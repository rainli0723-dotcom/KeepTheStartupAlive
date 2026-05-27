import { describe, expect, it } from "vitest";
import { metricsFromLines, metricsToLines, resolveEditableRole } from "./team-member-form-utils";

describe("team member form helpers", () => {
  it("converts editable metric lines into API payload metrics", () => {
    expect(metricsFromLines("rationality:80\npressure:120\n\nempty:\nempathy:not-a-number")).toEqual([
      { label: "rationality", value: 80 },
      { label: "pressure", value: 120 },
      { label: "empathy", value: 50 },
    ]);
  });

  it("converts stored metrics back to editable lines", () => {
    expect(
      metricsToLines([
        { label: "rationality", value: 80 },
        { label: "empathy", value: 72 },
      ]),
    ).toBe("rationality:80\nempathy:72");
  });

  it("uses a manually typed role before the selected preset", () => {
    expect(resolveEditableRole("CEO", "CLO")).toBe("CLO");
    expect(resolveEditableRole("CIO", "")).toBe("CIO");
  });
});
