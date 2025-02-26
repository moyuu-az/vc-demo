// src/lib/vc/did-utils.ts
import { exportPublicKey, KeyPair } from "./crypto-utils";

export interface DIDDocument {
  "@context": string[];
  id: string;
  verificationMethod: {
    id: string;
    type: string;
    controller: string;
    publicKeyJwk: string;
  }[];
  authentication: string[];
  assertionMethod: string[];
}

export async function createDIDDocument(
  did: string,
  keyPair: KeyPair,
): Promise<DIDDocument> {
  const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
  const verificationMethodId = `${did}#key-1`;

  return {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: "EcdsaSecp256k1VerificationKey2019",
        controller: did,
        publicKeyJwk,
      },
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
  };
}

export function validateDID(did: string): boolean {
  const DID_REGEX = /^did:[a-zA-Z0-9]+:[a-zA-Z0-9.\-:]+$/;
  return DID_REGEX.test(did);
}

export function resolveDID(did: string): Promise<DIDDocument | null> {
  // 無効な発行者の場合はnullを返す
  if (did === "did:web:invalid-issuer.example.com") {
    console.log("Invalid issuer DID detected");
    return Promise.resolve(null);
  }
  
  // In a real implementation, this would resolve the DID through a DID resolver
  // For demo purposes, we'll create a mock document
  return Promise.resolve({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "EcdsaSecp256k1VerificationKey2019",
        controller: did,
        publicKeyJwk: "", // This would be the actual public key in a real implementation
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
  });
}
