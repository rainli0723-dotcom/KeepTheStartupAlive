/**
 * Production-grade file upload security.
 * - Strict MIME type whitelist
 * - File size limits
 * - Sensitive data detection
 * - Sanitized filenames
 */

const ALLOWED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword",                                                          // .doc
  "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg",                         // audio
]);

const ALLOWED_EXTENSIONS = new Set([
  "txt", "md", "csv", "pdf", "docx", "doc", "mp3", "wav", "webm", "ogg",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TEXT_EXTRACTION_SIZE = 500 * 1024; // 500KB text content max

// Patterns for detecting sensitive information
const SENSITIVE_PATTERNS = [
  { name: "身份证号", regex: /\b\d{17}[\dXx]\b/g, severity: "high" },
  { name: "手机号", regex: /\b1[3-9]\d{9}\b/g, severity: "high" },
  { name: "银行卡号", regex: /\b\d{16,19}\b/g, severity: "high" },
  { name: "邮箱地址", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, severity: "medium" },
  { name: "API Key (疑似)", regex: /\b(sk-[A-Za-z0-9]{32,}|[A-Za-z0-9]{32,})\b/g, severity: "critical" },
];

export type ScanResult = {
  allowed: boolean;
  reason?: string;
  detections?: { name: string; count: number; severity: string }[];
  sanitizedText?: string;
};

/**
 * Validate file before upload.
 */
export function validateUpload(file: { name: string; type: string; size: number }): ScanResult {
  // Check extension
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { allowed: false, reason: `不支持的文件类型 .${ext}。支持的类型：${[...ALLOWED_EXTENSIONS].join(", ")}` };
  }

  // Check MIME type
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    // Allow unknown types (some browsers send empty mime) but not obviously wrong ones
    if (file.type !== "" && !file.type.startsWith("audio/")) {
      return { allowed: false, reason: `不支持的文件格式 ${file.type}` };
    }
  }

  // Check size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return { allowed: false, reason: `文件过大（${sizeMB}MB），请上传小于 20MB 的文件` };
  }

  return { allowed: true };
}

/**
 * Scan extracted text for sensitive information and optionally redact.
 */
export function scanAndRedact(text: string): ScanResult {
  if (!text || text.length === 0) {
    return { allowed: true };
  }

  const detections: { name: string; count: number; severity: string }[] = [];
  let redacted = text;

  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches && matches.length > 0) {
      detections.push({ name: pattern.name, count: matches.length, severity: pattern.severity });

      // Auto-redact critical/high severity items
      if (pattern.severity === "critical" || pattern.severity === "high") {
        redacted = redacted.replace(pattern.regex, (match) => `[已脱敏:${pattern.name}]`);
      }
    }
  }

  // Don't block upload for detections — just redact and warn
  return {
    allowed: true,
    detections: detections.length > 0 ? detections : undefined,
    sanitizedText: redacted !== text ? redacted : undefined,
  };
}

/**
 * Truncate extracted text to a maximum size to prevent memory issues.
 */
export function truncateText(text: string, maxSize = MAX_TEXT_EXTRACTION_SIZE): string {
  if (text.length <= maxSize) return text;
  return text.slice(0, maxSize) + `\n\n[文本过长，已截断。原始长度：${text.length} 字符]`;
}

/**
 * Sanitize filenames to prevent path traversal.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")  // Remove invalid chars
    .replace(/^\.+/, "")              // Remove leading dots
    .slice(0, 200);                   // Max filename length
}
