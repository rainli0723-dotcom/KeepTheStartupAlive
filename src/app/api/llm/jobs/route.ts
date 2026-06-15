import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toJson } from "@/lib/serializers";
import { assertTenantUsageAllowed } from "@/lib/usage-limits";

const jobSchema = z.object({
  task: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  timeoutMs: z.number().int().min(5000).max(300000).default(60000),
});

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Please login first" }, { status: 401 });

  const jobs = await getDb().llmJob.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Please login first" }, { status: 401 });

  const input = jobSchema.parse(await request.json());
  const quota = await assertTenantUsageAllowed(auth.tenant.id, "llm");
  if (!quota.ok) return NextResponse.json({ error: quota.reason }, { status: 402 });

  const job = await getDb().llmJob.create({
    data: {
      id: randomUUID(),
      tenantId: auth.tenant.id,
      task: input.task,
      payload: toJson(input.payload),
      maxAttempts: input.maxAttempts,
      timeoutMs: input.timeoutMs,
      status: "queued",
    },
  });

  return NextResponse.json({ job });
}
