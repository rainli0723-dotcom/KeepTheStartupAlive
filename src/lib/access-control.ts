import { NextResponse } from "next/server";
import type { AuthContext } from "./auth";
import { getCurrentAuth } from "./auth";
import { getDb } from "./db";
import { getActiveTenant } from "./tenant";

export function canEdit(role?: string | null) {
  return role === "admin" || role === "editor";
}

export async function requireAuth() {
  const auth = await getCurrentAuth();
  if (!auth) return { error: NextResponse.json({ error: "Please login first" }, { status: 401 }) };
  return { auth };
}

export async function requireEditor() {
  const result = await requireAuth();
  if ("error" in result) return result;
  if (!canEdit(result.auth.user.role)) {
    return { error: NextResponse.json({ error: "Editor permission required" }, { status: 403 }) };
  }
  return result;
}

export async function assertWorkspaceAccess(workspaceId: string, auth: AuthContext) {
  const workspace = await getDb().simulationWorkspace.findFirst({
    where: { id: workspaceId, tenantId: auth.tenant.id },
  });
  return Boolean(workspace);
}

export async function assertFinaleAccess(finaleId: string, auth: AuthContext) {
  const finale = await getDb().simulationFinale.findFirst({
    where: scopedFinaleWhere(finaleId, auth.tenant.id),
  });
  return Boolean(finale);
}

export function scopedTeamMemberWhere(id: string, tenantId: string) {
  return { id, workspace: { tenantId } };
}

export function scopedMeetingWhere(id: string, tenantId: string) {
  return { id, workspace: { tenantId } };
}

export function scopedFinaleWhere(id: string, tenantId: string) {
  return { id, workspace: { tenantId } };
}

export async function getScopedTeamMember(id: string) {
  const tenant = await getActiveTenant();
  const member = await getDb().teamMember.findFirst({
    where: scopedTeamMemberWhere(id, tenant.id),
    include: { distillationProfile: true, sourceDocuments: { orderBy: { createdAt: "desc" } } },
  });
  return { tenant, member };
}

export async function getScopedMeeting(id: string) {
  const tenant = await getActiveTenant();
  const meeting = await getDb().strategyMeeting.findFirst({
    where: scopedMeetingWhere(id, tenant.id),
    include: {
      workspace: {
        select: {
          userRole: true,
          organizationProfile: {
            select: { name: true, stage: true, industry: true, product: true },
          },
        },
      },
      businessEvent: { select: { title: true, description: true, eventType: true } },
      decisionOptions: { select: { id: true, title: true, recommendation: true, upside: true, risk: true } },
    },
  });
  return { tenant, meeting };
}

export async function getScopedMeetingReport(id: string) {
  const tenant = await getActiveTenant();
  const meeting = await getDb().strategyMeeting.findFirst({
    where: scopedMeetingWhere(id, tenant.id),
    include: {
      workspace: { include: { organizationProfile: true, teamMembers: true } },
      businessEvent: true,
      decisionOptions: true,
    },
  });
  return { tenant, meeting };
}

export async function getScopedFinale(id: string) {
  const tenant = await getActiveTenant();
  const finale = await getDb().simulationFinale.findFirst({
    where: scopedFinaleWhere(id, tenant.id),
    include: { workspace: true },
  });
  return { tenant, finale };
}
