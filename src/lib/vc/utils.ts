// src/lib/vc/utils.ts
import { v4 as uuidv4 } from "uuid";
import {
  AuthorizationRequest,
  AuthorizationResponse,
  ErrorInjectionOptions,
  PersonalInfo,
  VerifiableCredential,
  VerifiableCredentialSchema,
  VerifiablePresentation,
} from "../types/vc";
import { generateKeyPair } from "./crypto-utils";
import { createDIDDocument, resolveDID, validateDID } from "./did-utils";
import { revocationService } from "./revocation-utils";
import { base64urlToBuffer, createSDJWTCredential, SDJWT } from "./sd-jwt";
import {
  createDataIntegrityProof,
  createLinkedDataProof,
  verifyLinkedDataProof,
  verifyLinkedDataProofDetailed,
} from "./security-utils";

export async function generateAuthorizationRequest(
  credentialType: string[],
  purpose: string,
): Promise<AuthorizationRequest> {
  const keyPair = await generateKeyPair();
  const issuerDid = "did:web:demo-issuer.example.com";
  await createDIDDocument(issuerDid, keyPair);

  const request: AuthorizationRequest = {
    type: "AuthorizationRequest",
    credentialType,
    issuer: {
      id: issuerDid,
      name: "Demo Issuer",
    },
    purpose,
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
    callbackUrl: "https://demo-issuer.example.com/callback",
    challenge: uuidv4(),
    domain: "demo-issuer.example.com",
  };

  return request;
}

export async function createVerifiableCredential(
  subjectId: string,
  info: PersonalInfo & {
    credentialType?: string;
    style?: {
      backgroundColor: string;
      textColor: string;
    };
    errorTypes?: Record<string, string>;
    presentationFormat?: "sd-jwt" | "vp";
  },
  errorOptions?: ErrorInjectionOptions,
  credentialType: string = "PersonalInfoCredential",
): Promise<VerifiableCredential> {
  const credentialId = `urn:uuid:${uuidv4()}`;
  const issuerDid = errorOptions?.invalidIssuer
    ? "did:web:invalid-issuer.example.com"
    : "did:web:demo-issuer.example.com";

  // エラーオプションに基づいてクレデンシャルタイプを変更
  let finalCredentialType = info.credentialType || credentialType;

  // エラーオプションが有効な場合、対応するエラータイプを使用
  if (errorOptions && info.errorTypes) {
    if (errorOptions.invalidSignature && info.errorTypes.invalidSignature) {
      finalCredentialType = info.errorTypes.invalidSignature;
    } else if (
      errorOptions.expiredCredential &&
      info.errorTypes.expiredCredential
    ) {
      finalCredentialType = info.errorTypes.expiredCredential;
    } else if (errorOptions.invalidIssuer && info.errorTypes.invalidIssuer) {
      finalCredentialType = info.errorTypes.invalidIssuer;
    } else if (errorOptions.missingFields && info.errorTypes.missingFields) {
      finalCredentialType = info.errorTypes.missingFields;
    } else if (
      errorOptions.revokedCredential &&
      info.errorTypes.revokedCredential
    ) {
      finalCredentialType = info.errorTypes.revokedCredential;
    }
  }

  const credential: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
      "https://w3id.org/security/data-integrity/v2",
      "https://w3id.org/status-list/2023/v1",
    ],
    id: credentialId,
    type: ["VerifiableCredential", finalCredentialType],
    issuer: {
      id: issuerDid,
      name: "Demo Issuer Organization",
      image: "https://demo-issuer.example.com/logo.png",
    },
    issuanceDate: new Date().toISOString(),
    validFrom: errorOptions?.expiredCredential
      ? new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString(),
    validUntil: errorOptions?.expiredCredential
      ? new Date(Date.now() - 1).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject: errorOptions?.missingFields
      ? { id: subjectId, type: "PersonalInfo" }
      : {
          id: subjectId,
          type: "PersonalInfo",
          name: info.name,
          dateOfBirth: info.dateOfBirth,
          address: info.address,
          presentationFormat: info.presentationFormat || "sd-jwt",
        },
  };

  // スタイル情報を追加
  if (info.style) {
    credential.style = {
      backgroundColor: info.style.backgroundColor,
      textColor: info.style.textColor,
    };
  }

  if (!errorOptions?.missingFields) {
    credential.credentialStatus = {
      id: `https://demo-issuer.example.com/status/${credentialId}`,
      type: "StatusList2021Entry",
      statusPurpose: "revocation",
      statusListIndex: errorOptions?.revokedCredential ? "1" : "0",
      statusListCredential: "https://demo-issuer.example.com/status-list/2021",
    };
  }

  const proof = await createDataIntegrityProof(
    credential,
    errorOptions?.invalidSignature,
  );
  credential.proof = proof;

  // 失効オプションが有効な場合、実際にクレデンシャルを失効させる
  if (errorOptions?.revokedCredential) {
    await revokeCredential(credentialId);
    console.log(`Credential ${credentialId} has been revoked`);
  }

  return credential;
}

