import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { callStructuredLlm, organizationAnalysisSchema } from "@/lib/llm";
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
      errorMessage: "任务超时，已恢复为可重试状态。",
      runAfter: new Date(),
    },
  });
}

async function runJob(task: string, payload: Record<string, unknown>, tenantId: string | null, timeoutMs: number) {
  if (task === "organization.analyze_profile") {
    return runOrganizationProfileAnalysis(payload, tenantId, timeoutMs);
  }

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
          task: "把排队任务内容整理成一份简短的运营说明。",
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

async function runOrganizationProfileAnalysis(payload: Record<string, unknown>, tenantId: string | null, timeoutMs: number) {
  const organizationProfileId = String(payload.organizationProfileId ?? "");
  if (!organizationProfileId) throw new Error("Missing organizationProfileId");

  const db = getDb();
  const org = await db.organizationProfile.findFirst({
    where: {
      id: organizationProfileId,
      ...(tenantId ? { workspaces: { some: { tenantId } } } : {}),
    },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });
  if (!org) throw new Error("Organization profile not found");

  const documentContexts = org.documents.map((doc) => ({
    title: doc.fileName,
    kind: doc.sourceKind,
    content: doc.extractedText.slice(0, 3000),
  }));

  const analysisResult = await callStructuredLlm({
    task: "organization.analyze_profile",
    tenantId,
    timeoutMs,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          action: "analyze_organization_profile",
          currentProfile: {
            name: org.name || "",
            stage: org.stage || "",
            industry: org.industry || "",
            product: org.product || "",
            market: org.market || "",
            cashflow: org.cashflow ?? 60,
            revenue: org.revenue || "",
            teamSize: org.teamSize ?? 1,
            governanceStructure: org.governanceStructure || "",
            keyRisks: org.keyRisks || "[]",
          },
          documents: documentContexts,
          instructions: [
            "从资料中提取真实公司信息，不要编造不存在的事实。",
            "如果资料不足，保留原字段，并在 summary 里说明信息不足。",
            "stage 必须是 opc、small_team、seed、growth、mature、incubator 之一。",
            "cashflow 必须是 0-100 的数字，表示现金流健康度。",
            "keyRisks 返回 3-6 个具体风险。",
            "只返回 JSON object，不要 Markdown。",
          ],
        }),
      },
    ],
    schema: organizationAnalysisSchema,
  });

  const riskArray = Array.isArray(analysisResult.keyRisks) ? analysisResult.keyRisks : [];
  await db.organizationProfile.update({
    where: { id: org.id },
    data: {
      name: analysisResult.name || org.name,
      stage: analysisResult.stage || org.stage,
      industry: analysisResult.industry || org.industry,
      product: analysisResult.product || org.product,
      market: analysisResult.market || org.market,
      cashflow: typeof analysisResult.cashflow === "number" ? analysisResult.cashflow : org.cashflow,
      revenue: analysisResult.revenue || org.revenue,
      teamSize: typeof analysisResult.teamSize === "number" ? analysisResult.teamSize : org.teamSize,
      governanceStructure: analysisResult.governanceStructure || org.governanceStructure,
      keyRisks: riskArray.length > 0 ? JSON.stringify(riskArray) : org.keyRisks,
    },
  });

  return {
    summary: analysisResult.summary ?? "",
    updatedFields: getUpdatedFields(org, analysisResult),
  };
}

function getUpdatedFields(
  org: { name: string; stage: string; industry: string; product: string; market: string; cashflow: number; revenue: string; teamSize: number; governanceStructure: string; keyRisks: string },
  analysis: Record<string, unknown>,
): string[] {
  const updated: string[] = [];
  const fieldLabels: Record<string, string> = {
    name: "企业名称",
    stage: "企业阶段",
    industry: "行业",
    product: "产品/服务",
    market: "目标市场",
    cashflow: "现金流健康度",
    revenue: "收入情况",
    teamSize: "团队规模",
    governanceStructure: "治理结构",
    keyRisks: "关键风险",
  };

  if (typeof analysis.name === "string" && analysis.name && analysis.name !== org.name) updated.push(fieldLabels.name);
  if (typeof analysis.stage === "string" && analysis.stage && analysis.stage !== org.stage) updated.push(fieldLabels.stage);
  if (typeof analysis.industry === "string" && analysis.industry && analysis.industry !== org.industry) updated.push(fieldLabels.industry);
  if (typeof analysis.product === "string" && analysis.product && analysis.product !== org.product) updated.push(fieldLabels.product);
  if (typeof analysis.market === "string" && analysis.market && analysis.market !== org.market) updated.push(fieldLabels.market);
  if (typeof analysis.cashflow === "number" && analysis.cashflow !== org.cashflow) updated.push(fieldLabels.cashflow);
  if (typeof analysis.revenue === "string" && analysis.revenue && analysis.revenue !== org.revenue) updated.push(fieldLabels.revenue);
  if (typeof analysis.teamSize === "number" && analysis.teamSize !== org.teamSize) updated.push(fieldLabels.teamSize);
  if (typeof analysis.governanceStructure === "string" && analysis.governanceStructure && analysis.governanceStructure !== org.governanceStructure) updated.push(fieldLabels.governanceStructure);
  if (Array.isArray(analysis.keyRisks) && analysis.keyRisks.length > 0) updated.push(fieldLabels.keyRisks);

  return updated;
}
