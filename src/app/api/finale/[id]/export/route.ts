import { NextResponse } from "next/server";
import { buildPdfReport, buildPptReport, buildWordReport, reportFileName, type ReportPayload } from "@/lib/report-export";
import { getReportPayload } from "@/lib/report-payload";
import { getActiveTenant, writeAuditLog } from "@/lib/tenant";
import { getCurrentAuth } from "@/lib/auth";
import { assertTenantUsageAllowed } from "@/lib/usage-limits";

export const dynamic = "force-dynamic";

type ExportFormat = "pdf" | "docx" | "pptx";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const format = parseFormat(new URL(request.url).searchParams.get("format"));
  if (!format) {
    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  }

  const auth = await getCurrentAuth();
  const tenant = auth?.tenant ?? (await getActiveTenant());
  const quota = await assertTenantUsageAllowed(tenant.id, "exports");
  if (!quota.ok) return NextResponse.json({ error: quota.reason }, { status: 402 });

  const payload = await getReportPayload(id, { tenantId: tenant.id });
  if (!payload) return NextResponse.json({ error: "Finale report not found" }, { status: 404 });

  const buffer = await buildBuffer(format, payload);
  const contentType = contentTypes[format];
  const filename = reportFileName(payload.finale.title, format);

  await writeAuditLog({
    tenantId: tenant.id,
    actor: auth?.user.email ?? "demo",
    action: "report.exported",
    entityType: "SimulationFinale",
    entityId: payload.finale.id,
    metadata: { format, filename },
  });

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
