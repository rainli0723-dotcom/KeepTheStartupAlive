/**
 * LLM Model Switching and Error Recovery
 *
 * Supports multi-model fallback for production reliability.
 * When the primary model fails, automatically tries backup models.
 */

export type LlmModelConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

const MODEL_PRESETS: Record<string, LlmModelConfig> = {
  deepseek: {
    name: "deepseek-chat",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: process.env.LLM_API_KEY || "",
    timeoutMs: 60000,
  },
  openai: {
    name: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY || "",
    timeoutMs: 60000,
  },
  claude: {
    name: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    baseUrl: process.env.CLAUDE_BASE_URL || "https://api.anthropic.com/v1",
    apiKey: process.env.CLAUDE_API_KEY || "",
    timeoutMs: 90000,
  },
};

/**
 * Get the primary and fallback model configs.
 * Priority: LLM_BACKUP_MODELS env var (comma-separated preset names)
 * Default: deepseek only, unless BACKUP_MODELS is set.
 */
export function getModelChain(): LlmModelConfig[] {
  const primary: LlmModelConfig = {
    name: process.env.LLM_MODEL || "deepseek-chat",
    baseUrl: process.env.LLM_BASE_URL || "https://api.deepseek.com/v1",
    apiKey: process.env.LLM_API_KEY || "",
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 60000),
  };

  const backupNames = process.env.LLM_BACKUP_MODELS
    ? process.env.LLM_BACKUP_MODELS.split(",").map(s => s.trim())
    : [];

  const backups = backupNames
    .map(name => MODEL_PRESETS[name])
    .filter(m => m && m.apiKey);

  return [primary, ...backups];
}

/**
 * User-friendly error messages for common LLM failures.
 */
export function humanizeLlmError(error: Error): { title: string; suggestion: string } {
  const msg = error.message.toLowerCase();

  if (msg.includes("timed out") || msg.includes("abort") || msg.includes("timeout")) {
    return {
      title: "AI 服务响应超时",
      suggestion: "模型响应时间过长，系统正在自动重试。如果持续超时，可以在设置中切换到更快的模型（如 deepseek-chat），或调大超时时间。",
    };
  }

  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("too many")) {
    return {
      title: "AI 服务请求过于频繁",
      suggestion: "请稍候再试。如果需要更高的调用频率，请联系我们升级套餐。",
    };
  }

  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("api key")) {
    return {
      title: "AI 服务认证失败",
      suggestion: "API Key 无效或已过期。请联系管理员检查 LLM API Key 配置。",
    };
  }

  if (msg.includes("json") || msg.includes("schema") || msg.includes("invalid")) {
    return {
      title: "AI 返回格式异常",
      suggestion: "模型返回了不符合预期的格式，系统已自动尝试修复。如果反复出现，建议切换到其他模型。",
    };
  }

  if (msg.includes("insufficient") || msg.includes("balance") || msg.includes("quota")) {
    return {
      title: "AI 服务额度不足",
      suggestion: "API 账户余额不足或已达配额上限。请联系管理员充值或升级 API 套餐。",
    };
  }

  if (msg.includes("network") || msg.includes("fetch") || msg.includes("connect") || msg.includes("dns")) {
    return {
      title: "网络连接异常",
      suggestion: "无法连接到 AI 服务。请检查网络连接和代理设置。如果在防火墙后，请确认已配置 LLM_PROXY_URL。",
    };
  }

  return {
    title: "AI 服务暂时不可用",
    suggestion: "系统将自动重试。如问题持续，请联系技术支持并提供错误详情。",
  };
}
