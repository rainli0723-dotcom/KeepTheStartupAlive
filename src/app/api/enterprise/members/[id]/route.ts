import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const patchSchema = z.object({
  action: z.enum(["remove", "deactivate"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });

  const { id } = await context.params;
  const input = patchSchema.parse(await request.json());
  const db = getDb();
  const member = await db.tenantMember.findFirst({
    where: { id, tenantId: auth.tenant.id },
  });
  if (!member) return NextResponse.json({ error: "成员不存在或不属于当前企业" }, { status: 404 });
  if (member.userId === auth.user.id) {
    return NextResponse.json({ error: "不能停用或移除自己" }, { status: 400 });
  }

  if (member.userId) {
    await db.authSession.deleteMany({ where: { userId: member.userId } });
    await db.appUser.update({
      where: { id: member.userId },
      data: { status: "inactive" },
    });
  }

  if (input.action === "remove") {
    await db.tenantMember.delete({ where: { id: member.id } });
  }

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: input.action === "remove" ? "tenant.member.removed" : "tenant.member.deactivated",
    entityType: "TenantMember",
    entityId: member.id,
    metadata: { email: member.email, userId: member.userId },
  });

  return NextResponse.json({ ok: true });
}
