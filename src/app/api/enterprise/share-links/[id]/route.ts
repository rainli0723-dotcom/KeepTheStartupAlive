import { NextResponse } from "next/server";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });

  const { id } = await context.params;
  const db = getDb();
  const link = await db.reportShareLink.findFirst({ where: { id, tenantId: auth.tenant.id } });
  if (!link) return NextResponse.json({ error: "分享链接不存在或不属于当前企业" }, { status: 404 });

  const updated = await db.reportShareLink.update({
    where: { id },
    data: { status: "revoked", revokedAt: new Date() },
  });
  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "report.share_link.revoked",
    entityType: "ReportShareLink",
    entityId: id,
    metadata: { finaleId: link.finaleId },
  });

  return NextResponse.json({ link: updated });
}
