import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Agent, buildConnector, fetch as undiciFetch, ProxyAgent, type Dispatcher } from "undici";
import { getDb } from "./db";
import { toJson } from "./serializers";

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const llmMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const llmTimeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 60000);
const llmTemperature = Number(process.env.LLM_TEMPERATURE ?? 0.4);
const proxyUrl = process.env.LLM_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const resolveIp = process.env.LLM_RESOLVE_IP;
const defaultSystemPrompt =
  "You are KTSA, a To B business simulation sandbox analyst. Your response MUST be a valid JSON object. Do not include any explanation, markdown formatting, or text outside the JSON. The JSON must exactly match the required schema.";

export async function callStructuredLlm<T>(input: {
  messages: LlmMessage[];
  schema: z.ZodType<T>;
  fallback?: T;
  timeoutMs?: number;
  task?: string;
  tenantId?: string | null;
  maxRetries?: number;
}) {
  input.messages.forEach((message) => llmMessageSchema.parse(message));
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4.1-mini";
  const task = input.task ?? "structured_call";
  const startedAt = Date.now();
  const maxRetries = input.maxRetries ?? Number(process.env.LLM_MAX_RETRIES ?? 2);
  const promptVersion = await ensurePromptVersion({
    tenantId: input.tenantId,
    task,
    schema: input.schema,
  });
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ task, model, promptVersionId: promptVersion.id, messages: input.messages }))
    .digest("hex");

  if (!apiKey) {
    if (input.fallback) return input.fallback;
    throw new Error("LLM_API_KEY is not configured. Add it to .env to run AI simulation.");
  }

  const requestUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const timeoutDuration = input.timeoutMs ?? llmTimeoutMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const { result, usage } = await executeStructuredLlmRequest({
        messages: input.messages,
        schema: input.schema,
        requestUrl,
        timeoutDuration,
        baseUrl,
        model,
        apiKey,
        systemPrompt: promptVersion.systemPrompt,
      });
      await writeLlmCallLog({
        tenantId: input.tenantId,
        task,
        provider: new URL(baseUrl).hostname,
        model,
        promptVersionId: promptVersion.id,
        modelConfig: {
          baseUrl: redactBaseUrl(baseUrl),
          temperature: llmTemperature,
          timeoutMs: timeoutDuration,
          responseFormat: baseUrl.includes("minimax") ? "best_effort_json" : "json_object",
        },
        status: "success",
        attemptCount: attempt,
        durationMs: Date.now() - startedAt,
        requestHash,
        usage,
      });
      return result;
    } catch (error) {
      lastError = error;
      if (attempt <= maxRetries) {
        await delay(Math.min(3000, 250 * 2 ** (attempt - 1)));
      }
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  await writeLlmCallLog({
    tenantId: input.tenantId,
    task,
    provider: new URL(baseUrl).hostname,
    model,
    promptVersionId: promptVersion.id,
    modelConfig: {
      baseUrl: redactBaseUrl(baseUrl),
      temperature: llmTemperature,
      timeoutMs: timeoutDuration,
    },
    status: "failed",
    attemptCount: maxRetries + 1,
    durationMs: Date.now() - startedAt,
    requestHash,
    errorMessage,
  });
  throw lastError instanceof Error ? lastError : new Error(errorMessage);
}

async function executeStructuredLlmRequest<T>(input: {
  messages: LlmMessage[];
  schema: z.ZodType<T>;
  requestUrl: string;
  timeoutDuration: number;
  baseUrl: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
}) {
  const { messages, schema, requestUrl, timeoutDuration, baseUrl, model, apiKey, systemPrompt } = input;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutDuration);

  const forcedIpAgent = createForcedIpAgent(baseUrl);
  const dispatcher = forcedIpAgent ?? proxyAgent;
  const requestBody = JSON.stringify({
    model,
    temperature: llmTemperature,
    ...(baseUrl.includes("minimax") ? {} : { response_format: { type: "json_object" } }),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages,
    ],
  });
  let response;
  try {
    const requestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
      signal: abortController.signal,
    };
    response = dispatcher
      ? await undiciFetch(requestUrl, { ...requestInit, dispatcher })
      : await fetch(requestUrl, requestInit);
  } catch (error) {
    throw new Error(formatNetworkError(error, requestUrl, timeoutDuration));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  
  if (!content) throw new Error("LLM returned an empty response.");
  
  return { result: parseAndRepairJson(content, schema), usage: payload.usage };
}

