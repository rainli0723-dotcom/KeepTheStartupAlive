import { notFound } from "next/navigation";
import { AppShell, MetricBar, PageHeader, Panel } from "@/components/app-shell";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { getDb } from "@/lib/db";
import { parseJson } from "@/lib/domain";

export const dynamic = "force-dynamic";

type ParticipantView = { roleName: string; view: string };
type Score = {
  cashflow: number;
  growth: number;
  teamPressure: number;
  technicalRisk: number;
  financingAttractiveness: number;
  survivalProbability: number;
};

const scoreLabels = {
  cashflow: "现金流",
  growth: "增长",
  teamPressure: "团队压力",
  technicalRisk: "技术风险",
  financingAttractiveness: "融资吸引力",
  survivalProbability: "生存概率",
};

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  const { id } = await params;
  const meeting = await getDb().strategyMeeting.findUnique({
    where: { id },
    include: { workspace: { include: { organizationProfile: true } }, businessEvent: true, decisionOptions: true },
  });
  if (!meeting) notFound();
  const views = parseJson<ParticipantView[]>(meeting.participantViews, []);
  return (
    <AppShell>
      <PageHeader
        title={`Cycle ${meeting.cycle} 经营会议`}
        description={`${meeting.workspace.organizationProfile.name} · 主持：${meeting.chair}`}
      />
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-5">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold">{meeting.businessEvent?.title ?? "专项事件"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{meeting.businessEvent?.description}</p>
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-3 text-lg font-semibold">角色观点</h2>
            <div className="space-y-3">
              {views.map((view, index) => (
                <div key={`${view.roleName}-${index}`} className="rounded-md border border-[var(--line)] p-3">
                  <div className="font-semibold">{view.roleName}</div>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{view.view}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold">会议结论</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{meeting.conclusion}</p>
          </Panel>
          {meeting.decisionOptions.map((option) => {
            const score = parseJson<Score>(option.impactScore, {
              cashflow: 50,
              growth: 50,
              teamPressure: 50,
              technicalRisk: 50,
              financingAttractiveness: 50,
              survivalProbability: 50,
            });
            return (
              <Panel key={option.id} className="p-5">
                <h3 className="text-lg font-semibold">{option.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.recommendation}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {Object.entries(score).map(([key, value]) => (
                    <MetricBar key={key} label={scoreLabels[key as keyof typeof scoreLabels]} value={value} />
                  ))}
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <p><b>收益：</b>{option.upside}</p>
                  <p><b>风险：</b>{option.risk}</p>
                  <p><b>资源：</b>{option.resourceNeed}</p>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
