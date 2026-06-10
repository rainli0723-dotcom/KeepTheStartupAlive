import { NextResponse } from "next/server";
import { z } from "zod";
import { registerEnterpriseAccount } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1, "请输入姓名").max(80),
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
  tenantName: z.string().min(1, "请输入企业名称").max(120),
});

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const { user, tenant } = await registerEnterpriseAccount(input);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan, status: tenant.status },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