function parseAndRepairJson<T>(content: string, schema: z.ZodType<T>) {
  const candidates = [
    content,
    content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(),
    content.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, "$1"),
    content.match(/\[[\s\S]*\]/)?.[0],
    content.match(/\{[\s\S]*\}/)?.[0],
  ].filter(Boolean) as string[];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return schema.parse(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? new Error(`LLM JSON repair failed: ${lastError.message}`) : new Error("LLM JSON repair failed.");
}

async function ensurePromptVersion(input: { tenantId?: string | null; task: string; schema: z.ZodType<unknown> }) {
  const db = getDb();
  const version = process.env.LLM_PROMPT_VERSION ?? "v1";
  const tenantId = input.tenantId ?? null;
  const outputSchema = toJson({ zod: input.schema.description ?? input.schema.constructor.name });

  const existing = await db.promptVersion.findFirst({
    where: { tenantId, task: input.task, version },
  });
  if (existing) return existing;

  return db.promptVersion.create({
    data: {
      id: randomUUID(),
      tenantId,
      task: input.task,
      version,
      systemPrompt: process.env.LLM_SYSTEM_PROMPT ?? defaultSystemPrompt,
      outputSchema,
      status: "active",
      createdBy: "system",
    },
  });
}

async function writeLlmCallLog(input: {
  tenantId?: string | null;
  task: string;
  provider: string;
  model: string;
  status: string;
  attemptCount: number;
  durationMs: number;
  requestHash: string;
  promptVersionId?: string | null;
  modelConfig?: Record<string, unknown>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  errorMessage?: string;
}) {
  try {
    await getDb().llmCallLog.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId ?? null,
        task: input.task,
        provider: input.provider,
        model: input.model,
        status: input.status,
        attemptCount: input.attemptCount,
        durationMs: input.durationMs,
        requestHash: input.requestHash,
        promptVersionId: input.promptVersionId ?? null,
        modelConfig: toJson(input.modelConfig ?? {}),
        promptTokens: input.usage?.prompt_tokens,
        completionTokens: input.usage?.completion_tokens,
        totalTokens: input.usage?.total_tokens,
        estimatedCostUsd: estimateCost(input.model, input.usage),
        errorMessage: input.errorMessage ? input.errorMessage.slice(0, 2000) : null,
      },
    });
  } catch (error) {
    console.warn("[llm] failed to write call log:", error instanceof Error ? error.message : String(error));
  }
}

function estimateCost(model: string, usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) {
  if (!usage) return undefined;
  const rates = parseModelRates();
  const key = Object.keys(rates).find((name) => model.includes(name));
  if (!key) return undefined;
  const rate = rates[key];
  const prompt = ((usage.prompt_tokens ?? 0) / 1_000_000) * rate.input;
  const completion = ((usage.completion_tokens ?? 0) / 1_000_000) * rate.output;
  return Number((prompt + completion).toFixed(6));
}

function parseModelRates() {
  const fallback: Record<string, { input: number; output: number }> = {
    "gpt-4.1-mini": { input: 0.4, output: 1.6 },
    "gpt-4.1": { input: 2, output: 8 },
    "deepseek-chat": { input: 0.27, output: 1.1 },
    "deepseek-reasoner": { input: 0.55, output: 2.19 },
  };
  if (!process.env.LLM_MODEL_RATES_JSON) return fallback;
  try {
    return { ...fallback, ...JSON.parse(process.env.LLM_MODEL_RATES_JSON) };
  } catch {
    return fallback;
  }
}

