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
  const presetIds = formData
    .getAll("presetIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const presets = presetIds
    .map((presetId) => getSkillPreset(presetId))
    .filter((preset): preset is NonNullable<ReturnType<typeof getSkillPreset>> => Boolean(preset));
  const hasFile = file instanceof File && file.size > 0;

  let fileName = presets.length ? `组合 Skill（${presets.length} 个预设）` : "导入 Skill";
  let mimeType = "text/plain";
  let extractedText = "";

  if (presets.length) {
    extractedText = [
      buildSkillConflictPolicy({
        presetCount: presets.length,
        hasFile,
        hasUserText: Boolean(skillText),
      }),
      presets
        .map((preset, index) =>
          [
            `预设 Skill ${index + 1}：${preset.name}`,
            `适用重点：${preset.focus}`,
            `建议角色：${preset.bestFor}`,
            preset.content,
          ].join("\n"),
        )
        .join("\n\n---\n\n"),
    ].join("\n\n");
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
    extractedText = [extractedText, hasFile || presets.length ? `用户导入 Skill 补充：\n${skillText}` : skillText]
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

function buildSkillConflictPolicy(input: { presetCount: number; hasFile: boolean; hasUserText: boolean }) {
  const externalSources = [
    input.presetCount > 0 ? `${input.presetCount} 个预设 Skill` : "",
    input.hasFile ? "用户上传 Skill 文件" : "",
    input.hasUserText ? "用户手动补充 Skill" : "",
  ].filter(Boolean);

  return [
    "组合 Skill 冲突处理规则：",
    `本次合并来源：${externalSources.join("、") || "单一 Skill"}`,
    "1. 用户手动补充内容优先级最高，其次是用户上传文件，最后是预设 Skill。",
    "2. 当多个 Skill 对同一问题给出不同做法时，不要混成一个含糊建议；要明确说出冲突点、取舍依据和推荐顺序。",
    "3. 角色职责优先于通用能力包。例如 CFO 优先关注现金流和财务风险，CTO 优先关注技术可行性，CLO 优先关注合规边界。",
    "4. 真人表达类 Skill 与任务执行类 Skill 冲突时，发言风格采用真人表达，行动建议采用任务执行结构。",
    "5. 客户/市场 Persona 类 Skill 与内部管理 Skill 冲突时，先区分外部客户视角和内部管理视角，不要把两种立场混为一谈。",
    "6. 谈判/博弈类 Skill 与共识协作类 Skill 冲突时，先表达自身立场和底线，再给出可接受的让步条件。",
    "7. 如果 Skill 内容与当前角色身份明显不匹配，只保留可迁移的判断方法，不强行扮演不属于该角色的身份。",
    "8. 会议中要把冲突转化为自然对话中的分歧、追问、让步和决策取舍。",
  ].join("\n");
}
