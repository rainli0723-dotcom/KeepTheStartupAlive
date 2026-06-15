export const organizationStages = ["opc", "small_team", "seed", "growth", "mature", "incubator"] as const;

export const sandboxTypes = [
  "legal_compliance",
  "financing",
  "pricing",
  "market_competition",
  "organization",
  "crisis",
  "growth",
] as const;

export type OrganizationStage = (typeof organizationStages)[number];
export type SandboxType = (typeof sandboxTypes)[number];

export type ScenarioNodeDefinition = {
  nodeType: "event" | "decision" | "condition" | "result";
  title: string;
  content: string;
  effect?: Record<string, number>;
};

export type ScenarioDefinition = {
  name: string;
  sandboxType: string;
  stage: string;
  description: string;
  nodes: ScenarioNodeDefinition[];
};

export const defaultScenarios: ScenarioDefinition[] = [
  scenario("现金流融资压力", "financing", "seed", "投资人要求更快增长，但账上现金只够支撑 6 个月。"),
  scenario("合规整改窗口", "legal_compliance", "growth", "客户法务提出数据合规要求，销售节奏和产品交付同时受压。"),
  scenario("竞品低价进入", "market_competition", "growth", "竞争对手用低价抢占核心客户，团队需要判断是否跟进。"),
  scenario("核心成员离职", "organization", "seed", "核心技术负责人提出离职，产品路线和团队士气受到冲击。"),
  scenario("大客户交付危机", "crisis", "growth", "关键客户上线失败，续约、口碑和现金回款都面临风险。"),
  scenario("增长停滞复盘", "growth", "growth", "获客成本升高，增长曲线放缓，需要重新选择增长路径。"),
  scenario("定价体系重构", "pricing", "growth", "客户愿意购买，但现有价格无法覆盖交付成本。"),
];

export const defaultCapabilities = ["sales", "technology", "management", "operations", "financing", "strategy"] as const;

export type CapabilityKey = (typeof defaultCapabilities)[number];
export type CapabilityMap = Record<CapabilityKey, number>;

export type CustomMetric = {
  label: string;
  value: number;
};

export type OrganizationState = {
  cashflow: number;
  growth: number;
  teamPressure: number;
  technicalRisk: number;
  financingAttractiveness: number;
  survivalProbability: number;
};

export type RoleTemplateDefinition = {
  name: string;
  category: string;
  stages: OrganizationStage[];
  sandboxTypes: SandboxType[];
  defaultCapabilities: CapabilityMap;
  defaultMetrics: CustomMetric[];
  description: string;
};

const allStages = [...organizationStages];
const allSandboxes = [...sandboxTypes];

