import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { extractTextFromUpload } from "@/lib/extract";
import { callStructuredLlm, distillationSchema } from "@/lib/llm";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const member = await db.teamMember.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "未找到成员" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件或语音材料" }, { status: 400 });
  }

  const extractedText = await extractTextFromUpload(file);
  const sourceKind = file.type.startsWith("audio/") ? "audio" : "document";
  const source = await db.sourceDocument.create({
    data: {
      teamMemberId: member.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      extractedText,
      sourceKind,
    },
  });

  let profile;
  try {
    profile = await callStructuredLlm({
      schema: distillationSchema,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "根据真实材料为商业模拟沙盘生成可编辑的角色数字孪生画像",
            roleName: member.roleName,
            memberName: member.name,
            material: extractedText.slice(0, 12000),
            outputContract: {
              languageStyle: "string",
              decisionPreference: "string",
              values: "string",
              pressureResponse: "string",
              capabilityTendency: "string",
              typicalPhrases: ["string"],
              professionalBoundary: "string",
            },
            requirements: [
              "只返回一个 JSON object，不要 Markdown",
              "字段名和 outputContract 完全一致",
              "typicalPhrases 必须是字符串数组",
            ],
          }),
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM 调用失败";
    return NextResponse.json(
      { error: message, source, detail: "材料已保存，但未生成蒸馏画像。" },
      { status: 503 },
    );
  }

  const distillationProfile = await db.distillationProfile.upsert({
    where: { teamMemberId: member.id },
    create: {
      teamMemberId: member.id,
      languageStyle: profile.languageStyle,
      decisionPreference: profile.decisionPreference,
      values: profile.values,
      pressureResponse: profile.pressureResponse,
      capabilityTendency: profile.capabilityTendency,
      typicalPhrases: JSON.stringify(profile.typicalPhrases),
      professionalBoundary: profile.professionalBoundary,
      rawProfile: JSON.stringify(profile),
    },
    update: {
      languageStyle: profile.languageStyle,
      decisionPreference: profile.decisionPreference,
      values: profile.values,
      pressureResponse: profile.pressureResponse,
      capabilityTendency: profile.capabilityTendency,
      typicalPhrases: JSON.stringify(profile.typicalPhrases),
      professionalBoundary: profile.professionalBoundary,
      rawProfile: JSON.stringify(profile),
    },
  });

  return NextResponse.json({ source, profile: distillationProfile });
}
