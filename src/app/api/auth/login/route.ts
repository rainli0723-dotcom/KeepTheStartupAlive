import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
});

export async function POST(request: Request) {
  const input = loginSchema.parse(await request.json());
  const email = input.email.trim().toLowerCase();
  const user = await getDb().appUser.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user || !verifyPassword(input.password, user.passwordHash) || user.status !== "active") {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  await createSession(user.id);
  await writeAuditLog({
    tenantId: user.tenantId,
    actor: user.email,
    action: "auth.login",
    entityType: "AppUser",
    entityId: user.id,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: { id: user.tenant.id, name: user.tenant.name, plan: user.tenant.plan, status: user.tenant.status },
  });
}
