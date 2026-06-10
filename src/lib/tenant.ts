import { randomUUID } from "node:crypto";
import { getCurrentAuth } from "./auth";
import { getDb } from "./db";
import { toJson } from "./serializers";

const defaultTenantName = "演示企业空间";

export async function ensureDefaultTenant() {
  const db = getDb();
  const existing = await db.enterpriseTenant.findFirst({
    where: { name: defaultTenantName },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const tenant = await db.enterpriseTenant.create({
    data: {
      id: randomUUID(),
      name: defaultTenantName,
      plan: "trial",
      status: "active",
      members: {
        create: {
          id: randomUUID(),
          name: "演示管理员",
          role: "admin",
        },
      },
    },
  });

  await writeAuditLog({
    tenantId: tenant.id,
    action: "tenant.created",
    entityType: "EnterpriseTenant",
    entityId: tenant.id,
    metadata: { name: tenant.name, plan: tenant.plan },
  });

  return tenant;
}

export async function getActiveTenant() {
  const auth = await getCurrentAuth();
  if (auth) return auth.tenant;

  const tenant = await ensureDefaultTenant();
  const result = await getDb().simulationWorkspace.updateMany({
    where: { tenantId: null },
    data: { tenantId: tenant.id },
  });

  if (result.count > 0) {
    await writeAuditLog({
      tenantId: tenant.id,
      action: "workspace.backfilled",
      entityType: "SimulationWorkspace",
      metadata: { count: result.count },
    });
  }

  return tenant;
}

export async function assignWorkspaceToDefaultTenant(workspaceId: string) {
  const tenant = await getActiveTenant();
  await getDb().simulationWorkspace.update({
    where: { id: workspaceId },
    data: { tenantId: tenant.id },
  });
  return tenant;
}

export async function writeAuditLog(input: {
  tenantId?: string | null;
  actor?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await getDb().auditLog.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId ?? null,
      actor: input.actor ?? "system",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: toJson(input.metadata ?? {}),
    },
  });
}
