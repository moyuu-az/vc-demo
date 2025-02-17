// src/lib/types/vc.ts
import { z } from "zod";

// Proof Schema
export const ProofSchema = z.object({
  type: z.string(),
  created: z.string(),
  verificationMethod: z.string(),
  proofPurpose: z.string(),
  proofValue: z.string(),
  jws: z.string().optional(),
  challenge: z.string().optional(),
  domain: z.string().optional(),
});

export type Proof = z.infer<typeof ProofSchema>;

// Credential Status Schema
export const CredentialStatusSchema = z.object({
  id: z.string(),
  type: z.string(),
  revocationListIndex: z.string().optional(),
  revocationListCredential: z.string().optional(),
});

export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;

// Credential Schema
export const CredentialSchemaSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export type CredentialSchema = z.infer<typeof CredentialSchemaSchema>;

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
  refreshService: z
    .object({
      id: z.string(),
      type: z.string(),
    })
    .optional(),
  termsOfUse: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
      }),
    )
    .optional(),
  evidence: z
    .array(
      z
        .object({
          id: z.string(),
          type: z.array(z.string()),
        })
        .and(z.record(z.string(), z.any())),
    )
    .optional(),
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
