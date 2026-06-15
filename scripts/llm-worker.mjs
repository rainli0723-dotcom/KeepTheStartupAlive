const appUrl = (process.env.KTSA_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const intervalMs = Number(process.env.LLM_WORKER_INTERVAL_MS || 5000);
const once = process.argv.includes("--once");
const token = process.env.LLM_WORKER_TOKEN;

async function runOnce() {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${appUrl}/api/llm/jobs/run`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const body = await response.json().catch(() => ({}));
    const job = body.job;
    const elapsed = Date.now() - startedAt;

    if (!response.ok) {
      console.error(`[llm-worker] failed ${response.status} in ${elapsed}ms`, body.error || body);
      return;
    }

    if (!job) {
      console.log(`[llm-worker] idle in ${elapsed}ms`);
      return;
    }

    console.log(`[llm-worker] ${job.status} ${job.task} ${job.id} in ${elapsed}ms`);
  } catch (error) {
    console.error("[llm-worker] request failed", error instanceof Error ? error.message : error);
  }
}

if (once) {
  await runOnce();
} else {
  console.log(`[llm-worker] polling ${appUrl}/api/llm/jobs/run every ${intervalMs}ms`);
  await runOnce();
  setInterval(runOnce, intervalMs);
}
