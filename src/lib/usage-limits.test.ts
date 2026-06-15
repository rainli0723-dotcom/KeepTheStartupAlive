import { describe, expect, it } from "vitest";

function isOverLimit(used: number, limit: number) {
  return used >= limit;
}

describe("tenant usage limits", () => {
  it("blocks usage when the monthly limit is reached", () => {
    expect(isOverLimit(10, 10)).toBe(true);
    expect(isOverLimit(11, 10)).toBe(true);
  });

  it("allows usage below the monthly limit", () => {
    expect(isOverLimit(9, 10)).toBe(false);
  });
});
