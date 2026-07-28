import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/enterprise/analytics?range=30d
 *
 * Returns usage analytics for the current tenant.
 * Admin and editor roles only.
 */
export async function GET(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth || (auth.user.role !== "admin" && auth.user.role !== "editor")) {
    return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
  }

  const range = req.nextUrl.searchParams.get("range") || "30d";
  const days = range === "90d" ? 90 : range === "7d" ? 7 : 30;
  const since = new Date(Date.now() - days * 86400000);
  const prevSince = new Date(Date.now() - days * 2 * 86400000);

  const tenantId = auth.tenant.id;
  const db = getDb();

  const [
    activeUserCount,
    activeUserPrevCount,
    workspaces,
    completedWorkspaces,
    llmLogs,
    shareLinksThisMonth,
    shareLinksActive,
    auditExportCount,
  ] = await Promise.all([
    // Unique users with login activity this period
    db.auditLog.groupBy({
      by: ["actor"],
      where: { tenantId, action: "login", createdAt: { gte: since } },
    }).then(r => r.length),
    // Previous period
    db.auditLog.groupBy({
      by: ["actor"],
      where: { tenantId, action: "login", createdAt: { gte: prevSince, lt: since } },
    }).then(r => r.length),
    // All workspaces
    db.simulationWorkspace.findMany({
      where: { tenantId },
      select: { id: true, name: true, status: true, currentCycle: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    // Completed workspaces
    db.simulationWorkspace.count({
      where: { tenantId, status: "ended" },
    }),
    // LLM call logs
    db.llmCallLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { model: true, totalTokens: true, estimatedCostUsd: true, status: true, createdAt: true, task: true },
      orderBy: { createdAt: "asc" },
    }),
    // Share links created this month
    db.reportShareLink.count({
      where: { tenantId, createdAt: { gte: since } },
    }),
    // Active share links
    db.reportShareLink.count({
      where: { tenantId, status: "active" },
    }),
    // Export count (from audit log)
    db.auditLog.count({
      where: { tenantId, action: "export_report", createdAt: { gte: since } },
    }),
  ]);

  // Compute daily call counts
  const dailyMap = new Map<string, number>();
  let totalTokens = 0;
  let totalCost = 0;
  let failures = 0;
  const modelMap = new Map<string, { calls: number; cost: number; tokens: number }>();
  const taskMap = new Map<string, number>();

  for (const log of llmLogs) {
    const dateKey = log.createdAt.toISOString().slice(0, 10);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    totalTokens += log.totalTokens || 0;
    const cost = Number(log.estimatedCostUsd) || 0;
    totalCost += cost;
    if (log.status === "failed") failures++;

    const m = modelMap.get(log.model) || { calls: 0, cost: 0, tokens: 0 };
    m.calls++;
    m.cost += cost;
    m.tokens += log.totalTokens || 0;
    modelMap.set(log.model, m);

    taskMap.set(log.task, (taskMap.get(log.task) || 0) + 1);
  }

  return NextResponse.json({
    period: {
      start: since.toISOString(),
      end: new Date().toISOString(),
      days,
    },
    users: {
      active: activeUserCount,
      activePrev: activeUserPrevCount,
      change: activeUserPrevCount ? Math.round((activeUserCount - activeUserPrevCount) / activeUserPrevCount * 100) : null,
    },
    simulations: {
      total: workspaces.length,
      completed: completedWorkspaces,
      active: workspaces.filter(w => w.status === "active").length,
    },
    reports: {
      exports: auditExportCount,
    },
    llm: {
      totalCalls: llmLogs.length,
      totalTokens,
      estimatedCostUsd: Math.round(totalCost * 10000) / 10000,
      failureRate: llmLogs.length ? Math.round(failures / llmLogs.length * 10000) / 100 : 0,
      dailyCalls: [...dailyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      byModel: [...modelMap.entries()].map(([model, v]) => ({
        model,
        calls: v.calls,
        cost: Math.round(v.cost * 10000) / 10000,
        tokens: v.tokens,
      })),
      byTask: [...taskMap.entries()].map(([task, count]) => ({ task, count })),
    },
    workspaces: workspaces.slice(0, 10).map(w => ({
      id: w.id,
      name: w.name,
      status: w.status,
      completedCycles: w.currentCycle - 1,
      lastActive: w.updatedAt.toISOString(),
    })),
    shareLinks: {
      active: shareLinksActive,
      createdThisMonth: shareLinksThisMonth,
    },
  });
}
