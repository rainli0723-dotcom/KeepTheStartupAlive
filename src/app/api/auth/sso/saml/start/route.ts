import { NextRequest, NextResponse } from "next/server";
import { loadTenantSamlConfig, findTenantByEmailDomain, buildSamlCallbackUrl } from "@/lib/saml";

/**
 * GET /api/auth/sso/saml/start?email=user@company.com
 *
 * Initiates the SAML SSO login flow.
 * 1. Looks up the tenant by email domain
 * 2. Loads the tenant's SAML configuration
 * 3. Builds a SAML AuthnRequest and redirects the user to the IdP
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "请提供企业邮箱地址。", code: "MISSING_EMAIL" }, { status: 400 });
  }

  const emailDomain = email.split("@")[1];
  if (!emailDomain) {
    return NextResponse.json({ error: "邮箱格式不正确。", code: "INVALID_EMAIL" }, { status: 400 });
  }

  // Find the tenant that has this email domain
  const tenantId = await findTenantByEmailDomain(emailDomain);
  if (!tenantId) {
    return NextResponse.json(
      { error: "未找到使用此邮箱域名的企业。请确认你的公司已配置 SSO。", code: "TENANT_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Load SAML config for this tenant
  const config = await loadTenantSamlConfig(tenantId);
  if (!config) {
    return NextResponse.json(
      { error: "你的企业尚未配置 SAML SSO，或配置未启用。请联系企业管理员。", code: "SAML_NOT_CONFIGURED" },
      { status: 404 }
    );
  }

  try {
    // Dynamic import — install: npm install @node-saml/node-saml
    const { SAML } = await import("@node-saml/node-saml");

    const saml = new SAML({
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      cert: config.cert,
      callbackUrl: buildSamlCallbackUrl(),
      signatureAlgorithm: "sha256",
      acceptedClockSkewMs: 60000,
    });

    const loginUrl = await saml.getAuthorizeUrlAsync("", buildSamlCallbackUrl(), {});

    // Redirect user to the Identity Provider
    return NextResponse.redirect(loginUrl);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "未知错误";
    console.error("[saml] Failed to build SAML request:", msg);
    return NextResponse.json(
      { error: "SAML 认证请求构建失败。请检查 SAML 配置。", code: "SAML_BUILD_ERROR", details: msg },
      { status: 500 }
    );
  }
}
