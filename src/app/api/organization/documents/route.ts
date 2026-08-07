import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canEdit, requireAuth } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { extractTextFromUpload } from "@/lib/extract";
import { getActiveWorkspace } from "@/lib/workspace";
import { toJson } from "@/lib/serializers";

export async function GET() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ documents: [] });

  const documents = await getDb().organizationDocument.findMany({
    where: { organizationProfileId: workspace.organizationProfileId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if ("error" in session) return session.error;
  const auth = session.auth;
  if (!canEdit(auth.user.role)) {
    return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请先选择公司情况文档，或填写公司情况说明" }, { status: 400 });
  }
  const file = formData.get("file");
  const note = String(formData.get("note") ?? "").trim();
  const hasFile = file instanceof File && file.size > 0;

  if (!hasFile && !note) {
    return NextResponse.json({ error: "请先选择公司情况文档，或填写公司情况说明" }, { status: 400 });
  }

  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });

  let fileName = "公司情况补充说明";
  let mimeType = "text/plain";
  let extractedText = "";
  let sourceKind = "manual_note";

  if (hasFile) {
    fileName = file.name;
    mimeType = file.type || "application/octet-stream";
    try {
      extractedText = await extractTextFromUpload(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `文件解析失败：${errorMessage}` },
        { status: 400 },
      );
    }
    sourceKind = "company_document";
  }

  if (note) {
    extractedText = [extractedText, hasFile ? `补充说明：\n${note}` : note].filter(Boolean).join("\n\n");
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "请上传文档或填写公司情况说明" }, { status: 400 });
  }

  const document = await getDb().organizationDocument.create({
    data: {
      organizationProfileId: workspace.organizationProfileId,
      fileName,
      mimeType,
      extractedText,
      sourceKind,
    },
  });

  const job = await getDb().llmJob.create({
    data: {
      id: randomUUID(),
      tenantId: workspace.tenantId,
      task: "organization.analyze_profile",
      status: "queued",
      maxAttempts: 3,
      timeoutMs: 120000,
      payload: toJson({
        organizationProfileId: workspace.organizationProfileId,
        sourceDocumentId: document.id,
      }),
    },
  });
  void triggerJobWorker();

  return NextResponse.json({
    document,
    analysis: {
      status: "queued",
      jobId: job.id,
      summary: "公司情况已保存，AI 分析将在后台完成。",
      updatedFields: [],
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await getCurrentAuth();
  if (auth && !canEdit(auth.user.role)) {
    return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
  }

  const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "缺少 documentId" }, { status: 400 });

  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });

  const document = await getDb().organizationDocument.findFirst({
    where: {
      id: documentId,
      organizationProfileId: workspace.organizationProfileId,
    },
  });
  if (!document) return NextResponse.json({ error: "未找到当前企业空间下的资料" }, { status: 404 });

  await getDb().organizationDocument.delete({ where: { id: document.id } });
  return NextResponse.json({ ok: true });
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
