import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { toJson } from "./serializers";

const defaultTenantName = "默认企业";

export async function ensureDefaultTenant() {
  const db = getDb();
  const existing = await db.enterpriseTenant.findFirst({ orderBy: { createdAt: "asc" } });
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
          name: "管理员",
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

export async function assignWorkspaceToDefaultTenant(workspaceId: string) {
  const tenant = await ensureDefaultTenant();
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
