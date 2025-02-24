// src/lib/vc/utils.ts
import { v4 as uuidv4 } from "uuid";
import {
  AuthorizationRequest,
  AuthorizationResponse,
  VerifiableCredential,
  VerifiableCredentialSchema,
  PersonalInfo,
  DisclosureRequest,
  DisclosureResponse,
} from "../types/vc";
import { generateKeyPair } from "./crypto-utils";
import { createLinkedDataProof, verifyLinkedDataProof } from "./security-utils";
import { createDIDDocument, validateDID, resolveDID } from "./did-utils";
import { revocationService } from "./revocation-utils";

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
  info: PersonalInfo,
): Promise<VerifiableCredential> {
  if (!validateDID(subjectId)) {
    throw new Error("Invalid DID format for subject");
  }

  const keyPair = await generateKeyPair();
  await exportKeys(keyPair.publicKey, keyPair.privateKey);

  const credentialId = `urn:uuid:${uuidv4()}`;
  const revocationStatus =
    revocationService.createRevocationStatus(credentialId);
  const issuerDid = "did:web:demo-issuer.example.com";

  const credential: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      "https://w3id.org/vc-revocation-list-2020/v1",
      "https://schema.org"
    ],
    id: credentialId,
    type: ["VerifiableCredential", "PersonalInfoCredential"],
    issuer: {
      id: issuerDid,
      name: "Demo Issuer Organization",
      image: "https://demo-issuer.example.com/logo.png",
    },
    issuanceDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject: {
      id: subjectId,
      type: "PersonalInfo",
      name: info.name,
      dateOfBirth: info.dateOfBirth,
      address: info.address,
    },
    style: info.style,
    credentialStatus: revocationStatus,
    credentialSchema: {
      id: "https://demo-issuer.example.com/schemas/personal-info.json",
      type: "JsonSchemaValidator2018",
    },
    evidence: [
      {
        id: `${credentialId}#evidence-1`,
        type: ["DocumentVerification"],
        verifier: issuerDid,
        evidenceDocument: "Verified Identity Document",
        subjectPresence: "Physical",
        documentPresence: "Physical",
        verificationMethod: "ProofOfIdentity",
      },
    ],
  };

  const validationResult = VerifiableCredentialSchema.safeParse(credential);
  if (!validationResult.success) {
    throw new Error(`Invalid credential format: ${validationResult.error}`);
  }

  const proof = await createLinkedDataProof(
    credential,
    issuerDid,
    "assertionMethod",
    {
      challenge: uuidv4(),
      domain: "demo-issuer.example.com",
    },
  );

  credential.proof = proof;

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
    const issuanceDate = new Date(credential.issuanceDate);
    const expirationDate = credential.expirationDate
      ? new Date(credential.expirationDate)
      : null;

    result.checks.notExpired = true; // デフォルトはtrue
    if (issuanceDate > now) {
      result.checks.notExpired = false;
      result.errors.push("クレデンシャルの有効期間がまだ始まっていません");
    }
    if (expirationDate && expirationDate < now) {
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
      result.errors.push(`発行者の検証に失敗しました: ${error.message}`);
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
      `検証中に予期せぬエラーが発生しました: ${error.message}`,
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
  // 選択された属性のみを含む新しいオブジェクトを作成
  const disclosedClaims = selectedClaims.reduce(
    (acc, claim) => {
      if (credential.credentialSubject[claim]) {
        acc[claim] = credential.credentialSubject[claim];
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  // VCの基本構造を維持しながら、選択された属性のみを含む新しいVCを作成
  const selectiveVC: VerifiableCredential = {
    "@context": credential["@context"],
    id: credential.id,
    type: credential.type,
    issuer: credential.issuer,
    issuanceDate: credential.issuanceDate,
    expirationDate: credential.expirationDate,
    credentialSubject: {
      id: credential.credentialSubject.id,
      type: credential.credentialSubject.type,
      ...disclosedClaims,
    },
    style: credential.style,
  };

  // 新しいプルーフを生成
  const proof = await createLinkedDataProof(
    selectiveVC,
    credential.issuer.id,
    "selectiveDisclosure",
  );

  return {
    ...selectiveVC,
    proof,
  };
}
