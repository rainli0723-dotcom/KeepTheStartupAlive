import { describe, expect, it } from "vitest";
import {
  appendInteractionLog,
  getLockedMemberIds,
  parseInteractionLog,
  serializeLockedMemberIds,
} from "./simulation-run";

describe("simulation run helpers", () => {
  it("serializes and restores locked member ids for a 20-round run", () => {
    const stored = serializeLockedMemberIds(["member-a", "member-b"]);

    expect(getLockedMemberIds(stored)).toEqual(["member-a", "member-b"]);
  });

  it("falls back to an empty locked member list when old role-name data is stored", () => {
    expect(getLockedMemberIds(JSON.stringify(["CEO", "CTO"]))).toEqual([]);
  });

  it("appends and parses meeting interaction logs with multi-speaker dialogue turns", () => {
    const base = "initial situation";
    const next = appendInteractionLog(base, {
      speaker: "user",
      message: "Should we cut price?",
      evaluation: "The question focuses on pricing strategy.",
      dialogueTurns: [
        { speaker: "CEO", message: "We need to test the cashflow impact first." },
        { speaker: "CTO", message: "Lower price may increase delivery pressure." },
      ],
      createdAt: "2026-05-24T10:00:00.000Z",
    });

    expect(next).toContain(base);
    expect(parseInteractionLog(next)).toEqual([
      {
        speaker: "user",
        message: "Should we cut price?",
        evaluation: "The question focuses on pricing strategy.",
        dialogueTurns: [
          { speaker: "CEO", message: "We need to test the cashflow impact first." },
          { speaker: "CTO", message: "Lower price may increase delivery pressure." },
        ],
        createdAt: "2026-05-24T10:00:00.000Z",
      },
    ]);
  });
});
