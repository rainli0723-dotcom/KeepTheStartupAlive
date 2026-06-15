import { NextResponse } from "next/server";
import { z } from "zod";
import { canEdit, getScopedMeeting } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseJson } from "@/lib/domain";
import { callStructuredLlm, meetingInteractionSchema } from "@/lib/llm";
import { appendInteractionLog, parseInteractionLog } from "@/lib/simulation-run";
import { writeAuditLog } from "@/lib/tenant";

const interactionInputSchema = z.object({
  message: z.string().min(1),
  selectedOptionId: z.string().optional(),
});

type ParticipantView = {
  roleName: string;
  view: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await getCurrentAuth();
  if (auth && !canEdit(auth.user.role)) {
    return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
  }
  const input = interactionInputSchema.parse(await request.json());
  const db = getDb();
  const { tenant, meeting } = await getScopedMeeting(id);

  if (!meeting) return NextResponse.json({ error: "未找到会议" }, { status: 404 });

  const selectedOption = input.selectedOptionId
    ? meeting.decisionOptions.find((option) => option.id === input.selectedOptionId)
    : null;
  const participantViews = parseJson<ParticipantView[]>(meeting.participantViews, []);
  const recentInteractions = parseInteractionLog(meeting.userInput).slice(-2);

  let result: z.infer<typeof meetingInteractionSchema>;
  try {
    result = await callStructuredLlm({
      schema: meetingInteractionSchema,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "继续一场真实的经营会议。所有 dialogueTurns、assistantReply、evaluation、riskSignal 和 suggestedChoices 都必须由你生成。",
            organization: {
              name: meeting.workspace.organizationProfile.name,
              stage: meeting.workspace.organizationProfile.stage,
              industry: meeting.workspace.organizationProfile.industry,
              product: meeting.workspace.organizationProfile.product,
            },
            event: meeting.businessEvent
              ? {
                  title: meeting.businessEvent.title,
                  description: meeting.businessEvent.description.slice(0, 500),
                  eventType: meeting.businessEvent.eventType,
                }
              : null,
            agenda: meeting.agenda.slice(0, 500),
            conclusion: meeting.conclusion.slice(0, 500),
            speakers: participantViews.map((view) => view.roleName),
            userRole: meeting.workspace.userRole,
            userMessage: input.message.slice(0, 500),
            selectedOption: selectedOption
              ? {
                  title: selectedOption.title,
                  recommendation: selectedOption.recommendation.slice(0, 300),
                  upside: selectedOption.upside,
                  risk: selectedOption.risk,
                }
              : null,
            recentInteractions: recentInteractions.map((interaction) => ({
              speaker: interaction.speaker,
              message: interaction.message.slice(0, 240),
              evaluation: interaction.evaluation?.slice(0, 240),
            })),
            outputContract: {
              dialogueTurns: [{ speaker: "只能从 speakers 中选择或使用会议主持", message: "会议发言" }],
              assistantReply: "会议主持对本轮互动的简短归纳",
              evaluation: "对用户发言或所选方案的经营影响判断",
              riskSignal: "最值得关注的风险信号",
              decisionQualityScore: 0,
              suggestedChoices: ["2-4 个下一步可选行动"],
            },
            requirements: [
              "dialogueTurns 必须生成 3-5 个回合，按真实会议发言顺序排列",
              "每个 dialogueTurn 都必须像具体角色在会议中的发言，不要解释你在生成什么",
              "每条 message 只说 1-2 句，尽量短，不要写成长段分析",
              "第一条 dialogueTurn 必须回应 userMessage 或 selectedOption，不要另起炉灶",
              "后续角色必须接住上一位的意思，可以追问、反驳、补充、让步或要求更具体的数据",
              "禁止使用“首先、其次、综上、建议如下、从某某角度来看”这类报告腔模板",
              "不同角色要有不同说话方式，不要所有人都像同一个顾问",
              "至少一个角色要提出真实分歧或保留意见，但不要为了吵架而吵架",
              "speaker 必须来自 speakers，或使用会议主持",
              "assistantReply 必须在所有 dialogueTurns 之后做简短主持归纳，不超过 2 句",
              "evaluation 必须给出经营判断，不允许为空",
              "只返回 JSON object，不要 Markdown",
            ],
          }),
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM 会议互动生成失败";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  if (result.dialogueTurns.length === 0 || !result.evaluation.trim()) {
    return NextResponse.json(
      { error: "LLM 未返回完整会议对话或判断，请重试。" },
      { status: 502 },
    );
  }

  const entry = {
    speaker: meeting.workspace.userRole || "用户",
    message: selectedOption ? `选择方案：${selectedOption.title}\n${input.message.slice(0, 500)}` : input.message.slice(0, 500),
    evaluation: result.evaluation,
    assistantReply: result.assistantReply,
    suggestedChoices: result.suggestedChoices,
    dialogueTurns: result.dialogueTurns,
    createdAt: new Date().toISOString(),
  };

  await db.strategyMeeting.update({
    where: { id: meeting.id },
    data: {
      userInput: appendInteractionLog(meeting.userInput, entry),
    },
  });

  await writeAuditLog({
    tenantId: tenant.id,
    actor: auth?.user.email ?? "demo",
    action: "meeting.interacted",
    entityType: "StrategyMeeting",
    entityId: meeting.id,
    metadata: { selectedOptionId: input.selectedOptionId ?? null },
  });

  return NextResponse.json({
    interaction: entry,
    riskSignal: result.riskSignal,
    decisionQualityScore: result.decisionQualityScore,
    suggestedChoices: result.suggestedChoices,
  });
}
