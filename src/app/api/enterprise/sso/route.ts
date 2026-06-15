import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const ssoSchema = z.object({
  provider: z.enum(["oidc", "saml", "microsoft", "google"]).default("oidc"),
  issuer: z.string().min(1).max(300),
  clientId: z.string().min(1).max(200),
  clientSecret: z.string().max(300).optional(),
  status: z.enum(["disabled", "testing", "active"]).default("testing"),
});

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const settings = await getDb().tenantSsoSetting.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, provider: true, issuer: true, clientId: true, status: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });

  const input = ssoSchema.parse(await request.json());
  const setting = await getDb().tenantSsoSetting.upsert({
    where: { tenantId_provider: { tenantId: auth.tenant.id, provider: input.provider } },
    update: {
      issuer: input.issuer.trim(),
      clientId: input.clientId.trim(),
      clientSecret: input.clientSecret?.trim() || undefined,
      status: input.status,
    },
    create: {
      id: randomUUID(),
      tenantId: auth.tenant.id,
      provider: input.provider,
      issuer: input.issuer.trim(),
      clientId: input.clientId.trim(),
      clientSecret: input.clientSecret?.trim() || null,
      status: input.status,
    },
    select: { id: true, provider: true, issuer: true, clientId: true, status: true },
  });

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "tenant.sso.updated",
    entityType: "TenantSsoSetting",
    entityId: setting.id,
    metadata: { provider: setting.provider, status: setting.status },
  });

  return NextResponse.json({ setting });
}
