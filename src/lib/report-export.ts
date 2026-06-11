import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import pptxgen from "pptxgenjs";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

export type ExportMeeting = {
  cycle: number;
  agenda: string;
  conclusion: string;
  businessEvent: { title: string; description: string; eventType: string } | null;
  decisionOptions: { title: string; recommendation: string; risk: string; upside: string }[];
};

export type ExportFinale = {
  id: string;
  title: string;
  summary: string;
  score: number;
  outcomeType: string;
  completedCycles: number;
  keyDrivers: string[];
  decisionTrace: string[];
  alternativeEndings: string[];
  nextActions: string[];
};

export type ReportPayload = {
  finale: ExportFinale;
  meetings: ExportMeeting[];
  organization?: {
    name: string;
    industry: string;
    product: string;
    stage: string;
  };
};

const labels = {
  cover: "Enterprise Decision Report",
  summary: "Executive Summary",
  riskMatrix: "Risk Matrix",
  roadmap: "Decision Roadmap",
  actionPlan: "Action Plan",
  keyDrivers: "Key Drivers",
  decisionTrace: "Decision Trace",
  alternativeEndings: "Alternative Endings",
  timeline: "Meeting Timeline",
};

export async function buildWordReport(payload: ReportPayload) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          heading(labels.cover, HeadingLevel.TITLE),
          paragraph(payload.organization?.name ?? "KTSA Enterprise Customer"),
          paragraph(`Report: ${payload.finale.title}`),
          paragraph(`Score: ${Math.round(payload.finale.score)} / 100`),
          paragraph(`Outcome: ${payload.finale.outcomeType}`),
          paragraph(`Completed cycles: ${payload.finale.completedCycles}`),
          heading(labels.summary, HeadingLevel.HEADING_1),
          paragraph(payload.finale.summary),
          listSection(labels.keyDrivers, payload.finale.keyDrivers),
          tableSection(labels.riskMatrix, buildRiskRows(payload)),
          tableSection(labels.roadmap, buildRoadmapRows(payload)),
          tableSection(labels.actionPlan, buildActionRows(payload)),
          listSection(labels.decisionTrace, payload.finale.decisionTrace),
          listSection(labels.alternativeEndings, payload.finale.alternativeEndings),
          heading(labels.timeline, HeadingLevel.HEADING_1),
          ...payload.meetings.flatMap((meeting) => [
            heading(`Cycle ${meeting.cycle}: ${meeting.agenda}`, HeadingLevel.HEADING_2),
            ...(meeting.businessEvent ? [paragraph(`Event: ${meeting.businessEvent.title}`), paragraph(meeting.businessEvent.description)] : []),
            paragraph(`Conclusion: ${meeting.conclusion}`),
            ...meeting.decisionOptions.map((option) => paragraph(`Option: ${option.title}. Recommendation: ${option.recommendation}. Risk: ${option.risk}`)),
          ]),
        ].flat(),
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function buildPptReport(payload: ReportPayload) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "KTSA";
  pptx.subject = "KTSA enterprise decision report";
  pptx.title = payload.finale.title;
  pptx.company = payload.organization?.name ?? "KTSA";
  pptx.theme = { headFontFace: "Microsoft YaHei", bodyFontFace: "Microsoft YaHei" };

  addTitleSlide(pptx, payload);
  addBulletsSlide(pptx, labels.summary, [payload.finale.summary]);
  addBulletsSlide(pptx, labels.keyDrivers, payload.finale.keyDrivers);
  addTableSlide(pptx, labels.riskMatrix, buildRiskRows(payload));
  addTableSlide(pptx, labels.roadmap, buildRoadmapRows(payload));
  addTableSlide(pptx, labels.actionPlan, buildActionRows(payload));
  addTimelineSlide(pptx, payload.meetings);

  const data = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
}

