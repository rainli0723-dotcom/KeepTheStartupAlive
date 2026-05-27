import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
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

export async function GET() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ finale: null });

  const row = await getExistingFinale(workspace.id);
  return NextResponse.json({ finale: row ? serializeFinale(row) : null });
}

export async function POST() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });

  const completedCycles = Math.max(0, workspace.currentCycle - 1);
  // Allow generating finale at any point when user，主动结束
  const forceGenerate = Array.isArray(workspace.events) && workspace.events.length > 0;
  if (completedCycles < 1 && !forceGenerate) {
    return NextResponse.json({ error: "需要完成至少 1 轮后才能生成复盘报告" }, { status: 409 });
  }

  const existing = await getExistingFinale(workspace.id);
  if (existing) return NextResponse.json({ finale: serializeFinale(existing), reused: true });

  const db = getDb();
  const meetings = await db.strategyMeeting.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ cycle: "asc" }, { createdAt: "asc" }],
    include: { businessEvent: true, decisionOptions: true },
  });

  const state = parseState(workspace.organizationState);
  const fallback = finaleSchema.parse(buildTwentyRoundFinale({
    state,
    completedCycles,
    events: meetings
      .map((meeting) => meeting.businessEvent)
      .filter((event): event is NonNullable<typeof event> => Boolean(event))
      .map((event) => ({
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        cycle: event.cycle,
      })),
    meetings: meetings.map((meeting) => ({ cycle: meeting.cycle, conclusion: meeting.conclusion })),
  }));

  let report: z.infer<typeof finaleSchema>;
  try {
    report = await callStructuredLlm({
      schema: finaleSchema,
      fallback,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "为 To B 商业模拟沙盘生成 20 轮后的最终结算。结局必须由此前事件、会议主题、用户输入和决策方案共同决定。",
            organization: workspace.organizationProfile,
            finalState: state,
            completedCycles,
            history: meetings.slice(0, 20).map((meeting) => ({
              cycle: meeting.cycle,
              event: meeting.businessEvent
                ? {
                    type: meeting.businessEvent.eventType,
                    title: meeting.businessEvent.title,
                    description: meeting.businessEvent.description,
                    impact: meeting.businessEvent.impact,
                  }
                : null,
              agenda: meeting.agenda,
              userInput: meeting.userInput,
              conclusion: meeting.conclusion,
              decisions: meeting.decisionOptions.map((option) => ({
                title: option.title,
                recommendation: option.recommendation,
                upside: option.upside,
                risk: option.risk,
                resourceNeed: option.resourceNeed,
                impactScore: option.impactScore,
                nextIndicators: option.nextIndicators,
              })),
            })),
            outputContract: {
              outcomeType:
                "one of: bankruptcy, ipo, acquisition, stable_growth, restructure, shutdown, pivot, strategic_partnership, scale_up",
              title: "string, for example 破产清算、上市准备、被战略并购、稳态续航、重组转向",
              summary: "string",
              score: "number 0-100",
              keyDrivers: ["string"],
              decisionTrace: ["string"],
              alternativeEndings: ["string"],
              nextActions: ["string"],
            },
            requirements: [
              "只返回一个 JSON object，不要 Markdown",
              "结局必须体现历史选择和会议主题的因果链",
              "允许出现破产、上市、被并购、战略合作、重组、转型、关停、稳态续航等不同结局",
              "decisionTrace 要指出哪些轮次的选择把组织推向该结局",
              "alternativeEndings 要说明如果关键选择不同，可能出现哪些其他结局",
              "语言面向企业复盘报告，不使用游戏化表达",
            ],
          }),
        },
      ],
    });
  } catch {
    report = fallback;
  }

  const id = randomUUID();
  await db.$executeRaw`
    INSERT INTO SimulationFinale (
      id, workspaceId, completedCycles, outcomeType, title, summary, score,
      keyDrivers, decisionTrace, alternativeEndings, nextActions, rawReport, createdAt
    )
    VALUES (
      ${id}, ${workspace.id}, ${completedCycles}, ${report.outcomeType}, ${report.title}, ${report.summary}, ${Math.round(report.score)},
      ${toJson(report.keyDrivers)}, ${toJson(report.decisionTrace)}, ${toJson(report.alternativeEndings)}, ${toJson(report.nextActions)}, ${toJson(report)}, CURRENT_TIMESTAMP
    )
  `;

  const row = await getExistingFinale(workspace.id);
  return NextResponse.json({ finale: row ? serializeFinale(row) : { id, ...report, completedCycles }, reused: false });
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
  } catch (e) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
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
    rawReport: JSON.parse(row.rawReport) as FinaleReport,
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
