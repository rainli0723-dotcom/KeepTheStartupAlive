import { defaultScenarios } from "@/lib/domain";
import { toJson } from "@/lib/serializers";
import Link from "next/link";
import { AppShell, EmptyState, PageHeader, Panel } from "@/components/app-shell";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { ensureScenarios } from "@/lib/seed";
import { getDb } from "@/lib/db";
import { ScenariosList } from "@/components/scenarios-list";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const defaultScenarioNames = new Set(defaultScenarios.map((s) => s.name));

export default async function ScenariosPage() {
  await ensureDatabase();
  await ensureScenarios();
  const scenariosRaw = await getDb().scenario.findMany({
    orderBy: { updatedAt: "desc" },
    include: { nodes: { orderBy: { sortOrder: "asc" } } },
  });
  const scenarios = scenariosRaw.map((s) => ({
    ...s,
    isDefault: defaultScenarioNames.has(s.name),
  }));

  const workspace = await getActiveWorkspace();

  return (
    <AppShell>
      <PageHeader
        title="专项场景库"
        description="维护法务、融资、定价、市场竞争、组织管理、危机应对和增长策略等专项沙盘的事件流。"
        action={<Link className="glass-primary-button px-4 py-2 text-sm" href="/scenarios/new">新建场景</Link>}
      />
      {scenarios.length ? (
        <ScenariosList scenarios={scenarios} selectedScenarioId={workspace?.selectedScenarioId ?? undefined} />
      ) : (
        <EmptyState title="尚未创建场景" description="先建立一个表单式事件流，后续可扩展为拖拽画布。" />
      )}
    </AppShell>
  );
}
