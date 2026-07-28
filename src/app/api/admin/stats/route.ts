import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") {
    return NextResponse.json({ error: "需要超级管理员权限" }, { status: 403 });
  }
  const db = getDb();
  const [tenantCount, userCount, workspaceCount, finaleCount, llmCallCount, llmFailedCount, deadJobCount] = await Promise.all([
    db.enterpriseTenant.count(),
    db.appUser.count(),
    db.simulationWorkspace.count(),
    db.simulationFinale.count(),
    db.llmCallLog.count(),
    db.llmCallLog.count({ where: { status: "failed" } }),
    db.llmJob.count({ where: { status: "dead" } }),
  ]);

  const costAgg = await db.llmCallLog.aggregate({ _sum: { estimatedCostUsd: true, totalTokens: true } });

  return NextResponse.json({
    tenants: tenantCount,
    users: userCount,
    workspaces: workspaceCount,
    finales: finaleCount,
    llmCalls: llmCallCount,
    llmFailures: llmFailedCount,
    deadJobs: deadJobCount,
    totalCostUsd: costAgg._sum.estimatedCostUsd || 0,
    totalTokens: costAgg._sum.totalTokens || 0,
  });
}
