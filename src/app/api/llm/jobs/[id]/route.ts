import { NextResponse } from "next/server";
import { z } from "zod";
import { canEdit } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

const actionSchema = z.object({
  action: z.enum(["retry"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!canEdit(auth.user.role)) return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });

  const { id } = await context.params;
  const input = actionSchema.parse(await request.json());
  if (input.action !== "retry") {
    return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
  }

  const job = await getDb().llmJob.findFirst({
    where: { id, tenantId: auth.tenant.id },
  });
  if (!job) return NextResponse.json({ error: "未找到当前企业空间下的后台任务" }, { status: 404 });

  const updated = await getDb().llmJob.update({
    where: { id: job.id },
    data: {
      status: "queued",
      errorMessage: null,
      runAfter: new Date(),
      startedAt: null,
      completedAt: null,
      attempts: 0,
    },
  });

  void triggerJobWorker();
  return NextResponse.json({ job: updated });
}

async function triggerJobWorker() {
  const token = process.env.LLM_WORKER_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
  try {
    await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/jobs/run`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    // The queued job remains available for the next worker run.
  }
}
