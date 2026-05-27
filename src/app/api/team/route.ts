import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { defaultCapabilities, normalizeCustomMetrics, validateCapabilities } from "@/lib/domain";
import { toJson } from "@/lib/serializers";
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
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });
  const parsed = teamMemberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "角色表单数据不完整或格式不正确", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  try {
    validateCapabilities(input.capabilities);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "能力值必须在 0-100 之间" },
      { status: 400 },
    );
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
  return NextResponse.json({ member });
}
