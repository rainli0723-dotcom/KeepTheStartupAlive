import { getDb } from "./db";

export type UsageMetric = "llm" | "exports" | "workspaces";

export async function getTenantUsageSnapshot(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [limits, llmCalls, exports, workspaces] = await Promise.all([
    getDb().tenantUsageLimit.findUnique({ where: { tenantId } }),
    getDb().llmCallLog.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
    getDb().auditLog.count({ where: { tenantId, action: "report.exported", createdAt: { gte: monthStart } } }),
    getDb().simulationWorkspace.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
  ]);

  return {
    limits: limits ?? {
      tenantId,
      trialEndsAt: null,
      monthlyLlmCalls: 500,
      monthlyExports: 50,
      monthlyWorkspaces: 20,
    },
    usage: { llmCalls, exports, workspaces },
    monthStart,
  };
}

export async function assertTenantUsageAllowed(tenantId: string, metric: UsageMetric) {
  const snapshot = await getTenantUsageSnapshot(tenantId);
  if (snapshot.limits.trialEndsAt && snapshot.limits.trialEndsAt < new Date()) {
    return { ok: false, reason: "试用期已结束，请升级套餐或联系管理员" };
  }

  const checks = {
    llm: [snapshot.usage.llmCalls, snapshot.limits.monthlyLlmCalls, "本月 LLM 调用额度已用完"],
    exports: [snapshot.usage.exports, snapshot.limits.monthlyExports, "本月报告导出额度已用完"],
    workspaces: [snapshot.usage.workspaces, snapshot.limits.monthlyWorkspaces, "本月工作区额度已用完"],
  } as const;
  const [used, limit, reason] = checks[metric];
  return used >= limit ? { ok: false, reason } : { ok: true, reason: "" };
}
