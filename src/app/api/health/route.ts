import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const checks = {
    database: false,
    llmConfigured: Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL),
    model: process.env.LLM_MODEL ?? "not-configured",
  };

  try {
    await getDb().$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const ok = checks.database;

  return NextResponse.json(
    {
      ok,
      service: "ktsa",
      checks,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
