import { describe, expect, it } from "vitest";
import { buildTenantDataDeletionScope, buildTenantFinaleWhere, isActiveShareLink } from "./enterprise-safety";

describe("read-only report share links", () => {
  const now = new Date("2026-06-13T00:00:00.000Z");

  it("allows active links that are not expired or revoked", () => {
    expect(isActiveShareLink({ status: "active", expiresAt: "2026-06-14T00:00:00.000Z", now })).toBe(true);
  });

  it("rejects expired, revoked, or inactive links", () => {
    expect(isActiveShareLink({ status: "active", expiresAt: "2026-06-12T00:00:00.000Z", now })).toBe(false);
    expect(isActiveShareLink({ status: "active", revokedAt: "2026-06-12T00:00:00.000Z", now })).toBe(false);
    expect(isActiveShareLink({ status: "disabled", now })).toBe(false);
  });
});

describe("tenant data deletion scope", () => {
  it("only includes workspace and organization IDs from the selected tenant query", () => {
    expect(
      buildTenantDataDeletionScope([
        { id: "workspace-a", organizationProfileId: "org-a" },
        { id: "workspace-b", organizationProfileId: "org-a" },
      ]),
    ).toEqual({
      workspaceIds: ["workspace-a", "workspace-b"],
      organizationIds: ["org-a"],
    });
  });
});

describe("tenant-scoped finale access", () => {
  it("builds a finale filter that requires the finale workspace to belong to the tenant", () => {
    expect(buildTenantFinaleWhere("finale-a", "tenant-a")).toEqual({
      id: "finale-a",
      workspace: { tenantId: "tenant-a" },
    });
  });
});
