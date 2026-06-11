import { getDb } from "./db";
import { parseJson } from "./domain";
import type { ReportPayload } from "./report-export";

export async function getReportPayload(finaleId: string): Promise<ReportPayload | null> {
  const finale = await getDb().simulationFinale.findUnique({
    where: { id: finaleId },
    include: {
      workspace: {
        include: {
          organizationProfile: true,
          meetings: {
            orderBy: { cycle: "asc" },
            include: { businessEvent: true, decisionOptions: true },
          },
        },
      },
    },
  });

  if (!finale) return null;

  return {
    finale: {
      id: finale.id,
      title: finale.title,
      summary: finale.summary,
      score: finale.score,
      outcomeType: finale.outcomeType,
      completedCycles: finale.completedCycles,
      keyDrivers: parseJson<string[]>(finale.keyDrivers, []),
      decisionTrace: parseJson<string[]>(finale.decisionTrace, []),
      alternativeEndings: parseJson<string[]>(finale.alternativeEndings, []),
      nextActions: parseJson<string[]>(finale.nextActions, []),
    },
    organization: {
      name: finale.workspace.organizationProfile.name,
      industry: finale.workspace.organizationProfile.industry,
      product: finale.workspace.organizationProfile.product,
      stage: finale.workspace.organizationProfile.stage,
    },
    meetings: finale.workspace.meetings.map((meeting) => ({
      cycle: meeting.cycle,
      agenda: meeting.agenda,
      conclusion: meeting.conclusion,
      businessEvent: meeting.businessEvent
        ? {
            title: meeting.businessEvent.title,
            description: meeting.businessEvent.description,
            eventType: meeting.businessEvent.eventType,
          }
        : null,
      decisionOptions: meeting.decisionOptions.map((option) => ({
        title: option.title,
        recommendation: option.recommendation,
        risk: option.risk,
        upside: option.upside,
      })),
    })),
  };
}
