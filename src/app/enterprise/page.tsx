import Link from "next/link";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { EnterpriseDangerZone } from "@/components/enterprise-danger-zone";
import { TenantMemberForm } from "@/components/tenant-member-form";
import { getCurrentAuth } from "@/lib/auth";
import { parseJson } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { getActiveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function EnterprisePage() {
  const auth = await getCurrentAuth();
  const activeTenant = await getActiveTenant();
  const tenant = await getDb().enterpriseTenant.findUnique({
    where: { id: activeTenant.id },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      workspaces: { orderBy: { updatedAt: "desc" }, take: 8 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 12 },
      llmCallLogs: { orderBy: { createdAt: "desc" }, take: 12 },
      llmJobs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="企业空间"
        description="管理企业账号、成员权限、工作区、LLM 运行记录和审计日志。"
        action={
          auth ? (
            <span className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50">
              {auth.user.name} · {formatRole(auth.user.role)}
            </span>
          ) : (
            <Link href="/login" className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15">
              登录
            </Link>
          )
        }
      />

      {tenant ? (
        <div className="grid gap-5">
          <Panel className="p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">企业租户</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{tenant.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  套餐：{formatPlan(tenant.plan)} · 状态：{formatStatus(tenant.status)}
                  {!auth ? " · Demo 企业" : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                <Metric label="成员" value={tenant.members.length} />
                <Metric label="工作区" value={tenant.workspaces.length} />
                <Metric label="审计" value={tenant.auditLogs.length} />
                <Metric label="LLM" value={tenant.llmCallLogs.length} />
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">成员与权限</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">支持管理员、编辑者和只读成员。</p>
              </div>
              {auth?.user.role === "admin" ? <TenantMemberForm /> : null}
              {auth?.user.role === "admin" ? (
                <Link href="/admin" className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                  管理后台
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tenant.members.map((member) => (
                <div key={member.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-3">
                  <div className="font-semibold text-white">{member.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{member.email ?? "未填写邮箱"}</div>
                  <div className="mt-2 inline-flex rounded-sm border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                    {formatRole(member.role)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">最近工作区</h2>
              <div className="mt-4 space-y-3">
                {tenant.workspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="font-semibold text-white">{workspace.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      第 {Math.max(0, workspace.currentCycle - 1)}/20 轮 · {formatStatus(workspace.status)}
                    </div>
                  </div>
                ))}
                {tenant.workspaces.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无工作区。</p> : null}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">LLM 调用日志</h2>
              <div className="mt-4 space-y-3">
                {tenant.llmCallLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-sm font-semibold text-cyan-100">{log.task}</div>
                      <div className={`text-xs ${log.status === "success" ? "text-emerald-200" : "text-rose-200"}`}>{formatStatus(log.status)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      {log.model} · {log.attemptCount} 次尝试 · {log.durationMs} ms
                    </div>
                    {log.errorMessage ? <div className="mt-1 text-xs text-rose-200">{log.errorMessage}</div> : null}
                  </div>
                ))}
                {tenant.llmCallLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无 LLM 调用日志。</p> : null}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">LLM 后台任务</h2>
              <div className="mt-4 space-y-3">
                {tenant.llmJobs.map((job) => (
                  <div key={job.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-sm font-semibold text-cyan-100">{job.task}</div>
                      <div className="text-xs text-[var(--muted)]">{formatStatus(job.status)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      尝试次数 {job.attempts}/{job.maxAttempts}
                    </div>
                    {job.errorMessage ? <div className="mt-1 text-xs text-rose-200">{job.errorMessage}</div> : null}
                  </div>
                ))}
                {tenant.llmJobs.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无后台任务。</p> : null}
              </div>
            </Panel>

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
                        {log.entityType}
                        {log.entityId ? ` · ${log.entityId}` : ""} · {log.actor}
                      </div>
                      {Object.keys(metadata).length ? (
                        <pre className="mt-2 overflow-auto rounded bg-black/20 p-2 text-xs text-slate-300">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}
                {tenant.auditLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无审计日志。</p> : null}
              </div>
            </Panel>
          </div>

          {auth?.user.role === "admin" ? (
            <Panel className="border-rose-300/20 p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-white">危险操作区</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    删除企业业务数据，同时保留企业账号和审计记录。
                  </p>
                </div>
                <EnterpriseDangerZone />
              </div>
            </Panel>
          ) : null}
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

function formatRole(role: string) {
  if (role === "admin") return "管理员";
  if (role === "editor") return "编辑者";
  return "只读成员";
}

function formatPlan(plan: string) {
  if (plan === "trial") return "试用版";
  if (plan === "business") return "商业版";
  return plan;
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    active: "启用",
    running: "运行中",
    ended: "已结束",
    success: "成功",
    failed: "失败",
    queued: "排队中",
    completed: "已完成",
    dead: "已终止",
  };
  return map[status] ?? status;
}
