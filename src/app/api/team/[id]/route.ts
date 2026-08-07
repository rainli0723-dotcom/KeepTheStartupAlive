import { NextResponse } from "next/server";
import { z } from "zod";
import { canEdit, requireAuth } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";
import { getScopedTeamMember } from "@/lib/access-control";
import { getDb } from "@/lib/db";
import { defaultCapabilities, normalizeCustomMetrics, validateCapabilities } from "@/lib/domain";
import { toJson } from "@/lib/serializers";
import { writeAuditLog } from "@/lib/tenant";

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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { member } = await getScopedTeamMember(id);
  if (!member) return NextResponse.json({ error: "未找到成员" }, { status: 404 });
  return NextResponse.json({ member });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await requireAuth();
  if ("error" in session) return session.error;
  const auth = session.auth;
  if (!canEdit(auth.user.role)) {
    return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
  }
  const { tenant, member: existing } = await getScopedTeamMember(id);
  if (!existing) return NextResponse.json({ error: "未找到成员" }, { status: 404 });

  const input = teamMemberSchema.parse(await request.json());
  validateCapabilities(input.capabilities);
  const member = await getDb().teamMember.update({
    where: { id: existing.id },
    data: {
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
    actor: auth.user.email,
    action: "team_member.updated",
    entityType: "TeamMember",
    entityId: member.id,
    metadata: { name: member.name, roleName: member.roleName },
  });
  return NextResponse.json({ member });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await requireAuth();
  if ("error" in session) return session.error;
  const auth = session.auth;
  if (!canEdit(auth.user.role)) {
    return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
  }
  const { tenant, member } = await getScopedTeamMember(id);
  if (!member) return NextResponse.json({ error: "未找到成员" }, { status: 404 });

  await getDb().teamMember.delete({ where: { id: member.id } });
  await writeAuditLog({
    tenantId: tenant.id,
    actor: auth.user.email,
    action: "team_member.deleted",
    entityType: "TeamMember",
    entityId: member.id,
    metadata: { name: member.name, roleName: member.roleName },
  });
  return NextResponse.json({ ok: true });
}
