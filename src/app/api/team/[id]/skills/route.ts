import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { extractTextFromUpload } from "@/lib/extract";
import { getSkillPreset } from "@/lib/skill-presets";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const member = await db.teamMember.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "未找到数字孪生角色" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  const skillText = String(formData.get("skillText") ?? "").trim();
  const presetId = String(formData.get("presetId") ?? "").trim();
  const preset = presetId ? getSkillPreset(presetId) : undefined;
  const hasFile = file instanceof File && file.size > 0;

  let fileName = preset ? preset.name : "导入 Skill";
  let mimeType = "text/plain";
  let extractedText = "";

  if (preset) {
    extractedText = [
      `预设来源：${preset.name}`,
      `参考链接：${preset.sourceUrl}`,
      `适用重点：${preset.focus}`,
      preset.content,
    ].join("\n");
  }

  if (hasFile) {
    fileName = file.name;
    mimeType = file.type || "application/octet-stream";
    try {
      extractedText = [extractedText, await extractTextFromUpload(file)].filter(Boolean).join("\n\n");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `文件解析失败：${errorMessage}` }, { status: 400 });
    }
  }

  if (skillText) {
    extractedText = [extractedText, hasFile || preset ? `Skill 补充：\n${skillText}` : skillText]
      .filter(Boolean)
      .join("\n\n");
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "请上传 Skill 文件、选择 Skill 预设或粘贴 Skill 内容" }, { status: 400 });
  }

  const source = await db.sourceDocument.create({
    data: {
      teamMemberId: member.id,
      fileName,
      mimeType,
      extractedText,
      sourceKind: "skill",
    },
  });

  return NextResponse.json({ source });
}
