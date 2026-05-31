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
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请上传文件或语音材料" }, { status: 400 });
  }

  // Validate file size (max 20MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请上传小于 20MB 的文件` },
      { status: 400 },
    );
  }

  let extractedText: string;
  try {
    extractedText = await extractTextFromUpload(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `文件解析失败：${message}。请确认文件未损坏，或尝试转换为 txt 格式后重新上传。` },
      { status: 400 },
    );
  }

  if (!extractedText.trim()) {
    return NextResponse.json(
      { error: "未能从文件中提取到有效文字内容。请确认文件包含可读取的文字，而非扫描图片。" },
      { status: 400 },
    );
  }

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

  const materialText = extractedText.slice(0, 12000);
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
            material: materialText,
            outputContract: {
              languageStyle: "string - 语言风格与沟通方式",
              decisionPreference: "string - 决策偏好与判断逻辑",
              values: "string - 核心价值观与工作理念",
              pressureResponse: "string - 压力下的行为反应模式",
              capabilityTendency: "string - 能力倾向与擅长领域",
              typicalPhrases: ["string - 典型口头禅或高频用语，2-4个"],
              professionalBoundary: "string - 专业边界，什么领域会主动介入/回避",
            },
            requirements: [
              "只返回一个 JSON object，不要 Markdown 代码块，不要额外解释",
              "字段名必须与 outputContract 完全一致，不要遗漏任何字段",
              "typicalPhrases 必须是字符串数组，至少包含 2 个短语",
              "根据材料内容如实提取，没有明确证据的维度请根据角色类型合理推断",
              "所有字段用中文填写",
            ],
          }),
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM 调用失败";
    // Check for common issues and give actionable advice
    let hint = "";
    if (message.includes("timed out") || message.includes("aborted")) {
      hint = "LLM 响应超时，请稍后重试。如持续超时，可在 .env 中调大 LLM_TIMEOUT_MS。";
    } else if (message.includes("API key") || message.includes("401") || message.includes("403")) {
      hint = "API Key 无效或已过期，请检查 .env 中的 LLM_API_KEY。";
    } else if (message.includes("429")) {
      hint = "API 调用频率过高，请稍后重试。";
    } else if (message.includes("JSON")) {
      hint = "LLM 返回格式异常，请重试或尝试更结构化的材料。";
    } else {
      hint = "请检查网络连接和 LLM 配置后重试。";
    }
    return NextResponse.json(
      { error: message, hint, source, detail: "材料已保存，但未生成蒸馏画像。" },
      { status: 503 },
    );
  }

  let distillationProfile;
  try {
    distillationProfile = await db.distillationProfile.upsert({
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `画像保存失败：${message}`, detail: "蒸馏已成功但数据库写入失败，请重试。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ source, profile: distillationProfile });
}
