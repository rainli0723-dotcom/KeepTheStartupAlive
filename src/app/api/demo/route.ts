import { NextResponse } from "next/server";
import { defaultOrganizationState, resolveMeetingChair, roleTemplates, type SandboxType } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { ensureRoleTemplates, ensureScenarios } from "@/lib/seed";
import { toJson } from "@/lib/serializers";
import { serializeLockedMemberIds } from "@/lib/simulation-run";
import { assignWorkspaceToDefaultTenant, writeAuditLog } from "@/lib/tenant";
import { businessCycleSchema, callStructuredLlm } from "@/lib/llm";

const demoRoleNames = ["创始人", "CEO", "CTO", "CFO", "产品负责人", "销售负责人", "法务顾问", "投资人"];

export async function POST() {
  await ensureRoleTemplates();
  await ensureScenarios();

  const db = getDb();
  const organizationProfile = {
    name: "北辰智能",
    stage: "seed",
    industry: "企业 AI 应用",
    product: "面向 To B 销售团队的 AI 客户情报与跟进助手",
    market: "年营收 5000 万以上、销售流程复杂的 B2B 软件与工业服务公司",
    cashflow: 58,
    revenue: "MRR 18 万，已签 6 个付费试点客户",
    teamSize: 14,
    governanceStructure: "创始团队负责制，投资人每月参与经营复盘",
    keyRisks: ["销售周期过长", "交付依赖创始人", "试点转正式付费率不稳定"],
  };
  const organizationState = {
    ...defaultOrganizationState(),
    cashflow: 58,
    growth: 64,
    teamPressure: 66,
    technicalRisk: 52,
    financingAttractiveness: 61,
    survivalProbability: 68,
  };
  const roleDefinitions = demoRoleNames
    .map((name) => roleTemplates.find((roleTemplate) => roleTemplate.name === name))
    .filter((roleTemplate): roleTemplate is NonNullable<typeof roleTemplate> => Boolean(roleTemplate));
  const chair = resolveMeetingChair({
    userRole: "CEO",
    sandboxType: "growth" as SandboxType,
    availableRoles: roleDefinitions.map((role) => role.name),
  });

  let cycleResult;
  try {
    cycleResult = await callStructuredLlm({
      schema: businessCycleSchema,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "为 To B 产品演示生成第一轮商业模拟经营会议。所有会展示给用户的事件、角色观点、结论和决策方案都必须由你生成。",
            organization: organizationProfile,
            workspace: {
              stage: "seed",
              sandboxType: "growth",
              currentCycle: 1,
              totalCycles: 20,
              organizationState,
              userRole: "CEO",
              chair,
            },
            roles: roleDefinitions.map((role) => ({
              name: role.name,
              roleName: role.name,
              capabilities: role.defaultCapabilities,
              customMetrics: role.defaultMetrics,
              personality: role.description,
              communicationStyle: "简洁、直接、先给判断再说明依据",
              decisionPreference: "优先选择能在 30 天内验证、且不显著透支现金流的方案",
            })),
            userInput: "这是一条用于产品演示的第一轮经营模拟，请围绕真实 To B 销售、交付、现金流和融资风险生成会议。",
            outputContract: {
              event: {
                eventType: "one of: opportunity, risk, specialized",
                title: "string",
                description: "string",
                impact: {
                  cashflow: "number",
                  growth: "number",
                  teamPressure: "number",
                  technicalRisk: "number",
                  financingAttractiveness: "number",
                  survivalProbability: "number",
                },
              },
              meeting: {
                agenda: "string",
                participantViews: [{ roleName: "string", view: "string" }],
                conclusion: "string",
                options: [
                  {
                    title: "string",
                    recommendation: "string",
                    upside: "string",
                    risk: "string",
                    resourceNeed: "string",
                    impactScore: {
                      cashflow: "number",
                      growth: "number",
                      teamPressure: "number",
                      technicalRisk: "number",
                      financingAttractiveness: "number",
                      survivalProbability: "number",
                    },
                    nextIndicators: ["string"],
                  },
                ],
              },
            },
            requirements: [
              "生成 2-3 个决策方案",
              "participantViews 只能使用 roles 数组中的角色",
              "每个角色观点必须像真实经营会议发言，而不是说明文字",
              "会议必须有分歧、取舍和可执行结论",
              "不要使用游戏化表达",
              "只返回 JSON object，不要 Markdown",
            ],
          }),
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM Demo 生成失败";
    return NextResponse.json(
      { error: message, detail: "Demo 不使用内置会议台词；请确认 LLM 配置可用后重试。" },
      { status: 503 },
    );
  }

  const organization = await db.organizationProfile.create({
    data: {
      name: organizationProfile.name,
      stage: organizationProfile.stage,
      industry: organizationProfile.industry,
      product: organizationProfile.product,
      market: organizationProfile.market,
      cashflow: organizationProfile.cashflow,
      revenue: organizationProfile.revenue,
      teamSize: organizationProfile.teamSize,
      governanceStructure: organizationProfile.governanceStructure,
      keyRisks: toJson(organizationProfile.keyRisks),
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
      organizationState: toJson(organizationState),
      selectedRoleNames: toJson([]),
      organizationProfileId: organization.id,
    },
  });
  const tenant = await assignWorkspaceToDefaultTenant(workspace.id);

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
          personality: roleTemplate.description,
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
      eventType: cycleResult.event.eventType,
      title: cycleResult.event.title,
      description: cycleResult.event.description,
      impact: toJson(cycleResult.event.impact),
    },
  });

  await db.strategyMeeting.create({
    data: {
      workspaceId: workspace.id,
      businessEventId: event.id,
      cycle: 1,
      chair: chair.chair,
      agenda: cycleResult.meeting.agenda,
      participantViews: toJson(cycleResult.meeting.participantViews),
      userInput: "",
      conclusion: cycleResult.meeting.conclusion,
      decisionOptions: {
        create: cycleResult.meeting.options.map((option) => ({
          title: option.title,
          recommendation: option.recommendation,
          upside: option.upside,
          risk: option.risk,
          resourceNeed: option.resourceNeed,
          impactScore: toJson(option.impactScore),
          nextIndicators: toJson(option.nextIndicators),
        })),
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
