import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { extractTextFromUpload } from "@/lib/extract";
import { getActiveWorkspace } from "@/lib/workspace";

export async function GET() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ documents: [] });

  const documents = await getDb().organizationDocument.findMany({
    where: { organizationProfileId: workspace.organizationProfileId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  const note = String(formData.get("note") ?? "").trim();
  const hasFile = file instanceof File && file.size > 0;

  let fileName = "公司情况补充说明";
  let mimeType = "text/plain";
  let extractedText = "";
  let sourceKind = "manual_note";

  if (hasFile) {
    fileName = file.name;
    mimeType = file.type || "application/octet-stream";
    extractedText = await extractTextFromUpload(file);
    sourceKind = "company_document";
  }

  if (note) {
    extractedText = [extractedText, hasFile ? `补充说明：\n${note}` : note].filter(Boolean).join("\n\n");
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "请上传文档或填写公司情况说明" }, { status: 400 });
  }

  const document = await getDb().organizationDocument.create({
    data: {
      organizationProfileId: workspace.organizationProfileId,
      fileName,
      mimeType,
      extractedText,
      sourceKind,
    },
  });

  return NextResponse.json({ document });
}
