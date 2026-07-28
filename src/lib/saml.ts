import { getDb } from "./db";

// SAML SP configuration placeholder
// SAML support uses @node-saml/node-saml
// Install: npm install @node-saml/node-saml
// This module exports helpers used by the SAML SSO API routes.

export interface SamlConfig {
  entryPoint: string;      // IdP SSO URL (Redirect Binding)
  issuer: string;          // SP Entity ID (our app URL)
  cert: string;            // IdP X.509 certificate (PEM format)
  nameIdFormat?: string;   // default: emailAddress
  wantAuthnResponseSigned?: boolean;
}

/**
 * Build the SP issuer from the app URL.
 */
export function buildSamlIssuer(): string {
  return (process.env.KTSA_APP_URL || process.env.VERCEL_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Build the SAML callback URL.
 */
export function buildSamlCallbackUrl(): string {
  return `${buildSamlIssuer()}/api/auth/sso/saml/callback`;
}

/**
 * Load SAML configuration for a tenant from the database.
 * Returns null if SAML is not configured for this tenant.
 */
export async function loadTenantSamlConfig(tenantId: string): Promise<SamlConfig | null> {
  const db = getDb();
  const setting = await db.tenantSsoSetting.findFirst({
    where: { tenantId, provider: "saml", status: "active" },
  });
  // SAML fields may be in the model's raw JSON or dedicated columns
  const data = setting as Record<string, unknown> | null;
  if (!data) return null;

  const entryPoint = (data.samlEntryPoint as string) || (data.entryPoint as string);
  const cert = (data.samlCert as string) || (data.cert as string);
  if (!entryPoint || !cert) return null;

  return {
    entryPoint,
    issuer: buildSamlIssuer(),
    cert,
    nameIdFormat: (data.samlNameIdFormat as string) || "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    wantAuthnResponseSigned: true,
  };
}

/**
 * Find a tenant by email domain for SSO discovery.
 */
export async function findTenantByEmailDomain(emailDomain: string) {
  const db = getDb();
  // Find SSO settings for tenants whose members have matching email domains
  const members = await db.tenantMember.findMany({
    where: { email: { contains: `@${emailDomain}` } },
    select: { tenantId: true },
    take: 1,
  });
  if (members.length === 0) return null;
  return members[0].tenantId;
}
