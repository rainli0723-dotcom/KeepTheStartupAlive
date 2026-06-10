import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { getDb } from "@/lib/db";
import { getActiveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const tenant = await getActiveTenant();
  const workspaces = await getDb().simulationWorkspace.findMany({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
    include: {
      organizationProfile: true,
      _count: {
        select: {
          teamMembers: true,
          meetings: true,
          events: true,
        },
      },
    },
  });

  const items = workspaces.map((workspace, index) => ({
    id: workspace.id,
    name: workspace.name,
    status: workspace.status,
    currentCycle: workspace.currentCycle,
    organizationName: workspace.organizationProfile.name,
    industry: workspace.organizationProfile.industry,
    product: workspace.organizationProfile.product,
    updatedAt: workspace.updatedAt.toISOString(),
    isActive: index === 0,
    counts: workspace._count,
  }));

  return (
    <AppShell>
      <PageHeader
        title="沙盘工作区"
        description="管理多个客户、Demo 或内部推演沙盘，并切换当前正在操作的工作区。"
      />
      {items.length ? (
        <WorkspaceSwitcher workspaces={items} />
      ) : (
        <EmptyState title="暂无沙盘工作区" description="先创建一个组织沙盘，或从首页启动 3 分钟 Demo。" />
      )}
    </AppShell>
  );
}
