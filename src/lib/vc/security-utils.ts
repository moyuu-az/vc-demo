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
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
      "https://w3id.org/security/suites/jws-2020/v2",
    ],
  };

  const fullDoc = { ...context, ...document };
  return JSON.stringify(fullDoc);
}

async function exportKeyToJWK(key: CryptoKey): Promise<JWK> {
  const exported = await crypto.subtle.exportKey("jwk", key);
  return {
    ...exported,
    kty: exported.kty as string,
    alg: "ES256",
    use: "sig",
  };
}

async function createJWS(payload: any, privateKey: CryptoKey): Promise<string> {
  // ペイロードをJSON文字列に変換
  const payloadString = JSON.stringify(payload);

  // UTF-8バイト配列に変換
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payloadString);

  // Base64エンコード（UTF-8対応）
  const base64Payload = btoa(String.fromCharCode(...payloadBytes));

  // 署名の生成
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    payloadBytes,
  );

  // 署名をBase64エンコード
  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  );

  // JWSの形式で返す
  return `${base64Payload}.${signatureBase64}`;
}

export async function verifyLinkedDataProof(
  document: any,
  proof: LinkedDataProof,
): Promise<boolean> {
  try {
    // デモ環境では常にtrueを返す
    console.log("Demo mode: Signature verification always returns true");
    return true;
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
      ["sign", "verify"],
    )
    .then((keyPair: CryptoKeyPair) => keyPair.publicKey);
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

export async function createDataIntegrityProof(
  document: any,
): Promise<SecurityProof> {
  // キーペアの生成
  const keyPair = await generateKeyPair();

  // ドキュメントの正規化（JSON文字列に変換）
  const normalizedDoc = JSON.stringify(document);

  // 署名の生成
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    keyPair.privateKey,
    new TextEncoder().encode(normalizedDoc),
  );

  // Base64エンコード
  const jws = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return {
    type: "DataIntegrityProof",
    created: new Date().toISOString(),
    verificationMethod: "did:web:demo-issuer.example.com#key-1",
    proofPurpose: "assertionMethod",
    cryptosuite: "ecdsa-2019",
    jws,
  };
}
