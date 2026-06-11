import { NextResponse } from "next/server";
import { z } from "zod";
import { registerEnterpriseAccount } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  tenantName: z.string().min(1, "Enterprise name is required").max(120),
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
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
