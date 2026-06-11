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
    focus: "Pricing, retention, enterprise sales, and product-led growth",
    metrics: ["ARR", "Churn", "CAC payback", "Expansion"],
  },
  {
    industry: "AI Product",
    focus: "Model cost, reliability, evaluation, and data governance",
    metrics: ["Inference cost", "Latency", "Quality score", "Risk level"],
  },
  {
    industry: "Consumer",
    focus: "Acquisition channels, activation, community, and monetization",
    metrics: ["Activation", "Retention", "LTV", "Payback"],
  },
  {
    industry: "Enterprise Service",
    focus: "Delivery quality, contracts, utilization, and account expansion",
    metrics: ["Gross margin", "Utilization", "SLA", "Renewal"],
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
        title="Industry Templates"
        description="Use industry scenario templates to pressure-test financing, pricing, growth, delivery, governance, and crisis decisions."
        action={<Link className="glass-primary-button px-4 py-2 text-sm" href="/scenarios/new">New Scenario</Link>}
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
        <EmptyState title="No scenarios yet" description="Create a scenario to define the events, decisions, conditions, and outcomes used in simulations." />
      )}
    </AppShell>
  );
}
