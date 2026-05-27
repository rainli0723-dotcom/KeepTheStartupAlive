import Link from "next/link";
import { AppShell, EmptyState, MetricBar, PageHeader, Panel } from "@/components/app-shell";
import { getActiveWorkspaceForOverview } from "@/lib/workspace";
import { parseState } from "@/lib/serializers";
import { Users, BarChart3, Target, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

const metricLabels = {
  cashflow: "现金流",
  growth: "增长动能",
  teamPressure: "团队压力",
  technicalRisk: "技术风险",
  financingAttractiveness: "融资吸引力",
  survivalProbability: "生存概率",
};

export default async function SimulationPreparePage() {
  const workspace = await getActiveWorkspaceForOverview();
  if (!workspace) {
    return (
      <AppShell>
        <EmptyState title="尚未创建沙盘" description="请先创建组织工作区。" />
        <Link className="glass-primary-button mt-4 px-4 py-2 text-sm" href="/setup">
          去创建
        </Link>
      </AppShell>
    );
  }

  const state = parseState(workspace.organizationState);
  const latestMeeting = workspace.meetings[0] || null;
  const org = workspace.organizationProfile;
  const totalCycles = 20;
  const completedCycles = workspace.currentCycle - 1;
  const cycleProgress = Math.round((completedCycles / totalCycles) * 100);

  return (
    <AppShell>
      <PageHeader
        title="模拟进行中"
        description={`${org.industry} · ${org.product} · 已完成 ${completedCycles}/20 个经营周期`}
      />

      {/* 组织档案概览 */}
      <Panel className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">📋 组织档案</h2>
          <Link href="/organization" className="text-xs text-[var(--accent)] hover:underline">
            编辑组织档案
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">组织名称</p>
            <p className="mt-1 font-semibold text-white">{org.name}</p>
            <p className="mt-1 text-xs text-cyan-300">{org.stage}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">行业 · 产品</p>
            <p className="mt-1 font-semibold text-white">{org.industry}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{org.product}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">目标市场</p>
            <p className="mt-1 font-semibold text-white">{org.market}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">治理结构</p>
            <p className="mt-1 font-semibold text-white">{org.governanceStructure}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">收入情况</p>
            <p className="mt-1 font-semibold text-white">{org.revenue}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">现金流</p>
            <p className="mt-1 font-semibold text-white">{org.cashflow}%</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">团队规模</p>
            <p className="mt-1 font-semibold text-white">{org.teamSize} 人</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">数字孪生</p>
            <p className="mt-1 font-semibold text-white">{workspace.teamMembers.length} 个</p>
          </div>
        </div>
      </Panel>

      {/* 运行概览 */}
      <div className="grid gap-5 md:grid-cols-3 mt-5">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted)]">周期进度</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{completedCycles}/{totalCycles}</h3>
              <p className="mt-2 text-xs text-cyan-300 font-semibold">{cycleProgress}% 完成</p>
            </div>
            <BarChart3 size={32} className="opacity-20" />
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted)]">已发生事件</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{workspace.events.length}</h3>
              <p className="mt-2 text-xs text-[var(--muted)]">个事件</p>
            </div>
            <Users size={32} className="opacity-20" />
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted)]">已完成会议</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{workspace.meetings.length}</h3>
              <p className="mt-2 text-xs text-[var(--muted)]">轮会议</p>
            </div>
            <BarChart3 size={32} className="opacity-20" />
          </div>
        </Panel>
      </div>

      {/* 周期进度条 */}
      <Panel className="mt-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">经营周期进度</h3>
          <span className="text-sm text-[var(--muted)]">{completedCycles} / {totalCycles}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-300"
            style={{ width: `${cycleProgress}%` }}
          />
        </div>
      </Panel>

      {/* 组织状态指标 */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">组织状态</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(state).map(([key, value]) => (
              <MetricBar key={key} label={metricLabels[key as keyof typeof metricLabels]} value={value} />
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">进入会议</h2>
          <p className="mb-4 mt-2 text-sm leading-6 text-[var(--muted)]">
            基于组织状态和最近事件，进入经营会议推演。
          </p>
          <Link href="/simulation/run" className="glass-primary-button w-full block px-4 py-3 text-center text-sm">
            进入会议室
          </Link>
        </Panel>
      </div>

      {/* 参与角色和场景信息 */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">参与身份</h2>
          </div>
          <p className="text-sm text-[var(--muted)]">本轮用户参与身份</p>
          <p className="mt-2 rounded-md bg-white/5 px-3 py-2 font-semibold text-white">{workspace.userRole}</p>
        </Panel>
        <Panel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target size={18} className="text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">数字孪生团队</h2>
          </div>
          <p className="text-sm text-[var(--muted)]">本轮参会角色数量</p>
          <p className="mt-2 rounded-md bg-white/5 px-3 py-2 font-semibold text-white">{workspace.teamMembers.length} 个角色</p>
        </Panel>
      </div>

      {/* 当前选用的场景信息 */}
      {"selectedScenario" in workspace && workspace.selectedScenario && (
        <Panel className="mt-5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target size={18} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">当前选用的专项场景</h2>
          </div>
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/5 p-4">
            <h3 className="font-semibold text-white text-lg">{workspace.selectedScenario.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {workspace.selectedScenario.sandboxType} · {workspace.selectedScenario.stage}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{workspace.selectedScenario.description}</p>
          </div>
        </Panel>
      )}

      {/* 团队成员概览 */}
      {workspace.teamMembers.length > 0 && (
        <Panel className="mt-5 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">参会数字孪生</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workspace.teamMembers.map((member) => (
              <div key={member.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                <h3 className="font-semibold text-white">{member.name}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{member.roleName}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    member.isRealMember 
                      ? "bg-emerald-300/20 text-emerald-300" 
                      : "bg-slate-400/20 text-slate-300"
                  }`}>
                    {member.isRealMember ? "真实成员" : "虚拟角色"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 最近事件和会议结论 */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">最近事件</h2>
          <div className="space-y-3">
            {workspace.events.length ? (
              workspace.events.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-md border border-[var(--line)] bg-white/[0.03] p-3">
                  <div className="flex justify-between gap-3">
                    <h3 className="font-semibold text-white">{event.title}</h3>
                    <span className="font-mono text-xs text-[var(--muted)]">Cycle {event.cycle}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">还没有事件。完成一次经营会议后会在这里显示。</p>
            )}
          </div>
        </Panel>
        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">最近会议结论</h2>
          {latestMeeting ? (
            <div>
              <p className="text-sm text-[var(--muted)]">主持：{latestMeeting.chair}</p>
              <h3 className="mt-2 font-semibold text-white">{latestMeeting.agenda}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{latestMeeting.conclusion}</p>
              <Link className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]" href={`/meeting/${latestMeeting.id}`}>
                查看会议与决策方案
              </Link>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">会议记录将在完成经营周期后生成。</p>
          )}
        </Panel>
      </div>

      {/* 快速操作 */}
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Link href="/team" className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0f141b] p-5 transition-all hover:border-cyan-400/30 hover:bg-white/[0.05]">
          <div className="relative z-10">
            <h3 className="font-semibold text-white">管理数字孪生</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">编辑团队角色和能力</p>
          </div>
        </Link>
        <Link href="/scenarios" className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0f141b] p-5 transition-all hover:border-cyan-400/30 hover:bg-white/[0.05]">
          <div className="relative z-10">
            <h3 className="font-semibold text-white">专项场景</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">查看和选择模拟场景</p>
          </div>
        </Link>
        <Link href="/dashboard" className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0f141b] p-5 transition-all hover:border-cyan-400/30 hover:bg-white/[0.05]">
          <div className="relative z-10">
            <h3 className="font-semibold text-white">完整仪表板</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">查看详细的统计数据</p>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}