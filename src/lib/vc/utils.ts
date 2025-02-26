// src/lib/vc/utils.ts
import { v4 as uuidv4 } from "uuid";
import {
  AuthorizationRequest,
  AuthorizationResponse,
  ErrorInjectionOptions,
  PersonalInfo,
  VerifiableCredential,
  VerifiableCredentialSchema,
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
      result.checks.proofValid = await verifyLinkedDataProof(
        credential,
        credential.proof,
      );
      if (!result.checks.proofValid) {
        result.errors.push("クレデンシャルの署名が無効です");
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

  // 選択された開示情報のみを含める
  const selectedDisclosures = disclosures.filter((disclosure: string) => {
    const [, claim] = JSON.parse(
      new TextDecoder().decode(base64urlToBuffer(disclosure)),
    );
    // idは常に含める
    return selectedClaims.includes(claim) || claim === "id";
  });

  // JWT と選択された開示情報を ~ で結合
  return [jwt, ...selectedDisclosures].join("~");
}

// VCフォーマットへの変換関数を追加
function convertSDJWTtoVC(presentation: string): VerifiableCredential {
  const [jwt, ...disclosures] = presentation.split("~");
  const [headerB64, payloadB64] = jwt.split(".");

  // JWTペイロードをデコード
  const payload = JSON.parse(
    new TextDecoder().decode(base64urlToBuffer(payloadB64)),
  );

  // 開示された情報を解析
  const disclosedClaims = {
    id: payload.sub || payload.id || `did:web:holder-${crypto.randomUUID()}`,
    type: "PersonalInfo",
  } as { id: string; type: string } & Record<string, any>;

  // 開示情報をクレデンシャルに追加
  for (const disclosure of disclosures) {
    const [, claim, value] = JSON.parse(
      new TextDecoder().decode(base64urlToBuffer(disclosure)),
    );
    disclosedClaims[claim] = value;
  }

  return {
    "@context": payload["@context"],
    id: payload.jti || `urn:uuid:${crypto.randomUUID()}`,
    type: payload.type,
    issuer: payload.issuer,
    validFrom: payload.validFrom || payload.iat,
    validUntil: payload.validUntil || payload.exp,
    credentialSubject: disclosedClaims,
    proof: {
      type: "JsonWebSignature2020",
      created: new Date().toISOString(),
      jws: presentation,
      verificationMethod: `${payload.issuer.id}#key-1`,
      proofPurpose: "assertionMethod",
      cryptosuite: "ecdsa-p256",
    },
  };
}

export { verifySDJWT } from "./sd-jwt";

// 詳細な検証を行う新しい関数
export async function verifyCredentialDetailed(
  credential: VerifiableCredential,
): Promise<DetailedVerificationResult> {
  // 基本的な検証を実行
  const baseResult = await verifyCredential(credential);

  // 詳細な検証結果を作成
  const detailedResult: DetailedVerificationResult = {
    ...baseResult,
    rawCredential: { ...credential }, // 生のクレデンシャルデータをコピー
    technicalDetails: {
      schema: {
        requiredFields: [
          "@context",
          "id",
          "type",
          "issuer",
          "validFrom",
          "credentialSubject",
        ],
        optionalFields: [
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
        validFrom: credential.validFrom,
        validUntil: credential.validUntil,
        currentTime: new Date().toISOString(),
      },
    },
  };

  // 発行者情報の詳細
  try {
    const issuerDID = credential.issuer.id;
    const didDocument = await resolveDID(issuerDID);
    detailedResult.technicalDetails.issuer = {
      did: issuerDID,
      didDocument: didDocument,
    };
  } catch (error) {
    console.error("Failed to resolve issuer DID:", error);
  }

  // 失効情報の詳細
  if (credential.credentialStatus) {
    detailedResult.technicalDetails.revocation = {
      status: credential.credentialStatus.statusPurpose,
      statusListCredential: credential.credentialStatus.statusListCredential,
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
    } catch (error) {
      console.error("Detailed proof verification failed:", error);
    }
  }

  return detailedResult;
}
