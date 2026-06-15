import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { parseState, toJson } from "@/lib/serializers";
import { getActiveWorkspace } from "@/lib/workspace";
import { getDb } from "@/lib/db";
import type { FinaleReport } from "@/lib/finale";
import { callStructuredLlm, finaleSchema } from "@/lib/llm";
import { canEdit } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";
import { getActiveTenant, writeAuditLog } from "@/lib/tenant";

type FinaleRow = {
  id: string;
  workspaceId: string;
  completedCycles: number;
  outcomeType: string;
  title: string;
  summary: string;
  score: number;
  keyDrivers: string;
  decisionTrace: string;
  alternativeEndings: string;
  nextActions: string;
  rawReport: string;
  createdAt: string;
};

type FinaleMeeting = Prisma.StrategyMeetingGetPayload<{
  include: { businessEvent: true; decisionOptions: true };
}>;

type LlmFinaleReport = z.infer<typeof finaleSchema>;

export async function GET() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ finale: null });

  const row = await getExistingFinale(workspace.id);
  if (!row || !isLlmGenerated(row)) {
    return NextResponse.json({ finale: null, enriched: false });
  }

  return NextResponse.json({
    finale: serializeFinale(row),
    enriched: true,
  });
}

export async function POST() {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "未找到可生成结局的沙盘工作区" }, { status: 404 });
  }

  const completedCycles = Math.max(0, workspace.currentCycle - 1);
  const forceGenerate = Array.isArray(workspace.events) && workspace.events.length > 0;
  if (completedCycles < 1 && !forceGenerate) {
    return NextResponse.json({ error: "至少完成 1 轮经营周期后，才能生成结局" }, { status: 409 });
  }

  const existing = await getExistingFinale(workspace.id);
  if (existing && isLlmGenerated(existing)) {
    return NextResponse.json({ finale: serializeFinale(existing), enriched: true, reused: true });
  }

  const db = getDb();
  const meetings = await db.strategyMeeting.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ cycle: "asc" }, { createdAt: "asc" }],
    include: { businessEvent: true, decisionOptions: true },
  });

  const state = parseState(workspace.organizationState);
  let generated: LlmFinaleReport;
  try {
    generated = await generateFinaleWithLlm(workspace, meetings, state, completedCycles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM 结局生成失败";
    return NextResponse.json(
      { error: message, detail: "结局不会使用内置 fallback。请确认 LLM 配置可用后重试。" },
      { status: 503 },
    );
  }

  const id = existing?.id ?? randomUUID();
  if (existing) {
    await updateFinale(id, generated);
  } else {
    await insertFinale(id, workspace.id, completedCycles, generated);
  }

  await archiveOrganization(workspace, generated);

  return NextResponse.json({
    finale: { id, workspaceId: workspace.id, ...generated, score: Math.round(generated.score), completedCycles },
    enriched: true,
    reused: false,
  });
}

async function generateFinaleWithLlm(
  workspace: NonNullable<Awaited<ReturnType<typeof getActiveWorkspace>>>,
  meetings: FinaleMeeting[],
  state: Record<string, number>,
  completedCycles: number,
) {
  return callStructuredLlm({
    schema: finaleSchema,
    timeoutMs: 180000,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          task: "为一个 To B 创业公司经营模拟生成最终结局报告。所有会展示给用户的结局标题、摘要、关键原因、决策路径、替代结局和下一步行动都必须由你生成。",
          organization: {
            name: workspace.organizationProfile.name,
            stage: workspace.organizationProfile.stage,
            industry: workspace.organizationProfile.industry,
            product: workspace.organizationProfile.product,
            market: workspace.organizationProfile.market,
          },
          finalMetrics: {
            cashflow: state.cashflow,
            growth: state.growth,
            teamPressure: state.teamPressure,
            technicalRisk: state.technicalRisk,
            financingAttractiveness: state.financingAttractiveness,
            survivalProbability: state.survivalProbability,
          },
          completedCycles,
          timeline: meetings.slice(0, 20).map((meeting) => ({
            cycle: meeting.cycle,
            event: meeting.businessEvent
              ? {
                  type: meeting.businessEvent.eventType,
                  title: meeting.businessEvent.title,
                  description: meeting.businessEvent.description.slice(0, 400),
                }
              : null,
            agenda: meeting.agenda?.slice(0, 300),
            decision: meeting.conclusion?.slice(0, 400),
            options: meeting.decisionOptions.map((option) => ({
              title: option.title,
              recommendation: option.recommendation.slice(0, 240),
              risk: option.risk.slice(0, 180),
            })),
          })),
          outputContract: {
            outcomeType:
              "one of: bankruptcy, ipo, acquisition, stable_growth, restructure, shutdown, pivot, strategic_partnership, scale_up",
            title: "string",
            summary: "string, 250-450 Chinese characters",
            score: "number 0-100",
            keyDrivers: ["3-5 strings, explain why this ending happened"],
            decisionTrace: ["3-6 strings, connect important decisions to consequences"],
            alternativeEndings: ["2-3 strings, plausible other endings and what would have changed them"],
            nextActions: ["3-5 strings, concrete next actions for the management team"],
          },
          requirements: [
            "只返回 JSON object，不要 Markdown",
            "不要使用游戏化表达",
            "结局必须基于 timeline 和 finalMetrics，不要写成通用模板",
            "decisionTrace 必须引用具体轮次或具体决策",
            "summary 必须像正式经营复盘，不要像宣传文案",
          ],
        }),
      },
    ],
  });
}

