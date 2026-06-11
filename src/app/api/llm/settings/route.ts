import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toJson } from "@/lib/serializers";
import { writeAuditLog } from "@/lib/tenant";

const promptSchema = z.object({
  task: z.string().min(1),
  version: z.string().min(1).default("v1"),
  systemPrompt: z.string().min(20),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
});

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Please login first" }, { status: 401 });

  const [promptVersions, usage] = await Promise.all([
    getDb().promptVersion.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getDb().llmCallLog.aggregate({
      where: { tenantId: auth.tenant.id },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
      },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    promptVersions,
    usage: {
      calls: usage._count,
      promptTokens: usage._sum.promptTokens ?? 0,
      completionTokens: usage._sum.completionTokens ?? 0,
      totalTokens: usage._sum.totalTokens ?? 0,
      estimatedCostUsd: usage._sum.estimatedCostUsd ?? 0,
      activeModel: process.env.LLM_MODEL ?? "gpt-4.1-mini",
      modelSwitching: "Set LLM_MODEL, LLM_BASE_URL, and LLM_API_KEY per environment.",
    },
  });
}

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Please login first" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) return NextResponse.json({ error: "Admin permission required" }, { status: 403 });

  const input = promptSchema.parse(await request.json());
  const promptVersion = await getDb().promptVersion.upsert({
    where: {
      tenantId_task_version: {
        tenantId: auth.tenant.id,
        task: input.task,
        version: input.version,
      },
    },
    create: {
      tenantId: auth.tenant.id,
      task: input.task,
      version: input.version,
      systemPrompt: input.systemPrompt,
      outputSchema: toJson(input.outputSchema),
      status: "active",
      createdBy: auth.user.email,
    },
    update: {
      systemPrompt: input.systemPrompt,
      outputSchema: toJson(input.outputSchema),
      status: "active",
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "llm.prompt_version.upserted",
    entityType: "PromptVersion",
    entityId: promptVersion.id,
    metadata: { task: promptVersion.task, version: promptVersion.version },
  });

  return NextResponse.json({ promptVersion });
}
