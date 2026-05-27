export async function extractTextFromUpload(file: File) {
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (mimeType.startsWith("text/") || file.name.endsWith(".md")) {
    return buffer.toString("utf8");
  }

  if (file.name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (file.name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }

  if (mimeType.startsWith("audio/")) {
    return `音频文件已上传：${file.name}。当前 MVP 已保存音频资料记录；如需真实语音转写，请配置企业语音转写服务后替换此文本。`;
  }

  return `文件已上传：${file.name}。当前文件类型 ${mimeType} 暂未提供自动文本提取。`;
}
