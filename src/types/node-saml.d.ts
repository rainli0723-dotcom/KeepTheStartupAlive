// Type declaration for @node-saml/node-saml
// Install: npm install @node-saml/node-saml
declare module "@node-saml/node-saml" {
  export interface SamlConfig {
    entryPoint: string;
    issuer: string;
    cert: string;
    callbackUrl?: string;
    signatureAlgorithm?: "sha1" | "sha256" | "sha512";
    acceptedClockSkewMs?: number;
    wantAuthnResponseSigned?: boolean;
    privateKey?: string;
  }

  export interface SamlProfile {
    nameID?: string | null;
    email?: string;
    displayName?: string;
    nameIDFormat?: string;
    attributes?: Record<string, unknown>;
  }

  export interface SamlValidationResult {
    profile: SamlProfile | null;
  }

  export class SAML {
    constructor(config: SamlConfig);
    getAuthorizeUrlAsync(
      relayState: string,
      host: string,
      options?: Record<string, unknown>
    ): Promise<string>;
    validatePostResponseAsync(
      body: Record<string, string>
    ): Promise<SamlValidationResult>;
  }
}