export async function buildPdfReport(payload: ReportPayload) {
  const doc = new PDFDocument({ margin: 44, size: "A4", bufferPages: true });
  const fontPath = resolveChineseFontPath();
  if (fontPath) doc.font(fontPath);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  writePdfCover(doc, payload);
  writePdfSection(doc, labels.summary, [payload.finale.summary]);
  writePdfSection(doc, labels.keyDrivers, payload.finale.keyDrivers);
  writePdfTable(doc, labels.riskMatrix, buildRiskRows(payload));
  writePdfTable(doc, labels.roadmap, buildRoadmapRows(payload));
  writePdfTable(doc, labels.actionPlan, buildActionRows(payload));
  writePdfSection(doc, labels.decisionTrace, payload.finale.decisionTrace);
  writePdfSection(doc, labels.alternativeEndings, payload.finale.alternativeEndings);
  writePdfSection(doc, labels.timeline, payload.meetings.slice(0, 12).map((meeting) => `Cycle ${meeting.cycle}: ${meeting.agenda} - ${meeting.conclusion}`));

  doc.end();
  return done;
}

export function reportFileName(title: string, extension: string) {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "").slice(0, 48) || "KTSA-report";
  return `${safeTitle}.${extension}`;
}

export function buildEnterpriseReportMarkdown(payload: ReportPayload) {
  const lines = [
    `# ${labels.cover}`,
    "",
    `Customer: ${payload.organization?.name ?? "KTSA Enterprise Customer"}`,
    `Report: ${payload.finale.title}`,
    `Score: ${Math.round(payload.finale.score)} / 100`,
    `Outcome: ${payload.finale.outcomeType}`,
    "",
    `## ${labels.summary}`,
    payload.finale.summary,
    "",
    `## ${labels.keyDrivers}`,
    ...payload.finale.keyDrivers.map((item) => `- ${item}`),
    "",
    `## ${labels.riskMatrix}`,
    ...buildRiskRows(payload).map((row) => `- ${row[0]} | ${row[1]} | ${row[2]}`),
    "",
    `## ${labels.roadmap}`,
    ...buildRoadmapRows(payload).map((row) => `- ${row[0]}: ${row[1]} (${row[2]})`),
    "",
    `## ${labels.actionPlan}`,
    ...buildActionRows(payload).map((row) => `- ${row[0]}: ${row[1]} - ${row[2]}`),
  ];
  return lines.join("\n");
}

function buildRiskRows(payload: ReportPayload) {
  const optionRisks = payload.meetings.flatMap((meeting) => meeting.decisionOptions.map((option) => [option.title, option.risk, "Owner: management"]));
  const fallback = payload.finale.keyDrivers.slice(0, 5).map((driver) => [driver, "Monitor execution drift and stakeholder pressure.", "Owner: CEO"]);
  return (optionRisks.length ? optionRisks : fallback).slice(0, 8);
}

function buildRoadmapRows(payload: ReportPayload) {
  return payload.finale.decisionTrace.slice(0, 8).map((item, index) => [`Step ${index + 1}`, item, index < 2 ? "Now" : index < 5 ? "Next 30 days" : "Next 90 days"]);
}

function buildActionRows(payload: ReportPayload) {
  return payload.finale.nextActions.slice(0, 10).map((item, index) => [`Action ${index + 1}`, item, index < 3 ? "High" : "Medium"]);
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text, heading: level, spacing: { after: 240 } });
}

function paragraph(text: string) {
  return new Paragraph({ children: [new TextRun(text)], spacing: { after: 160 } });
}

function listSection(title: string, items: string[]) {
  return [
    heading(title, HeadingLevel.HEADING_1),
    ...items.map((item) => new Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 120 } })),
  ];
}

function tableSection(title: string, rows: string[][]) {
  return [
    heading(title, HeadingLevel.HEADING_1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map((row) => new TableRow({ children: row.map((cell) => new TableCell({ children: [paragraph(cell)] })) })),
    }),
  ];
}