export interface VerificationResult {
  isValid: boolean;
  checks: {
    schemaValid: boolean;
    notExpired: boolean;
    notRevoked: boolean;
    proofValid: boolean;
    issuerValid: boolean;
  };
  errors: string[];
}

// 詳細な検証結果の型定義を追加
export interface DetailedVerificationResult extends VerificationResult {
  rawCredential?: any; // 生のクレデンシャルデータ
  presentationFormat: "sd-jwt" | "vp" | "vc";
  technicalDetails: {
    proof?: any; // 署名の詳細情報
    schema?: {
      validationErrors?: string[];
      requiredFields?: string[];
      optionalFields?: string[];
    };
    issuer?: {
      did?: string;
      didDocument?: any;
    };
    timing?: {
      validFrom?: string;
      validUntil?: string;
      currentTime?: string;
    };
    revocation?: {
      status?: string;
      statusListCredential?: string;
    };
  };
}

export async function verifyCredential(
  credential: VerifiableCredential,
): Promise<VerificationResult> {
  const result: VerificationResult = {
    isValid: false,
    checks: {
      schemaValid: false,
      notExpired: false,
      notRevoked: false,
      proofValid: false,
      issuerValid: false,
    },
    errors: [],
  };

  try {
    // 1. スキーマ検証
    const validationResult = VerifiableCredentialSchema.safeParse(credential);
    result.checks.schemaValid = validationResult.success;
    if (!validationResult.success) {
      result.errors.push(
        `スキーマ検証エラー: ${validationResult.error.message}`,
      );
    }

    // 2. 有効期限チェック
    const now = new Date();
    const validFrom = new Date(credential.validFrom);
    const validUntil = credential.validUntil
      ? new Date(credential.validUntil)
      : null;

    result.checks.notExpired = true; // デフォルトはtrue
    if (validFrom > now) {
      result.checks.notExpired = false;
      result.errors.push("クレデンシャルの有効期間がまだ始まっていません");
    }
    if (validUntil && validUntil < now) {
      result.checks.notExpired = false;
      result.errors.push("クレデンシャルの有効期限が切れています");
    }

    // 3. 失効状態チェック
    result.checks.notRevoked = await verifyCredentialStatus(credential.id);
    if (!result.checks.notRevoked) {
      result.errors.push("このクレデンシャルは失効しています");
    }

    // 4. 発行者の検証
    try {
      const issuerDID = credential.issuer.id;
      const didDocument = await resolveDID(issuerDID);
      result.checks.issuerValid = !!didDocument && didDocument.id === issuerDID;
      if (!result.checks.issuerValid) {
        result.errors.push("発行者のDIDが無効です");
      }
    } catch (error) {
      result.checks.issuerValid = false;
      result.errors.push(
        `発行者の検証に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    }

    // 5. プルーフの検証
    if (credential.proof) {
      // 無効な署名の強制検出
      if (
        credential.proof.proofValue === "invalid_signature_for_testing_purposes"
      ) {
        result.checks.proofValid = false;
        result.errors.push(
          "クレデンシャルの署名が無効です（テスト用無効署名を検出）",
        );
      } else {
        result.checks.proofValid = await verifyLinkedDataProof(
          credential,
          credential.proof,
        );
        if (!result.checks.proofValid) {
          result.errors.push("クレデンシャルの署名が無効です");
        }
      }
    } else {
      result.checks.proofValid = false;
      result.errors.push("クレデンシャルに署名が含まれていません");
    }

    // デバッグ用のログ出力
    console.log("Verification checks:", result.checks);
    console.log("Verification errors:", result.errors);

    // 総合判定
    result.isValid = Object.values(result.checks).every((check) => check);
  } catch (error) {
    result.errors.push(
      `検証中に予期せぬエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
    );
    result.isValid = false;
  }

  return result;
}

export async function generateAuthorizationResponse(
  requestId: string,
  holder: string,
  accepted: boolean,
): Promise<AuthorizationResponse> {
  if (!validateDID(holder)) {
    throw new Error("Invalid DID format for holder");
  }

  const response: AuthorizationResponse = {
    requestId,
    holder,
    accepted,
    timestamp: new Date().toISOString(),
  };

  // 新しいLinkedDataProofを使用して署名を生成
  const proof = await createLinkedDataProof(
    response,
    holder,
    "authentication",
    {
      challenge: uuidv4(),
      domain: "demo-issuer.example.com",
    },
  );

  response.proof = proof;

  return response;
}

export async function revokeCredential(credentialId: string): Promise<void> {
  revocationService.revokeCredential(credentialId);
}

export async function verifyCredentialStatus(
  credentialId: string,
): Promise<boolean> {
  return !revocationService.isRevoked(credentialId);
}

async function exportKeys(publicKey: CryptoKey, privateKey: CryptoKey) {
  try {
    // JWK形式で公開鍵をエクスポート
    const publicJWK = await window.crypto.subtle.exportKey("jwk", publicKey);
    console.log("Public Key (JWK format):", JSON.stringify(publicJWK, null, 2));

    // SPKI形式で公開鍵をエクスポート
    const publicSPKI = await window.crypto.subtle.exportKey("spki", publicKey);
    const publicSPKIBase64 = btoa(
      String.fromCharCode(...new Uint8Array(publicSPKI)),
    );
    console.log("Public Key (SPKI format, base64):", publicSPKIBase64);

    // JWK形式で秘密鍵をエクスポート
    const privateJWK = await window.crypto.subtle.exportKey("jwk", privateKey);
    console.log(
      "Private Key (JWK format):",
      JSON.stringify(privateJWK, null, 2),
    );

    // PKCS#8形式で秘密鍵をエクスポート
    const privatePKCS8 = await window.crypto.subtle.exportKey(
      "pkcs8",
      privateKey,
    );
    const privatePKCS8Base64 = btoa(
      String.fromCharCode(...new Uint8Array(privatePKCS8)),
    );
    console.log("Private Key (PKCS#8 format, base64):", privatePKCS8Base64);
  } catch (error) {
    console.error("Error exporting keys:", error);
  }
}

export async function createSelectiveDisclosure(
  credential: VerifiableCredential,
  selectedClaims: string[],
): Promise<VerifiableCredential> {
  if (!credential || !credential.credentialSubject) {
    throw new Error("Invalid credential: credentialSubject is missing");
  }

  // SD-JWT形式でクレデンシャルを作成
  const sdJwt = await createSDJWTCredential(credential, selectedClaims);

  // 選択的開示用のSD-JWTを作成
  const presentation = await createSDJWTPresentation(sdJwt, selectedClaims);

  // 検証用のVCフォーマットに変換
  return convertSDJWTtoVC(presentation);
}

// SD-JWT形式のプレゼンテーションを作成する関数を追加
async function createSDJWTPresentation(
  sdJwt: SDJWT,
  selectedClaims: string[],
): Promise<string> {
  const { jwt, disclosures } = sdJwt;
  console.log(
    "Creating SD-JWT presentation with JWT:",
    jwt.substring(0, 20) + "...",
  );
  console.log("Selected claims:", selectedClaims);

  // 選択された開示情報のみを含める
  const selectedDisclosures = disclosures.filter((disclosure: string) => {
    const [, claim] = JSON.parse(
      new TextDecoder().decode(base64urlToBuffer(disclosure)),
    );
    // idは常に含める
    return selectedClaims.includes(claim) || claim === "id";
  });

  console.log(
    `Selected ${selectedDisclosures.length} disclosures out of ${disclosures.length}`,
  );

  // JWT と選択された開示情報を ~ で結合
  return [jwt, ...selectedDisclosures].join("~");
}

// VCフォーマットへの変換関数を追加
function convertSDJWTtoVC(presentation: string): VerifiableCredential {
  console.log(
    "Converting SD-JWT to VC, presentation length:",
    presentation.length,
  );

  const [jwt, ...disclosures] = presentation.split("~");
  console.log(`Parsed JWT and ${disclosures.length} disclosures`);

  const [headerB64, payloadB64] = jwt.split(".");
  console.log("JWT header:", headerB64.substring(0, 10) + "...");
  console.log("JWT payload base64:", payloadB64.substring(0, 10) + "...");

  // JWTペイロードをデコード
  const payload = JSON.parse(
    new TextDecoder().decode(base64urlToBuffer(payloadB64)),
  );

  // デバッグ用ログ
  console.log("JWT payload:", payload);
  console.log("nbf:", payload.nbf, "exp:", payload.exp);

  // 開示された情報を解析
  const disclosedClaims = {
    id: payload.sub || payload.id || `did:web:holder-${uuidv4()}`,
    type: "PersonalInfo",
  } as { id: string; type: string } & Record<string, any>;

  // 開示情報をクレデンシャルに追加
  for (const disclosure of disclosures) {
    const [, claim, value] = JSON.parse(
      new TextDecoder().decode(base64urlToBuffer(disclosure)),
    );
    disclosedClaims[claim] = value;
  }

  // 安全に日付を変換する関数
  const safelyConvertToISODate = (
    timestamp: any,
    defaultOffsetDays = 0,
  ): string => {
    console.log(
      `Converting timestamp: ${timestamp}, type: ${typeof timestamp}`,
    );

    if (timestamp === undefined || timestamp === null) {
      console.log("Timestamp is undefined/null, using current date + offset");
      // デフォルト値を現在時刻 + オフセット日数に設定
      const date = new Date();
      date.setDate(date.getDate() + defaultOffsetDays);
      return date.toISOString();
    }

    // 数値に変換を試みる
    const numericTimestamp = Number(timestamp);
    console.log(
      `Converted to numeric: ${numericTimestamp}, isNaN: ${isNaN(numericTimestamp)}`,
    );

    // 無効な数値の場合は現在時刻を使用
    if (isNaN(numericTimestamp)) {
      console.log(
        "Timestamp is not a valid number, using current date + offset",
      );
      const date = new Date();
      date.setDate(date.getDate() + defaultOffsetDays);
      return date.toISOString();
    }

    try {
      // Unix時間をミリ秒に変換して日付オブジェクトを作成
      const date = new Date(numericTimestamp * 1000);
      console.log(
        `Created date: ${date.toISOString()}, year: ${date.getFullYear()}`,
      );

      // 有効な日付かチェック
      if (date.getFullYear() < 1970 || date.getFullYear() > 2100) {
        console.log("Date out of valid range, using fallback");
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + defaultOffsetDays);
        return fallbackDate.toISOString();
      }

      return date.toISOString();
    } catch (error) {
      console.error("日付変換エラー:", error);
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + defaultOffsetDays);
      return fallbackDate.toISOString();
    }
  };

  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: `urn:uuid:${uuidv4()}`,
    type: ["VerifiableCredential"],
    issuer: payload.issuer,
    validFrom: safelyConvertToISODate(payload.nbf, 0),
    validUntil: safelyConvertToISODate(payload.exp, 365),
    credentialSubject: {
      ...(payload.credentialSubject || {}),
      ...disclosedClaims,
      id:
        payload.sub ||
        payload.credentialSubject?.id ||
        `did:web:holder-${uuidv4()}`,
    },
    proof: {
      type: "DataIntegrityProof",
      created: new Date().toISOString(),
      proofValue: presentation,
      verificationMethod:
        payload.issuer && payload.issuer.id
          ? `${payload.issuer.id}#key-1`
          : "did:web:demo-issuer.example.com#key-1",
      proofPurpose: "assertionMethod",
      cryptosuite: "ecdsa-2019",
    },
  };
}

