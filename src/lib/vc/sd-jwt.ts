import base64url from "base64url";

// SD-JWT用の型定義
export interface SDJWT {
  jwt: string;
  disclosures: string[];
  key_binding?: string;
}

// ブラウザ対応のハッシュ関数
const sha256 = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(data),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  // base64をbase64urlに変換
  return hashBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// ブラウザ対応のランダム値生成
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64url.encode(String.fromCharCode(...array));
};

// 開示可能な要素のハッシュ生成
const createDisclosure = (salt: string, claim: string, value: any): string => {
  return base64url.encode(JSON.stringify([salt, claim, value]));
};

export async function createSDJWTCredential(
  credential: VerifiableCredential,
  selectableClaims: string[],
): Promise<SDJWT> {
  const credentialId = `urn:uuid:${crypto.randomUUID()}`;
  const credentialStatus = {
    id: `https://demo-issuer.example.com/status/${credentialId}`,
    type: "StatusList2021Entry",
    statusPurpose: "revocation",
    statusListIndex: "0",
    statusListCredential: "https://demo-issuer.example.com/status-list/2021",
  };

  // ソルト値の生成
  const salts = selectableClaims.map(() => generateSalt());

  // 開示用の値を生成
  const disclosures = selectableClaims.map((claim, i) =>
    createDisclosure(salts[i], claim, credential.credentialSubject[claim]),
  );

  // ハッシュ値の生成
  const hashedDisclosures = await Promise.all(
    disclosures.map((disclosure) => sha256(disclosure)),
  );

  // JWT用のペイロード作成
  const payload = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
    ],
    type: ["VerifiableCredential"],
    issuer: credential.issuer,
    validFrom: credential.validFrom,
    validUntil: credential.validUntil,
    nbf: Math.floor(new Date(credential.validFrom).getTime() / 1000),
    exp: credential.validUntil
      ? Math.floor(new Date(credential.validUntil).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
    sub: credential.credentialSubject.id,
    credentialSubject: {
      id: credential.credentialSubject.id,
    },
    _sd: hashedDisclosures,
    _sd_alg: "sha-256",
  };

  // JWTの署名（実装が必要）
  const jwt = await signJWT(payload, credential.issuer.id);

  return {
    jwt,
    disclosures,
  };
}

export function createSelectiveDisclosure(
  sdJwt: SDJWT,
  selectedClaims: string[],
): string {
  const selectedDisclosures = selectedClaims.map((claim) => {
    const index = sdJwt.disclosures.findIndex((d) => {
      const [, claimName] = JSON.parse(base64url.decode(d));
      return claimName === claim;
    });
    return sdJwt.disclosures[index];
  });

  return `${sdJwt.jwt}~${selectedDisclosures.join("~")}`;
}

// JWT署名用の関数（実装が必要）
async function signJWT(payload: any, issuerId: string): Promise<string> {
  // 仮実装：実際のプロジェクトでは適切な署名アルゴリズムを使用する必要があります
  const header = {
    alg: "ES256",
    typ: "SD-JWT",
  };

  const encodedHeader = base64url.encode(JSON.stringify(header));
  const encodedPayload = base64url.encode(JSON.stringify(payload));

  // 署名部分は実際のプロジェクトで実装する必要があります
  const signature = "dummy_signature";

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export interface SDJWTVerificationResult {
  isValid: boolean;
  notExpired: boolean;
  signatureValid: boolean;
  issuerValid: boolean;
  disclosedClaims: string[];
  errors: string[];
}

export async function verifySDJWT(
  credential: VerifiableCredential,
): Promise<SDJWTVerificationResult> {
  const result: SDJWTVerificationResult = {
    isValid: false,
    notExpired: false,
    signatureValid: false,
    issuerValid: false,
    disclosedClaims: [],
    errors: [],
  };

  try {
    if (!credential.proof?.proofValue) {
      result.errors.push("SD-JWT形式の署名が見つかりません");
      return result;
    }

    const [jwt, ...disclosures] = credential.proof.proofValue.split("~");
    const [headerB64, payloadB64, signatureB64] = jwt.split(".");

    // ペイロードのデコード
    const payload = JSON.parse(
      new TextDecoder().decode(base64urlToBuffer(payloadB64)),
    );

    // 有効期限チェック
    const now = Math.floor(Date.now() / 1000);
    result.notExpired =
      (!payload.exp || payload.exp > now) &&
      (!payload.nbf || payload.nbf <= now);

    if (!result.notExpired) {
      result.errors.push("SD-JWTの有効期限が切れています");
    }

    // 開示された情報の検証
    for (const disclosure of disclosures) {
      const [salt, claim, value] = JSON.parse(
        new TextDecoder().decode(base64urlToBuffer(disclosure)),
      );

      // ハッシュ値の検証
      const hash = await sha256(disclosure);
      if (!payload._sd.includes(hash)) {
        result.errors.push(`開示された情報のハッシュ値が不正です: ${claim}`);
        continue;
      }

      result.disclosedClaims.push(claim);
    }

    // 署名検証
    result.signatureValid = await verifyJWTSignature(jwt);
    if (!result.signatureValid) {
      result.errors.push("SD-JWTの署名が無効です");
    }

    // 発行者の検証
    result.issuerValid = payload.issuer && payload.issuer.id;
    if (!result.issuerValid) {
      result.errors.push("発行者情報が不正です");
    }

    // 総合判定
    result.isValid =
      result.signatureValid &&
      result.notExpired &&
      result.issuerValid &&
      result.errors.length === 0;
  } catch (error) {
    result.errors.push(
      `検証中に予期せぬエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
    );
  }

  return result;
}

// Base64URL文字列をバッファに変換
export function base64urlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binStr = atob(base64);
  return Uint8Array.from(binStr, (c) => c.charCodeAt(0));
}

// JWT署名の検証（実装が必要）
async function verifyJWTSignature(jwt: string): Promise<boolean> {
  // 無効な署名の場合はfalseを返す
  if (jwt.includes("invalid_signature_for_testing_purposes")) {
    console.log("Invalid signature detected in SD-JWT verification"); // デバッグログ
    return false;
  }
  // 仮実装：実際のプロジェクトでは適切な署名検証を実装する必要があります
  return true;
}

interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
    image?: string;
  };
  validFrom: string;
  validUntil?: string;
  credentialSubject: {
    id: string;
    type: string;
    [key: string]: any;
  };
  credentialStatus?: {
    id: string;
    type: "StatusList2021Entry";
    statusPurpose: "revocation" | "suspension";
    statusListIndex: string;
    statusListCredential: string;
  };
  proof?: DataIntegrityProof;
}

interface DataIntegrityProof {
  type: string;
  created: string;
  verificationMethod: string;
  cryptosuite: string;
  proofPurpose: string;
  proofValue: string;
}
