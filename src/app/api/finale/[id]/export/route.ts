import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseJson } from "@/lib/domain";
import {
  buildPdfReport,
  buildPptReport,
  buildWordReport,
  reportFileName,
  type ReportPayload,
} from "@/lib/report-export";

export const dynamic = "force-dynamic";

type ExportFormat = "pdf" | "docx" | "pptx";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const format = parseFormat(new URL(request.url).searchParams.get("format"));
  if (!format) {
    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  }

  const finale = await getDb().simulationFinale.findUnique({
    where: { id },
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

  if (!finale) return NextResponse.json({ error: "Finale report not found" }, { status: 404 });

  const payload: ReportPayload = {
    finale: {
      id: finale.id,
      title: finale.title,
      summary: finale.summary,
      score: finale.score,
      outcomeType: finale.outcomeType,
      completedCycles: finale.completedCycles,
      keyDrivers: parseStringArray(finale.keyDrivers),
      decisionTrace: parseStringArray(finale.decisionTrace),
      alternativeEndings: parseStringArray(finale.alternativeEndings),
      nextActions: parseStringArray(finale.nextActions),
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

  const buffer = await buildBuffer(format, payload);
  const contentType = contentTypes[format];
  const filename = reportFileName(finale.title, format);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition(filename),
      "Cache-Control": "no-store",
    },
  });
}

async function buildBuffer(format: ExportFormat, payload: ReportPayload) {
  if (format === "pdf") return buildPdfReport(payload);
  if (format === "docx") return buildWordReport(payload);
  return buildPptReport(payload);
}

function parseFormat(value: string | null): ExportFormat | null {
  if (value === "pdf" || value === "docx" || value === "pptx") return value;
  return null;
}

const contentTypes: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function contentDisposition(filename: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function parseStringArray(value: string) {
  return parseJson<string[]>(value, []);
}
