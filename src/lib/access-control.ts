import { NextResponse } from "next/server";
import type { AuthContext } from "./auth";
import { getCurrentAuth } from "./auth";
import { getDb } from "./db";

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
    where: { id: finaleId, workspace: { tenantId: auth.tenant.id } },
  });
  return Boolean(finale);
}
