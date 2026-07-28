/** API Key management for programmatic access. */
import { randomUUID, createHash } from "node:crypto";
import { getDb } from "./db";

export async function createApiKey(tenantId: string, label: string, createdBy: string) {
  const db = getDb();
  const plainKey = `ktsa_${randomUUID().replace(/-/g, "")}`;
  const keyHash = createHash("sha256").update(plainKey).digest("hex");
  const prefix = plainKey.slice(0, 12);

  await db.auditLog.create({
    data: {
      tenantId, actor: createdBy, action: "apikey.created",
      entityType: "ApiKey", entityId: keyHash.slice(0, 16),
      metadata: JSON.stringify({ label, prefix }),
    },
  });

  return { plainKey, keyHash, prefix };
}

export async function validateApiKey(key: string): Promise<{ tenantId: string; valid: boolean } | null> {
  if (!key.startsWith("ktsa_")) return null;
  const db = getDb();
  const keyHash = createHash("sha256").update(key).digest("hex");
  const log = await db.auditLog.findFirst({
    where: { action: "apikey.created", entityId: keyHash.slice(0, 16) },
    orderBy: { createdAt: "desc" },
  });
  if (!log) return null;
  return { tenantId: log.tenantId || "", valid: true };
}

export async function revokeApiKey(tenantId: string, prefix: string, revokedBy: string) {
  await getDb().auditLog.create({
    data: {
      tenantId, actor: revokedBy, action: "apikey.revoked",
      entityType: "ApiKey", entityId: prefix,
      metadata: JSON.stringify({ prefix }),
    },
  });
}

export async function listApiKeys(tenantId: string) {
  const logs = await getDb().auditLog.findMany({
    where: { tenantId, action: "apikey.created" },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, metadata: true, createdAt: true, actor: true },
  });
  const revoked = await getDb().auditLog.findMany({
    where: { tenantId, action: "apikey.revoked" },
    select: { entityId: true },
  });
  const revokedSet = new Set(revoked.map(r => r.entityId));
  return logs.filter(l => !revokedSet.has(l.entityId)).map(l => {
    const meta = JSON.parse(l.metadata || "{}");
    return { id: l.entityId, label: meta.label, prefix: meta.prefix, createdBy: l.actor, createdAt: l.createdAt };
  });
}
