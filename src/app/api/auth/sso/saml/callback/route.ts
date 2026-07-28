import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { hashSessionToken } from "@/lib/auth";
import { loadTenantSamlConfig } from "@/lib/saml";
import { randomUUID } from "crypto";

const sessionCookieName = "ktsa_session";

/**
 * POST /api/auth/sso/saml/callback
 *
 * Handles the SAML Assertion Consumer Service (ACS).
 * The Identity Provider POSTs the SAML Response to this endpoint after
 * the user authenticates.
 */
export async function POST(req: NextRequest) {
  // Parse the SAML Response from the POST body
  let body: Record<string, string>;
  try {
    body = Object.fromEntries(await req.formData()) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "无法解析 SAML 响应。", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const samlResponse = body.SAMLResponse || body.SAMLart;
  if (!samlResponse) {
    return NextResponse.json({ error: "SAML 响应为空。", code: "MISSING_RESPONSE" }, { status: 400 });
  }

  try {
    // Dynamic import — install @node-saml/node-saml first
    const { SAML } = await import("@node-saml/node-saml");

    // We need to know which tenant this SAML response is for.
    // Since the SAML response contains an InResponseTo or the Issuer,
    // we first try to find a matching SSO config.
    // For the initial implementation, we iterate over active SAML configs.
    const db = getDb();
    const samlConfigs = await db.tenantSsoSetting.findMany({
      where: { provider: "saml", status: "active" },
    });

    let profile: { nameId?: string | null; email?: string; name?: string } | null = null;
    let matchedTenantId: string | null = null;

    for (const setting of samlConfigs) {
      const data = setting as Record<string, unknown>;
      const entryPoint = (data.samlEntryPoint as string) || (data.entryPoint as string);
      const cert = (data.samlCert as string) || (data.cert as string);
      if (!entryPoint || !cert) continue;

      try {
        const saml = new SAML({
          entryPoint,
          issuer: process.env.KTSA_APP_URL || "http://localhost:3000",
          cert,
          callbackUrl: `${process.env.KTSA_APP_URL || "http://localhost:3000"}/api/auth/sso/saml/callback`,
          signatureAlgorithm: "sha256",
          acceptedClockSkewMs: 60000,
        });

        const result = await saml.validatePostResponseAsync(body);
        profile = {
          nameId: result.profile?.nameID ?? null,
          email: result.profile?.email ?? result.profile?.nameID ?? "",
          name: result.profile?.displayName ?? result.profile?.nameID ?? "",
        };
        matchedTenantId = setting.tenantId;
        break; // Successfully validated
      } catch {
        // Try next config
        continue;
      }
    }

    if (!profile || !matchedTenantId) {
      return NextResponse.json(
        { error: "SAML 响应验证失败。请确认认证凭据有效。", code: "SAML_VALIDATION_FAILED" },
        { status: 401 }
      );
    }

    const email = profile.email || profile.nameId || "";
    const name = profile.name || email.split("@")[0] || "SAML User";

    // Find or create the AppUser
    let user = await db.appUser.findUnique({ where: { email } });
    if (!user) {
      // Auto-register: create user as editor of the matched tenant
      user = await db.appUser.create({
        data: {
          tenantId: matchedTenantId,
          name,
          email,
          passwordHash: `saml:${randomUUID()}`, // SAML users don't have a local password
          role: "editor",
          status: "active",
        },
      });
      // Also create a tenant member record
      await db.tenantMember.create({
        data: {
          tenantId: matchedTenantId,
          userId: user.id,
          name,
          email,
          role: "editor",
        },
      });
    }

    // Create session
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 86400000); // 14 days
    await db.authSession.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(sessionToken),
        expiresAt,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    // Redirect to enterprise space
    const appUrl = process.env.KTSA_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/enterprise`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "未知错误";
    console.error("[saml] Callback error:", msg);
    return NextResponse.json(
      { error: "SAML 认证处理失败。请联系管理员。", code: "SAML_CALLBACK_ERROR", details: msg },
      { status: 500 }
    );
  }
}
