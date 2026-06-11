import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEditor } from "@/lib/access-control";
import { getDb } from "@/lib/db";
import { defaultCapabilities, normalizeCustomMetrics, validateCapabilities } from "@/lib/domain";
import { toJson } from "@/lib/serializers";
import { writeAuditLog } from "@/lib/tenant";
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
  const access = await requireEditor();
  if ("error" in access) return access.error;

  const workspace = await getActiveWorkspace();
  if (!workspace || workspace.tenantId !== access.auth.tenant.id) {
    return NextResponse.json({ error: "Workspace not found in this tenant" }, { status: 404 });
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
    tenantId: access.auth.tenant.id,
    actor: access.auth.user.email,
    action: "team.member.created",
    entityType: "TeamMember",
    entityId: member.id,
    metadata: { workspaceId: workspace.id, roleName: member.roleName },
  });

  return NextResponse.json({ member });
}
