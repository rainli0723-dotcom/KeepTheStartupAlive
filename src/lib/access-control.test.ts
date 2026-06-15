import { describe, expect, it } from "vitest";
import { canEdit, scopedFinaleWhere, scopedMeetingWhere, scopedTeamMemberWhere } from "./access-control";

describe("tenant scoped access filters", () => {
  it("scopes team member access through workspace tenant", () => {
    expect(scopedTeamMemberWhere("member-1", "tenant-a")).toEqual({
      id: "member-1",
      workspace: { tenantId: "tenant-a" },
    });
  });

  it("scopes meeting access through workspace tenant", () => {
    expect(scopedMeetingWhere("meeting-1", "tenant-a")).toEqual({
      id: "meeting-1",
      workspace: { tenantId: "tenant-a" },
    });
  });

  it("scopes finale report access through workspace tenant", () => {
    expect(scopedFinaleWhere("finale-1", "tenant-a")).toEqual({
      id: "finale-1",
      workspace: { tenantId: "tenant-a" },
    });
  });

  it("only allows admin and editor to mutate business data", () => {
    expect(canEdit("admin")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });

  it("does not treat unknown roles as editable", () => {
    expect(canEdit("owner")).toBe(false);
    expect(canEdit("readonly")).toBe(false);
    expect(canEdit("")).toBe(false);
  });
});
