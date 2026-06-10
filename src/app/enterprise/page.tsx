import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { getDb } from "@/lib/db";
import { getActiveTenant } from "@/lib/tenant";
import { parseJson } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function EnterprisePage() {
  const activeTenant = await getActiveTenant();
  const tenant = await getDb().enterpriseTenant.findUnique({
    where: { id: activeTenant.id },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      workspaces: { orderBy: { updatedAt: "desc" }, take: 6 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="企业管理"
        description="管理企业租户、成员、工作区归属和关键操作记录。"
      />

      {tenant ? (
        <div className="grid gap-5">
          <Panel className="p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Tenant</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{tenant.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">套餐：{tenant.plan} · 状态：{tenant.status}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric label="成员" value={tenant.members.length} />
                <Metric label="沙盘" value={tenant.workspaces.length} />
                <Metric label="审计" value={tenant.auditLogs.length} />
              </div>
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">成员与权限</h2>
              <div className="mt-4 space-y-3">
                {tenant.members.map((member) => (
                  <div key={member.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="font-semibold text-white">{member.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{member.email ?? "未绑定邮箱"} · {member.role}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">最近工作区</h2>
              <div className="mt-4 space-y-3">
                {tenant.workspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="font-semibold text-white">{workspace.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Cycle {Math.max(0, workspace.currentCycle - 1)}/20 · {workspace.status}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">审计日志</h2>
            <div className="mt-4 space-y-3">
              {tenant.auditLogs.map((log) => {
                const metadata = parseJson<Record<string, unknown>>(log.metadata, {});
                return (
                  <div key={log.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-sm font-semibold text-cyan-100">{log.action}</div>
                      <div className="text-xs text-[var(--muted)]">{new Date(log.createdAt).toLocaleString("zh-CN")}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      {log.entityType}{log.entityId ? ` · ${log.entityId}` : ""} · {log.actor}
                    </div>
                    {Object.keys(metadata).length ? (
                      <pre className="mt-2 overflow-auto rounded bg-black/20 p-2 text-xs text-slate-300">
                        {JSON.stringify(metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      ) : null}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
      <div className="font-mono text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-cyan-100">{label}</div>
    </div>
  );
}
