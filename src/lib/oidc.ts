import { createHash, randomBytes } from "node:crypto";

export const ssoStateCookieName = "ktsa_sso_state";

export type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  issuer?: string;
};

export function createSsoState() {
  return randomBytes(32).toString("base64url");
}

export function hashSsoState(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAppBaseUrl(requestUrl: string) {
  return process.env.KTSA_APP_URL?.replace(/\/$/, "") || new URL(requestUrl).origin;
}

export function getSsoCallbackUrl(requestUrl: string) {
  return `${getAppBaseUrl(requestUrl)}/api/auth/sso/callback`;
}

export function discoveryUrl(issuer: string) {
  const normalized = issuer.replace(/\/$/, "");
  if (normalized.endsWith("/.well-known/openid-configuration")) return normalized;
  return `${normalized}/.well-known/openid-configuration`;
}

export async function fetchOidcDiscovery(issuer: string): Promise<OidcDiscovery> {
  const response = await fetch(discoveryUrl(issuer), { cache: "no-store" });
  if (!response.ok) throw new Error("无法读取 OIDC discovery 配置");
  const body = await response.json();
  if (!body.authorization_endpoint || !body.token_endpoint) {
    throw new Error("OIDC discovery 缺少 authorization_endpoint 或 token_endpoint");
  }
  return body;
}

export function buildAuthorizationUrl(input: {
  discovery: OidcDiscovery;
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(input.discovery.authorization_endpoint);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeOidcCode(input: {
  discovery: OidcDiscovery;
  clientId: string;
  clientSecret?: string | null;
  redirectUri: string;
  code: string;
}) {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", input.code);
  body.set("redirect_uri", input.redirectUri);
  body.set("client_id", input.clientId);
  if (input.clientSecret) body.set("client_secret", input.clientSecret);

  const response = await fetch(input.discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("OIDC token 交换失败");
  return response.json() as Promise<{ access_token?: string; id_token?: string; token_type?: string }>;
}

export function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return {};
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(normalized, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export async function fetchUserInfo(discovery: OidcDiscovery, accessToken: string) {
  if (!discovery.userinfo_endpoint) return {};
  const response = await fetch(discovery.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return {};
  return response.json() as Promise<Record<string, unknown>>;
}
