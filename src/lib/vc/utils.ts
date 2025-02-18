// src/lib/vc/utils.ts
import { v4 as uuidv4 } from "uuid";
import {
  AuthorizationRequest,
  AuthorizationResponse,
  VerifiableCredential,
  VerifiableCredentialSchema,
} from "../types/vc";
import { generateKeyPair } from "./crypto-utils";
import { createLinkedDataProof, verifyLinkedDataProof } from "./security-utils";
import { createDIDDocument, validateDID } from "./did-utils";
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
  claims: Record<string, any>,
): Promise<VerifiableCredential> {
  if (!validateDID(subjectId)) {
    throw new Error("Invalid DID format for subject");
  }

  // 鍵ペアを生成
  const keyPair = await generateKeyPair();

  // 生成した鍵ペアをログに出力
  await exportKeys(keyPair.publicKey, keyPair.privateKey);

  // 以下は既存のコード
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
    ],
    id: credentialId,
    type: ["VerifiableCredential", "DemoCredential"],
    issuer: {
      id: issuerDid,
      name: "Demo Issuer Organization",
      image: "https://demo-issuer.example.com/logo.png",
    },
    issuanceDate: new Date().toISOString(),
    expirationDate: new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    credentialSubject: {
      id: subjectId,
      ...claims,
    },
    credentialStatus: revocationStatus,
    credentialSchema: {
      id: "https://demo-issuer.example.com/schemas/demo-credential.json",
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
    refreshService: {
      id: `https://demo-issuer.example.com/refresh/${credentialId}`,
      type: "ManualRefreshService2018",
    },
    termsOfUse: [
      {
        type: "IssuerPolicy",
        id: "https://demo-issuer.example.com/policies/credential-terms",
      },
    ],
  };

  // Validate the credential against the schema
  const validationResult = VerifiableCredentialSchema.safeParse(credential);
  if (!validationResult.success) {
    throw new Error(`Invalid credential format: ${validationResult.error}`);
  }

  // Create Linked Data Proof
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

export async function verifyCredential(
  credential: VerifiableCredential,
): Promise<boolean> {
  // 1. Validate schema
  const validationResult = VerifiableCredentialSchema.safeParse(credential);
  if (!validationResult.success) {
    return false;
  }

  // 2. Check expiration
  if (
    credential.expirationDate &&
    new Date(credential.expirationDate) < new Date()
  ) {
    return false;
  }

  // 3. Check revocation status
  const isNotRevoked = await verifyCredentialStatus(credential.id);
  if (!isNotRevoked) {
    return false;
  }

  // 4. Verify proof
  if (!credential.proof) {
    return false;
  }

  return await verifyLinkedDataProof(credential, credential.proof);
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
