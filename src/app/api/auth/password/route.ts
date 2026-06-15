import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAuth, hashPassword, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function PATCH(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const input = passwordSchema.parse(await request.json());
  const db = getDb();
  const user = await db.appUser.findFirst({
    where: { id: auth.user.id, tenantId: auth.tenant.id, status: "active" },
  });
  if (!user) return NextResponse.json({ error: "账号不存在或已停用" }, { status: 404 });
  if (!verifyPassword(input.currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
  }

  await db.appUser.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(input.newPassword) },
  });
  await db.authSession.deleteMany({ where: { userId: user.id } });
  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "auth.password.changed",
    entityType: "AppUser",
    entityId: user.id,
  });

  return NextResponse.json({ ok: true });
}
