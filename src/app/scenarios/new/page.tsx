import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { ScenarioForm } from "@/components/scenario-form";

export default async function NewScenarioPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const params = await searchParams;
  return (
    <AppShell>
      <PageHeader title="新建复杂场景" description="MVP 使用表单式节点编辑器，保证专项沙盘具备事件、决策和结果闭环。" />
      <Panel className="p-5">
        <ScenarioForm editId={params.edit} />
      </Panel>
    </AppShell>
  );
}
