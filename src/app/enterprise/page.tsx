import Link from "next/link";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { EnterpriseDangerZone } from "@/components/enterprise-danger-zone";
import { LlmJobActions } from "@/components/llm-job-actions";
import { LlmJobProgress } from "@/components/llm-job-progress";
import { PasswordChangeForm } from "@/components/password-change-form";
import { SessionActions } from "@/components/session-actions";
import { ShareLinkActions } from "@/components/share-link-actions";
import { SsoSettingsForm } from "@/components/sso-settings-form";
import { TenantMemberActions } from "@/components/tenant-member-actions";
import { TenantMemberForm } from "@/components/tenant-member-form";
import { UsageLimitForm } from "@/components/usage-limit-form";
import { getCurrentAuth } from "@/lib/auth";
import { parseJson } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { isActiveShareLink } from "@/lib/enterprise-safety";
import { getTenantUsageSnapshot } from "@/lib/usage-limits";

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function EnterprisePage() {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const activeTenant = auth.tenant;
  const tenant = await getDb().enterpriseTenant.findUnique({
    where: { id: activeTenant.id },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      workspaces: { orderBy: { updatedAt: "desc" }, take: 8 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 12 },
      llmCallLogs: { orderBy: { createdAt: "desc" }, take: 12 },
      llmJobs: { orderBy: { createdAt: "desc" }, take: 8 },
      reportShareLinks: { orderBy: { createdAt: "desc" }, take: 8 },
      ssoSettings: { orderBy: { updatedAt: "desc" } },
      usageLimits: true,
    },
  });
  const usageSnapshot = tenant ? await getTenantUsageSnapshot(tenant.id) : null;

  return (
    <AppShell>
      <PageHeader
        title="企业空间"
        description="管理企业成员、权限、登录会话、分享链接、LLM 任务和审计记录。"
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">企业概览</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{tenant.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  套餐：{formatPlan(tenant.plan)} · 状态：{formatStatus(tenant.status)}
                  {!auth ? " · 当前为演示企业空间" : ""}
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

          {auth ? (
            <Panel className="p-5">
              <div className="grid gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">账号安全</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">修改密码、退出其他设备登录，降低账号被共享或泄露后的风险。</p>
                </div>
                <PasswordChangeForm />
                <SessionActions />
              </div>
            </Panel>
          ) : null}

          <Panel className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h2 className="text-lg font-semibold text-white">成员与权限</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">邀请成员进入企业空间，并按管理员、编辑者、只读成员分配权限。</p>
              </div>
              {auth?.user.role === "admin" ? (
                <Link href="/admin" className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                  管理后台
                </Link>
              ) : null}
            </div>
            {auth?.user.role === "admin" ? <div className="mt-4"><TenantMemberForm /></div> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tenant.members.map((member) => (
                <div key={member.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold text-white">{member.name}</div>
                    {auth?.user.role === "admin" && member.userId !== auth.user.id ? (
                      <TenantMemberActions memberId={member.id} />
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{member.email ?? "未绑定邮箱"}</div>
                  <div className="mt-2 inline-flex rounded-sm border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                    {formatRole(member.role)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {auth?.user.role === "admin" && usageSnapshot ? (
            <Panel className="p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">SSO 与用量限制</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">配置企业 SSO 占位信息，并限制试用期、LLM 调用、报告导出和工作区数量。</p>
              </div>
              <div className="grid gap-5">
                <div>
                  <div className="mb-2 text-sm font-semibold text-cyan-100">SSO 配置</div>
                  <SsoSettingsForm />
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {tenant.ssoSettings.map((setting) => (
                      <div key={setting.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
                        <span className="font-semibold text-white">{formatSsoProvider(setting.provider)}</span>
                        <span className="ml-2 text-xs text-[var(--muted)]">{formatStatus(setting.status)}</span>
                        <div className="mt-1 truncate text-xs">{setting.issuer}</div>
                      </div>
                    ))}
                    {tenant.ssoSettings.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无 SSO 配置。</p> : null}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-semibold text-cyan-100">用量限制</div>
                  <UsageLimitForm defaults={usageSnapshot.limits} />
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <UsagePill label="LLM 调用" used={usageSnapshot.usage.llmCalls} limit={usageSnapshot.limits.monthlyLlmCalls} />
                    <UsagePill label="报告导出" used={usageSnapshot.usage.exports} limit={usageSnapshot.limits.monthlyExports} />
                    <UsagePill label="工作区" used={usageSnapshot.usage.workspaces} limit={usageSnapshot.limits.monthlyWorkspaces} />
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}

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
              <h2 className="text-lg font-semibold text-white">报告分享链接</h2>
              <div className="mt-4 space-y-3">
                {tenant.reportShareLinks.map((link) => {
                  const active = isActiveShareLink(link);
                  return (
                    <div key={link.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-white">{link.title}</div>
                        {auth?.user.role === "admin" ? <ShareLinkActions linkId={link.id} status={link.status} /> : null}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {active ? "可访问" : "已失效"} · 创建人 {link.createdBy}
                        {link.expiresAt ? ` · 过期 ${new Date(link.expiresAt).toLocaleString("zh-CN")}` : " · 不自动过期"}
                      </div>
                    </div>
                  );
                })}
                {tenant.reportShareLinks.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无分享链接。</p> : null}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">LLM 调用记录</h2>
              <div className="mt-4 space-y-3">
                {tenant.llmCallLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-sm font-semibold text-cyan-100">{log.task}</div>
                      <div className={`text-xs ${log.status === "success" ? "text-emerald-200" : "text-rose-200"}`}>{formatStatus(log.status)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      {log.model} · {log.attemptCount} 次尝试 · {log.durationMs} ms
                      {log.estimatedCostUsd ? ` · 约 $${log.estimatedCostUsd.toFixed(4)}` : ""}
                    </div>
                    {log.errorMessage ? <div className="mt-1 text-xs text-rose-200">{log.errorMessage}</div> : null}
                  </div>
                ))}
                {tenant.llmCallLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无 LLM 调用记录。</p> : null}
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
                    <LlmJobProgress status={job.status} attempts={job.attempts} maxAttempts={job.maxAttempts} />
                    {job.errorMessage ? <div className="mt-1 text-xs text-rose-200">{job.errorMessage}</div> : null}
                    {auth && (auth.user.role === "admin" || auth.user.role === "editor") ? (
                      <LlmJobActions jobId={job.id} status={job.status} />
                    ) : null}
                  </div>
                ))}
                {tenant.llmJobs.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无后台任务。</p> : null}
              </div>
            </Panel>

            <Panel className="p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-white">审计记录</h2>
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
                {tenant.auditLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无审计记录。</p> : null}
              </div>
            </Panel>
          </div>

          {auth?.user.role === "admin" ? (
            <Panel className="border-rose-300/20 p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-white">危险操作</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    删除当前企业空间下的业务数据。操作会写入审计记录，请谨慎使用。
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

function UsagePill({ label, used, limit }: { label: string; used: number; limit: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-mono text-lg text-white">{used} / {limit}</div>
    </div>
  );
}

function formatSsoProvider(provider: string) {
  const map: Record<string, string> = {
    oidc: "OIDC",
    saml: "SAML",
    microsoft: "Microsoft",
    google: "Google",
  };
  return map[provider] ?? provider;
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
    inactive: "已停用",
    running: "进行中",
    ended: "已结束",
    success: "成功",
    failed: "失败",
    queued: "排队中",
    completed: "已完成",
    dead: "已终止",
    revoked: "已撤销",
  };
  return map[status] ?? status;
}
