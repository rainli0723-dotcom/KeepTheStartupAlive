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
      workspace: { include: { organizationProfile: true, teamMembers: true } },
      businessEvent: true,
      decisionOptions: true,
    },
  });

  if (!meeting) return NextResponse.json({ error: "未找到会议" }, { status: 404 });

  const selectedOption = input.selectedOptionId
    ? meeting.decisionOptions.find((option) => option.id === input.selectedOptionId)
    : null;
  const participantViews = parseJson<ParticipantView[]>(meeting.participantViews, []);
  const previousInteractions = parseInteractionLog(meeting.userInput);
  const participantNames = [
    ...new Set([
      meeting.chair,
      ...participantViews.map((view) => view.roleName),
      ...meeting.workspace.teamMembers.map((member) => member.roleName),
    ]),
  ].filter(Boolean);

  let result: z.infer<typeof meetingInteractionSchema>;
  try {
    result = await callStructuredLlm({
      schema: meetingInteractionSchema,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "继续一场企业经营会议。用户刚刚发言或选择了一个方案。请让参会角色像真实会议一样轮流回应，而不是只总结观点。",
            organization: meeting.workspace.organizationProfile,
            workspace: {
              cycle: meeting.cycle,
              totalCycles: 20,
              userRole: meeting.workspace.userRole,
              status: meeting.workspace.status,
            },
            event: meeting.businessEvent
              ? {
                  title: meeting.businessEvent.title,
                  description: meeting.businessEvent.description,
                  eventType: meeting.businessEvent.eventType,
                }
              : null,
            meeting: {
              chair: meeting.chair,
              agenda: meeting.agenda,
              participantViews,
              conclusion: meeting.conclusion,
              availableSpeakers: participantNames,
            },
            selectedOption: selectedOption
              ? {
                  title: selectedOption.title,
                  recommendation: selectedOption.recommendation,
                  upside: selectedOption.upside,
                  risk: selectedOption.risk,
                  resourceNeed: selectedOption.resourceNeed,
                }
              : null,
            userMessage: input.message,
            previousInteractions,
            outputContract: {
              dialogueTurns: [
                {
                  speaker: "must be one available speaker, such as CEO/CTO/CLO/CFO",
                  message: "one concrete meeting reply, question, objection, or follow-up",
                },
              ],
              assistantReply: "short chair summary after the role-by-role discussion",
              evaluation: "plain string judging the user's message and likely business impact",
              riskSignal: "plain string describing the most important risk signal",
              decisionQualityScore: "number from 0 to 100",
              suggestedChoices: ["2-4 next actions the user can choose"],
            },
            requirements: [
              "Use Chinese.",
              "Do not use game wording.",
              "Return JSON object only.",
              "dialogueTurns must contain 3-6 turns.",
              "Each turn must be a direct reply in a live meeting, not a final summary.",
              "At least two roles must disagree, ask a question, or challenge an assumption.",
              "The chair can summarize only in assistantReply, after the role discussion.",
              "suggestedChoices should be short user actions, not reports.",
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
      : [{ speaker: meeting.chair || "会议主持", message: result.assistantReply || "请继续补充你的判断。" }];
  const evaluation = result.evaluation || "本次发言已记录，后续轮次会把它作为决策依据。";

  const entry = {
    speaker: meeting.workspace.userRole || "用户",
    message: selectedOption ? `选择方案：${selectedOption.title}\n${input.message}` : input.message,
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
