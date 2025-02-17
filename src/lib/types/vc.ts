import { z } from "zod";

// Proof Schema
export const ProofSchema = z.object({
  type: z.string(),
  created: z.string(),
  verificationMethod: z.string(),
  proofPurpose: z.string(),
  proofValue: z.string().optional(),
  jws: z.string(),
  challenge: z.string().optional(),
  domain: z.string().optional(),
  cryptosuite: z.string(),
});

export type Proof = z.infer<typeof ProofSchema>;

// 以下は既存のコードをそのまま維持
export const CredentialStatusSchema = z.object({
  id: z.string(),
  type: z.string(),
  revocationListIndex: z.string().optional(),
  revocationListCredential: z.string().optional(),
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
  issuanceDate: z.string(),
  expirationDate: z.string().optional(),
  credentialSubject: z
    .object({
      id: z.string(),
    })
    .and(z.record(z.string(), z.any())),
  credentialStatus: CredentialStatusSchema.optional(),
  credentialSchema: CredentialSchemaSchema.optional(),
  refreshService: RefreshServiceSchema.optional(),
  termsOfUse: z.array(TermsOfUseSchema).optional(),
  evidence: z.array(EvidenceSchema).optional(),
  proof: ProofSchema.optional(),
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
