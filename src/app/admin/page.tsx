import Link from "next/link";
import { Activity, Building2, FileClock, Gauge, ShieldAlert, Users } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { getCurrentAuth } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await ensureDatabase();
  const auth = await getCurrentAuth();

  if (!auth) {
    return (
      <AppShell>
        <PageHeader
          title="Admin Console"
          description="Login is required before viewing enterprise operating metrics."
          action={<Link className="glass-primary-button px-4 py-2 text-sm" href="/login">Login</Link>}
        />
      </AppShell>
    );
  }

  if (auth.user.role !== "admin") {
    return (
      <AppShell>
        <PageHeader title="Admin Console" description="Only enterprise admins can view this console." />
        <Panel className="p-5">
          <div className="flex items-start gap-3 text-amber-100">
            <ShieldAlert className="mt-0.5 shrink-0" size={20} />
            <div>
              <h2 className="font-semibold">Admin permission required</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Your current role is {auth.user.role}. Ask an admin to update your access.</p>
            </div>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const db = getDb();
  const [tenantCount, userCount, workspaceCount, finaleCount, auditCount, llmCallCount, failedLlmCount, queuedJobCount, tenants, recentAudits, recentCalls] =
    await Promise.all([
      db.enterpriseTenant.count(),
      db.appUser.count(),
      db.simulationWorkspace.count(),
      db.simulationFinale.count(),
      db.auditLog.count(),
      db.llmCallLog.count(),
      db.llmCallLog.count({ where: { status: "failed" } }),
      db.llmJob.count({ where: { status: "queued" } }),
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
            },
          },
        },
      }),
      db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      db.llmCallLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

  return (
    <AppShell>
      <PageHeader
        title="Admin Console"
        description="Operate tenants, accounts, workspaces, LLM usage, background jobs, and audit records from a single view."
        action={<Link className="glass-primary-button px-4 py-2 text-sm" href="/enterprise">Enterprise Space</Link>}
      />

      <div className="grid gap-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Building2 size={18} />} label="Tenants" value={tenantCount} />
          <Metric icon={<Users size={18} />} label="Users" value={userCount} />
          <Metric icon={<Gauge size={18} />} label="Workspaces" value={workspaceCount} />
          <Metric icon={<FileClock size={18} />} label="Final reports" value={finaleCount} />
          <Metric icon={<Activity size={18} />} label="LLM calls" value={llmCallCount} />
          <Metric icon={<ShieldAlert size={18} />} label="Failed LLM calls" value={failedLlmCount} />
          <Metric icon={<FileClock size={18} />} label="Queued jobs" value={queuedJobCount} />
          <Metric icon={<ShieldAlert size={18} />} label="Audit logs" value={auditCount} />
        </section>

        <Panel className="p-5">
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
            <div>
              <h2 className="text-lg font-semibold text-white">Tenant Operations</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Review commercial accounts and their operational footprint.</p>
            </div>
            <Link href="/pricing" className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15">
              Pricing Package
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-cyan-100">
                <tr>
                  <th className="py-3 pr-4">Tenant</th>
                  <th className="py-3 pr-4">Plan</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Users</th>
                  <th className="py-3 pr-4">Workspaces</th>
                  <th className="py-3 pr-4">LLM</th>
                  <th className="py-3 pr-4">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="text-slate-200">
                    <td className="py-3 pr-4 font-semibold text-white">{tenant.name}</td>
                    <td className="py-3 pr-4">{tenant.plan}</td>
                    <td className="py-3 pr-4">{tenant.status}</td>
                    <td className="py-3 pr-4">{tenant._count.users}</td>
                    <td className="py-3 pr-4">{tenant._count.workspaces}</td>
                    <td className="py-3 pr-4">{tenant._count.llmCallLogs}</td>
                    <td className="py-3 pr-4">{tenant._count.auditLogs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">Recent Audit Records</h2>
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
              {recentAudits.length === 0 ? <p className="text-sm text-[var(--muted)]">No audit records yet.</p> : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-white">Recent LLM Calls</h2>
            <div className="mt-4 space-y-3">
              {recentCalls.map((call) => (
                <div key={call.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-sm font-semibold text-cyan-100">{call.task}</div>
                    <div className={call.status === "success" ? "text-xs text-emerald-200" : "text-xs text-rose-200"}>{call.status}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">{call.model} · {call.attemptCount} attempts · {call.durationMs} ms</div>
                  {call.errorMessage ? <div className="mt-1 text-xs text-rose-200">{call.errorMessage}</div> : null}
                </div>
              ))}
              {recentCalls.length === 0 ? <p className="text-sm text-[var(--muted)]">No LLM calls yet.</p> : null}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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
