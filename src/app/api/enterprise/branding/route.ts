import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveTenant } from "@/lib/tenant";
import { canEdit } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/enterprise/branding
 * Returns branding settings for the current tenant.
 */
export async function GET() {
  const tenant = await getActiveTenant();
  const branding = await loadBranding(tenant.id);
  return NextResponse.json(branding);
}

/**
 * PATCH /api/enterprise/branding
 * Updates branding settings (admin only).
 * Body: { logoUrl?, primaryColor?, accentColor?, companyName? }
 */
export async function PATCH(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const tenant = await getActiveTenant();
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  const db = getDb();
  const current = await loadBranding(tenant.id);
  const updated = {
    ...current,
    ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
    ...(body.primaryColor !== undefined ? { primaryColor: body.primaryColor } : {}),
    ...(body.accentColor !== undefined ? { accentColor: body.accentColor } : {}),
    ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
  };

  // Store branding as metadata on the tenant (using AuditLog as metadata store)
  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: auth.user.email,
      action: "branding.updated",
      entityType: "EnterpriseTenant",
      entityId: tenant.id,
      metadata: JSON.stringify(updated),
    },
  });

  return NextResponse.json(updated);
}

async function loadBranding(tenantId: string) {
  const db = getDb();
  const lastBranding = await db.auditLog.findFirst({
    where: { tenantId, action: "branding.updated" },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });

  if (lastBranding?.metadata) {
    try {
      return JSON.parse(lastBranding.metadata) as {
        logoUrl?: string;
        primaryColor?: string;
        accentColor?: string;
        companyName?: string;
      };
    } catch { /* fall through */ }
  }

  return {
    primaryColor: "#3370ff",
    accentColor: "#67e8f9",
  };
}

// Branding interface
export interface BrandingOptions {
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  companyName?: string;
}
