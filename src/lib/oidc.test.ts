import { describe, expect, it } from "vitest";
import { buildAuthorizationUrl, decodeJwtPayload, discoveryUrl, getSsoCallbackUrl } from "./oidc";

describe("OIDC SSO helpers", () => {
  it("builds discovery URL from issuer", () => {
    expect(discoveryUrl("https://login.example.com/tenant")).toBe("https://login.example.com/tenant/.well-known/openid-configuration");
    expect(discoveryUrl("https://login.example.com/.well-known/openid-configuration")).toBe("https://login.example.com/.well-known/openid-configuration");
  });

  it("builds callback URL from request origin", () => {
    expect(getSsoCallbackUrl("https://app.example.com/login")).toBe("https://app.example.com/api/auth/sso/callback");
  });

  it("builds authorization URL with required OIDC parameters", () => {
    const url = new URL(buildAuthorizationUrl({
      discovery: { authorization_endpoint: "https://login.example.com/auth", token_endpoint: "https://login.example.com/token" },
      clientId: "client-a",
      redirectUri: "https://app.example.com/api/auth/sso/callback",
      state: "state-a",
    }));
    expect(url.searchParams.get("client_id")).toBe("client-a");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("openid");
    expect(url.searchParams.get("state")).toBe("state-a");
  });

  it("decodes JWT payload without verifying signature", () => {
    const payload = Buffer.from(JSON.stringify({ email: "a@example.com" })).toString("base64url");
    expect(decodeJwtPayload(`header.${payload}.signature`)).toEqual({ email: "a@example.com" });
  });
});
