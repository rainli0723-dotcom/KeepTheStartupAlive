import { z } from "zod";
import { Agent, buildConnector, fetch as undiciFetch, ProxyAgent, type Dispatcher } from "undici";

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const llmMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const llmTimeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 60000);
const proxyUrl = process.env.LLM_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const resolveIp = process.env.LLM_RESOLVE_IP;

export async function callStructuredLlm<T>(input: {
  messages: LlmMessage[];
  schema: z.ZodType<T>;
  fallback?: T;
}) {
  input.messages.forEach((message) => llmMessageSchema.parse(message));
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    if (input.fallback) return input.fallback;
    throw new Error("LLM_API_KEY is not configured. Add it to .env to run AI simulation.");
  }

  const requestUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), llmTimeoutMs);

  const forcedIpAgent = createForcedIpAgent(baseUrl);
  const dispatcher = forcedIpAgent ?? proxyAgent;
  const requestBody = JSON.stringify({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are KTSA, a To B business simulation sandbox analyst. Always return valid JSON only.",
      },
      ...input.messages,
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
    throw new Error(formatNetworkError(error, requestUrl));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned an empty response.");

  return input.schema.parse(JSON.parse(content));
}

function formatNetworkError(error: unknown, requestUrl: string) {
  const cause = error instanceof Error ? (error.cause as { code?: string; message?: string } | undefined) : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const causeText = [cause?.code, cause?.message].filter(Boolean).join(" ");

  if (message.includes("aborted") || cause?.code === "ABORT_ERR") {
    return `LLM request timed out after ${llmTimeoutMs}ms: ${requestUrl}`;
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
  languageStyle: z.string(),
  decisionPreference: z.string(),
  values: z.string(),
  pressureResponse: z.string(),
  capabilityTendency: z.string(),
  typicalPhrases: z.array(z.string()),
  professionalBoundary: z.string(),
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
