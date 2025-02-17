// src/lib/types/vc.ts

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

export interface CredentialStatus {
  id: string;
  type: string;
}

export interface CredentialSchema {
  id: string;
  type: string;
}

export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
    image?: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: any;
  };
  credentialStatus?: CredentialStatus;
  credentialSchema?: CredentialSchema;
  refreshService?: {
    id: string;
    type: string;
  };
  termsOfUse?: {
    id: string;
    type: string;
  }[];
  evidence?: {
    id: string;
    type: string[];
    [key: string]: any;
  }[];
  proof?: Proof;
}

export interface AuthorizationRequest {
  type: string;
  credentialType: string[];
  issuer: {
    id: string;
    name: string;
  };
  purpose: string;
  timestamp: string;
  requestId: string;
  callbackUrl: string;
}

export interface AuthorizationResponse {
  requestId: string;
  holder: string;
  accepted: boolean;
  timestamp: string;
}
