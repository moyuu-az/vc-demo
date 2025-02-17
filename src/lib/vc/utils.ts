// src/lib/vc/utils.ts

import { v4 as uuidv4 } from "uuid";
import {
  VerifiableCredential,
  AuthorizationRequest,
  AuthorizationResponse,
} from "../types/vc";

export const generateAuthorizationRequest = (
  credentialType: string[],
  purpose: string,
): AuthorizationRequest => {
  return {
    type: "AuthorizationRequest",
    credentialType,
    issuer: {
      id: "did:web:demo-issuer.example.com",
      name: "Demo Issuer",
    },
    purpose,
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
    callbackUrl: "https://demo-issuer.example.com/callback",
  };
};

export const createVerifiableCredential = (
  subjectId: string,
  claims: Record<string, any>,
): VerifiableCredential => {
  const credential: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
    ],
    id: `urn:uuid:${uuidv4()}`,
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
    credentialStatus: {
      id: `https://demo-issuer.example.com/credentials/${uuidv4()}/status`,
      type: "CredentialStatusList2020",
    },
    credentialSchema: {
      id: "https://demo-issuer.example.com/schemas/demo-credential.json",
      type: "JsonSchemaValidator2018",
    },
  };

  // 実際の環境では、ここで電子署名を行う
  credential.proof = {
    type: "Ed25519Signature2020",
    created: new Date().toISOString(),
    verificationMethod: "did:web:demo-issuer.example.com#key-1",
    proofPurpose: "assertionMethod",
    proofValue: "dummy_signature_for_demo",
  };

  return credential;
};

export const generateAuthorizationResponse = (
  requestId: string,
  holder: string,
  accepted: boolean,
): AuthorizationResponse => {
  return {
    requestId,
    holder,
    accepted,
    timestamp: new Date().toISOString(),
  };
};