export { verifySDJWT } from "./sd-jwt";

// 修正版verifyCredentialDetailed関数
export async function verifyCredentialDetailed(
  credential: VerifiableCredential | VerifiablePresentation,
): Promise<DetailedVerificationResult> {
  // 形式を判定
  const format = detectPresentationFormat(credential);

  // 基本的な検証を実行
  let baseResult: VerificationResult;

  if (format === "vp") {
    // VP形式の場合はpresentationを検証
    baseResult = await verifyPresentation(credential as VerifiablePresentation);
  } else {
    // VC形式の場合はcredentialを検証
    baseResult = await verifyCredential(credential as VerifiableCredential);
  }

  // 詳細な検証結果を作成
  const detailedResult: DetailedVerificationResult = {
    ...baseResult,
    rawCredential: { ...credential } as any, // 生のクレデンシャルデータをコピー
    presentationFormat: format,
    technicalDetails: {
      schema: {
        requiredFields:
          format === "vp"
            ? ["@context", "id", "type", "holder", "verifiableCredential"]
            : [
                "@context",
                "id",
                "type",
                "issuer",
                "validFrom",
                "credentialSubject",
              ],
        optionalFields:
          format === "vp"
            ? ["proof"]
            : [
                "validUntil",
                "credentialStatus",
                "credentialSchema",
                "refreshService",
                "termsOfUse",
                "evidence",
                "proof",
              ],
      },
      timing: {
        validFrom:
          format === "vp"
            ? (credential as VerifiablePresentation).verifiableCredential?.[0]
                ?.validFrom
            : (credential as VerifiableCredential).validFrom,
        validUntil:
          format === "vp"
            ? (credential as VerifiablePresentation).verifiableCredential?.[0]
                ?.validUntil
            : (credential as VerifiableCredential).validUntil,
        currentTime: new Date().toISOString(),
      },
    },
  };

  // 発行者情報を追加（VP形式の場合は最初のVCの発行者）
  const issuer =
    format === "vp"
      ? (credential as VerifiablePresentation).verifiableCredential?.[0]?.issuer
      : (credential as VerifiableCredential).issuer;

  if (issuer && issuer.id) {
    detailedResult.technicalDetails.issuer = {
      did: issuer.id,
      didDocument: await resolveDID(issuer.id).catch(() => null),
    };
  }

  // クレデンシャルステータス情報を追加
  const credStatus =
    format === "vp"
      ? (credential as VerifiablePresentation).verifiableCredential?.[0]
          ?.credentialStatus
      : (credential as VerifiableCredential).credentialStatus;

  if (credStatus) {
    detailedResult.technicalDetails.revocation = {
      status: credStatus.statusPurpose,
      statusListCredential: credStatus.statusListCredential,
    };
  }

  // 署名検証の詳細
  if (credential.proof) {
    try {
      // 詳細な署名検証を実行
      const proofResult = await verifyLinkedDataProofDetailed(
        credential,
        credential.proof as any,
      );

      detailedResult.technicalDetails.proof = {
        ...credential.proof,
        verificationDetails: proofResult.details,
      };

      // 選択的開示フラグの確認
      const isSelectivelyDisclosed =
        (credential as any)._selectivelyDisclosed === true ||
        (format === "vp" &&
          (credential as VerifiablePresentation).verifiableCredential?.[0]
            ?._selectivelyDisclosed === true);

      if (isSelectivelyDisclosed) {
        // 選択的開示された場合のエラーを追加（重複しないように注意）
        if (!detailedResult.errors.some((e) => e.includes("選択的開示"))) {
          detailedResult.errors.push(
            "このクレデンシャルは選択的開示されているため、元の発行者の署名が無効です。SD-JWT形式での検証をご利用ください。",
          );
        }
      }
    } catch (error) {
      console.error("Detailed proof verification failed:", error);
    }
  }

  return detailedResult;
}

