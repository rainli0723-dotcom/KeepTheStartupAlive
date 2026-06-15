import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decodeJwtPayload, exchangeOidcCode, fetchOidcDiscovery, fetchUserInfo, getSsoCallbackUrl, ssoStateCookieName } from "@/lib/oidc";
import { toJson } from "@/lib/serializers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return redirectWithError(`SSO 登录失败：${error}`);
  if (!code || !state) return redirectWithError("SSO 回调缺少 code 或 state");

  const cookieStore = await cookies();
  const statePayload = parseStateCookie(cookieStore.get(ssoStateCookieName)?.value);
  cookieStore.delete(ssoStateCookieName);
  if (!statePayload || statePayload.state !== state) {
    return redirectWithError("SSO state 校验失败，请重新登录");
  }

  const setting = await getDb().tenantSsoSetting.findFirst({
    where: { id: statePayload.settingId, status: "active", provider: { in: ["oidc", "microsoft", "google"] } },
  });
  if (!setting) return redirectWithError("未找到已启用的 OIDC SSO 配置");

  try {
    const discovery = await fetchOidcDiscovery(setting.issuer);
    const token = await exchangeOidcCode({
      discovery,
      clientId: setting.clientId,
      clientSecret: setting.clientSecret,
      redirectUri: getSsoCallbackUrl(request.url),
      code,
    });
    const idTokenClaims = token.id_token ? decodeJwtPayload(token.id_token) : {};
    const userInfo = token.access_token ? await fetchUserInfo(discovery, token.access_token) : {};
    const profile = { ...idTokenClaims, ...userInfo };
    const email = String(profile.email ?? "").trim().toLowerCase();
    const name = String(profile.name ?? profile.preferred_username ?? email.split("@")[0] ?? "SSO 用户");
    if (!email) return redirectWithError("SSO 返回结果缺少邮箱");

    const user = await findOrCreateSsoUser(setting.tenantId, email, name);
    await createSession(user.id);
    await getDb().auditLog.create({
      data: {
        id: randomUUID(),
        tenantId: setting.tenantId,
        actor: email,
        action: "auth.sso.login",
        entityType: "AppUser",
        entityId: user.id,
        metadata: toJson({ provider: setting.provider }),
      },
    });
    return NextResponse.redirect(new URL("/enterprise", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "SSO 登录失败";
    return redirectWithError(message);
  }
}

async function findOrCreateSsoUser(tenantId: string, email: string, name: string) {
  const db = getDb();
  const existing = await db.appUser.findFirst({ where: { tenantId, email, status: "active" } });
  if (existing) return existing;

  const member = await db.tenantMember.findFirst({ where: { tenantId, email } });
  const invitation = await db.tenantInvitation.findFirst({
    where: { tenantId, email, status: "pending", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!member && !invitation) {
    throw new Error("该邮箱尚未被企业邀请，不能使用 SSO 自动登录");
  }

  const role = member?.role ?? invitation?.role ?? "viewer";
  const user = await db.appUser.create({
    data: {
      id: randomUUID(),
      tenantId,
      name: member?.name ?? name,
      email,
      passwordHash: hashPassword(randomUUID()),
      role,
      status: "active",
    },
  });

  if (member) {
    await db.tenantMember.update({ where: { id: member.id }, data: { userId: user.id, name: user.name } });
  } else {
    await db.tenantMember.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId: user.id,
        name: user.name,
        email,
        role,
      },
    });
  }

  if (invitation) {
    await db.tenantInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
  }

  return user;
}

function redirectWithError(message: string) {
  const url = new URL("/login", process.env.KTSA_APP_URL || "http://127.0.0.1:3000");
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function parseStateCookie(value?: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { state?: unknown; settingId?: unknown };
    if (typeof parsed.state !== "string" || typeof parsed.settingId !== "string") return null;
    return { state: parsed.state, settingId: parsed.settingId };
  } catch {
    return null;
  }
}
