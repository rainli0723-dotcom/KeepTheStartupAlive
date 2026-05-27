export const organizationStages = [
  "opc",
  "small_team",
  "seed",
  "growth",
  "mature",
  "incubator",
] as const;

export const sandboxTypes = [
  "legal_compliance",
  "financing",
  "pricing",
  "market_competition",
  "organization",
  "crisis",
  "growth",
] as const;

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
  {
    name: "天使轮融资成功",
    sandboxType: "financing",
    stage: "seed",
    description: "早期融资成功，资金到账，但估值较低，需要规划资金使用节奏",
    nodes: [
      { nodeType: "event", title: "投资意向书签署", content: "投资方发出TS，估值800万，稀释15%股份，要求董事会席位和优先清算权" },
      { nodeType: "decision", title: "是否接受条款", content: "接受低估值换取快速到账，还是继续谈判争取更好条款", effect: { cashflow: 15, financingAttractiveness: -10 } },
      { nodeType: "event", title: "资金到账", content: "200万天使资金到账，账上资金从30万增加到230万", effect: { cashflow: 30 } },
      { nodeType: "decision", title: "资金分配", content: "如何分配这笔资金：招聘、研发、市场还是储备", effect: { growth: 10, cashflow: -10 } },
      { nodeType: "result", title: "融资完成", content: "天使轮融资完成，进入下一阶段" },
    ],
  },
  {
    name: "A轮融资谈判",
    sandboxType: "financing",
    stage: "growth",
    description: "A轮融资进行中，多家机构接触，需要展示增长数据",
    nodes: [
      { nodeType: "event", title: "投资机构DD", content: "三家机构同时进入DD阶段，要求提供财务数据、团队背景和产品数据" },
      { nodeType: "decision", title: "选择哪家", content: "选择战略型投资人（有资源但管得宽）还是财务型投资人（给钱多但盯得紧）", effect: { financingAttractiveness: 15, teamPressure: 10 } },
      { nodeType: "condition", title: "数据验证", content: "月度环比增长率是否达到40%，ARR是否过500万", effect: { growth: 20 } },
      { nodeType: "event", title: "签署SPA", content: "估值5000万，融资1500万，稀释23%股份" },
      { nodeType: "result", title: "A轮关闭", content: "A轮融资完成，估值提升10倍" },
    ],
  },
  {
    name: "融资失败应对",
    sandboxType: "financing",
    stage: "seed",
    description: "融资谈判破裂，需要快速调整策略或面临资金链断裂风险",
    nodes: [
      { nodeType: "event", title: "融资失败通知", content: "连续被5家机构拒绝，TS被撤回，账上资金仅够运营3个月", effect: { cashflow: -25, financingAttractiveness: -15 } },
      { nodeType: "decision", title: "应对策略", content: "收缩战线、裁员降本，还是寻找战略投资人或被并购", effect: { teamPressure: 20, cashflow: -15 } },
      { nodeType: "event", title: "紧急融资", content: "创始团队抵押个人资产，引入过桥贷款", effect: { cashflow: 10, teamPressure: 15 } },
      { nodeType: "decision", title: "寻找买家", content: "是否接受被大厂并购，保留团队但失去独立性", effect: { survivalProbability: 20 } },
      { nodeType: "result", title: "结局待定", content: "根据决策走向不同结局" },
    ],
  },
  {
    name: "产品上线发布",
    sandboxType: "growth",
    stage: "seed",
    description: "核心产品正式发布，面临市场验证和用户获取挑战",
    nodes: [
      { nodeType: "event", title: "产品正式发布", content: "V1.0版本上线，获得首批100个付费用户，但NPS低于预期", effect: { growth: 10, teamPressure: 5 } },
      { nodeType: "decision", title: "定价策略", content: "低价切入市场还是高品质高价策略", effect: { cashflow: 15, growth: 10 } },
      { nodeType: "event", title: "用户反馈收集", content: "首批用户反馈：功能满足度70分，但交付速度和售后支持不满", effect: { growth: 5, teamPressure: 10 } },
      { nodeType: "decision", title: "迭代方向", content: "快速迭代补功能，还是深耕核心功能做差异化", effect: { technicalRisk: 10, growth: 15 } },
      { nodeType: "result", title: "产品市场匹配验证", content: "根据决策形成不同的产品发展方向" },
    ],
  },
  {
    name: "竞品入侵市场",
    sandboxType: "market_competition",
    stage: "growth",
    description: "头部竞争对手发布类似产品，开始价格战和客户争夺",
    nodes: [
      { nodeType: "event", title: "竞品发布", content: "大厂推出同类产品，价格低40%，目标客户重叠度80%", effect: { growth: -15, financingAttractiveness: -10 } },
      { nodeType: "decision", title: "应对策略", content: "打价格战、强调差异化、还是深耕细分市场", effect: { cashflow: -20, growth: -10 } },
      { nodeType: "event", title: "客户流失", content: "流失20%客户，主要是被价格敏感型企业客户挖走", effect: { cashflow: -15, growth: -10 } },
      { nodeType: "decision", title: "反击计划", content: "研发新一代功能、拓展渠道还是建立护城河", effect: { technicalRisk: 15, financingAttractiveness: -5 } },
      { nodeType: "result", title: "市场竞争格局", content: "市场进入新平衡" },
    ],
  },
  {
    name: "核心成员离职",
    sandboxType: "organization",
    stage: "growth",
    description: "CTO突然提出离职，技术和产品交付面临风险",
    nodes: [
      { nodeType: "event", title: "CTO离职通知", content: "CTO因个人原因提出一个月后离职，技术团队人心浮动", effect: { teamPressure: 25, technicalRisk: 15 } },
      { nodeType: "decision", title: "留人策略", content: "加薪挽留、股权激励还是尊重选择开始招聘", effect: { cashflow: -20, teamPressure: -10 } },
      { nodeType: "event", title: "技术债爆发", content: "核心模块缺乏文档，接替者需要3个月才能独立工作", effect: { technicalRisk: 20, teamPressure: 10 } },
      { nodeType: "decision", title: "紧急补救", content: "外包过渡、内部提拔还是外部招聘", effect: { cashflow: -15, technicalRisk: 10 } },
      { nodeType: "result", title: "组织稳定", content: "团队恢复稳定但成本增加" },
    ],
  },
  {
    name: "监管政策收紧",
    sandboxType: "legal_compliance",
    stage: "mature",
    description: "行业新规出台，现有业务模式面临合规压力",
    nodes: [
      { nodeType: "event", title: "新规发布", content: "监管部门发布新规，现有业务需要整改或面临罚款", effect: { financingAttractiveness: -15, cashflow: -20 } },
      { nodeType: "decision", title: "整改策略", content: "立即合规整改、观望过渡期还是转型业务模式", effect: { technicalRisk: 10, cashflow: -15 } },
      { nodeType: "event", title: "整改通知", content: "被要求限期整改，整改期间业务暂停", effect: { cashflow: -25, teamPressure: 10 } },
      { nodeType: "decision", title: "应对方案", content: "投入合规系统、引入合规顾问还是寻求政策豁免", effect: { cashflow: -20, financingAttractiveness: 10 } },
      { nodeType: "result", title: "合规过关", content: "整改完成，业务恢复正常" },
    ],
  },
  {
    name: "增长停滞危机",
    sandboxType: "growth",
    stage: "growth",
    description: "业务增长突然放缓，环比增长率从40%降到5%，投资人心急",
    nodes: [
      { nodeType: "event", title: "增长急刹", content: "月度环比增长从40%骤降至5%，核心指标停滞", effect: { growth: -20, financingAttractiveness: -15 } },
      { nodeType: "decision", title: "诊断方向", content: "产品问题、渠道问题还是市场竞争问题", effect: { technicalRisk: 10, teamPressure: 10 } },
      { nodeType: "event", title: "用户调研", content: "调研发现：老用户活跃度下降，新用户转化漏斗堵塞", effect: { growth: -10 } },
      { nodeType: "decision", title: "破局策略", content: "产品迭代、渠道拓展还是营销破圈", effect: { cashflow: -20, growth: 15 } },
      { nodeType: "result", title: "重启增长", content: "根据策略执行情况，增长开始恢复" },
    ],
  },
  {
    name: "IPO上市准备",
    sandboxType: "financing",
    stage: "mature",
    description: "公司达到上市门槛，启动IPO准备，需要进行一系列规范化改革",
    nodes: [
      { nodeType: "event", title: "IPO启动", content: "董事会决定启动IPO，聘请投行辅导，开始财务规范化", effect: { teamPressure: 15, financingAttractiveness: 20 } },
      { nodeType: "decision", title: "上市地点", content: "选择港股、A股还是美股，各有优劣", effect: { cashflow: -10, financingAttractiveness: 15 } },
      { nodeType: "event", title: "审计整改", content: "三年财务数据追溯整改，规范治理结构", effect: { teamPressure: 20, cashflow: -15 } },
      { nodeType: "decision", title: "股权激励", content: "上市前是否做核心员工股权激励", effect: { teamPressure: -10, cashflow: -5 } },
      { nodeType: "result", title: "IPO成功", content: "公司正式上市，市值XX亿" },
    ],
  },
  {
    name: "并购整合挑战",
    sandboxType: "financing",
    stage: "growth",
    description: "完成对一家竞品的收购，面临文化冲突和整合难题",
    nodes: [
      { nodeType: "event", title: "并购完成", content: "以3000万现金+500万股票收购竞品，获得20%市场份额", effect: { cashflow: -20, growth: 20 } },
      { nodeType: "decision", title: "整合策略", content: "保持被收购公司独立运营，还是完全融入母公司体系", effect: { teamPressure: 20, technicalRisk: 10 } },
      { nodeType: "event", title: "文化冲突", content: "两家团队在价值观、工作方式上产生矛盾，多名核心员工离职", effect: { teamPressure: 25, technicalRisk: 15 } },
      { nodeType: "decision", title: "危机处理", content: "安抚老团队、引入新领导还是重新定义公司文化", effect: { teamPressure: 10, growth: -10 } },
      { nodeType: "result", title: "整合完成", content: "公司恢复稳定，获得整合红利" },
    ],
  },
];

