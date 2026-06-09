import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { parseState, toJson } from "@/lib/serializers";
import { getActiveWorkspace } from "@/lib/workspace";
import { getDb } from "@/lib/db";
import { buildTwentyRoundFinale, type FinaleReport } from "@/lib/finale";
import { callStructuredLlm, finaleSchema } from "@/lib/llm";

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

export async function GET() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ finale: null });

  const row = await getExistingFinale(workspace.id);
  if (!row) return NextResponse.json({ finale: null });

  const finale = serializeFinale(row);
  return NextResponse.json({
    finale,
    enriched: !row.rawReport.includes('"generatedBy":"fallback"'),
  });
}

export async function POST() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });

  const completedCycles = Math.max(0, workspace.currentCycle - 1);
  const forceGenerate = Array.isArray(workspace.events) && workspace.events.length > 0;
  if (completedCycles < 1 && !forceGenerate) {
    return NextResponse.json({ error: "需要完成至少 1 轮后才能生成复盘报告" }, { status: 409 });
  }

  const existing = await getExistingFinale(workspace.id);
  if (existing) {
    const finale = serializeFinale(existing);
    const enriched = !existing.rawReport.includes('"generatedBy":"fallback"');

    // If the existing finale is just the fallback, trigger enrichment in background
    if (!enriched) {
      const meetings = await getDb().strategyMeeting.findMany({
        where: { workspaceId: workspace.id },
        orderBy: [{ cycle: "asc" }, { createdAt: "asc" }],
        include: { businessEvent: true, decisionOptions: true },
      });
      enrichFinaleWithLlm(
        existing.id,
        workspace,
        meetings,
        parseState(workspace.organizationState),
        Math.max(0, workspace.currentCycle - 1),
      ).catch((err) => {
        console.warn("[finale] background enrichment failed:", err instanceof Error ? err.message : String(err));
      });
    }

    return NextResponse.json({ finale, enriched, reused: true });
  }

  const db = getDb();
  const meetings = await db.strategyMeeting.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ cycle: "asc" }, { createdAt: "asc" }],
    include: { businessEvent: true, decisionOptions: true },
  });

  const state = parseState(workspace.organizationState);

  // Build and save INSTANT fallback first (pure math, ~0ms)
  const fallbackInput = {
    state,
    completedCycles,
    events: meetings
      .map((m) => m.businessEvent)
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .map((e) => ({ eventType: e.eventType, title: e.title, description: e.description, cycle: e.cycle })),
    meetings: meetings.map((m) => ({ cycle: m.cycle, conclusion: m.conclusion })),
  };
  const fallback = finaleSchema.parse(buildTwentyRoundFinale(fallbackInput));
  const fallbackReport = { ...fallback, generatedBy: "fallback" as const };

  const id = randomUUID();
  const orgProfile = workspace.organizationProfile;

  await db.$executeRaw`
    INSERT INTO SimulationFinale (
      id, workspaceId, completedCycles, outcomeType, title, summary, score,
      keyDrivers, decisionTrace, alternativeEndings, nextActions, rawReport, createdAt
    )
    VALUES (
      ${id}, ${workspace.id}, ${completedCycles}, ${fallback.outcomeType}, ${fallback.title}, ${fallback.summary}, ${Math.round(fallback.score)},
      ${toJson(fallback.keyDrivers)}, ${toJson(fallback.decisionTrace)}, ${toJson(fallback.alternativeEndings)}, ${toJson(fallback.nextActions)}, ${toJson(fallbackReport)}, CURRENT_TIMESTAMP
    )
  `;

  if (orgProfile) {
    try {
      const archiveId = randomUUID();
      await db.$executeRaw`
        INSERT INTO OrganizationArchive (
          id, organizationProfileId, name, stage, industry, product, market,
          cashflow, revenue, teamSize, governanceStructure, keyRisks, finalOutcome, finalScore, simulationEndedAt
        )
        VALUES (
          ${archiveId}, ${orgProfile.id}, ${orgProfile.name}, ${orgProfile.stage}, ${orgProfile.industry},
          ${orgProfile.product}, ${orgProfile.market}, ${orgProfile.cashflow}, ${orgProfile.revenue},
          ${orgProfile.teamSize}, ${orgProfile.governanceStructure}, ${orgProfile.keyRisks},
          ${fallback.outcomeType}, ${Math.round(fallback.score)}, CURRENT_TIMESTAMP
        )
      `;
    } catch (err) {
      console.warn("[finale] Failed to archive organization:", err instanceof Error ? err.message : String(err));
    }
  }

  // Fire-and-forget: enrich with LLM in background
  enrichFinaleWithLlm(id, workspace, meetings, state, completedCycles).catch((err) => {
    console.warn("[finale] background LLM enrichment failed:", err instanceof Error ? err.message : String(err));
  });

  return NextResponse.json({
    finale: { id, ...fallback, completedCycles },
    enriched: false,
    reused: false,
  });
}

