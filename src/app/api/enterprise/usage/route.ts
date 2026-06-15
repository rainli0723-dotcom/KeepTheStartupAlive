import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";
import { getTenantUsageSnapshot } from "@/lib/usage-limits";

const usageLimitSchema = z.object({
  trialEndsAt: z.string().optional().or(z.literal("")),
  monthlyLlmCalls: z.number().int().min(0).max(100000),
  monthlyExports: z.number().int().min(0).max(100000),
  monthlyWorkspaces: z.number().int().min(0).max(100000),
});

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  return NextResponse.json(await getTenantUsageSnapshot(auth.tenant.id));
}

export async function PUT(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });

  const input = usageLimitSchema.parse(await request.json());
  const limits = await getDb().tenantUsageLimit.upsert({
    where: { tenantId: auth.tenant.id },
    update: {
      trialEndsAt: input.trialEndsAt ? new Date(input.trialEndsAt) : null,
      monthlyLlmCalls: input.monthlyLlmCalls,
      monthlyExports: input.monthlyExports,
      monthlyWorkspaces: input.monthlyWorkspaces,
    },
    create: {
      id: randomUUID(),
      tenantId: auth.tenant.id,
      trialEndsAt: input.trialEndsAt ? new Date(input.trialEndsAt) : null,
      monthlyLlmCalls: input.monthlyLlmCalls,
      monthlyExports: input.monthlyExports,
      monthlyWorkspaces: input.monthlyWorkspaces,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "tenant.usage_limits.updated",
    entityType: "TenantUsageLimit",
    entityId: limits.id,
    metadata: {
      monthlyLlmCalls: limits.monthlyLlmCalls,
      monthlyExports: limits.monthlyExports,
      monthlyWorkspaces: limits.monthlyWorkspaces,
      trialEndsAt: limits.trialEndsAt,
    },
  });

  return NextResponse.json({ limits });
}