function redactBaseUrl(value: string) {
  const url = new URL(value);
  return `${url.protocol}//${url.hostname}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNetworkError(error: unknown, requestUrl: string, timeoutDuration: number) {
  const cause = error instanceof Error ? (error.cause as { code?: string; message?: string } | undefined) : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const causeText = [cause?.code, cause?.message].filter(Boolean).join(" ");

  if (message.includes("aborted") || cause?.code === "ABORT_ERR") {
    return `LLM request timed out after ${timeoutDuration}ms: ${requestUrl}`;
  }

  return [
    `LLM network request failed: ${message}`,
    causeText ? `Cause: ${causeText}` : "",
    resolveIp
      ? `LLM_RESOLVE_IP is enabled: ${resolveIp}. If it stops working, refresh the IP or remove this setting.`
      : proxyUrl
        ? `Proxy is enabled via LLM_PROXY_URL/HTTPS_PROXY/HTTP_PROXY. Check whether it is reachable: ${redactProxy(proxyUrl)}`
        : "No proxy is configured. If this network blocks DeepSeek/OpenAI, set LLM_PROXY_URL in .env, for example LLM_PROXY_URL=\"http://127.0.0.1:7897\".",
  ]
    .filter(Boolean)
    .join(" ");
}

function redactProxy(value: string) {
  return value.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}

function createForcedIpAgent(baseUrl: string): Dispatcher | undefined {
  const hostname = new URL(baseUrl).hostname;
  const forcedIp = getForcedIp(hostname);
  if (!forcedIp) return undefined;
  const connector = buildConnector({});

  return new Agent({
    connect(options, callback) {
      connector({ ...options, hostname: forcedIp, host: forcedIp, servername: hostname }, callback);
    },
  });
}

function getForcedIp(hostname: string) {
  if (!resolveIp) return undefined;
  const [targetHost, targetIp] = resolveIp.includes("=")
    ? resolveIp.split("=", 2).map((value) => value.trim())
    : [hostname, resolveIp.trim()];

  return targetHost === hostname ? targetIp : undefined;
}

export const businessCycleSchema = z.object({
  event: z.object({
    eventType: z.enum(["opportunity", "risk", "specialized"]),
    title: z.string(),
    description: z.string(),
    impact: z.object({
      cashflow: z.number(),
      growth: z.number(),
      teamPressure: z.number(),
      technicalRisk: z.number(),
      financingAttractiveness: z.number(),
      survivalProbability: z.number(),
    }),
  }),
  meeting: z.object({
    agenda: z.string(),
    participantViews: z.array(
      z.object({
        roleName: z.string(),
        view: z.string(),
      }),
    ),
    conclusion: z.string(),
    options: z.array(
      z.object({
        title: z.string(),
        recommendation: z.string(),
        upside: z.string(),
        risk: z.string(),
        resourceNeed: z.string(),
        impactScore: z.object({
          cashflow: z.number(),
          growth: z.number(),
          teamPressure: z.number(),
          technicalRisk: z.number(),
          financingAttractiveness: z.number(),
          survivalProbability: z.number(),
        }),
        nextIndicators: z.array(z.string()),
      }),
    ),
  }),
});

export const distillationSchema = z.object({
  languageStyle: z.string().min(1, "语言风格不能为空"),
  decisionPreference: z.string().min(1, "决策偏好不能为空"),
  values: z.string().min(1, "价值观不能为空"),
  pressureResponse: z.string().min(1, "压力反应不能为空"),
  capabilityTendency: z.string().min(1, "能力倾向不能为空"),
  typicalPhrases: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => {
      if (typeof val === "string") {
        // LLM might return a comma-separated string instead of array
        return val
          .split(/[,;，；、\n]/)
          .map((s) => s.trim().replace(/^[""「『]|[""」』]$/g, ""))
          .filter((s) => s.length > 0);
      }
      return val.filter((s) => s.trim().length > 0);
    })
    .pipe(z.array(z.string().min(1)).min(1, "至少需要一个典型用语")),
  professionalBoundary: z.string().min(1, "专业边界不能为空"),
});

const flexibleString = z
  .union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown()), z.number(), z.boolean()])
  .optional()
  .transform((value) => {
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  });

export const meetingInteractionSchema = z.object({
  assistantReply: z.string().optional().default(""),
  dialogueTurns: z
    .array(
      z.object({
        speaker: z.string(),
        message: z.string(),
      }),
    )
    .optional()
    .default([]),
  evaluation: flexibleString,
  riskSignal: flexibleString,
  decisionQualityScore: z.coerce.number().optional().default(50),
  suggestedChoices: z.array(z.string()).optional().default([]),
});

export const organizationAnalysisSchema = z.object({
  name: z.string().optional().describe("公司/组织名称"),
  stage: z.enum(["opc", "small_team", "seed", "growth", "mature", "incubator"]).optional().describe("组织发展阶段"),
  industry: z.string().optional().describe("所属行业"),
  product: z.string().optional().describe("核心产品/业务描述"),
  market: z.string().optional().describe("目标市场"),
  cashflow: z.number().min(0).max(100).optional().describe("现金流健康度 0-100"),
  revenue: z.string().optional().describe("收入情况描述"),
  teamSize: z.number().min(1).optional().describe("团队规模"),
  governanceStructure: z.string().optional().describe("治理结构"),
  keyRisks: z.array(z.string()).optional().describe("关键风险列表"),
  summary: z.string().optional().describe("公司情况一句话总结"),
});

export const finaleSchema = z.object({
  outcomeType: z.enum([
    "bankruptcy",
    "ipo",
    "acquisition",
    "stable_growth",
    "restructure",
    "shutdown",
    "pivot",
    "strategic_partnership",
    "scale_up",
  ]),
  title: z.string(),
  summary: z.string(),
  score: z.number(),
  keyDrivers: z.array(z.string()),
  decisionTrace: z.array(z.string()),
  alternativeEndings: z.array(z.string()),
  nextActions: z.array(z.string()),
});