// VP（Verifiable Presentation）作成のための新しい関数
export async function createVerifiablePresentation(
  credential: VerifiableCredential,
  selectedClaims: string[] = [],
): Promise<any> {
  // Holder's identifier
  const holderId = credential.credentialSubject.id;

  // Prepare credential for selective disclosure
  let disclosedCredential: VerifiableCredential = JSON.parse(
    JSON.stringify(credential),
  );

  // 明示的に選択的開示フラグを削除（初期状態でクリーンな状態にする）
  if ("_selectivelyDisclosed" in disclosedCredential) {
    delete disclosedCredential._selectivelyDisclosed;
    console.log("初期状態で選択的開示フラグを削除しました");
  }

  // Only process for selective disclosure if claims are specified
  if (selectedClaims.length > 0 && disclosedCredential.credentialSubject) {
    // Required attributes (always included)
    const requiredClaims = ["id", "type"];

    // Technical fields that should be ignored in disclosure checks
    const technicalFields = ["presentationFormat"];

    // Get all available claims that are not technical fields or required fields
    const allAvailableClaims = Object.keys(
      disclosedCredential.credentialSubject,
    ).filter(
      (claim) =>
        !technicalFields.includes(claim) && !requiredClaims.includes(claim),
    );

    // Combine selected and required claims
    const allClaimsToKeep = [
      ...new Set([...requiredClaims, ...selectedClaims]),
    ];

    console.log("利用可能な属性:", allAvailableClaims);
    console.log("選択された属性:", selectedClaims);
    console.log("保持する属性:", allClaimsToKeep);

    // Check if all available main claims are selected
    // Using every instead of some for clarity
    const allMainClaimsSelected = allAvailableClaims.every((claim) =>
      allClaimsToKeep.includes(claim),
    );

    const isPartialDisclosure = !allMainClaimsSelected;
    console.log("部分開示かどうか:", isPartialDisclosure);

    if (isPartialDisclosure) {
      // 一部の属性のみ選択されている場合（選択的開示）
      console.log(
        "一部の属性のみが選択されています - 選択的開示フラグを設定します",
      );

      // Create new object with basic attributes
      const filteredSubject: any = {};

      // Add only required attributes and selected claims
      for (const claim of allClaimsToKeep) {
        if (claim in disclosedCredential.credentialSubject) {
          filteredSubject[claim] = disclosedCredential.credentialSubject[claim];
        }
      }

      // Add technical fields back
      for (const field of technicalFields) {
        if (field in disclosedCredential.credentialSubject) {
          filteredSubject[field] = disclosedCredential.credentialSubject[field];
        }
      }

      // Update with new subject
      disclosedCredential.credentialSubject = filteredSubject;

      // Add selective disclosure flag
      disclosedCredential._selectivelyDisclosed = true;
    } else {
      // 全ての属性が選択されている場合
      console.log(
        "すべての属性が選択されています - 選択的開示フラグは不要です",
      );

      // 念のため、選択的開示フラグを明示的に削除
      if ("_selectivelyDisclosed" in disclosedCredential) {
        delete disclosedCredential._selectivelyDisclosed;
        console.log("選択的開示フラグを削除しました");
      }
    }
  }

  // VP最終チェック
  console.log("最終的なクレデンシャル:", JSON.stringify(disclosedCredential));
  console.log(
    "選択的開示フラグ存在:",
    "_selectivelyDisclosed" in disclosedCredential,
  );

  // Create VP
  const presentation = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
    ],
    type: ["VerifiablePresentation"],
    id: `urn:uuid:${uuidv4()}`,
    holder: holderId,
    verifiableCredential: [disclosedCredential],
  };

  // Create data integrity proof for W3C VP
  const proof = await createDataIntegrityProof(presentation, false);

  // Add holder info as signer
  proof.verificationMethod = `${holderId}#key-1`;

  const finalPresentation = {
    ...presentation,
    proof,
  };

  // 最終チェック - VPに選択的開示フラグが残っていないか確認
  console.log(
    "VP内のVC選択的開示フラグ:",
    finalPresentation.verifiableCredential[0]._selectivelyDisclosed
      ? "あり"
      : "なし",
  );

  // Return VP with signature
  return finalPresentation;
}