function addTitleSlide(pptx: pptxgen, payload: ReportPayload) {
  const slide = pptx.addSlide();
  slide.background = { color: "07111F" };
  slide.addText(labels.cover, { x: 0.6, y: 0.45, w: 11.8, h: 0.4, fontSize: 15, color: "67E8F9", bold: true });
  slide.addText(payload.finale.title, { x: 0.6, y: 1.05, w: 8.2, h: 0.9, fontSize: 28, bold: true, color: "FFFFFF", fit: "shrink" });
  slide.addText(payload.organization?.name ?? "KTSA Enterprise Customer", { x: 0.65, y: 2.05, w: 7.2, h: 0.35, fontSize: 13, color: "CBD5E1" });
  slide.addText(payload.finale.summary, { x: 0.65, y: 2.75, w: 7.5, h: 2.5, fontSize: 14, color: "CBD5E1", fit: "shrink" });
  slide.addText(`${Math.round(payload.finale.score)}`, { x: 9.4, y: 1.55, w: 2.3, h: 1, fontSize: 46, bold: true, color: "67E8F9", align: "center" });
  slide.addText("Finale Score", { x: 9.4, y: 2.45, w: 2.3, h: 0.3, fontSize: 12, color: "94A3B8", align: "center" });
}

function addBulletsSlide(pptx: pptxgen, title: string, items: string[]) {
  const slide = pptx.addSlide();
  slide.background = { color: "07111F" };
  slide.addText(title, { x: 0.6, y: 0.4, w: 11, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF" });
  slide.addText(items.map((item) => `- ${item}`).join("\n"), { x: 0.8, y: 1.2, w: 11.4, h: 4.8, fontSize: 15, color: "DDE7F0", fit: "shrink" });
}

function addTableSlide(pptx: pptxgen, title: string, rows: string[][]) {
  const slide = pptx.addSlide();
  slide.background = { color: "07111F" };
  slide.addText(title, { x: 0.6, y: 0.4, w: 11, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF" });
  const tableRows = rows.slice(0, 8).map((row) => row.map((text) => ({ text, options: { color: "DDE7F0", fontSize: 10 } })));
  slide.addTable(tableRows, {
    x: 0.65,
    y: 1.15,
    w: 12,
    h: 4.8,
    border: { color: "334155", pt: 1 },
    color: "DDE7F0",
    fontSize: 10,
    fill: { color: "0F172A" },
  });
}

function addTimelineSlide(pptx: pptxgen, meetings: ExportMeeting[]) {
  const slide = pptx.addSlide();
  slide.background = { color: "07111F" };
  slide.addText(labels.timeline, { x: 0.6, y: 0.4, w: 11, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF" });
  slide.addText(
    meetings.slice(0, 8).map((meeting) => `C${meeting.cycle} ${meeting.agenda}\n${meeting.conclusion}`).join("\n\n"),
    { x: 0.75, y: 1.15, w: 11.5, h: 5, fontSize: 12, color: "DDE7F0", fit: "shrink" },
  );
}

function writePdfCover(doc: PDFKit.PDFDocument, payload: ReportPayload) {
  doc.fontSize(10).fillColor("#67e8f9").text(labels.cover.toUpperCase());
  doc.moveDown(0.6);
  doc.fontSize(22).fillColor("#111827").text(payload.finale.title, { width: 500 });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#334155").text(`Customer: ${payload.organization?.name ?? "KTSA Enterprise Customer"}`);
  doc.text(`Industry: ${payload.organization?.industry ?? "Not specified"}`);
  doc.text(`Score: ${Math.round(payload.finale.score)} / 100`);
  doc.text(`Outcome: ${payload.finale.outcomeType}`);
}

function writePdfSection(doc: PDFKit.PDFDocument, title: string, items: string[]) {
  doc.moveDown(1);
  doc.fontSize(14).fillColor("#111827").text(title);
  doc.moveDown(0.35);
  doc.fontSize(10).fillColor("#334155");
  items.forEach((item) => {
    doc.text(`- ${item}`, { width: 500, lineGap: 2 });
    doc.moveDown(0.2);
  });
}

function writePdfTable(doc: PDFKit.PDFDocument, title: string, rows: string[][]) {
  writePdfSection(doc, title, rows.map((row) => row.join(" | ")));
}

function resolveChineseFontPath() {
  const candidates = [
    process.env.REPORT_FONT_PATH,
    "C:\\Windows\\Fonts\\msyh.ttc",
    "C:\\Windows\\Fonts\\simsun.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(path.resolve(candidate)));
}
