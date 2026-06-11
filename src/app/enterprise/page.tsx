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
        title="Enterprise Space"
        description="Manage enterprise account, members, permissions, workspaces, LLM operations, and audit records."
        action={
          auth ? (
            <span className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50">
              {auth.user.name} · {auth.user.role}
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15"
            >
              Login
            </Link>
          )
        }
      />

      {tenant ? (
        <div className="grid gap-5">
          <Panel className="p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Tenant</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{tenant.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Plan: {tenant.plan} · Status: {tenant.status}
                  {!auth ? " · Demo tenant" : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                <Metric label="Members" value={tenant.members.length} />
                <Metric label="Workspaces" value={tenant.workspaces.length} />
                <Metric label="Audit" value={tenant.auditLogs.length} />
                <Metric label="LLM" value={tenant.llmCallLogs.length} />
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Members and Permissions</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Admin, editor, and viewer roles are available.</p>
              </div>
              {auth?.user.role === "admin" ? <TenantMemberForm /> : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tenant.members.map((member) => (
                <div key={member.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-3">
                  <div className="font-semibold text-white">{member.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{member.email ?? "No email"}</div>
                  <div className="mt-2 inline-flex rounded-sm border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                    {formatRole(member.role)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">Recent Workspaces</h2>
              <div className="mt-4 space-y-3">
                {tenant.workspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="font-semibold text-white">{workspace.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Cycle {Math.max(0, workspace.currentCycle - 1)}/20 · {workspace.status}
                    </div>
                  </div>
                ))}
                {tenant.workspaces.length === 0 ? <p className="text-sm text-[var(--muted)]">No workspace yet.</p> : null}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">LLM Call Logs</h2>
              <div className="mt-4 space-y-3">
                {tenant.llmCallLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-sm font-semibold text-cyan-100">{log.task}</div>
                      <div className={`text-xs ${log.status === "success" ? "text-emerald-200" : "text-rose-200"}`}>{log.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      {log.model} · {log.attemptCount} attempts · {log.durationMs} ms
                    </div>
                    {log.errorMessage ? <div className="mt-1 text-xs text-rose-200">{log.errorMessage}</div> : null}
                  </div>
                ))}
                {tenant.llmCallLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">No LLM call logs yet.</p> : null}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">LLM Background Jobs</h2>
              <div className="mt-4 space-y-3">
                {tenant.llmJobs.map((job) => (
                  <div key={job.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-sm font-semibold text-cyan-100">{job.task}</div>
                      <div className="text-xs text-[var(--muted)]">{job.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      Attempts {job.attempts}/{job.maxAttempts}
                    </div>
                    {job.errorMessage ? <div className="mt-1 text-xs text-rose-200">{job.errorMessage}</div> : null}
                  </div>
                ))}
                {tenant.llmJobs.length === 0 ? <p className="text-sm text-[var(--muted)]">No background jobs yet.</p> : null}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">Audit Logs</h2>
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
                {tenant.auditLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">No audit logs yet.</p> : null}
              </div>
            </Panel>
          </div>

          {auth?.user.role === "admin" ? (
            <Panel className="border-rose-300/20 p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Delete enterprise business data while keeping the enterprise account and audit trail.
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
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  return "Viewer";
}
