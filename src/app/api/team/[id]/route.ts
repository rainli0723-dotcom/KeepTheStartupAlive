import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { defaultCapabilities, normalizeCustomMetrics, validateCapabilities } from "@/lib/domain";
import { toJson } from "@/lib/serializers";

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
  const member = await getDb().teamMember.findUnique({
    where: { id },
    include: { distillationProfile: true, sourceDocuments: { orderBy: { createdAt: "desc" } } },
  });
  if (!member) return NextResponse.json({ error: "未找到成员" }, { status: 404 });
  return NextResponse.json({ member });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const input = teamMemberSchema.parse(await request.json());
  validateCapabilities(input.capabilities);
  const member = await getDb().teamMember.update({
    where: { id },
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
  return NextResponse.json({ member });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await getDb().teamMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