export const roleTemplates: RoleTemplateDefinition[] = [
  role("创始人", "core", allStages, allSandboxes, [74, 58, 82, 72, 74, 88], "关注愿景、速度和资源约束，容易在增长与风险之间拉扯。"),
  role("CEO", "core", allStages, allSandboxes, [78, 55, 88, 82, 78, 90], "负责最终取舍，倾向把不同观点收束成可执行决策。"),
  role("CTO", "core", allStages, ["pricing", "market_competition", "organization", "crisis", "growth"], [36, 94, 66, 68, 34, 72], "关注技术债、交付风险、系统可扩展性和研发节奏。"),
  role("CLO", "core", ["seed", "growth", "mature", "incubator"], ["legal_compliance", "financing", "crisis"], [30, 38, 72, 66, 54, 78], "关注合同、合规、数据风险和企业客户的法务要求。"),
  role("COO", "core", ["small_team", "seed", "growth", "mature", "incubator"], ["organization", "crisis", "growth"], [66, 42, 88, 92, 48, 78], "关注流程、交付、人效和跨团队协同。"),
  role("CFO", "core", ["seed", "growth", "mature", "incubator"], ["financing", "pricing", "crisis", "growth"], [48, 32, 76, 70, 94, 84], "关注现金流、毛利、预算、融资窗口和财务风险。"),
  role("CMO", "core", ["seed", "growth", "mature", "incubator"], ["pricing", "market_competition", "growth"], [90, 34, 70, 78, 58, 78], "关注定位、获客、品牌和增长叙事。"),
  role("产品负责人", "business", ["opc", "small_team", "seed", "growth", "mature"], ["pricing", "market_competition", "growth"], [64, 72, 70, 78, 42, 82], "关注用户价值、路线图优先级和需求取舍。"),
  role("销售负责人", "business", ["small_team", "seed", "growth", "mature"], ["pricing", "market_competition", "growth"], [94, 28, 68, 72, 62, 72], "关注客户成交、销售周期、价格阻力和一线反馈。"),
  role("运营负责人", "business", ["small_team", "seed", "growth", "mature"], ["organization", "crisis", "growth"], [68, 36, 76, 90, 46, 70], "关注日常运转、交付效率和流程稳定性。"),
  role("客户成功负责人", "business", ["growth", "mature"], ["pricing", "market_competition", "growth"], [82, 42, 72, 82, 50, 72], "关注续约、客户健康度、上线质量和长期价值。"),
  role("市场负责人", "business", ["seed", "growth", "mature"], ["market_competition", "growth"], [86, 32, 66, 74, 52, 78], "关注传播、渠道、线索质量和竞品打法。"),
  role("法务顾问", "support", ["opc", "small_team", "seed", "growth", "mature", "incubator"], ["legal_compliance", "financing", "crisis"], [30, 35, 65, 62, 55, 80], "关注合同条款、责任边界和争议风险。"),
  role("合规负责人", "support", ["growth", "mature", "incubator"], ["legal_compliance", "crisis"], [26, 38, 76, 82, 48, 82], "关注制度、审计、数据处理和监管要求。"),
  role("HR 负责人", "support", ["growth", "mature"], ["organization", "crisis"], [48, 24, 86, 76, 36, 72], "关注组织能力、激励、招聘和关键人才风险。"),
  role("财务负责人", "support", ["small_team", "seed", "growth", "mature"], ["financing", "pricing", "crisis"], [42, 28, 72, 74, 88, 76], "关注预算、回款、成本结构和财务纪律。"),
  role("安全负责人", "support", ["seed", "growth", "mature"], ["legal_compliance", "crisis"], [30, 86, 62, 72, 46, 78], "关注数据安全、权限、审计和事故响应。"),
  role("投资人", "external", ["opc", "small_team", "seed", "growth", "incubator"], ["financing", "growth", "crisis"], [72, 48, 76, 62, 96, 88], "关注增长质量、融资叙事、资本效率和退出路径。"),
  role("董事会成员", "external", ["growth", "mature"], ["financing", "legal_compliance", "crisis", "organization"], [64, 42, 86, 70, 88, 94], "关注治理、重大风险和长期战略。"),
  role("外部顾问", "external", ["opc", "small_team", "seed", "incubator"], allSandboxes, [72, 58, 82, 76, 76, 88], "提供结构化追问，帮助团队看见盲区。"),
  role("客户代表", "external", ["seed", "growth", "mature", "incubator"], ["market_competition", "growth", "crisis"], [62, 70, 70, 72, 62, 88], "代表客户视角，关注真实痛点、采购阻力和落地效果。"),
  role("行业专家", "external", ["seed", "growth", "mature"], ["market_competition", "growth"], [74, 48, 64, 70, 58, 74], "提供行业经验、竞争判断和常见失败模式。"),
  role("创业导师", "external", ["opc", "small_team", "seed", "incubator"], allSandboxes, [72, 58, 84, 76, 76, 88], "用导师视角追问商业模式、节奏和创始团队盲区。"),
  role("监管观察员", "external", ["growth", "mature"], ["legal_compliance", "crisis"], [18, 30, 80, 78, 36, 82], "从监管和公共风险角度提出提醒。"),
  role("竞争对手观察员", "external", ["seed", "growth", "mature"], ["market_competition", "pricing", "growth"], [78, 62, 60, 68, 58, 86], "模拟竞争对手可能采取的反制动作。"),
  role("事业部负责人", "business", ["growth", "mature"], ["organization", "legal_compliance", "growth"], [76, 42, 84, 82, 58, 78], "关注业务单元目标、资源争夺和跨部门执行。"),
  role("风控负责人", "support", ["growth", "mature"], ["legal_compliance", "financing", "crisis"], [36, 46, 82, 78, 78, 90], "关注风险识别、授权边界、内控和重大决策的兜底机制。"),
  role("其他负责人", "custom", allStages, allSandboxes, [60, 60, 60, 60, 60, 60], "用于承载用户自定义的企业内部角色。"),
  role("AI 策略负责人", "future", ["growth", "mature"], ["organization", "market_competition", "legal_compliance", "growth"], [74, 72, 78, 78, 60, 88], "关注 AI 能力边界、自动化 ROI 和组织采用风险。"),
  role("私有化交付负责人", "future", ["growth", "mature"], ["legal_compliance", "crisis", "growth"], [52, 70, 76, 88, 54, 82], "关注企业部署、交付周期、环境差异和运维责任。"),
];

