// src/lib/vc/crypto-utils.ts
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export async function generateKeyPair(): Promise<KeyPair> {
  // ブラウザのcrypto APIを使用
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"],
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function signCredential(
  credential: any,
  privateKey: CryptoKey,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(credential));

  const signature = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    data,
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifyCredential(
  credential: any,
  signature: string,
  publicKey: CryptoKey,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(credential));
  const signatureBytes = Uint8Array.from(atob(signature), (c) =>
    c.charCodeAt(0),
  );

  return await window.crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    publicKey,
    signatureBytes,
    data,
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importPublicKey(keyData: string): Promise<CryptoKey> {
  const keyBytes = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    "spki",
    keyBytes,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"],
  );
}
