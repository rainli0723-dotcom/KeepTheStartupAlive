import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { parseJson } from "@/lib/domain";
import { callStructuredLlm, meetingInteractionSchema } from "@/lib/llm";
import { appendInteractionLog, parseInteractionLog } from "@/lib/simulation-run";

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
  const input = interactionInputSchema.parse(await request.json());
  const db = getDb();
  const meeting = await db.strategyMeeting.findUnique({
    where: { id },
    include: {
      workspace: {
        select: {
          userRole: true,
          organizationProfile: {
            select: { name: true, stage: true, industry: true, product: true },
          },
        },
      },
      businessEvent: { select: { title: true, description: true, eventType: true } },
      decisionOptions: { select: { id: true, title: true, recommendation: true, upside: true, risk: true } },
    },
  });

  if (!meeting) return NextResponse.json({ error: "未找到会议" }, { status: 404 });

  const selectedOption = input.selectedOptionId
    ? meeting.decisionOptions.find((option) => option.id === input.selectedOptionId)
    : null;
  const participantViews = parseJson<ParticipantView[]>(meeting.participantViews, []);
  const allInteractions = parseInteractionLog(meeting.userInput);
  // Only keep last 2 interactions to reduce token usage
  const recentInteractions = allInteractions.slice(-2);

  let result: z.infer<typeof meetingInteractionSchema>;
  try {
    result = await callStructuredLlm({
      schema: meetingInteractionSchema,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "继续企业会议。用户发言了，让角色回应。",
            org: `${meeting.workspace.organizationProfile.name}（${meeting.workspace.organizationProfile.stage}·${meeting.workspace.organizationProfile.industry}）`,
            event: meeting.businessEvent
              ? `${meeting.businessEvent.title}：${meeting.businessEvent.description.slice(0, 200)}`
              : "",
            agenda: meeting.agenda.slice(0, 300),
            conclusion: meeting.conclusion.slice(0, 300),
            speakers: participantViews.map((v) => v.roleName),
            userRole: meeting.workspace.userRole,
            userMessage: input.message.slice(0, 500),
            selectedOption: selectedOption
              ? `${selectedOption.title}：${selectedOption.recommendation.slice(0, 200)}`
              : "",
            recentInteractions: recentInteractions.map((i) => ({
              speaker: i.speaker,
              message: i.message.slice(0, 200),
            })),
            outputContract: {
              dialogueTurns: [
                { speaker: "角色名", message: "简短回应" },
              ],
              assistantReply: "主持人总结",
              evaluation: "用户发言的商业影响评估",
              riskSignal: "最重要的风险信号",
              decisionQualityScore: 50,
              suggestedChoices: ["2-4个下一步行动"],
            },
            requirements: [
              "用中文。不要游戏化表达。只返回JSON。",
              "dialogueTurns生成2-3个回合。每个是会议中的直接回应。",
              "至少一个角色表达不同意见或提出问题。",
              "assistantReply在dialogueTurns之后做简短总结。",
            ],
          }),
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM 互动判断失败";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const dialogueTurns =
    result.dialogueTurns.length > 0
      ? result.dialogueTurns
      : [{ speaker: meeting.workspace.userRole || "会议主持", message: result.assistantReply || "请继续补充你的判断。" }];
  const evaluation = result.evaluation || "本次发言已记录，后续轮次会把它作为决策依据。";

  const entry = {
    speaker: meeting.workspace.userRole || "用户",
    message: selectedOption ? `选择方案：${selectedOption.title}\n${input.message.slice(0, 500)}` : input.message.slice(0, 500),
    evaluation,
    assistantReply: result.assistantReply,
    suggestedChoices: result.suggestedChoices,
    dialogueTurns,
    createdAt: new Date().toISOString(),
  };

  await db.strategyMeeting.update({
    where: { id: meeting.id },
    data: {
      userInput: appendInteractionLog(meeting.userInput, entry),
    },
  });

  return NextResponse.json({
    interaction: entry,
    riskSignal: result.riskSignal,
    decisionQualityScore: result.decisionQualityScore,
    suggestedChoices: result.suggestedChoices,
  });
}