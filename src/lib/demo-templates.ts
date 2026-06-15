import type { SandboxType } from "./domain";

export type DemoTemplate = {
  id: string;
  name: string;
  description: string;
  roleNames: string[];
  userRole: string;
  sandboxType: SandboxType;
  workspaceName: string;
  meetingPrompt: string;
  organizationProfile: {
    name: string;
    stage: string;
    industry: string;
    product: string;
    market: string;
    cashflow: number;
    revenue: string;
    teamSize: number;
    governanceStructure: string;
    keyRisks: string[];
  };
  state: {
    cashflow: number;
    growth: number;
    teamPressure: number;
    technicalRisk: number;
    financingAttractiveness: number;
    survivalProbability: number;
  };
};

const baseRoles = ["CEO", "CTO", "CFO", "产品负责人", "销售负责人", "客户成功负责人", "法务顾问", "投资人"];

export const demoTemplates: DemoTemplate[] = [
  template({
    id: "saas-startup",
    name: "SaaS 创业公司",
    description: "适合演示续约、定价、融资和企业客户交付压力。",
    industry: "B2B SaaS",
    product: "面向销售团队的 AI 客户跟进与成交预测平台",
    sandboxType: "growth",
    prompt: "客户增长不错，但交付成本和续约风险开始上升，需要决定下一阶段增长策略。",
    risks: ["获客成本升高", "续约风险", "交付成本失控"],
  }),
  template({
    id: "ai-product-company",
    name: "AI 产品公司",
    description: "适合演示模型成本、数据安全、产品可信度和企业采购阻力。",
    industry: "AI 产品",
    product: "企业内部知识库智能助手",
    sandboxType: "legal_compliance",
    prompt: "大客户要求私有化部署和审计追踪，但团队担心交付周期被拖长。",
    risks: ["模型成本不可控", "数据合规压力", "私有化交付复杂"],
  }),
  template({
    id: "cross-border-commerce",
    name: "跨境电商",
    description: "适合演示现金流、库存、广告 ROI 和平台政策变化。",
    industry: "跨境电商",
    product: "多平台 DTC 消费品品牌",
    sandboxType: "crisis",
    prompt: "库存积压和广告成本同时上升，团队需要决定是否收缩 SKU 或加码爆品。",
    risks: ["库存积压", "广告 ROI 下滑", "平台政策变化"],
  }),
  template({
    id: "hardware-company",
    name: "硬件公司",
    description: "适合演示供应链、量产、渠道和售后压力。",
    industry: "智能硬件",
    product: "工业设备预测性维护网关",
    sandboxType: "market_competition",
    prompt: "试点客户反馈积极，但量产成本和渠道交付不稳定。",
    risks: ["供应链延迟", "毛利不足", "售后成本高"],
  }),
  template({
    id: "education-training",
    name: "教育培训",
    description: "适合演示获客、课程交付、复购和政策风险。",
    industry: "教育培训",
    product: "面向企业的 AI 能力训练营",
    sandboxType: "pricing",
    prompt: "销售希望低价快速签单，教研和交付团队担心课程质量被稀释。",
    risks: ["低价竞争", "交付质量不稳", "复购不足"],
  }),
  template({
    id: "healthcare-compliance",
    name: "医疗 / 合规行业",
    description: "适合演示医疗数据、合规审批、客户信任和销售周期。",
    industry: "医疗 SaaS",
    product: "诊所经营数据分析与患者随访系统",
    sandboxType: "legal_compliance",
    prompt: "客户愿意试用，但要求更严格的数据隔离、权限和审计。",
    risks: ["医疗数据合规", "销售周期长", "信任建立慢"],
  }),
  template({
    id: "portfolio-management",
    name: "投资机构投后管理",
    description: "适合演示投后风险预警、经营复盘和董事会沟通。",
    industry: "投资机构",
    product: "投后企业经营风险沙盘与复盘系统",
    sandboxType: "financing",
    prompt: "多家被投企业进入融资窗口，投资经理需要识别风险和辅导重点。",
    risks: ["信息滞后", "投后动作不可追踪", "融资节奏不一致"],
  }),
  template({
    id: "incubator-program",
    name: "孵化器训练营",
    description: "适合演示批量创业团队训练、导师复盘和样例报告。",
    industry: "创业孵化",
    product: "面向创业营的数字孪生经营训练平台",
    sandboxType: "organization",
    prompt: "孵化器希望把创业团队训练标准化，同时保留导师点评和复盘差异。",
    risks: ["训练标准不一", "导师时间不足", "复盘难沉淀"],
  }),
];

export function getDemoTemplate(id: string | null | undefined) {
  return demoTemplates.find((demoTemplate) => demoTemplate.id === id) ?? demoTemplates[0];
}

function template(input: {
  id: string;
  name: string;
  description: string;
  industry: string;
  product: string;
  sandboxType: SandboxType;
  prompt: string;
  risks: string[];
}): DemoTemplate {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    roleNames: baseRoles,
    userRole: "CEO",
    sandboxType: input.sandboxType,
    workspaceName: `${input.name} - To B 演示沙盘`,
    meetingPrompt: input.prompt,
    organizationProfile: {
      name: input.name,
      stage: "growth",
      industry: input.industry,
      product: input.product,
      market: "面向企业客户和专业服务场景，需要证明 ROI、可控风险和交付稳定性。",
      cashflow: 58,
      revenue: "年收入约 800 万，关键客户集中，仍处于增长与交付并重阶段。",
      teamSize: 32,
      governanceStructure: "CEO 负责最终决策，核心负责人参与经营会议，重大风险进入管理层复盘。",
      keyRisks: input.risks,
    },
    state: {
      cashflow: 58,
      growth: 62,
      teamPressure: 66,
      technicalRisk: 54,
      financingAttractiveness: 60,
      survivalProbability: 68,
    },
  };
}