async function enrichFinaleWithLlm(
  finaleId: string,
  workspace: Awaited<ReturnType<typeof getActiveWorkspace>>,
  meetings: FinaleMeeting[],
  state: Record<string, number>,
  completedCycles: number,
) {
  if (!workspace) return;

  try {
    const enriched = await callStructuredLlm({
      schema: finaleSchema,
      timeoutMs: 180000,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "为商业模拟沙盘生成最终结算复盘报告。根据事件链和决策历史，判定组织结局。",
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
            timeline: (meetings ?? []).slice(0, 20).map((m) => {
              const event = m.businessEvent;
              return {
                cycle: m.cycle,
                event: event ? `${event.eventType}: ${event.title}` : null,
                agenda: m.agenda?.slice(0, 200),
                decision: m.conclusion?.slice(0, 300),
                options: m.decisionOptions.map((o) => o.title),
              };
            }),
            outputContract: {
              outcomeType: "bankruptcy | ipo | acquisition | stable_growth | restructure | shutdown | pivot | strategic_partnership | scale_up",
              title: "string - 结局标题",
              summary: "string - 300字以内复盘摘要",
              score: "number 0-100",
              keyDrivers: ["string - 3-5个关键驱动因素"],
              decisionTrace: ["string - 关键轮次选择"],
              alternativeEndings: ["string - 2-3个其他可能结局"],
              nextActions: ["string - 3-5个下一步行动建议"],
            },
            requirements: [
              "只返回 JSON object，无 Markdown",
              "结局必须体现事件链和决策的因果逻辑",
              "decisionTrace 引用具体轮次和选择",
              "语言面向企业复盘报告，务实专业",
            ],
          }),
        },
      ],
    });

    // Update the existing fallback record with LLM-enriched content
    const enrichedReport = { ...enriched, generatedBy: "llm" as const };
    const db = getDb();
    await db.$executeRaw`
      UPDATE SimulationFinale
      SET
        outcomeType = ${enriched.outcomeType},
        title = ${enriched.title},
        summary = ${enriched.summary},
        score = ${Math.round(enriched.score)},
        keyDrivers = ${toJson(enriched.keyDrivers)},
        decisionTrace = ${toJson(enriched.decisionTrace)},
        alternativeEndings = ${toJson(enriched.alternativeEndings)},
        nextActions = ${toJson(enriched.nextActions)},
        rawReport = ${toJson(enrichedReport)}
      WHERE id = ${finaleId}
    `;
  } catch (err) {
    // Silently fail - the fallback is already saved and visible to the user
    console.warn("[finale] LLM enrichment failed, keeping fallback:", err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, title, summary, keyDrivers, decisionTrace, alternativeEndings, nextActions } = body;
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const editableFields: string[] = [];
    const values: string[] = [];
    if (title !== undefined) { editableFields.push("title"); values.push(title); }
    if (summary !== undefined) { editableFields.push("summary"); values.push(summary); }
    if (keyDrivers !== undefined) { editableFields.push("keyDrivers"); values.push(JSON.stringify(keyDrivers)); }
    if (decisionTrace !== undefined) { editableFields.push("decisionTrace"); values.push(JSON.stringify(decisionTrace)); }
    if (alternativeEndings !== undefined) { editableFields.push("alternativeEndings"); values.push(JSON.stringify(alternativeEndings)); }
    if (nextActions !== undefined) { editableFields.push("nextActions"); values.push(JSON.stringify(nextActions)); }

    if (editableFields.length === 0) return NextResponse.json({ error: "没有可更新字段" }, { status: 400 });

    const setClause = editableFields.map((f) => `${f} = ?`).join(", ");
    await getDb().$executeRaw`UPDATE SimulationFinale SET ${setClause} WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
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

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safeJsonParse(value: string) {
  try { return JSON.parse(value); } catch { return {}; }
}
