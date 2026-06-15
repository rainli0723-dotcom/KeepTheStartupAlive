import { NextResponse } from "next/server";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildTenantDataDeletionScope } from "@/lib/enterprise-safety";
import { writeAuditLog } from "@/lib/tenant";

export async function DELETE() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Please login first" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) {
    return NextResponse.json({ error: "Only admins can delete enterprise data" }, { status: 403 });
  }

  const db = getDb();
  const workspaces = await db.simulationWorkspace.findMany({
    where: { tenantId: auth.tenant.id },
    select: { id: true, organizationProfileId: true },
  });
  const { workspaceIds, organizationIds } = buildTenantDataDeletionScope(workspaces);

  await db.decisionOption.deleteMany({ where: { meeting: { workspaceId: { in: workspaceIds } } } });
  await db.strategyMeeting.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await db.businessEvent.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await db.simulationFinale.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await db.sourceDocument.deleteMany({ where: { teamMember: { workspaceId: { in: workspaceIds } } } });
  await db.distillationProfile.deleteMany({ where: { teamMember: { workspaceId: { in: workspaceIds } } } });
  await db.teamMember.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await db.simulationWorkspace.deleteMany({ where: { id: { in: workspaceIds } } });
  await db.organizationDocument.deleteMany({ where: { organizationProfileId: { in: organizationIds } } });
  await db.organizationArchive.deleteMany({ where: { organizationProfileId: { in: organizationIds } } });
  await db.organizationProfile.deleteMany({ where: { id: { in: organizationIds } } });
  await db.llmJob.deleteMany({ where: { tenantId: auth.tenant.id } });
  await db.llmCallLog.deleteMany({ where: { tenantId: auth.tenant.id } });

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "tenant.data.deleted",
    entityType: "EnterpriseTenant",
    entityId: auth.tenant.id,
    metadata: {
      workspaceCount: workspaceIds.length,
      organizationCount: organizationIds.length,
    },
  });

  return NextResponse.json({ success: true, deleted: { workspaces: workspaceIds.length, organizations: organizationIds.length } });
}
