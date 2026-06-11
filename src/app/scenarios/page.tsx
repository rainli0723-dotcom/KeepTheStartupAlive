import Link from "next/link";
import { defaultScenarios } from "@/lib/domain";
import { AppShell, EmptyState, PageHeader, Panel } from "@/components/app-shell";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { ensureScenarios } from "@/lib/seed";
import { getDb } from "@/lib/db";
import { ScenariosList } from "@/components/scenarios-list";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const defaultScenarioNames = new Set(defaultScenarios.map((scenario) => scenario.name));

const industryTemplates = [
  {
    industry: "SaaS",
    focus: "定价、续费、企业销售和产品驱动增长",
    metrics: ["ARR", "流失率", "CAC 回收期", "扩张收入"],
  },
  {
    industry: "AI 产品",
    focus: "模型成本、稳定性、效果评估和数据治理",
    metrics: ["推理成本", "延迟", "质量评分", "风险等级"],
  },
  {
    industry: "消费产品",
    focus: "获客渠道、激活、社区和商业化",
    metrics: ["激活率", "留存率", "LTV", "回本周期"],
  },
  {
    industry: "企业服务",
    focus: "交付质量、合同、利用率和大客户扩张",
    metrics: ["毛利率", "利用率", "SLA", "续约率"],
  },
];

export default async function ScenariosPage() {
  await ensureDatabase();
  await ensureScenarios();
  const scenariosRaw = await getDb().scenario.findMany({
    orderBy: { updatedAt: "desc" },
    include: { nodes: { orderBy: { sortOrder: "asc" } } },
  });
  const scenarios = scenariosRaw.map((scenario) => ({
    ...scenario,
    isDefault: defaultScenarioNames.has(scenario.name),
  }));

  const workspace = await getActiveWorkspace();

  return (
    <AppShell>
      <PageHeader
        title="行业场景模板"
        description="使用行业场景模板，对融资、定价、增长、交付、治理和危机决策进行压力测试。"
        action={<Link className="glass-primary-button px-4 py-2 text-sm" href="/scenarios/new">新建场景</Link>}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {industryTemplates.map((template) => (
          <Panel key={template.industry} className="p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">{template.industry}</div>
            <p className="mt-3 min-h-16 text-sm leading-6 text-[var(--muted)]">{template.focus}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {template.metrics.map((metric) => (
                <span key={metric} className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200">
                  {metric}
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      {scenarios.length ? (
        <ScenariosList scenarios={scenarios} selectedScenarioId={workspace?.selectedScenarioId ?? undefined} />
      ) : (
        <EmptyState title="暂无场景" description="创建一个场景，用于定义模拟中的事件、决策、条件和结果。" />
      )}
    </AppShell>
  );
}