async function insertFinale(
  id: string,
  workspaceId: string,
  completedCycles: number,
  finale: LlmFinaleReport,
) {
  const report = { ...finale, generatedBy: "llm" as const };
  await getDb().$executeRaw`
    INSERT INTO SimulationFinale (
      id, workspaceId, completedCycles, outcomeType, title, summary, score,
      keyDrivers, decisionTrace, alternativeEndings, nextActions, rawReport, createdAt
    )
    VALUES (
      ${id}, ${workspaceId}, ${completedCycles}, ${finale.outcomeType}, ${finale.title}, ${finale.summary}, ${Math.round(finale.score)},
      ${toJson(finale.keyDrivers)}, ${toJson(finale.decisionTrace)}, ${toJson(finale.alternativeEndings)}, ${toJson(finale.nextActions)}, ${toJson(report)}, CURRENT_TIMESTAMP
    )
  `;
}

async function updateFinale(id: string, finale: LlmFinaleReport) {
  const report = { ...finale, generatedBy: "llm" as const };
  await getDb().$executeRaw`
    UPDATE SimulationFinale
    SET
      outcomeType = ${finale.outcomeType},
      title = ${finale.title},
      summary = ${finale.summary},
      score = ${Math.round(finale.score)},
      keyDrivers = ${toJson(finale.keyDrivers)},
      decisionTrace = ${toJson(finale.decisionTrace)},
      alternativeEndings = ${toJson(finale.alternativeEndings)},
      nextActions = ${toJson(finale.nextActions)},
      rawReport = ${toJson(report)}
    WHERE id = ${id}
  `;
}

async function archiveOrganization(
  workspace: NonNullable<Awaited<ReturnType<typeof getActiveWorkspace>>>,
  finale: LlmFinaleReport,
) {
  const orgProfile = workspace.organizationProfile;
  if (!orgProfile) return;

  try {
    const archiveId = randomUUID();
    await getDb().$executeRaw`
      INSERT INTO OrganizationArchive (
        id, organizationProfileId, name, stage, industry, product, market,
        cashflow, revenue, teamSize, governanceStructure, keyRisks, finalOutcome, finalScore, simulationEndedAt
      )
      VALUES (
        ${archiveId}, ${orgProfile.id}, ${orgProfile.name}, ${orgProfile.stage}, ${orgProfile.industry},
        ${orgProfile.product}, ${orgProfile.market}, ${orgProfile.cashflow}, ${orgProfile.revenue},
        ${orgProfile.teamSize}, ${orgProfile.governanceStructure}, ${orgProfile.keyRisks},
        ${finale.outcomeType}, ${Math.round(finale.score)}, CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    console.warn("[finale] Failed to archive organization:", error instanceof Error ? error.message : String(error));
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getCurrentAuth();
    if (auth && !canEdit(auth.user.role)) {
      return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
    }
    const tenant = auth?.tenant ?? (await getActiveTenant());
    const body = await request.json();
    const { id, title, summary, keyDrivers, decisionTrace, alternativeEndings, nextActions } = body;
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const current = await getDb().simulationFinale.findFirst({
      where: { id, workspace: { tenantId: tenant.id } },
    });
    if (!current) return NextResponse.json({ error: "未找到结局报告" }, { status: 404 });

    const updated = {
      title: title ?? current.title,
      summary: summary ?? current.summary,
      keyDrivers: keyDrivers === undefined ? parseStringArray(current.keyDrivers) : normalizeEditableList(keyDrivers),
      decisionTrace: decisionTrace === undefined ? parseStringArray(current.decisionTrace) : normalizeEditableList(decisionTrace),
      alternativeEndings: alternativeEndings === undefined ? parseStringArray(current.alternativeEndings) : normalizeEditableList(alternativeEndings),
      nextActions: nextActions === undefined ? parseStringArray(current.nextActions) : normalizeEditableList(nextActions),
    };

    await getDb().simulationFinale.update({
      where: { id: current.id },
      data: {
        title: updated.title,
        summary: updated.summary,
        keyDrivers: toJson(updated.keyDrivers),
        decisionTrace: toJson(updated.decisionTrace),
        alternativeEndings: toJson(updated.alternativeEndings),
        nextActions: toJson(updated.nextActions),
      },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      actor: auth?.user.email ?? "demo",
      action: "report.updated",
      entityType: "SimulationFinale",
      entityId: current.id,
      metadata: { title: updated.title },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "保存结局报告失败" }, { status: 500 });
  }
}

function normalizeEditableList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getExistingFinale(workspaceId: string) {
  const rows = await getDb().$queryRaw<FinaleRow[]>`
    SELECT * FROM SimulationFinale
    WHERE workspaceId = ${workspaceId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function serializeFinale(row: FinaleRow) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    completedCycles: row.completedCycles,
    outcomeType: row.outcomeType,
    title: row.title,
    summary: row.summary,
    score: row.score,
    keyDrivers: parseStringArray(row.keyDrivers),
    decisionTrace: parseStringArray(row.decisionTrace),
    alternativeEndings: parseStringArray(row.alternativeEndings),
    nextActions: parseStringArray(row.nextActions),
    rawReport: safeJsonParse(row.rawReport) as FinaleReport,
    createdAt: row.createdAt,
  };
}

function isLlmGenerated(row: FinaleRow) {
  const rawReport = safeJsonParse(row.rawReport) as { generatedBy?: string };
  return rawReport.generatedBy === "llm";
}

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
