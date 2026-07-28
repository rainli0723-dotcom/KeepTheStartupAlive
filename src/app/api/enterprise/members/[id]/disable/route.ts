import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/tenant";

/**
 * PATCH /api/enterprise/members/[id]/disable
 * Toggle member active/inactive status. Admin only.
 * Body: { disabled: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const disabled = Boolean(body.disabled);

  const db = getDb();
  const member = await db.tenantMember.findFirst({
    where: { id, tenantId: auth.tenant.id },
  });
  if (!member) {
    return NextResponse.json({ error: "未找到该成员" }, { status: 404 });
  }

  // Cannot disable yourself
  if (member.userId === auth.user.id && disabled) {
    return NextResponse.json({ error: "不能停用自己的账号" }, { status: 400 });
  }

  // Update member status and associated user if exists
  if (member.userId) {
    await db.appUser.update({
      where: { id: member.userId },
      data: { status: disabled ? "inactive" : "active" },
    });
  }

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: disabled ? "member.disabled" : "member.enabled",
    entityType: "TenantMember",
    entityId: member.id,
    metadata: { memberEmail: member.email, memberName: member.name },
  });

  return NextResponse.json({ ok: true, disabled, memberId: id });
}
