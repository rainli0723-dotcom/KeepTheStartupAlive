import Link from "next/link";
import { AppShell, EmptyState, MetricBar, PageHeader, Panel } from "@/components/app-shell";
import { FinalePanel } from "@/components/finale-panel";
import { buildTwentyRoundFinale } from "@/lib/finale";
import { getActiveWorkspace } from "@/lib/workspace";
import { parseState } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const metricLabels = {
  cashflow: "现金流",
  growth: "增长动能",
  teamPressure: "团队压力",
  technicalRisk: "技术风险",
  financingAttractiveness: "融资吸引力",
  survivalProbability: "生存概率",
};

export default async function DashboardPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return (
      <AppShell>
        <EmptyState title="尚未创建沙盘" description="先创建一个组织工作区，系统会推荐角色并初始化经营状态。" />
        <Link className="glass-primary-button mt-4 px-4 py-2 text-sm" href="/setup">
          去创建
        </Link>
      </AppShell>
    );
  }

  const state = parseState(workspace.organizationState);
  const latestMeeting = workspace.meetings[0];
  const completedCycles = Math.max(0, workspace.currentCycle - 1);
  const isFinaleReady = completedCycles >= 20;
  const fallbackFinale = isFinaleReady
    ? buildTwentyRoundFinale({
        state,
        completedCycles,
        events: workspace.events,
        meetings: workspace.meetings,
      })
    : null;

  return (
    <AppShell>
      <PageHeader
        title={workspace.name}
        description={`${workspace.organizationProfile.industry} · ${workspace.organizationProfile.product} · 已完成 ${completedCycles}/20 个经营周期`}
      />

      {fallbackFinale ? <FinalePanel fallback={fallbackFinale} /> : null}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">组织状态</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(state).map(([key, value]) => (
              <MetricBar key={key} label={metricLabels[key as keyof typeof metricLabels]} value={value} />
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">{isFinaleReady ? "模拟已完成" : "启动下一轮会议"}</h2>
          <p className="mb-4 mt-2 text-sm leading-6 text-[var(--muted)]">
            {isFinaleReady
              ? "20 轮经营周期已经完成，系统会根据此前事件、会议主题和决策方案生成最终结算。"
              : "先确认参与身份、数字孪生角色和本轮组织情况，再启动经营会议。"}
          </p>
          {isFinaleReady ? (
            <Link href="/reports" className="glass-primary-button w-full px-4 py-3 text-sm">
              查看复盘报告
            </Link>
          ) : (
            <Link href="/simulation/config" className="glass-primary-button w-full px-4 py-3 text-sm">
              进入模拟配置
            </Link>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
