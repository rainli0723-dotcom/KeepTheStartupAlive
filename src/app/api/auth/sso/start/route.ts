import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { buildAuthorizationUrl, createSsoState, fetchOidcDiscovery, getSsoCallbackUrl, hashSsoState, ssoStateCookieName } from "@/lib/oidc";
import { toJson } from "@/lib/serializers";

const startSchema = z.object({
  email: z.string().email("请输入有效企业邮箱"),
});

export async function POST(request: Request) {
  const input = startSchema.parse(await request.json());
  const email = input.email.trim().toLowerCase();
  const domain = email.split("@")[1];
  if (!domain) return NextResponse.json({ error: "请输入企业邮箱" }, { status: 400 });

  const setting = await getDb().tenantSsoSetting.findFirst({
    where: {
      status: "active",
      provider: { in: ["oidc", "microsoft", "google"] },
      tenant: { users: { some: { email: { endsWith: `@${domain}` } } } },
    },
    include: { tenant: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!setting) {
    return NextResponse.json({ error: "没有找到该邮箱域名对应的已启用 SSO 配置" }, { status: 404 });
  }

  const discovery = await fetchOidcDiscovery(setting.issuer);
  const state = createSsoState();
  const callbackUrl = getSsoCallbackUrl(request.url);
  const cookieStore = await cookies();
  cookieStore.set(ssoStateCookieName, JSON.stringify({ state, settingId: setting.id }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  await getDb().auditLog.create({
    data: {
      tenantId: setting.tenantId,
      actor: email,
      action: "auth.sso.started",
      entityType: "TenantSsoSetting",
      entityId: setting.id,
      metadata: toJson({ provider: setting.provider, stateHash: hashSsoState(state) }),
    },
  });

  return NextResponse.json({
    redirectTo: buildAuthorizationUrl({
      discovery,
      clientId: setting.clientId,
      redirectUri: callbackUrl,
      state,
    }),
  });
}
