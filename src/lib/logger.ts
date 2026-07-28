/**
 * Structured logging for KTSA.
 * Install pino for production: npm install pino pino-pretty
 * Falls back to console if pino is not installed.
 */

const isProduction = process.env.NODE_ENV === "production";
let pinoCache: { info: Function; warn: Function; error: Function; debug: Function } | null = null;

function tryLoadPino() {
  if (pinoCache) return pinoCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pino = require("pino");
    pinoCache = pino({
      level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
      ...(isProduction ? {} : {
        transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
      }),
    });
  } catch {
    pinoCache = null;
  }
  return pinoCache;
}

function log(level: "info" | "warn" | "error" | "debug", obj: unknown, msg?: string) {
  const pino = tryLoadPino();
  if (pino) {
    if (typeof obj === "string") {
      pino[level]({ msg: obj });
    } else {
      pino[level](obj, msg || "");
    }
    return;
  }
  // Console fallback
  const ts = new Date().toISOString().slice(11, 23);
  const data = typeof obj === "string" ? obj : JSON.stringify(obj);
  const message = msg ? `${data} ${msg}` : data;
  if (level === "error") console.error(`[${ts}] ERROR`, message);
  else if (level === "warn") console.warn(`[${ts}] WARN`, message);
  else if (level === "debug") console.debug(`[${ts}] DEBUG`, message);
  else console.log(`[${ts}] INFO`, message);
}

export const logger = {
  info: (obj: unknown, msg?: string) => log("info", obj, msg),
  warn: (obj: unknown, msg?: string) => log("warn", obj, msg),
  error: (obj: unknown, msg?: string) => log("error", obj, msg),
  debug: (obj: unknown, msg?: string) => log("debug", obj, msg),
};
