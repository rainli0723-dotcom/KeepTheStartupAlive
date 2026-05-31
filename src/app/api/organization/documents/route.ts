import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { extractTextFromUpload } from "@/lib/extract";
import { getActiveWorkspace } from "@/lib/workspace";
import { callStructuredLlm, organizationAnalysisSchema } from "@/lib/llm";

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
    try {
      extractedText = await extractTextFromUpload(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `文件解析失败：${errorMessage}` },
        { status: 400 },
      );
    }
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

  // After document is saved, trigger LLM analysis to populate organization profile
  let analysisResult = null;
  try {
    const org = workspace.organizationProfile;
    const allDocuments = await getDb().organizationDocument.findMany({
      where: { organizationProfileId: workspace.organizationProfileId },
      orderBy: { createdAt: "desc" },
    });

    const documentContexts = allDocuments.map((doc) => ({
      title: doc.fileName,
      kind: doc.sourceKind,
      content: doc.extractedText.slice(0, 3000),
    }));

    analysisResult = await callStructuredLlm({
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            action: "analyze_organization_profile",
            currentProfile: {
              name: org.name || "",
              stage: org.stage || "",
              industry: org.industry || "",
              product: org.product || "",
              market: org.market || "",
              cashflow: org.cashflow ?? 60,
              revenue: org.revenue || "",
              teamSize: org.teamSize ?? 1,
              governanceStructure: org.governanceStructure || "",
              keyRisks: org.keyRisks || "[]",
            },
            documents: documentContexts,
            instructions: `你是一位商业分析师。请根据上传的公司文档内容，提取并更新组织档案信息。对于每个字段：
- 如果文档中有明确信息，则提取并填写
- 如果文档中没有相关信息，则保持当前值不变（返回当前值）
- stage 必须是以下六项之一：opc（一人公司）、small_team（小型项目组）、seed（种子期/天使轮）、growth（A/B轮成长期）、mature（成熟公司）、incubator（孵化器）
- cashflow 是 0-100 的整数，代表现金流健康度
- keyRisks 是风险描述字符串数组
- 请用中文填写所有字段
- 返回完整的 JSON 对象，包含所有字段`,
          }),
        },
      ],
      schema: organizationAnalysisSchema,
    });

    // Merge analysis result with current profile (only update fields that changed)
    const riskArray = Array.isArray(analysisResult.keyRisks) ? analysisResult.keyRisks : [];

    await getDb().organizationProfile.update({
      where: { id: workspace.organizationProfileId },
      data: {
        name: analysisResult.name || org.name,
        stage: analysisResult.stage || org.stage,
        industry: analysisResult.industry || org.industry,
        product: analysisResult.product || org.product,
        market: analysisResult.market || org.market,
        cashflow: typeof analysisResult.cashflow === "number" ? analysisResult.cashflow : org.cashflow,
        revenue: analysisResult.revenue || org.revenue,
        teamSize: typeof analysisResult.teamSize === "number" ? analysisResult.teamSize : org.teamSize,
        governanceStructure: analysisResult.governanceStructure || org.governanceStructure,
        keyRisks: riskArray.length > 0 ? JSON.stringify(riskArray) : org.keyRisks,
      },
    });
  } catch (err) {
    // LLM analysis failure should not block the document upload
    console.warn("[org-documents] LLM analysis skipped:", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({
    document,
    analysis: analysisResult
      ? {
          summary: analysisResult.summary ?? "",
          updatedFields: getUpdatedFields(workspace.organizationProfile, analysisResult),
        }
      : null,
  });
}

function getUpdatedFields(
  org: { name: string; stage: string; industry: string; product: string; market: string; cashflow: number; revenue: string; teamSize: number; governanceStructure: string; keyRisks: string },
  analysis: Record<string, unknown>,
): string[] {
  const updated: string[] = [];
  const fieldLabels: Record<string, string> = {
    name: "组织名称",
    stage: "组织阶段",
    industry: "行业",
    product: "产品/业务",
    market: "目标市场",
    cashflow: "现金流健康度",
    revenue: "收入情况",
    teamSize: "团队规模",
    governanceStructure: "治理结构",
    keyRisks: "关键风险",
  };

  if (typeof analysis.name === "string" && analysis.name && analysis.name !== org.name) updated.push(fieldLabels.name);
  if (typeof analysis.stage === "string" && analysis.stage && analysis.stage !== org.stage) updated.push(fieldLabels.stage);
  if (typeof analysis.industry === "string" && analysis.industry && analysis.industry !== org.industry) updated.push(fieldLabels.industry);
  if (typeof analysis.product === "string" && analysis.product && analysis.product !== org.product) updated.push(fieldLabels.product);
  if (typeof analysis.market === "string" && analysis.market && analysis.market !== org.market) updated.push(fieldLabels.market);
  if (typeof analysis.cashflow === "number" && analysis.cashflow !== org.cashflow) updated.push(fieldLabels.cashflow);
  if (typeof analysis.revenue === "string" && analysis.revenue && analysis.revenue !== org.revenue) updated.push(fieldLabels.revenue);
  if (typeof analysis.teamSize === "number" && analysis.teamSize !== org.teamSize) updated.push(fieldLabels.teamSize);
  if (typeof analysis.governanceStructure === "string" && analysis.governanceStructure && analysis.governanceStructure !== org.governanceStructure) updated.push(fieldLabels.governanceStructure);
  if (Array.isArray(analysis.keyRisks) && analysis.keyRisks.length > 0) updated.push(fieldLabels.keyRisks);

  return updated;
}
