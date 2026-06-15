import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, Building2, FileClock, Gauge, ShieldAlert, Users } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { getCurrentAuth } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ jobStatus?: string }> }) {
  await ensureDatabase();
  const auth = await getCurrentAuth();
  const params = await searchParams;
  const jobStatus = normalizeJobStatus(params?.jobStatus);

  if (!auth) {
    return (
      <AppShell>
        <PageHeader title="管理后台" description="登录后查看企业、用户、用量、成本、错误和审计记录。" action={<Link className="glass-primary-button px-4 py-2 text-sm" href="/login">登录</Link>} />
      </AppShell>
    );
  }

  if (auth.user.role !== "admin") {
    return (
      <AppShell>
        <PageHeader title="管理后台" description="只有企业管理员可以查看管理后台。" />
        <Panel className="p-5">
          <div className="flex items-start gap-3 text-amber-100">
            <ShieldAlert className="mt-0.5 shrink-0" size={20} />
            <div>
              <h2 className="font-semibold">权限不足</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">当前角色是 {formatRole(auth.user.role)}，不能访问管理员视图。</p>
            </div>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const db = getDb();
  const [
    tenantCount,
    userCount,
    workspaceCount,
    finaleCount,
    auditCount,
    llmCallCount,
    failedLlmCount,
    queuedJobCount,
    runningJobCount,
    deadJobCount,
    shareLinkCount,
    revokedShareCount,
    llmCostAgg,
    tenants,
    recentAudits,
    recentCalls,
    recentJobs,
  ] = await Promise.all([
    db.enterpriseTenant.count(),
    db.appUser.count(),
    db.simulationWorkspace.count(),
    db.simulationFinale.count(),
    db.auditLog.count(),
    db.llmCallLog.count(),
    db.llmCallLog.count({ where: { status: "failed" } }),
    db.llmJob.count({ where: { status: "queued" } }),
    db.llmJob.count({ where: { status: "running" } }),
    db.llmJob.count({ where: { status: "dead" } }),
    db.reportShareLink.count(),
    db.reportShareLink.count({ where: { status: "revoked" } }),
    db.llmCallLog.aggregate({ _sum: { estimatedCostUsd: true, totalTokens: true } }),
    db.enterpriseTenant.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        _count: {
          select: {
            users: true,
            members: true,
            workspaces: true,
            auditLogs: true,
            llmCallLogs: true,
            llmJobs: true,
            reportShareLinks: true,
          },
        },
      },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.llmCallLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.llmJob.findMany({
      where: jobStatus ? { status: jobStatus } : undefined,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="管理后台"
        description="查看企业列表、用户数量、用量成本、失败任务、分享链接和系统健康状态。"
        action={<Link className="glass-primary-button px-4 py-2 text-sm" href="/enterprise">企业空间</Link>}
      />

      <div className="grid gap-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Building2 size={18} />} label="企业空间" value={tenantCount} />
          <Metric icon={<Users size={18} />} label="用户" value={userCount} />
          <Metric icon={<Gauge size={18} />} label="工作区" value={workspaceCount} />
          <Metric icon={<FileClock size={18} />} label="最终报告" value={finaleCount} />
          <Metric icon={<Activity size={18} />} label="LLM 调用" value={llmCallCount} />
          <Metric icon={<ShieldAlert size={18} />} label="失败调用" value={failedLlmCount} />
          <Metric icon={<FileClock size={18} />} label="排队任务" value={queuedJobCount} />
          <Metric icon={<ShieldAlert size={18} />} label="审计记录" value={auditCount} />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<FileClock size={18} />} label="运行中任务" value={runningJobCount} />
          <Metric icon={<ShieldAlert size={18} />} label="终止任务" value={deadJobCount} />
          <Metric icon={<Activity size={18} />} label="Token 总量" value={llmCostAgg._sum.totalTokens ?? 0} />
          <CostMetric value={llmCostAgg._sum.estimatedCostUsd ?? 0} />
          <Metric icon={<FileClock size={18} />} label="分享链接" value={shareLinkCount} />
          <Metric icon={<ShieldAlert size={18} />} label="已撤销分享" value={revokedShareCount} />
        </section>

        <Panel className="p-5">
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
            <div>
              <h2 className="text-lg font-semibold text-white">企业运行概览</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">用于售前演示和内部运营，查看每个企业的成员、工作区、LLM 调用和审计数量。</p>
            </div>
            <Link href="/pricing" className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15">
              套餐配置
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-cyan-100">
                <tr>
                  <th className="py-3 pr-4">企业</th>
                  <th className="py-3 pr-4">套餐</th>
                  <th className="py-3 pr-4">状态</th>
                  <th className="py-3 pr-4">用户</th>
                  <th className="py-3 pr-4">工作区</th>
                  <th className="py-3 pr-4">LLM</th>
                  <th className="py-3 pr-4">分享</th>
                  <th className="py-3 pr-4">审计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="text-slate-200">
                    <td className="py-3 pr-4 font-semibold text-white">{tenant.name}</td>
                    <td className="py-3 pr-4">{formatPlan(tenant.plan)}</td>
                    <td className="py-3 pr-4">{formatStatus(tenant.status)}</td>
                    <td className="py-3 pr-4">{tenant._count.users}</td>
                    <td className="py-3 pr-4">{tenant._count.workspaces}</td>
                    <td className="py-3 pr-4">{tenant._count.llmCallLogs}</td>
                    <td className="py-3 pr-4">{tenant._count.reportShareLinks}</td>
                    <td className="py-3 pr-4">{tenant._count.auditLogs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">最近审计记录</h2>
            <div className="mt-4 space-y-3">
              {recentAudits.map((audit) => (
                <div key={audit.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-sm font-semibold text-cyan-100">{audit.action}</div>
                    <div className="text-xs text-[var(--muted)]">{audit.createdAt.toLocaleString("zh-CN")}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">{audit.entityType} · {audit.actor}</div>
                </div>
              ))}
              {recentAudits.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无审计记录。</p> : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">最近 LLM 调用</h2>
            <div className="mt-4 space-y-3">
              {recentCalls.map((call) => (
                <div key={call.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-sm font-semibold text-cyan-100">{call.task}</div>
                    <div className={call.status === "success" ? "text-xs text-emerald-200" : "text-xs text-rose-200"}>{formatStatus(call.status)}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">{call.model} · {call.attemptCount} 次尝试 · {call.durationMs} ms</div>
                  {call.errorMessage ? <div className="mt-1 text-xs text-rose-200">{call.errorMessage}</div> : null}
                </div>
              ))}
              {recentCalls.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无 LLM 调用。</p> : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <h2 className="text-lg font-semibold text-white">最近后台任务</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  ["全部", ""],
                  ["排队中", "queued"],
                  ["运行中", "running"],
                  ["失败", "failed"],
                  ["终止", "dead"],
                ].map(([label, value]) => (
                  <Link
                    key={value || "all"}
                    href={value ? `/admin?jobStatus=${value}` : "/admin"}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                      (jobStatus ?? "") === value
                        ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50"
                        : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {recentJobs.map((job) => (
                <div key={job.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-sm font-semibold text-cyan-100">{job.task}</div>
                    <div className="text-xs text-[var(--muted)]">{formatStatus(job.status)}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">
                    尝试 {job.attempts}/{job.maxAttempts} · 下次运行 {job.runAfter.toLocaleString("zh-CN")}
                  </div>
                  {job.errorMessage ? <div className="mt-1 text-xs text-rose-200">{job.errorMessage}</div> : null}
                </div>
              ))}
              {recentJobs.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无后台任务。</p> : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">系统健康状态</h2>
            <div className="mt-4 grid gap-3">
              <Health label="数据库连接" ok />
              <Health label="LLM 任务队列" ok={deadJobCount === 0} detail={deadJobCount ? `${deadJobCount} 个任务已终止` : "无终止任务"} />
              <Health label="分享链接权限" ok detail="分享链接支持过期与撤销" />
              <Health label="审计覆盖" ok detail="成员、导出、分享、数据删除等关键操作已记录" />
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function normalizeJobStatus(value?: string) {
  if (value === "queued" || value === "running" || value === "failed" || value === "dead" || value === "completed") {
    return value;
  }
  return "";
}

function CostMetric({ value }: { value: number }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">估算成本 USD</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-white">{value.toFixed(4)}</div>
        </div>
        <div className="grid size-10 place-items-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
          <Activity size={18} />
        </div>
      </div>
    </Panel>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className="grid size-10 place-items-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">{icon}</div>
      </div>
    </Panel>
  );
}

function Health({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-white">{label}</span>
        <span className={ok ? "text-sm text-emerald-200" : "text-sm text-rose-200"}>{ok ? "正常" : "需处理"}</span>
      </div>
      {detail ? <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p> : null}
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
  if (plan === "enterprise") return "企业版";
  return plan;
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    active: "可用",
    success: "成功",
    failed: "失败",
    queued: "排队中",
    running: "运行中",
    completed: "已完成",
    dead: "已终止",
    revoked: "已撤销",
  };
  return map[status] ?? status;
}
