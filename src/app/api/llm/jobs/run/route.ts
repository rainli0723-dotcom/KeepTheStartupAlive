import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { callStructuredLlm } from "@/lib/llm";
import { parseJson } from "@/lib/domain";
import { toJson } from "@/lib/serializers";

const workerToken = process.env.LLM_WORKER_TOKEN;
const genericJobResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  actions: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  if (workerToken) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${workerToken}`) {
      return NextResponse.json({ error: "Unauthorized worker" }, { status: 401 });
    }
  }

  const db = getDb();
  await recoverTimedOutJobs();
  const job = await db.llmJob.findFirst({
    where: {
      status: { in: ["queued", "failed"] },
      attempts: { lt: 5 },
      runAfter: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!job || job.attempts >= job.maxAttempts) {
    return NextResponse.json({ job: null });
  }

  await db.llmJob.update({
    where: { id: job.id },
    data: { status: "running", attempts: { increment: 1 }, startedAt: new Date(), errorMessage: null },
  });

  try {
    const payload = parseJson<Record<string, unknown>>(job.payload, {});
    const result = await runJob(job.task, payload, job.tenantId, job.timeoutMs);
    const updated = await db.llmJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        result: toJson(result),
        completedAt: new Date(),
      },
    });
    return NextResponse.json({ job: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nextStatus = job.attempts + 1 >= job.maxAttempts ? "dead" : "failed";
    const runAfter = new Date(Date.now() + Math.min(60000, 1000 * 2 ** Math.max(0, job.attempts)));
    const updated = await db.llmJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        errorMessage: message.slice(0, 2000),
        runAfter,
      },
    });
    return NextResponse.json({ job: updated }, { status: nextStatus === "dead" ? 500 : 202 });
  }
}

async function recoverTimedOutJobs() {
  const timeoutCutoff = new Date(Date.now() - Number(process.env.LLM_JOB_RECOVERY_MS ?? 120000));
  await getDb().llmJob.updateMany({
    where: {
      status: "running",
      startedAt: { lt: timeoutCutoff },
    },
    data: {
      status: "failed",
      errorMessage: "Job recovered after worker timeout.",
      runAfter: new Date(),
    },
  });
}

async function runJob(task: string, payload: Record<string, unknown>, tenantId: string | null, timeoutMs: number) {
  if (task !== "llm.echo_structured") {
    throw new Error(`Unsupported LLM job task: ${task}`);
  }

  return callStructuredLlm({
    schema: genericJobResultSchema,
    task,
    tenantId,
    timeoutMs,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Summarize the queued payload into a structured operational note.",
          payload,
          outputContract: {
            title: "string",
            summary: "string",
            actions: ["string"],
          },
        }),
      },
    ],
  });
}
