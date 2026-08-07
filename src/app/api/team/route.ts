import { NextResponse } from "next/server";
import { z } from "zod";
import { canEdit, requireAuth } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { defaultCapabilities, normalizeCustomMetrics, validateCapabilities } from "@/lib/domain";
import { toJson } from "@/lib/serializers";
import { getActiveTenant, writeAuditLog } from "@/lib/tenant";
import { getActiveWorkspace } from "@/lib/workspace";

const teamMemberSchema = z.object({
  name: z.string().min(1),
  roleName: z.string().min(1),
  isRealMember: z.boolean().default(false),
  capabilities: z.record(z.enum(defaultCapabilities), z.number()),
  customMetrics: z.array(z.object({ label: z.string(), value: z.number() })).default([]),
  personality: z.string().default(""),
  communicationStyle: z.string().default(""),
  decisionPreference: z.string().default(""),
});

export async function GET() {
  const workspace = await getActiveWorkspace();
  return NextResponse.json({ members: workspace?.teamMembers ?? [] });
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if ("error" in session) return session.error;
  const auth = session.auth;
  if (!canEdit(auth.user.role)) {
    return NextResponse.json({ error: "当前账号没有编辑权限" }, { status: 403 });
  }

  const tenant = auth.tenant;
  const workspace = await getActiveWorkspace();
  if (!workspace || workspace.tenantId !== tenant.id) {
    return NextResponse.json({ error: "未找到当前企业空间下的沙盘工作区" }, { status: 404 });
  }

  const parsed = teamMemberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid team member payload", detail: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  try {
    validateCapabilities(input.capabilities);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Capabilities must be 0-100" }, { status: 400 });
  }

  const member = await getDb().teamMember.create({
    data: {
      workspaceId: workspace.id,
      name: input.name,
      roleName: input.roleName,
      isRealMember: input.isRealMember,
      capabilities: toJson(input.capabilities),
      customMetrics: toJson(normalizeCustomMetrics(input.customMetrics)),
      personality: input.personality,
      communicationStyle: input.communicationStyle,
      decisionPreference: input.decisionPreference,
    },
  });

  await writeAuditLog({
    tenantId: tenant.id,
    actor: auth?.user.email ?? "演示用户",
    action: "team.member.created",
    entityType: "TeamMember",
    entityId: member.id,
    metadata: { workspaceId: workspace.id, roleName: member.roleName },
  });

  return NextResponse.json({ member });
}
