export interface ErrorInjectionOptions {
  invalidSignature: boolean;
  expiredCredential: boolean;
  invalidIssuer: boolean;
  missingFields: boolean;
  revokedCredential: boolean;
}
