import { JWK } from "jose";
import { generateKeyPair } from "./crypto-utils";

export interface SecurityProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  jws: string;
  challenge?: string;
  domain?: string;
}

export interface LinkedDataProof extends SecurityProof {
  nonce?: string;
  cryptosuite: string;
}

export async function createLinkedDataProof(
  document: any,
  controller: string,
  purpose: string,
  options?: {
    challenge?: string;
    domain?: string;
    nonce?: string;
  },
): Promise<LinkedDataProof> {
  // キーペアの生成
  const keyPair = await generateKeyPair();

  // ドキュメントの正規化
  const normalizedDoc = await normalizeDocument(document);

  // JWKの作成
  const jwk = await exportKeyToJWK(keyPair.privateKey);

  // JWSの作成
  const jws = await createJWS(normalizedDoc, keyPair.privateKey);

  const proof: LinkedDataProof = {
    type: "JsonWebSignature2020",
    created: new Date().toISOString(),
    verificationMethod: `${controller}#key-1`,
    proofPurpose: purpose,
    cryptosuite: "es256",
    jws,
    ...options,
  };

  return proof;
}

async function normalizeDocument(document: any): Promise<string> {
  const context = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
  };

  const fullDoc = { ...context, ...document };
  return JSON.stringify(fullDoc);
}

async function exportKeyToJWK(key: CryptoKey): Promise<JWK> {
  const exported = await crypto.subtle.exportKey("jwk", key);
  return {
    ...exported,
    alg: "ES256",
    use: "sig",
  };
}

async function createJWS(
  payload: string,
  privateKey: CryptoKey,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);

  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    data,
  );

  // Base64URL エンコーディング
  const base64Signature = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // JWSの形式: Base64URL(header) + "." + Base64URL(payload) + "." + Base64URL(signature)
  const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const base64Payload = btoa(payload)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${header}.${base64Payload}.${base64Signature}`;
}

export async function verifyLinkedDataProof(
  document: any,
  proof: LinkedDataProof,
): Promise<boolean> {
  try {
    const normalizedDoc = await normalizeDocument(document);
    const publicKey = await resolvePublicKey(proof.verificationMethod);
    return await verifySignature(normalizedDoc, proof.jws, publicKey);
  } catch (error) {
    console.error("Proof verification failed:", error);
    return false;
  }
}

async function resolvePublicKey(
  verificationMethod: string,
): Promise<CryptoKey> {
  // 実際の実装では、DIDドキュメントを解決して公開鍵を取得
  // このデモ実装では、ダミーの公開鍵を返す
  return crypto.subtle
    .generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["verify"],
    )
    .then((keyPair) => keyPair.publicKey);
}

async function verifySignature(
  payload: string,
  jws: string,
  publicKey: CryptoKey,
): Promise<boolean> {
  try {
    const [headerB64, payloadB64, signatureB64] = jws.split(".");

    // Base64URLデコード
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );

    return await crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKey,
      signature,
      new TextEncoder().encode(payload),
    );
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}
