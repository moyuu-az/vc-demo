import { z } from "zod";

// Proof Schema
export const ProofSchema = z.object({
  type: z.string(),
  created: z.string(),
  verificationMethod: z.string(),
  proofPurpose: z.string(),
  // cryptosuite は Data Integrity Proof v2 では必須です
  cryptosuite: z.string(),
  // proofValue は Data Integrity Proof v2 では必須です
  proofValue: z.string(),
  // jws は Data Integrity Proof v2 では非推奨になりました
  jws: z.string().optional(),
  challenge: z.string().optional(),
  domain: z.string().optional(),
});

export type Proof = z.infer<typeof ProofSchema>;

// 以下は既存のコードをそのまま維持
export const CredentialStatusSchema = z.object({
  id: z.string(),
  type: z.literal("StatusList2021Entry"),
  statusPurpose: z.union([z.literal("revocation"), z.literal("suspension")]),
  // Status List 2023 の新しいフィールド
  statusListIndex: z.string(),
  statusListCredential: z.string(),
});

export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;

export const CredentialSchemaSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export type CredentialSchema = z.infer<typeof CredentialSchemaSchema>;

export const EvidenceSchema = z
  .object({
    id: z.string(),
    type: z.array(z.string()),
    verifier: z.string(),
    evidenceDocument: z.string(),
    subjectPresence: z.string(),
    documentPresence: z.string(),
    verificationMethod: z.string(),
  })
  .and(z.record(z.string(), z.any()));

export const RefreshServiceSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export const TermsOfUseSchema = z.object({
  type: z.string(),
  id: z.string(),
});

// Verifiable Credential Schema
export const VerifiableCredentialSchema = z.object({
  "@context": z.array(z.string()),
  id: z.string(),
  type: z.array(z.string()),
  issuer: z.object({
    id: z.string(),
    name: z.string().optional(),
    image: z.string().optional(),
  }),
  issuanceDate: z.string().optional(),
  validFrom: z.string(),
  validUntil: z.string().optional(),
  credentialSubject: z
    .object({
      id: z.string(),
      type: z.string(),
    })
    .catchall(z.any())
    .and(z.record(z.string(), z.any())),
  credentialStatus: CredentialStatusSchema.optional(),
  credentialSchema: CredentialSchemaSchema.optional(),
  refreshService: RefreshServiceSchema.optional(),
  termsOfUse: z.array(TermsOfUseSchema).optional(),
  evidence: z.array(EvidenceSchema).optional(),
  proof: ProofSchema.optional(),
  style: z
    .object({
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
    })
    .optional(),
});

export type VerifiableCredential = z.infer<typeof VerifiableCredentialSchema>;

// Authorization Request Schema
export const AuthorizationRequestSchema = z.object({
  type: z.string(),
  credentialType: z.array(z.string()),
  issuer: z.object({
    id: z.string(),
    name: z.string(),
  }),
  purpose: z.string(),
  timestamp: z.string(),
  requestId: z.string(),
  callbackUrl: z.string(),
  challenge: z.string().optional(),
  domain: z.string().optional(),
});

export type AuthorizationRequest = z.infer<typeof AuthorizationRequestSchema>;

// Authorization Response Schema
export const AuthorizationResponseSchema = z.object({
  requestId: z.string(),
  holder: z.string(),
  accepted: z.boolean(),
  timestamp: z.string(),
  proof: ProofSchema.optional(),
});

export type AuthorizationResponse = z.infer<typeof AuthorizationResponseSchema>;

export interface PersonalInfo {
  name: string;
  dateOfBirth: string;
  address: string;
  presentationFormat?: "sd-jwt" | "vp";
}

// 選択的開示のための型定義
export interface DisclosureRequest {
  requiredClaims: string[];
  optionalClaims: string[];
  purpose: string;
}

export interface DisclosureResponse {
  claims: Record<string, any>;
  proof: Proof;
}

export interface ErrorInjectionOptions {
  invalidSignature: boolean;
  expiredCredential: boolean;
  invalidIssuer: boolean;
  missingFields: boolean;
  revokedCredential: boolean;
}

// Verifiable Presentation型の定義
export interface VerifiablePresentation {
  "@context": string[];
  id: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof?: any;
}

export interface VerificationResult {
  isValid: boolean;
  checks: {
    schemaValid: boolean;
    notExpired: boolean;
    notRevoked: boolean;
    proofValid: boolean;
    issuerValid: boolean;
  };
  errors: string[];
}

export interface DetailedVerificationResult extends VerificationResult {
  rawCredential: VerifiableCredential;
  technicalDetails: {
    schema: {
      requiredFields: string[];
      optionalFields: string[];
    };
    timing: {
      validFrom: string;
      validUntil?: string;
      currentTime: string;
    };
    issuer?: {
      did: string;
      didDocument: any;
    };
    revocation?: {
      status: string;
      statusListCredential: string;
    };
    proof?: {
      type: string;
      created: string;
      verificationMethod: string;
      proofPurpose: string;
      proofValue: string;
      verificationDetails?: any;
    };
  };
  presentationFormat?: "sd-jwt" | "vp" | "vc";
}
