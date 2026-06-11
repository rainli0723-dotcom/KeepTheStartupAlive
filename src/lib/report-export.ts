import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import pptxgen from "pptxgenjs";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

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

const sectionLabels = {
  summary: "管理层摘要",
  keyDrivers: "关键驱动因素",
  decisionTrace: "决策路径",
  alternativeEndings: "替代结局",
  nextActions: "下一步行动",
  timeline: "会议与决策时间线",
};

export async function buildWordReport(payload: ReportPayload) {
  const { finale } = payload;
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          heading(finale.title, HeadingLevel.TITLE),
          paragraph(`结局评分：${Math.round(finale.score)} / 100`),
          paragraph(`完成轮次：${finale.completedCycles}`),
          paragraph(`结局类型：${finale.outcomeType}`),
          ...(payload.organization
            ? [
                paragraph(`企业：${payload.organization.name}`),
                paragraph(`行业：${payload.organization.industry}`),
                paragraph(`产品：${payload.organization.product}`),
              ]
            : []),
          heading(sectionLabels.summary, HeadingLevel.HEADING_1),
          paragraph(finale.summary),
          listSection(sectionLabels.keyDrivers, finale.keyDrivers),
          listSection(sectionLabels.decisionTrace, finale.decisionTrace),
          listSection(sectionLabels.alternativeEndings, finale.alternativeEndings),
          listSection(sectionLabels.nextActions, finale.nextActions),
          heading(sectionLabels.timeline, HeadingLevel.HEADING_1),
          ...payload.meetings.flatMap((meeting) => [
            heading(`Cycle ${meeting.cycle}: ${meeting.agenda}`, HeadingLevel.HEADING_2),
            ...(meeting.businessEvent
              ? [
                  paragraph(`事件：${meeting.businessEvent.title}`),
                  paragraph(meeting.businessEvent.description),
                ]
              : []),
            paragraph(`会议结论：${meeting.conclusion}`),
            ...meeting.decisionOptions.map((option) =>
              paragraph(`方案：${option.title}；建议：${option.recommendation}；风险：${option.risk}`),
            ),
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
  pptx.subject = "KTSA finale report";
  pptx.title = payload.finale.title;
  pptx.company = payload.organization?.name ?? "KTSA";
  pptx.theme = {
    headFontFace: "Microsoft YaHei",
    bodyFontFace: "Microsoft YaHei",
  };

  addTitleSlide(pptx, payload);
  addBulletsSlide(pptx, sectionLabels.keyDrivers, payload.finale.keyDrivers);
  addBulletsSlide(pptx, sectionLabels.decisionTrace, payload.finale.decisionTrace);
  addBulletsSlide(pptx, sectionLabels.nextActions, payload.finale.nextActions);
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

  doc.fontSize(20).text(payload.finale.title);
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Score: ${Math.round(payload.finale.score)} / 100`);
  doc.text(`Cycles: ${payload.finale.completedCycles}`);
  doc.text(`Outcome: ${payload.finale.outcomeType}`);
  if (payload.organization) {
    doc.text(`Organization: ${payload.organization.name}`);
    doc.text(`Industry: ${payload.organization.industry}`);
  }

  writePdfSection(doc, sectionLabels.summary, [payload.finale.summary]);
  writePdfSection(doc, sectionLabels.keyDrivers, payload.finale.keyDrivers);
  writePdfSection(doc, sectionLabels.decisionTrace, payload.finale.decisionTrace);
  writePdfSection(doc, sectionLabels.alternativeEndings, payload.finale.alternativeEndings);
  writePdfSection(doc, sectionLabels.nextActions, payload.finale.nextActions);
  writePdfSection(
    doc,
    sectionLabels.timeline,
    payload.meetings.slice(0, 12).map((meeting) => `Cycle ${meeting.cycle}: ${meeting.agenda} - ${meeting.conclusion}`),
  );

  doc.end();
  return done;
}

export function reportFileName(title: string, extension: string) {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "").slice(0, 48) || "KTSA-report";
  return `${safeTitle}.${extension}`;
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text, heading: level, spacing: { after: 240 } });
}

function paragraph(text: string) {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 160 },
  });
}

function listSection(title: string, items: string[]) {
  return [
    heading(title, HeadingLevel.HEADING_1),
    ...items.map((item) =>
      new Paragraph({
        text: item,
        bullet: { level: 0 },
        spacing: { after: 120 },
      }),
    ),
  ];
}

function addTitleSlide(pptx: pptxgen, payload: ReportPayload) {
  const slide = pptx.addSlide();
  slide.background = { color: "07111F" };
  slide.addText(payload.finale.title, {
    x: 0.6,
    y: 0.6,
    w: 11.8,
    h: 0.6,
    fontFace: "Microsoft YaHei",
    fontSize: 26,
    bold: true,
    color: "FFFFFF",
  });
  slide.addText(payload.finale.summary, {
    x: 0.65,
    y: 1.55,
    w: 7.2,
    h: 2.4,
    fontFace: "Microsoft YaHei",
    fontSize: 15,
    color: "CBD5E1",
    breakLine: false,
    fit: "shrink",
  });
  slide.addText(`${Math.round(payload.finale.score)}`, {
    x: 9.4,
    y: 1.45,
    w: 2.3,
    h: 1,
    fontFace: "Microsoft YaHei",
    fontSize: 44,
    bold: true,
    color: "67E8F9",
    align: "center",
  });
  slide.addText("Finale Score", {
    x: 9.4,
    y: 2.35,
    w: 2.3,
    h: 0.3,
    fontSize: 12,
    color: "94A3B8",
    align: "center",
  });
}

function addBulletsSlide(pptx: pptxgen, title: string, items: string[]) {
  const slide = pptx.addSlide();
  slide.background = { color: "07111F" };
  slide.addText(title, { x: 0.6, y: 0.4, w: 11, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF" });
  slide.addText(items.map((item) => `• ${item}`).join("\n"), {
    x: 0.8,
    y: 1.2,
    w: 11.4,
    h: 4.8,
    fontFace: "Microsoft YaHei",
    fontSize: 15,
    color: "DDE7F0",
    fit: "shrink",
    breakLine: false,
  });
}

function addTimelineSlide(pptx: pptxgen, meetings: ExportMeeting[]) {
  const slide = pptx.addSlide();
  slide.background = { color: "07111F" };
  slide.addText(sectionLabels.timeline, { x: 0.6, y: 0.4, w: 11, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF" });
  slide.addText(
    meetings
      .slice(0, 8)
      .map((meeting) => `C${meeting.cycle} ${meeting.agenda}\n${meeting.conclusion}`)
      .join("\n\n"),
    {
      x: 0.75,
      y: 1.15,
      w: 11.5,
      h: 5,
      fontFace: "Microsoft YaHei",
      fontSize: 12,
      color: "DDE7F0",
      fit: "shrink",
    },
  );
}

function writePdfSection(doc: PDFKit.PDFDocument, title: string, items: string[]) {
  doc.moveDown(1);
  doc.fontSize(14).text(title);
  doc.moveDown(0.35);
  doc.fontSize(10);
  items.forEach((item) => {
    doc.text(`- ${item}`, { width: 500, lineGap: 2 });
    doc.moveDown(0.2);
  });
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
