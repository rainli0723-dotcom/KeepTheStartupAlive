import { NextResponse } from "next/server";
import { defaultOrganizationState, roleTemplates } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { ensureRoleTemplates, ensureScenarios } from "@/lib/seed";
import { toJson } from "@/lib/serializers";
import { serializeLockedMemberIds } from "@/lib/simulation-run";
import { assignWorkspaceToDefaultTenant, writeAuditLog } from "@/lib/tenant";

const demoRoleNames = ["创始人", "CEO", "CTO", "CFO", "产品负责人", "销售负责人", "法务顾问", "投资人"];

export async function POST() {
  await ensureRoleTemplates();
  await ensureScenarios();

  const db = getDb();
  const organization = await db.organizationProfile.create({
    data: {
      name: "北辰智能",
      stage: "seed",
      industry: "企业 AI 应用",
      product: "面向 To B 销售团队的 AI 客户情报与跟进助手",
      market: "年营收 5000 万以上、销售流程复杂的 B2B 软件与工业服务公司",
      cashflow: 58,
      revenue: "MRR 18 万，已签 6 个付费试点客户",
      teamSize: 14,
      governanceStructure: "创始团队负责制，投资人每月参与经营复盘",
      keyRisks: toJson(["销售周期过长", "交付依赖创始人", "试点转正式付费率不稳定"]),
    },
  });

  const workspace = await db.simulationWorkspace.create({
    data: {
      name: "北辰智能 - 董事会前经营推演",
      organizationStage: "seed",
      sandboxType: "growth",
      currentCycle: 2,
      status: "active",
      userRole: "CEO",
      organizationState: toJson({
        ...defaultOrganizationState(),
        cashflow: 58,
        growth: 64,
        teamPressure: 66,
        technicalRisk: 52,
        financingAttractiveness: 61,
        survivalProbability: 68,
      }),
      selectedRoleNames: toJson([]),
      organizationProfileId: organization.id,
    },
  });
  const tenant = await assignWorkspaceToDefaultTenant(workspace.id);

  const roleDefinitions = demoRoleNames
    .map((name) => roleTemplates.find((roleTemplate) => roleTemplate.name === name))
    .filter((roleTemplate): roleTemplate is NonNullable<typeof roleTemplate> => Boolean(roleTemplate));

  const members = await Promise.all(
    roleDefinitions.map((roleTemplate) =>
      db.teamMember.create({
        data: {
          workspaceId: workspace.id,
          name: roleTemplate.name,
          roleName: roleTemplate.name,
          isRealMember: false,
          capabilities: toJson(roleTemplate.defaultCapabilities),
          customMetrics: toJson(roleTemplate.defaultMetrics),
          personality: `${roleTemplate.description}。在 Demo 中会围绕现金流、试点转化和组织承压给出明确判断。`,
          communicationStyle: "简洁、直接、先给判断再说明依据",
          decisionPreference: "优先选择能在 30 天内验证、且不显著透支现金流的方案",
        },
      }),
    ),
  );

  await db.simulationWorkspace.update({
    where: { id: workspace.id },
    data: { selectedRoleNames: serializeLockedMemberIds(members.map((member) => member.id)) },
  });

  const event = await db.businessEvent.create({
    data: {
      workspaceId: workspace.id,
      cycle: 1,
      eventType: "opportunity",
      title: "头部客户要求 30 天内完成付费版上线",
      description:
        "一家年合同额潜力 120 万的制造业集团愿意把试点升级为年度合同，但要求 30 天内接入 CRM、权限审计和周报功能。若承接成功，将显著提升融资故事；若交付失控，团队会被迫暂停现有 3 个试点。",
      impact: toJson({
        cashflow: -8,
        growth: 14,
        teamPressure: 16,
        technicalRisk: 10,
        financingAttractiveness: 12,
        survivalProbability: 6,
      }),
    },
  });

  await db.strategyMeeting.create({
    data: {
      workspaceId: workspace.id,
      businessEventId: event.id,
      cycle: 1,
      chair: "用户",
      agenda: "是否承接头部客户的 30 天付费版上线要求，并确定资源投入边界",
      participantViews: toJson([
        {
          roleName: "CEO",
          view: "这个机会能把试点故事变成可融资的增长证据，但不能无条件承诺。我们需要把 30 天目标拆成必须交付和可延后交付两层。",
        },
        {
          roleName: "CTO",
          view: "CRM 接入和权限审计同时做会挤压稳定性测试。若要承接，我建议冻结其他定制需求，只保留一个技术负责人对接客户。",
        },
        {
          roleName: "CFO",
          view: "现金流还能支撑 4 个月。这个合同值得争取，但必须设置预付款和阶段验收，否则会把融资前窗口变成现金消耗战。",
        },
        {
          roleName: "销售负责人",
          view: "客户已经把我们放进年度采购名单，这是稀缺窗口。销售侧可以推动 30% 预付款，但需要产品团队给出清晰交付边界。",
        },
        {
          roleName: "法务顾问",
          view: "合同里必须写清延期免责、数据权限边界和验收标准。否则客户的信息安全条款会在后期变成违约风险。",
        },
      ]),
      userInput: "Demo 沙盘自动生成：用户以 CEO 身份主持第一轮经营会议。",
      conclusion:
        "建议有条件承接：以 30% 预付款锁定合作，30 天只承诺 CRM 接入、基础权限和核心周报，权限审计增强版进入第二阶段。团队同步暂停低价值定制需求，避免交付失控。",
      decisionOptions: {
        create: [
          {
            title: "有条件承接，并设置预付款与分阶段验收",
            recommendation: "推荐。既保留头部客户机会，又控制现金流和交付风险。",
            upside: "提升融资叙事、验证标杆客户、增加短期现金流",
            risk: "团队压力上升，若范围控制失败会影响现有试点",
            resourceNeed: "抽调 1 名技术负责人、1 名产品负责人、销售推动合同条款",
            impactScore: toJson({
              cashflow: 8,
              growth: 16,
              teamPressure: -8,
              technicalRisk: -4,
              financingAttractiveness: 14,
              survivalProbability: 8,
            }),
            nextIndicators: toJson(["30% 预付款是否到账", "客户是否接受分阶段验收", "现有试点延期数量"]),
          },
          {
            title: "全量承诺 30 天上线，换取年度大单",
            recommendation: "激进。适合现金极度紧张且团队愿意押注单一客户时采用。",
            upside: "有机会快速拿下大合同和标杆案例",
            risk: "范围失控、技术债增加、其他客户流失",
            resourceNeed: "核心团队全员投入，暂停多数现有试点",
            impactScore: toJson({
              cashflow: 12,
              growth: 22,
              teamPressure: -18,
              technicalRisk: -16,
              financingAttractiveness: 10,
              survivalProbability: -4,
            }),
            nextIndicators: toJson(["研发延期天数", "客户新增需求数量", "团队加班强度"]),
          },
          {
            title: "拒绝 30 天交付，转为 60 天标准方案",
            recommendation: "保守。能保护交付质量，但可能错过客户预算窗口。",
            upside: "降低技术和组织压力，维持现有试点节奏",
            risk: "客户转向竞品，融资故事缺少突破性证据",
            resourceNeed: "销售重新谈判，产品准备标准版路线图",
            impactScore: toJson({
              cashflow: -4,
              growth: -8,
              teamPressure: 8,
              technicalRisk: 8,
              financingAttractiveness: -6,
              survivalProbability: 2,
            }),
            nextIndicators: toJson(["客户是否接受 60 天方案", "竞品推进情况", "现有试点转正率"]),
          },
        ],
      },
    },
  });
  await writeAuditLog({
    tenantId: tenant.id,
    action: "workspace.demo_created",
    entityType: "SimulationWorkspace",
    entityId: workspace.id,
    metadata: { organization: organization.name, scenario: "董事会前经营推演 Demo" },
  });

  return NextResponse.json({ workspaceId: workspace.id, redirectTo: "/simulation/run" });
}