export type OrganizationStage = (typeof organizationStages)[number];
export type SandboxType = (typeof sandboxTypes)[number];

export const defaultCapabilities = [
  "sales",
  "technology",
  "management",
  "operations",
  "financing",
  "strategy",
] as const;

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
  role("创始人", "core", allStages, allSandboxes, [72, 58, 78, 70, 72, 86], "组织愿景、关键取舍和最终风险承担者"),
  role("CEO", "core", allStages, allSandboxes, [78, 55, 86, 82, 78, 88], "负责经营节奏、资源分配和跨部门决策"),
  role("CTO", "core", allStages, ["pricing", "market_competition", "organization", "crisis", "growth"], [34, 94, 66, 68, 34, 72], "负责技术路线、交付风险和系统能力边界"),
  role("CLO", "core", ["seed", "growth", "mature", "incubator"], ["legal_compliance", "financing", "crisis"], [32, 38, 72, 66, 54, 76], "负责法务、合规、合同和监管风险判断"),
  role("COO", "core", ["small_team", "seed", "growth", "mature", "incubator"], ["organization", "crisis", "growth"], [66, 42, 88, 92, 48, 76], "负责运营体系、交付效率和流程稳定性"),
  role("CFO", "core", ["seed", "growth", "mature", "incubator"], ["financing", "pricing", "crisis", "growth"], [48, 32, 76, 70, 92, 82], "负责现金流、预算、融资节奏和财务风险"),
  role("CMO", "core", ["seed", "growth", "mature", "incubator"], ["pricing", "market_competition", "growth"], [88, 34, 70, 78, 58, 78], "负责市场定位、品牌传播和增长策略"),
  role("产品负责人", "business", ["opc", "small_team", "seed", "growth", "mature"], ["pricing", "market_competition", "growth"], [62, 70, 68, 78, 42, 82], "负责产品路径、用户价值和版本优先级"),
  role("销售负责人", "business", ["small_team", "seed", "growth", "mature"], ["pricing", "market_competition", "growth"], [94, 28, 68, 72, 62, 70], "负责客户转化、渠道打法和销售反馈"),
  role("运营负责人", "business", ["small_team", "seed", "growth", "mature"], ["organization", "crisis", "growth"], [68, 36, 74, 90, 46, 68], "负责流程、用户运营和日常执行"),
  role("客户成功负责人", "business", ["growth", "mature"], ["pricing", "market_competition", "growth"], [82, 42, 72, 82, 50, 70], "负责留存、续费和客户风险识别"),
  role("市场负责人", "business", ["seed", "growth", "mature"], ["market_competition", "growth"], [84, 32, 66, 74, 52, 78], "负责传播、获客和竞品响应"),
  role("法务顾问", "support", ["opc", "small_team", "seed", "growth", "mature", "incubator"], ["legal_compliance", "financing", "crisis"], [30, 35, 65, 62, 55, 78], "负责合同、股权、劳动和争议处理建议"),
  role("合规负责人", "support", ["growth", "mature", "incubator"], ["legal_compliance", "crisis"], [26, 38, 76, 82, 48, 80], "负责监管、内控和合规流程"),
  role("人力负责人", "support", ["growth", "mature"], ["organization", "crisis"], [48, 24, 86, 76, 36, 70], "负责组织设计、绩效和人才风险"),
  role("财务负责人", "support", ["small_team", "seed", "growth", "mature"], ["financing", "pricing", "crisis"], [42, 28, 72, 74, 88, 74], "负责账务、预算和经营数据"),
  role("数据分析师", "support", ["seed", "growth", "mature"], ["pricing", "market_competition", "growth"], [44, 78, 54, 68, 50, 78], "负责指标洞察和策略验证"),
  role("技术架构师", "support", ["growth", "mature"], ["crisis", "growth"], [28, 96, 58, 64, 30, 74], "负责架构稳定性、扩展性和技术债判断"),
  role("投资人", "external", ["opc", "small_team", "seed", "growth", "incubator"], ["financing", "growth", "crisis"], [72, 48, 76, 62, 96, 88], "从资本效率和退出路径评估方案"),
  role("董事会成员", "external", ["growth", "mature"], ["financing", "legal_compliance", "crisis", "organization"], [64, 42, 86, 70, 88, 94], "代表治理视角审视重大决策"),
  role("创业导师", "external", ["opc", "small_team", "seed", "incubator"], allSandboxes, [72, 58, 82, 76, 76, 88], "提供跨案例经验和风险提示"),
  role("行业专家", "external", ["seed", "growth", "mature", "incubator"], ["market_competition", "growth", "crisis"], [62, 70, 70, 72, 62, 88], "提供行业趋势和竞争格局判断"),
  role("客户代表", "external", allStages, ["pricing", "market_competition", "growth"], [70, 30, 42, 52, 30, 56], "代表客户需求、预算和使用阻力"),
  role("供应商代表", "external", ["growth", "mature"], ["crisis", "pricing", "organization"], [62, 36, 56, 76, 42, 58], "代表供应链、交付和价格压力"),
  role("合作伙伴", "external", ["seed", "growth", "mature"], ["market_competition", "growth"], [74, 48, 64, 70, 58, 74], "评估联合方案和生态资源"),
  role("监管方", "external", ["growth", "mature"], ["legal_compliance", "crisis"], [18, 30, 80, 78, 36, 82], "代表政策、许可和监管边界"),
  role("竞争对手观察员", "external", ["seed", "growth", "mature"], ["market_competition", "pricing", "growth"], [78, 62, 60, 68, 58, 86], "模拟竞品反应和市场博弈"),
  role("区域负责人", "future", ["growth", "mature"], ["organization", "growth", "crisis"], [76, 38, 82, 84, 56, 76], "负责区域市场和本地化增长"),
  role("事业部负责人", "future", ["growth", "mature"], ["organization", "market_competition", "legal_compliance", "growth"], [74, 52, 88, 82, 64, 86], "负责业务单元经营结果"),
  role("并购顾问", "future", ["growth", "mature"], ["financing", "legal_compliance", "growth"], [58, 44, 70, 68, 92, 90], "评估并购、整合和估值风险"),
  role("品牌负责人", "future", ["growth", "mature"], ["market_competition", "crisis", "growth"], [78, 32, 66, 70, 48, 80], "负责品牌资产、声誉和公关风险"),
  role("政府关系负责人", "future", ["growth", "mature"], ["legal_compliance", "crisis", "growth"], [58, 30, 74, 72, 54, 86], "负责政策沟通和地方资源协调"),
  role("国际化负责人", "future", ["growth", "mature"], ["market_competition", "legal_compliance", "growth"], [76, 48, 78, 76, 66, 88], "负责海外市场进入和跨境经营风险"),
  role("风控负责人", "future", ["growth", "mature"], ["legal_compliance", "financing", "crisis"], [36, 46, 82, 78, 78, 90], "负责风险模型、预警和缓释策略"),
];

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
      { label: "理性", value: 76 },
      { label: "情绪化", value: 34 },
      { label: "抗压能力", value: 72 },
      { label: "合规敏感度", value: category === "support" ? 82 : 58 },
    ],
    description,
  };
}

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
  const required = roleTemplates.filter((roleTemplate) =>
    requiredNames.includes(roleTemplate.name),
  );
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
    const legalChair = ["CLO", "法务顾问", "合规负责人"].find((roleName) =>
      input.availableRoles.includes(roleName),
    );
    if (legalChair) return { chair: legalChair, reason: "法务/合规沙盘由专业负责人主持" };
  }
  const defaultChair = ["CEO", "创始人"].find((roleName) => input.availableRoles.includes(roleName));
  return {
    chair: defaultChair ?? input.availableRoles[0] ?? "系统主持人",
    reason: "由组织负责人或首个可用角色主持会议",
  };
}

export function applyEventImpact(state: OrganizationState, impact: Partial<OrganizationState>) {
  return {
    cashflow: clamp(state.cashflow + (impact.cashflow ?? 0)),
    growth: clamp(state.growth + (impact.growth ?? 0)),
    teamPressure: clamp(state.teamPressure + (impact.teamPressure ?? 0)),
    technicalRisk: clamp(state.technicalRisk + (impact.technicalRisk ?? 0)),
    financingAttractiveness: clamp(
      state.financingAttractiveness + (impact.financingAttractiveness ?? 0),
    ),
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
