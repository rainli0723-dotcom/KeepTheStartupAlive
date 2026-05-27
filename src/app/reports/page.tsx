import Link from "next/link";
import { AppShell, EmptyState, PageHeader, Panel } from "@/components/app-shell";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await ensureDatabase();
  const meetings = await getDb().strategyMeeting.findMany({
    orderBy: { createdAt: "desc" },
    include: { workspace: { include: { organizationProfile: true } }, businessEvent: true, decisionOptions: true },
  });
  return (
    <AppShell>
      <PageHeader title="决策复盘报告" description="沉淀每个经营周期的事件、会议纪要、决策方案、风险收益和后续观察指标。" />
      {meetings.length ? (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Panel key={meeting.id} className="p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                    {meeting.workspace.organizationProfile.name} · Cycle {meeting.cycle}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{meeting.agenda}</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{meeting.conclusion}</p>
                </div>
                <Link className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold" href={`/meeting/${meeting.id}`}>
                  查看详情
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState title="尚无报告" description="推进经营周期后，会议与决策方案会自动进入报告中心。" />
      )}
    </AppShell>
  );
}