// プレゼンテーション形式を判定する関数
export function detectPresentationFormat(data: any): "sd-jwt" | "vp" | "vc" {
  if (data?.type?.includes("VerifiablePresentation")) {
    return "vp";
  } else if (data?.proof?.proofValue && data.proof.proofValue.includes("~")) {
    return "sd-jwt";
  } else {
    return "vc"; // 通常のVCの場合
  }
}

// Verifiable Presentationを検証する関数
// 修正版verifyPresentation関数
export async function verifyPresentation(
  presentation: any,
): Promise<VerificationResult> {
  const result: VerificationResult = {
    isValid: false,
    checks: {
      schemaValid: false,
      notExpired: false,
      notRevoked: false,
      proofValid: false,
      issuerValid: false,
    },
    errors: [],
  };

  try {
    // 1. スキーマ検証
    result.checks.schemaValid =
      presentation["@context"] &&
      presentation.type &&
      presentation.type.includes("VerifiablePresentation") &&
      presentation.holder &&
      Array.isArray(presentation.verifiableCredential);

    if (!result.checks.schemaValid) {
      result.errors.push("Presentationのスキーマが無効です");
    }

    // 2. プレゼンテーションの署名を検証
    if (presentation.proof) {
      result.checks.proofValid = await verifyLinkedDataProof(
        presentation,
        presentation.proof,
      );
      if (!result.checks.proofValid) {
        result.errors.push("Presentationの署名が無効です");
      }
    } else {
      result.checks.proofValid = false;
      result.errors.push("Presentationに署名がありません");
    }

    // 3. 含まれるクレデンシャルを検証
    if (
      Array.isArray(presentation.verifiableCredential) &&
      presentation.verifiableCredential.length > 0
    ) {
      // 選択的開示フラグの確認 (明示的なフラグのみ使用)
      const hasSelectiveDisclosure = presentation.verifiableCredential.some(
        (vc) => vc._selectivelyDisclosed === true,
      );

      if (hasSelectiveDisclosure) {
        // 選択的開示と明示的にマークされている場合のみエラー追加
        result.checks.proofValid = false;

        // エラーメッセージが重複しないようにする
        if (!result.errors.some((e) => e.includes("選択的開示"))) {
          result.errors.push(
            "このクレデンシャルは選択的開示されているため、元の発行者の署名が無効です。SD-JWT形式での検証をご利用ください。",
          );
        }
      } else {
        // 完全開示の場合は通常の検証を実行
        const credentialResults = await Promise.all(
          presentation.verifiableCredential.map(verifyCredential),
        );

        // すべてのクレデンシャルが有効かチェック
        const allCredentialsValid = credentialResults.every((r) => r.isValid);

        if (!allCredentialsValid) {
          result.errors.push("一部のクレデンシャルが無効です");

          // 詳細なエラーを追加
          credentialResults.forEach((r, i) => {
            if (!r.isValid) {
              result.errors.push(
                `クレデンシャル ${i + 1}: ${r.errors.join(", ")}`,
              );
            }
          });
        }

        // 最終判定にクレデンシャルの結果を考慮
        result.checks.notExpired = credentialResults.every(
          (r) => r.checks.notExpired,
        );
        result.checks.notRevoked = credentialResults.every(
          (r) => r.checks.notRevoked,
        );
        result.checks.issuerValid = credentialResults.every(
          (r) => r.checks.issuerValid,
        );
      }
    } else {
      result.errors.push("Presentationにクレデンシャルが含まれていません");
    }

    // 総合判定
    result.isValid = Object.values(result.checks).every((check) => check);
  } catch (error) {
    result.errors.push(
      `検証中に予期せぬエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
    );
    result.isValid = false;
  }

  return result;
}

// Modify the detailed verification function to be consistent
export async function verifyLinkedDataProofDetailed(
  document: any,
  proof: LinkedDataProof,
): Promise<DetailedVerificationResult> {
  console.log("検証開始: proof = ", proof); // デバッグログ
  const result: DetailedVerificationResult = {
    isValid: false,
    details: {
      signatureValid: false,
      methodResolved: false,
      proofPurposeValid: false,
      cryptosuiteSupported: false,
    },
  };

  try {
    // Invalid signature check
    if (proof.proofValue === "invalid_signature_for_testing_purposes") {
      console.log(
        "Invalid signature detected in verifyLinkedDataProofDetailed",
      );
      return {
        isValid: false,
        details: {
          signatureValid: false,
          methodResolved: true,
          proofPurposeValid: true,
          cryptosuiteSupported: true,
          signatureData: {
            algorithm: proof.cryptosuite || "ecdsa-2019",
            created: proof.created,
            verificationMethod: proof.verificationMethod,
            signatureValue: proof.proofValue.substring(0, 20) + "...",
          },
        },
      };
    }

    // Determine if this is a VP or VC
    const isVP =
      document.type && document.type.includes("VerifiablePresentation");
    const containsVC =
      isVP &&
      Array.isArray(document.verifiableCredential) &&
      document.verifiableCredential.length > 0;

    // Simulate verification method resolution
    result.details.methodResolved = true;

    // Verify proof purpose
    const validPurposes = ["assertionMethod", "authentication", "keyAgreement"];
    result.details.proofPurposeValid = validPurposes.includes(
      proof.proofPurpose,
    );

    // Check cryptosuite support
    const supportedSuites = [
      "ecdsa-2019",
      "eddsa-rdfc-2022",
      "ecdsa-sd-2023",
      "bbs-2023",
    ];
    result.details.cryptosuiteSupported = supportedSuites.includes(
      proof.cryptosuite,
    );

    // Check for selective disclosure flag - only use the explicit flag
    const isSelectivelyDisclosed =
      document._selectivelyDisclosed === true ||
      (isVP &&
        containsVC &&
        document.verifiableCredential[0]._selectivelyDisclosed === true);

    // Signature verification
    if (isSelectivelyDisclosed) {
      // For explicitly marked selective disclosure, signatures are invalid
      result.details.signatureValid = false;
      console.log("選択的開示されたVCの署名は無効とします");
    } else {
      // For regular VCs, VPs, or fully disclosed VPs
      result.details.signatureValid = true;
    }

    // Signature data details
    result.details.signatureData = {
      algorithm: proof.cryptosuite,
      created: proof.created,
      verificationMethod: proof.verificationMethod,
      signatureValue:
        proof.proofValue.length > 40
          ? proof.proofValue.substring(0, 20) +
            "..." +
            proof.proofValue.substring(proof.proofValue.length - 20)
          : proof.proofValue,
    };

    // Overall validation
    result.isValid =
      result.details.signatureValid &&
      result.details.methodResolved &&
      result.details.proofPurposeValid &&
      result.details.cryptosuiteSupported;

    return result;
  } catch (error) {
    console.error("Proof verification failed:", error);
    return result;
  }
}

// 拡張された検証関数 - SD-JWTとVP両方に対応
export async function verifyCredentialOrPresentation(
  data: any,
): Promise<VerificationResult> {
  const format = detectPresentationFormat(data);

  console.log(`検証形式: ${format}`);

  switch (format) {
    case "vp":
      return verifyPresentation(data);
    case "sd-jwt":
      // SD-JWT形式の検証
      return verifyCredential(data);
    case "vc":
      // 通常のVC形式の検証
      return verifyCredential(data);
    default:
      return {
        isValid: false,
        checks: {
          schemaValid: false,
          notExpired: false,
          notRevoked: false,
          proofValid: false,
          issuerValid: false,
        },
        errors: ["不明なフォーマットです"],
      };
  }
}
