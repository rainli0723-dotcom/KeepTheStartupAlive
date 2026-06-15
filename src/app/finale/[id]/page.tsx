import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import { FinaleDetailClient } from "@/components/finale-detail-client";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { getDb } from "@/lib/db";
import { parseJson } from "@/lib/domain";
import type { FinaleReport } from "@/lib/finale";
import { parseInteractionLog } from "@/lib/simulation-run";
import { getActiveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function FinaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  const { id } = await params;
  const db = getDb();
  const tenant = await getActiveTenant();

  const finaleRow = await db.simulationFinale.findFirst({
    where: { id, workspace: { tenantId: tenant.id } },
  });
  if (!finaleRow) notFound();

  const [meetings, comments] = await Promise.all([
    db.strategyMeeting.findMany({
      where: { workspaceId: finaleRow.workspaceId },
      orderBy: { cycle: "asc" },
      include: { businessEvent: true, decisionOptions: true },
    }),
    db.collaborationComment.findMany({
      where: { tenantId: tenant.id, finaleId: finaleRow.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const finale = {
    id: finaleRow.id,
    completedCycles: finaleRow.completedCycles,
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
        description={`${finaleRow.completedCycles} 轮模拟后的经营复盘 · 结局：${finaleRow.title}`}
      />
      <FinaleDetailClient
        finale={finale as FinaleReport & { id: string; completedCycles: number }}
        comments={comments.map((comment) => ({
          id: comment.id,
          author: comment.author,
          body: comment.body,
          status: comment.status,
          createdAt: comment.createdAt.toISOString(),
        }))}
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
