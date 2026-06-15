import { NextResponse } from "next/server";
import { defaultOrganizationState, resolveMeetingChair, roleTemplates, type SandboxType } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { ensureRoleTemplates, ensureScenarios } from "@/lib/seed";
import { toJson } from "@/lib/serializers";
import { serializeLockedMemberIds } from "@/lib/simulation-run";
import { assignWorkspaceToDefaultTenant, writeAuditLog } from "@/lib/tenant";
import { businessCycleSchema, callStructuredLlm } from "@/lib/llm";
import { getDemoTemplate } from "@/lib/demo-templates";
import { getCurrentAuth } from "@/lib/auth";
import { assertTenantUsageAllowed } from "@/lib/usage-limits";

export async function POST(request: Request) {
  await ensureRoleTemplates();
  await ensureScenarios();

  const body = await request.json().catch(() => ({}));
  const auth = await getCurrentAuth();
  if (auth) {
    const quota = await assertTenantUsageAllowed(auth.tenant.id, "workspaces");
    if (!quota.ok) return NextResponse.json({ error: quota.reason }, { status: 402 });
  }

  const template = getDemoTemplate(typeof body.templateId === "string" ? body.templateId : null);
  const db = getDb();
  const organizationProfile = template.organizationProfile;
  const organizationState = {
    ...defaultOrganizationState(),
    ...template.state,
  };
  const roleDefinitions = template.roleNames
    .map((name) => roleTemplates.find((roleTemplate) => roleTemplate.name === name))
    .filter((roleTemplate): roleTemplate is NonNullable<typeof roleTemplate> => Boolean(roleTemplate));
  const chair = resolveMeetingChair({
    userRole: template.userRole,
    sandboxType: template.sandboxType as SandboxType,
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
            task: "为 To B 产品演示生成第一轮经营事件和一场像真人开会的短会议。",
            organization: organizationProfile,
            workspace: {
              stage: organizationProfile.stage,
              sandboxType: template.sandboxType,
              currentCycle: 1,
              totalCycles: 20,
              organizationState,
              userRole: template.userRole,
              chair,
            },
            roles: roleDefinitions.map((role) => ({
              name: role.name,
              roleName: role.name,
              capabilities: role.defaultCapabilities,
              customMetrics: role.defaultMetrics,
              personality: role.description,
              communicationStyle: "短句、口语化、带一点犹豫或追问，不要像咨询报告。",
              decisionPreference: "先指出真实约束，再给出一个能在 7-30 天内验证的动作。",
            })),
            userInput: template.meetingPrompt,
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
                participantViews: [{ roleName: "string", view: "一人一句，像真实会议发言，短而具体" }],
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
              "事件要像真实创业公司会遇到的问题，不要泛泛而谈。",
              "participantViews 必须每个角色一条，不能合并成长段报告。",
              "每句发言 20-60 个中文字，有追问、反驳、让步或担忧。",
              "不同角色口吻要明显不同，销售关注成交，CFO 关注现金，CLO 关注风险，CTO 关注技术边界。",
              "如果角色观点冲突，要体现在发言里。",
              "结论要像会议主持人收束，不要像新闻稿。",
              "只返回 JSON object，不要 Markdown。",
            ],
          }),
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM Demo 生成失败";
    return NextResponse.json(
      { error: message, detail: "Demo 需要可用的 LLM 配置。请检查 API Key、模型和网络连接后重试。" },
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
      name: template.workspaceName,
      organizationStage: organizationProfile.stage,
      sandboxType: template.sandboxType,
      currentCycle: 2,
      status: "active",
      userRole: template.userRole,
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
          communicationStyle: "短句、口语化、直接说判断，不要长篇报告。",
          decisionPreference: "提出 7-30 天内可验证的动作，并说明一个风险。",
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
    metadata: { organization: organization.name, scenario: template.name, templateId: template.id },
  });

  return NextResponse.json({ workspaceId: workspace.id, redirectTo: "/simulation/run" });
}
