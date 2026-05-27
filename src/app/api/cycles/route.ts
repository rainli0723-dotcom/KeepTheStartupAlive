import { NextResponse } from "next/server";
import { z } from "zod";
import { applyEventImpact, resolveMeetingChair, type SandboxType } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { businessCycleSchema, callStructuredLlm } from "@/lib/llm";
import { parseCapabilities, parseMetrics, parseState, toJson } from "@/lib/serializers";
import { getLockedMemberIds, serializeLockedMemberIds } from "@/lib/simulation-run";
import { getActiveWorkspace } from "@/lib/workspace";

const cycleSchema = z.object({
  userInput: z.string().default(""),
  selectedMemberIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const input = cycleSchema.parse(await request.json());
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });
  if (workspace.currentCycle > 20) {
    return NextResponse.json({ error: "20 轮模拟已完成，请在仪表盘查看最终结局报告。" }, { status: 409 });
  }

  // 获取选择的场景信息
  let selectedScenario = null;
  if (workspace.selectedScenarioId) {
    const db = getDb();
    selectedScenario = await db.scenario.findUnique({
      where: { id: workspace.selectedScenarioId },
      include: { nodes: { orderBy: { sortOrder: "asc" } } },
    });
  }

  const lockedMemberIds = getLockedMemberIds(workspace.selectedRoleNames);
  const selectedMemberIds = Array.isArray(input.selectedMemberIds) ? input.selectedMemberIds : lockedMemberIds;
  const selectedMembers = selectedMemberIds.length > 0
    ? workspace.teamMembers.filter((member) => selectedMemberIds.includes(member.id))
    : workspace.teamMembers;

  if (selectedMembers.length === 0) {
    return NextResponse.json({ error: "至少需要选择一个参会角色才能推进经营周期" }, { status: 400 });
  }

  const state = parseState(workspace.organizationState);
  const roles = selectedMembers.map((member) => ({
    name: member.name,
    roleName: member.roleName,
    capabilities: parseCapabilities(member.capabilities),
    customMetrics: parseMetrics(member.customMetrics),
    personality: member.personality,
    communicationStyle: member.communicationStyle,
    decisionPreference: member.decisionPreference,
    skillContext: member.sourceDocuments
      .filter((source) => source.sourceKind === "skill")
      .slice(0, 3)
      .map((source) => ({
        title: source.fileName,
        content: source.extractedText.slice(0, 1800),
      })),
    distillationProfile: member.distillationProfile
      ? {
          languageStyle: member.distillationProfile.languageStyle,
          decisionPreference: member.distillationProfile.decisionPreference,
          values: member.distillationProfile.values,
          pressureResponse: member.distillationProfile.pressureResponse,
          professionalBoundary: member.distillationProfile.professionalBoundary,
        }
      : null,
  }));
  const chair = resolveMeetingChair({
    userRole: workspace.userRole,
    sandboxType: workspace.sandboxType as SandboxType,
    availableRoles: selectedMembers.map((member) => member.roleName),
  });

  let result: z.infer<typeof businessCycleSchema>;
  try {
    result = await callStructuredLlm({
      schema: businessCycleSchema,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "推进一个 To B 商业模拟沙盘经营周期。生成机会、风险或专项事件，并组织经营会议。",
            organization: workspace.organizationProfile,
            organizationContext: workspace.organizationProfile.documents.map((document) => ({
              title: document.fileName,
              kind: document.sourceKind,
              content: document.extractedText.slice(0, 2200),
            })),
            workspace: {
              stage: workspace.organizationStage,
              sandboxType: workspace.sandboxType,
              currentCycle: workspace.currentCycle,
              totalCycles: 20,
              organizationState: state,
              userRole: workspace.userRole,
              chair,
            },
            ...(selectedScenario ? {
              scenarioContext: {
                name: selectedScenario.name,
                description: selectedScenario.description,
                type: selectedScenario.sandboxType,
                nodes: selectedScenario.nodes.map((node) => ({
                  type: node.nodeType,
                  title: node.title,
                  content: node.content,
                  effect: node.effect,
                })),
              },
            } : {}),
            roles,
            userInput: input.userInput,
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
              "不要使用游戏化表达",
              "输出必须适合企业复盘报告",
              "生成 2-3 个决策方案",
              "每个角色观点必须体现角色能力、个性化设定、Skill 或蒸馏画像",
              "只有 roles 数组里的角色能参与本轮会议，不要引用未选中的角色",
              "本沙盘固定为 20 轮。若当前为第 20 轮，会议结论必须给出阶段性终局判断和后续 90 天建议",
              ...(selectedScenario ? [
                `本轮启用了专项场景 "${selectedScenario.name}"。生成的事件必须参考 scenarioContext 中的场景内容，体现场景的 effect 描述中所涉及的影响因子`,
              ] : []),
              "只返回一个 JSON object，不要 Markdown；字段名和 outputContract 完全一致；event.eventType 必须使用英文枚举 opportunity/risk/specialized",
            ],
          }),
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM 调用失败";
    return NextResponse.json(
      { error: message, detail: "经营周期未推进，未保存半成品会议或事件。" },
      { status: 503 },
    );
  }

  const db = getDb();
  const event = await db.businessEvent.create({
    data: {
      workspaceId: workspace.id,
      cycle: workspace.currentCycle,
      eventType: result.event.eventType,
      title: result.event.title,
      description: result.event.description,
      impact: toJson(result.event.impact),
    },
  });
  const meeting = await db.strategyMeeting.create({
    data: {
      workspaceId: workspace.id,
      businessEventId: event.id,
      cycle: workspace.currentCycle,
      chair: chair.chair,
      agenda: result.meeting.agenda,
      participantViews: toJson(result.meeting.participantViews),
      userInput: input.userInput,
      conclusion: result.meeting.conclusion,
      decisionOptions: {
        create: result.meeting.options.map((option) => ({
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
    include: { decisionOptions: true, businessEvent: true },
  });

  await db.simulationWorkspace.update({
    where: { id: workspace.id },
    data: {
      currentCycle: workspace.currentCycle + 1,
      organizationState: toJson(applyEventImpact(state, result.event.impact)),
      ...(selectedMemberIds.length > 0 ? { selectedRoleNames: serializeLockedMemberIds(selectedMemberIds) } : {}),
    },
  });

  return NextResponse.json({ event, meeting });
}
