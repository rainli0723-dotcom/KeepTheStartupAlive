/**
 * Unified async job queue for LLM-heavy operations.
 *
 * Jobs are stored in the LlmJob table and processed by the LLM worker.
 * The frontend polls GET /api/jobs/:id for status updates.
 *
 * Supported tasks:
 * - business_cycle.generate  (cycles)
 * - finale.generate           (finale)
 * - organization.analyze_profile (org docs)
 * - team_member.distill       (distillation)
 */

import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { toJson } from "./serializers";

export type JobTask =
  | "business_cycle.generate"
  | "finale.generate"
  | "organization.analyze_profile"
  | "team_member.distill";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobResult {
  jobId: string;
  status: JobStatus;
  task: JobTask;
  progress?: string;       // Human-readable progress message
  result?: unknown;         // The actual result data (on success)
  error?: string;           // Error message (on failure)
  attempts: number;
  createdAt: string;
}

/**
 * Create a new background job. Returns immediately with job ID.
 * The actual work is done by the LLM worker (scripts/llm-worker.mjs).
 */
export async function enqueueJob(input: {
  task: JobTask;
  tenantId: string | null;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  timeoutMs?: number;
  progress?: string;
}): Promise<JobResult> {
  const db = getDb();
  const job = await db.llmJob.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      task: input.task,
      status: "queued",
      maxAttempts: input.maxAttempts ?? 3,
      timeoutMs: input.timeoutMs ?? 120000,
      payload: toJson({
        ...input.payload,
        _progress: input.progress || "任务已排队",
      }),
    },
  });

  // Trigger worker (fire-and-forget)
  triggerWorker().catch(() => {});

  return {
    jobId: job.id,
    status: "queued",
    task: input.task,
    progress: input.progress || "任务已排队，正在等待处理...",
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Poll job status. Returns current state.
 */
export async function getJobStatus(jobId: string): Promise<JobResult | null> {
  const db = getDb();
  const job = await db.llmJob.findUnique({ where: { id: jobId } });
  if (!job) return null;

  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(job.payload); } catch { /* ignore */ }

  return {
    jobId: job.id,
    status: job.status as JobStatus,
    task: job.task as JobTask,
    progress: (payload._progress as string) || getDefaultProgress(job.status, job.task as JobTask),
    result: job.result ? safeParse(job.result) : undefined,
    error: job.errorMessage || undefined,
    attempts: job.attempts,
    createdAt: job.createdAt.toISOString(),
  };
}

/**
 * Mark a job as running.
 */
export async function markJobRunning(jobId: string) {
  await getDb().llmJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date() },
  });
}

/**
 * Mark a job as completed with result.
 */
export async function markJobCompleted(jobId: string, result: unknown) {
  await getDb().llmJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      result: typeof result === "string" ? result : JSON.stringify(result),
      completedAt: new Date(),
    },
  });
}

/**
 * Mark a job as failed.
 */
export async function markJobFailed(jobId: string, error: string) {
  const db = getDb();
  const job = await db.llmJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const attempts = job.attempts + 1;
  const status = attempts >= job.maxAttempts ? "failed" : "queued";

  await db.llmJob.update({
    where: { id: jobId },
    data: {
      status,
      attempts,
      errorMessage: error,
      ...(status === "failed" ? { completedAt: new Date() } : {}),
    },
  });
}

function getDefaultProgress(status: string, task: string): string {
  if (status === "queued") return "排队中...";
  if (status === "running") {
    if (task === "business_cycle.generate") return "AI 正在生成经营事件和角色讨论...";
    if (task === "finale.generate") return "AI 正在分析 20 轮决策数据，生成复盘报告...";
    if (task === "organization.analyze_profile") return "AI 正在分析公司资料...";
    if (task === "team_member.distill") return "AI 正在学习角色资料，生成数字孪生画像...";
    return "处理中...";
  }
  if (status === "completed") return "完成";
  if (status === "failed") return "失败";
  return status;
}

function safeParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

async function triggerWorker() {
  const token = process.env.LLM_WORKER_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.KTSA_APP_URL || "http://127.0.0.1:3000";
  try {
    await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/jobs/run`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Worker will pick up the job on its next polling cycle
  }
}
