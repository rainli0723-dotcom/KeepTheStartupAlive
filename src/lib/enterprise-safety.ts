export function isActiveShareLink(input: {
  status: string;
  revokedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  return input.status === "active" && !input.revokedAt && (!expiresAt || expiresAt >= now);
}

export function buildTenantDataDeletionScope(
  workspaces: { id: string; organizationProfileId: string }[],
) {
  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const organizationIds = Array.from(new Set(workspaces.map((workspace) => workspace.organizationProfileId)));
  return { workspaceIds, organizationIds };
}

export function buildTenantFinaleWhere(finaleId: string, tenantId: string) {
  return {
    id: finaleId,
    workspace: { tenantId },
  };
}
