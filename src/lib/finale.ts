import type { OrganizationState } from "./domain";

export type FinaleReport = {
  outcomeType: string;
  title: string;
  summary: string;
  score: number;
  keyDrivers: string[];
  decisionTrace: string[];
  alternativeEndings: string[];
  nextActions: string[];
};

type FinaleInput = {
  state: OrganizationState;
  completedCycles: number;
  events: { eventType: string; title: string; description: string; cycle: number }[];
  meetings: { conclusion: string; cycle: number }[];
};

export function buildTwentyRoundFinale(input: FinaleInput): FinaleReport {
  const { state, events, meetings } = input;
  const score = Math.round(
    state.cashflow * 0.22 +
      state.growth * 0.18 +
      (100 - state.teamPressure) * 0.16 +
      (100 - state.technicalRisk) * 0.16 +
      state.financingAttractiveness * 0.14 +
      state.survivalProbability * 0.14,
  );

  const outcome =
    score >= 86
      ? { type: "ipo", title: "上市准备结局" }
      : score >= 74
        ? { type: "scale_up", title: "高质量扩张结局" }
        : score >= 62
          ? { type: "stable_growth", title: "稳态续航结局" }
          : score >= 48
            ? { type: "restructure", title: "高压重组结局" }
            : state.cashflow < 30 || state.survivalProbability < 35
              ? { type: "bankruptcy", title: "破产清算风险结局" }
              : { type: "pivot", title: "战略转向结局" };

  const keyDrivers = [
    `现金流健康度 ${state.cashflow}`,
    `增长动能 ${state.growth}`,
    `团队压力 ${state.teamPressure}`,
    `技术风险 ${state.technicalRisk}`,
    `融资吸引力 ${state.financingAttractiveness}`,
    `生存概率 ${state.survivalProbability}`,
  ];

  return {
    outcomeType: outcome.type,
    title: outcome.title,
    score,
    summary:
      score >= 74
        ? "组织在 20 轮模拟中形成了较强的经营韧性和增长叙事，具备进入下一阶段融资、并购谈判或上市准备的基础。"
        : score >= 62
          ? "组织在 20 轮模拟后保持基本续航能力，适合继续做稳健增长、组织补强和专项风险修复。"
          : score >= 48
            ? "组织暴露出较高经营压力，需要通过收缩战线、优化现金流和重建关键岗位来恢复韧性。"
            : "组织在模拟中出现连续性风险，需优先考虑破产保护、业务收缩、债务重谈或治理重组。",
    keyDrivers,
    decisionTrace: meetings.slice(0, 5).map((meeting) => `第 ${meeting.cycle} 轮会议结论：${meeting.conclusion}`),
    alternativeEndings: events.slice(0, 4).map((event) => `若第 ${event.cycle} 轮事件处理不同，可能改变：${event.title}`),
    nextActions: [
      state.cashflow < 60 ? "建立 13 周现金流滚动预测，并设置支出冻结线。" : "保持现金流纪律，避免扩张期固定成本过快上升。",
      state.technicalRisk > 55 ? "安排技术债、交付风险和数据安全专项审计。" : "把技术能力沉淀为可复制交付标准。",
      state.teamPressure > 60 ? "重做岗位分工、会议节奏和关键角色备份。" : "继续用角色数字孪生进行关键会议预演。",
      state.financingAttractiveness < 60 ? "重构融资叙事，补充客户、收入和合规证据链。" : "准备下一阶段融资、并购或战略合作材料。",
    ],
  };
}
