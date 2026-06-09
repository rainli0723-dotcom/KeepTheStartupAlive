const maxUploadSizeBytes = 20 * 1024 * 1024;
const supportedExtensions = [".txt", ".md", ".docx", ".pdf", ".mp3", ".m4a", ".wav", ".webm"] as const;
const supportedMimePrefixes = ["text/", "audio/"] as const;
const supportedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateUploadFile(file: File) {
  if (file.size > maxUploadSizeBytes) {
    throw new Error(`文件大小为 ${(file.size / 1024 / 1024).toFixed(1)}MB，请上传 20MB 以内的文件。`);
  }

  const mimeType = file.type || "application/octet-stream";
  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = supportedExtensions.some((extension) => lowerName.endsWith(extension));
  const hasSupportedMime =
    supportedMimeTypes.has(mimeType) || supportedMimePrefixes.some((prefix) => mimeType.startsWith(prefix));

  if (!hasSupportedExtension && !hasSupportedMime) {
    throw new Error("当前仅支持 txt、md、docx、pdf 和常见音频文件。");
  }
}

export async function extractTextFromUpload(file: File) {
  validateUploadFile(file);
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
