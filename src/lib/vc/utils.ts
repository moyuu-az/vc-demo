// src/lib/vc/utils.ts
import { v4 as uuidv4 } from "uuid";
import {
  VerifiableCredential,
  AuthorizationRequest,
  AuthorizationResponse,
  VerifiableCredentialSchema,
} from "../types/vc";
import { generateKeyPair, signCredential } from "./crypto-utils";
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

  const keyPair = await generateKeyPair();
  const credentialId = `urn:uuid:${uuidv4()}`;

  const revocationStatus =
    revocationService.createRevocationStatus(credentialId);
  const revocationListCredential =
    revocationService.createRevocationListCredential();

  const credential: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
      "https://w3id.org/vc-revocation-list-2020/v1",
    ],
    id: credentialId,
    type: ["VerifiableCredential", "DemoCredential"],
    issuer: {
      id: "did:web:demo-issuer.example.com",
      name: "Demo Issuer Organization",
      image: "https://demo-issuer.example.com/logo.png",
    },
    issuanceDate: new Date().toISOString(),
    expirationDate: new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 1年後
    credentialSubject: {
      id: subjectId,
      ...claims,
    },
    credentialStatus: revocationStatus,
    credentialSchema: {
      id: "https://demo-issuer.example.com/schemas/demo-credential.json",
      type: "JsonSchemaValidator2018",
    },
  };

  // Validate the credential against the schema
  const validationResult = VerifiableCredentialSchema.safeParse(credential);
  if (!validationResult.success) {
    throw new Error(`Invalid credential format: ${validationResult.error}`);
  }

  // Sign the credential
  const proofValue = await signCredential(credential, keyPair.privateKey);

  credential.proof = {
    type: "EcdsaSecp256k1Signature2019",
    created: new Date().toISOString(),
    verificationMethod: `${credential.issuer.id}#key-1`,
    proofPurpose: "assertionMethod",
    proofValue,
  };

  return credential;
}

export async function generateAuthorizationResponse(
  requestId: string,
  holder: string,
  accepted: boolean,
): Promise<AuthorizationResponse> {
  if (!validateDID(holder)) {
    throw new Error("Invalid DID format for holder");
  }

  const keyPair = await generateKeyPair();
  const response: AuthorizationResponse = {
    requestId,
    holder,
    accepted,
    timestamp: new Date().toISOString(),
  };

  // Sign the response
  const proofValue = await signCredential(response, keyPair.privateKey);

  response.proof = {
    type: "EcdsaSecp256k1Signature2019",
    created: new Date().toISOString(),
    verificationMethod: `${holder}#key-1`,
    proofPurpose: "authentication",
    proofValue,
  };

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
