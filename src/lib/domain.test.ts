import { describe, expect, it } from "vitest";
import {
  applyEventImpact,
  defaultCapabilities,
  getRecommendedRoleTemplates,
  normalizeCustomMetrics,
  resolveMeetingChair,
  validateCapabilities,
} from "./domain";
import { buildTwentyRoundFinale } from "./finale";
import { getSkillPreset, skillPresets } from "./skill-presets";

describe("role template recommendations", () => {
  it("recommends virtual executive and advisor roles for OPC workspaces", () => {
    const roles = getRecommendedRoleTemplates({
      organizationStage: "opc",
      sandboxType: "growth",
    }).map((role) => role.name);

    expect(roles).toContain("创始人");
    expect(roles).toContain("CEO");
    expect(roles).toContain("CTO");
    expect(roles).toContain("CLO");
    expect(roles).toContain("创业导师");
  });

  it("enables governance, compliance, and business-unit roles for mature company legal sandboxes", () => {
    const roles = getRecommendedRoleTemplates({
      organizationStage: "mature",
      sandboxType: "legal_compliance",
    }).map((role) => role.name);

    expect(roles).toContain("董事会成员");
    expect(roles).toContain("合规负责人");
    expect(roles).toContain("事业部负责人");
    expect(roles).toContain("法务顾问");
  });
});

describe("capability and custom metric rules", () => {
  it("keeps six default capabilities in the expected order", () => {
    expect(defaultCapabilities).toEqual([
      "sales",
      "technology",
      "management",
      "operations",
      "financing",
      "strategy",
    ]);
  });

  it("rejects capability values outside the 0-100 range", () => {
    expect(() =>
      validateCapabilities({
        sales: 80,
        technology: 101,
        management: 70,
        operations: 70,
        financing: 60,
        strategy: 90,
      }),
    ).toThrow("technology");
  });

  it("normalizes editable custom indicators and removes empty labels", () => {
    expect(
      normalizeCustomMetrics([
        { label: "理性", value: 86 },
        { label: " ", value: 50 },
        { label: "情绪化", value: 120 },
      ]),
    ).toEqual([
      { label: "理性", value: 86 },
      { label: "情绪化", value: 100 },
    ]);
  });
});

describe("strategy meeting rules", () => {
  it("lets the user chair meetings when acting as founder or CEO", () => {
    expect(
      resolveMeetingChair({
        userRole: "CEO",
        sandboxType: "financing",
        availableRoles: ["创始人", "CEO", "CFO"],
      }),
    ).toEqual({ chair: "用户", reason: "用户以 CEO/创始人身份主持会议" });
  });

  it("uses CLO or legal advisor for legal compliance sandboxes when the user is not chairing", () => {
    expect(
      resolveMeetingChair({
        userRole: "CFO",
        sandboxType: "legal_compliance",
        availableRoles: ["CEO", "CLO", "法务顾问", "CFO"],
      }).chair,
    ).toBe("CLO");
  });
});

describe("business event impact rules", () => {
  it("clamps organization state after applying event impact", () => {
    const result = applyEventImpact(
      {
        cashflow: 95,
        growth: 20,
        teamPressure: 5,
        technicalRisk: 40,
        financingAttractiveness: 50,
        survivalProbability: 90,
      },
      {
        cashflow: 20,
        growth: -50,
        teamPressure: -20,
        technicalRisk: 80,
        financingAttractiveness: 10,
        survivalProbability: 20,
      },
    );

    expect(result.cashflow).toBe(100);
    expect(result.growth).toBe(0);
    expect(result.teamPressure).toBe(0);
    expect(result.technicalRisk).toBe(100);
    expect(result.survivalProbability).toBe(100);
  });
});

describe("twenty round finale fallback", () => {
  it("classifies strong final state as an IPO preparation ending", () => {
    const finale = buildTwentyRoundFinale({
      completedCycles: 20,
      events: [],
      meetings: [],
      state: {
        cashflow: 92,
        growth: 90,
        teamPressure: 18,
        technicalRisk: 20,
        financingAttractiveness: 94,
        survivalProbability: 96,
      },
    });

    expect(finale.outcomeType).toBe("ipo");
    expect(finale.alternativeEndings).toEqual([]);
  });

  it("classifies weak final state as bankruptcy risk", () => {
    const finale = buildTwentyRoundFinale({
      completedCycles: 20,
      events: [],
      meetings: [],
      state: {
        cashflow: 18,
        growth: 20,
        teamPressure: 90,
        technicalRisk: 88,
        financingAttractiveness: 22,
        survivalProbability: 24,
      },
    });

    expect(finale.outcomeType).toBe("bankruptcy");
    expect(finale.nextActions.some((action) => action.includes("现金流"))).toBe(true);
  });
});

describe("skill preset library", () => {
  it("contains the requested external reference skill packs", () => {
    expect(skillPresets.map((preset) => preset.id)).toEqual([
      "metagpt",
      "tinytroupe",
      "agentverse",
      "the-agent-company",
      "claw-empire",
      "simulatrex",
      "generative-agents",
    ]);
  });

  it("exposes preset content for import into a digital twin", () => {
    const preset = getSkillPreset("metagpt");
    expect(preset?.content).toContain("SOP");
    expect(preset?.sourceUrl).toContain("github.com");
  });
});