export function getRecommendedRoleTemplates(input: {
  organizationStage: OrganizationStage;
  sandboxType: SandboxType;
}) {
  const direct = roleTemplates.filter(
    (roleTemplate) =>
      roleTemplate.stages.includes(input.organizationStage) &&
      roleTemplate.sandboxTypes.includes(input.sandboxType),
  );
  const requiredNames = ["创始人", "CEO", "CTO", "CLO"];
  const required = roleTemplates.filter((roleTemplate) => requiredNames.includes(roleTemplate.name));
  const merged = new Map<string, RoleTemplateDefinition>();
  [...required, ...direct].forEach((roleTemplate) => merged.set(roleTemplate.name, roleTemplate));
  return [...merged.values()];
}

export function validateCapabilities(capabilities: CapabilityMap) {
  for (const capability of defaultCapabilities) {
    const value = capabilities[capability];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`${capability} must be between 0 and 100`);
    }
  }
  return capabilities;
}

export function normalizeCustomMetrics(metrics: CustomMetric[]) {
  return metrics
    .map((metric) => ({
      label: metric.label.trim(),
      value: clamp(Math.round(metric.value)),
    }))
    .filter((metric) => metric.label.length > 0);
}

export function resolveMeetingChair(input: {
  userRole: string;
  sandboxType: SandboxType;
  availableRoles: string[];
}) {
  if (["CEO", "创始人"].includes(input.userRole)) {
    return { chair: "用户", reason: "用户以 CEO/创始人身份主持会议" };
  }
  if (input.sandboxType === "legal_compliance") {
    const legalChair = ["CLO", "法务顾问", "合规负责人"].find((roleName) => input.availableRoles.includes(roleName));
    if (legalChair) return { chair: legalChair, reason: "合规议题由法务或合规角色主持" };
  }
  const defaultChair = ["CEO", "创始人"].find((roleName) => input.availableRoles.includes(roleName));
  return {
    chair: defaultChair ?? input.availableRoles[0] ?? "会议主持人",
    reason: "由最接近经营决策的角色主持",
  };
}

export function applyEventImpact(state: OrganizationState, impact: Partial<OrganizationState>) {
  return {
    cashflow: clamp(state.cashflow + (impact.cashflow ?? 0)),
    growth: clamp(state.growth + (impact.growth ?? 0)),
    teamPressure: clamp(state.teamPressure + (impact.teamPressure ?? 0)),
    technicalRisk: clamp(state.technicalRisk + (impact.technicalRisk ?? 0)),
    financingAttractiveness: clamp(state.financingAttractiveness + (impact.financingAttractiveness ?? 0)),
    survivalProbability: clamp(state.survivalProbability + (impact.survivalProbability ?? 0)),
  };
}

export function defaultOrganizationState(): OrganizationState {
  return {
    cashflow: 62,
    growth: 48,
    teamPressure: 36,
    technicalRisk: 42,
    financingAttractiveness: 52,
    survivalProbability: 68,
  };
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function role(
  name: string,
  category: string,
  stages: readonly OrganizationStage[],
  sandboxTypes: readonly SandboxType[],
  values: [number, number, number, number, number, number],
  description: string,
): RoleTemplateDefinition {
  return {
    name,
    category,
    stages: [...stages],
    sandboxTypes: [...sandboxTypes],
    defaultCapabilities: {
      sales: values[0],
      technology: values[1],
      management: values[2],
      operations: values[3],
      financing: values[4],
      strategy: values[5],
    },
    defaultMetrics: [
      { label: "判断速度", value: 76 },
      { label: "风险偏好", value: 38 },
      { label: "执行压力", value: 72 },
      { label: "合规敏感度", value: category === "support" ? 82 : 58 },
    ],
    description,
  };
}

function scenario(name: string, sandboxType: SandboxType, stage: OrganizationStage, description: string): ScenarioDefinition {
  return {
    name,
    sandboxType,
    stage,
    description,
    nodes: [
      { nodeType: "event", title: name, content: description },
      { nodeType: "decision", title: "关键取舍", content: "团队需要在速度、现金、风险和客户价值之间做出选择。" },
      { nodeType: "result", title: "阶段结果", content: "结果取决于会议决策、角色分歧和后续执行质量。" },
    ],
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
