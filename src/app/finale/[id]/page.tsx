import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import { FinaleDetailClient } from "@/components/finale-detail-client";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { getDb } from "@/lib/db";
import { parseJson, parseInteractionLog } from "@/lib/domain";
import type { FinaleReport } from "@/lib/finale";

export const dynamic = "force-dynamic";

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

export default async function FinaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  const { id } = await params;
  const db = getDb();

  const finaleRows = await db.$queryRaw<FinaleRow[]>`
    SELECT * FROM SimulationFinale WHERE id = ${id}
  `;
  const finaleRow = finaleRows[0];
  if (!finaleRow) notFound();

  const meetings = await db.strategyMeeting.findMany({
    where: { workspaceId: finaleRow.workspaceId },
    orderBy: { cycle: "asc" },
    include: { businessEvent: true, decisionOptions: true },
  });

  const finale = {
    id: finaleRow.id,
    outcomeType: finaleRow.outcomeType,
    title: finaleRow.title,
    summary: finaleRow.summary,
    score: finaleRow.score,
    keyDrivers: parseStringArray(finaleRow.keyDrivers),
    decisionTrace: parseStringArray(finaleRow.decisionTrace),
    alternativeEndings: parseStringArray(finaleRow.alternativeEndings),
    nextActions: parseStringArray(finaleRow.nextActions),
  };

  return (
    <AppShell>
      <PageHeader
        title="复盘报告"
        description={`${finaleRow.completedCycles} 轮经营周期 · 结局：${finaleRow.title}`}
      />
      <FinaleDetailClient
        finale={finale as FinaleReport & { id: string; completedCycles: number }}
        meetings={meetings.map((m) => ({
          id: m.id,
          cycle: m.cycle,
          chair: m.chair,
          agenda: m.agenda,
          conclusion: m.conclusion,
          businessEvent: m.businessEvent
            ? { title: m.businessEvent.title, description: m.businessEvent.description, eventType: m.businessEvent.eventType }
            : null,
          participantViews: parseJson(m.participantViews, []),
          decisionOptions: m.decisionOptions.map((o) => ({
            id: o.id,
            title: o.title,
            recommendation: o.recommendation,
            upside: o.upside,
            risk: o.risk,
            resourceNeed: o.resourceNeed,
          })),
          userInput: m.userInput,
          interactions: parseInteractionLog(m.userInput),
        }))}
      />
    </AppShell>
  );
}

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}