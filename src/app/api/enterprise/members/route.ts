import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const memberSchema = z.object({
  name: z.string().min(1, "请输入成员姓名").max(80),
  email: z.string().email("请输入有效邮箱").optional().or(z.literal("")),
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录企业账号" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) {
    return NextResponse.json({ error: "只有管理员可以添加企业成员" }, { status: 403 });
  }

  const input = memberSchema.parse(await request.json());
  const member = await getDb().tenantMember.create({
    data: {
      id: randomUUID(),
      tenantId: auth.tenant.id,
      name: input.name.trim(),
      email: input.email ? input.email.trim().toLowerCase() : null,
      role: input.role,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "tenant.member.added",
    entityType: "TenantMember",
    entityId: member.id,
    metadata: { email: member.email, role: member.role },
  });

  return NextResponse.json({ member });
}
