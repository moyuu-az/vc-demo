// src/lib/vc/revocation-utils.ts
import { v4 as uuidv4 } from "uuid";

export interface RevocationList {
  "@context": string[];
  id: string;
  type: string[];
  credentialSubject: {
    id: string;
    type: string;
    encodedList: string;
  };
}

export interface RevocationStatus {
  id: string;
  type: string;
  revocationListIndex: string;
  revocationListCredential: string;
}

export class RevocationService {
  private revocationList: Set<string> = new Set();
  private readonly listId: string;

  constructor() {
    this.listId = `urn:uuid:${uuidv4()}`;
  }

  public createRevocationListCredential(): RevocationList {
    return {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://w3id.org/vc-revocation-list-2020/v2",
      ],
      id: this.listId,
      type: ["VerifiableCredential", "RevocationList2021Credential"],
      credentialSubject: {
        id: `${this.listId}#list`,
        type: "RevocationList2020",
        encodedList: this.encodeList(),
      },
    };
  }

  public createRevocationStatus(credentialId: string): RevocationStatus {
    const index = this.getNextIndex();
    return {
      id: `${this.listId}#${index}`,
      type: "RevocationList2020Status",
      revocationListIndex: index.toString(),
      revocationListCredential: this.listId,
    };
  }

  public revokeCredential(credentialId: string): void {
    this.revocationList.add(credentialId);
  }

  public isRevoked(credentialId: string): boolean {
    return this.revocationList.has(credentialId);
  }

  private getNextIndex(): number {
    return this.revocationList.size;
  }

  private encodeList(): string {
    // In a real implementation, this would be a bit array encoded in base64
    // For demo purposes, we'll just return a mock encoded string
    return Buffer.from(Array.from(this.revocationList).join(",")).toString(
      "base64",
    );
  }
}

export const revocationService = new RevocationService();

function convertSDJWTtoVC(presentation: string): VerifiableCredential {
  const [jwt, ...disclosures] = presentation.split("~");
  const [headerB64, payloadB64] = jwt.split(".");

  // JWTペイロードをデコード
  const payload = JSON.parse(
    new TextDecoder().decode(base64urlToBuffer(payloadB64)),
  );

  // 開示された情報を解析
  const disclosedClaims: Record<string, any> = {
    id: payload.sub || payload.id,
    type: "PersonalInfo",
  };

  // 開示情報をクレデンシャルに追加
  for (const disclosure of disclosures) {
    const [, claim, value] = JSON.parse(
      new TextDecoder().decode(base64urlToBuffer(disclosure)),
    );
    disclosedClaims[claim] = value;
  }

  return {
    "@context": payload["@context"],
    id: payload.jti || payload.id,
    type: payload.type,
    issuer: payload.issuer,
    validFrom: payload.validFrom,
    validUntil: payload.validUntil,
    credentialSubject: disclosedClaims,
    proof: {
      type: "JsonWebSignature2020",
      created: new Date().toISOString(),
      jws: presentation,
    },
  };
}
