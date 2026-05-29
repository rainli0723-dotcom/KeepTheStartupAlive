import Link from "next/link";
import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { SimulationPrepForm } from "@/components/simulation-prep-form";
import { getActiveWorkspaceForSimulationPrep } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function SimulationConfigPage() {
  const workspace = await getActiveWorkspaceForSimulationPrep();
  if (!workspace) {
    return (
      <AppShell>
        <EmptyState title="尚未创建沙盘" description="请先创建组织工作区，再配置经营会议模拟。" />
        <Link className="glass-primary-button mt-4 px-4 py-2 text-sm" href="/setup">
          创建沙盘
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/simulation/start" className="text-sm text-[var(--accent)] hover:underline">
          ← 返回开始模拟
        </Link>
      </div>
      <PageHeader
        title="模拟配置"
        description="进入会议前，确认参与身份、数字孪生角色和本轮组织情况。确认后系统会生成事件与经营会议，并进入独立会议界面。"
      />
      <SimulationPrepForm
        organization={workspace.organizationProfile}
        teamMembers={workspace.teamMembers}
        scenarios={workspace.scenarios || []}
        selectedScenario={workspace.selectedScenario}
        currentRole={workspace.userRole}
      />
    </AppShell>
  );
}