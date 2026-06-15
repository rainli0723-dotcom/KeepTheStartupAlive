import { NextResponse } from "next/server";
import { roleTemplates } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { ensureRoleTemplates } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const checks = {
    database: false,
    databaseProvider: getDatabaseProvider(),
    llmConfigured: Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL),
    model: process.env.LLM_MODEL ?? "not-configured",
    roleTemplates: {
      expected: roleTemplates.length,
      actual: 0,
      synced: false,
    },
    workspaces: 0,
    queuedJobs: 0,
    deadJobs: 0,
    shareLinks: 0,
    revokedShareLinks: 0,
    auditLogs: 0,
  };

  try {
    await ensureDatabase();
    await ensureRoleTemplates();
    await getDb().$queryRaw`SELECT 1`;
    checks.database = true;
    checks.roleTemplates.actual = await getDb().roleTemplate.count();
    checks.roleTemplates.synced = checks.roleTemplates.actual >= checks.roleTemplates.expected;
    checks.workspaces = await getDb().simulationWorkspace.count();
    checks.queuedJobs = await getDb().llmJob.count({ where: { status: "queued" } });
    checks.deadJobs = await getDb().llmJob.count({ where: { status: "dead" } });
    checks.shareLinks = await getDb().reportShareLink.count();
    checks.revokedShareLinks = await getDb().reportShareLink.count({ where: { status: "revoked" } });
    checks.auditLogs = await getDb().auditLog.count();
  } catch {
    checks.database = false;
  }

  const ok = checks.database && checks.roleTemplates.synced;

  return NextResponse.json(
    {
      ok,
      service: "ktsa",
      checks,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}

function getDatabaseProvider() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) return "postgresql";
  if (url.startsWith("file:")) return "sqlite";
  return "unknown";
}
