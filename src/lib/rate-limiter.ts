/** In-memory rate limiter for API endpoints. For production, use Redis. */
const store = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60000);

export function rateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  entry.count++;
  return { allowed: entry.count <= maxRequests, remaining: Math.max(0, maxRequests - entry.count) };
}

export const RATE_LIMITS = {
  cycles: { max: 20, window: 60000 },          // 20/min — 正常模擬推進
  meetingsInteract: { max: 60, window: 60000 }, // 60/min — 會議對話
  distill: { max: 60, window: 3600000 },        // 60/hr — 資料蒸餾
  demo: { max: 10, window: 3600000 },            // 10/hr — Demo
  finale: { max: 10, window: 60000 },            // 10/min — 結局生成
  auth: { max: 30, window: 60000 },              // 30/min — 登入（防暴力但不上鎖）
} as const;
