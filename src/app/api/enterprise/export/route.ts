import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const tenantId = auth.tenant.id;
  const db = getDb();

  const [workspaces, members, finales, auditLogs, llmLogs] = await Promise.all([
    db.simulationWorkspace.findMany({ where: { tenantId }, include: { organizationProfile: true, teamMembers: { select: { id: true, name: true, roleName: true } } } }),
    db.tenantMember.findMany({ where: { tenantId } }),
    db.simulationFinale.findMany({ where: { workspace: { tenantId } }, include: { workspace: { select: { name: true } } } }),
    db.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.llmCallLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100, select: { task: true, model: true, totalTokens: true, estimatedCostUsd: true, status: true, createdAt: true } }),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    tenant: { id: tenantId, name: auth.tenant.name, plan: auth.tenant.plan },
    workspaces: workspaces.map(w => ({ id: w.id, name: w.name, status: w.status, currentCycle: w.currentCycle, organization: w.organizationProfile?.name, members: w.teamMembers.length })),
    members: members.map(m => ({ name: m.name, email: m.email, role: m.role })),
    finales: finales.map(f => ({ workspace: f.workspace.name, outcome: f.outcomeType, score: f.score, title: f.title })),
    recentAuditLogs: auditLogs.map(l => ({ action: l.action, actor: l.actor, createdAt: l.createdAt })),
    recentLlmLogs: llmLogs.map(l => ({ task: l.task, model: l.model, tokens: l.totalTokens, cost: l.estimatedCostUsd, status: l.status, at: l.createdAt })),
  });
}
