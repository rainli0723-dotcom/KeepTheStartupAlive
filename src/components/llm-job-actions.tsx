"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Zap } from "lucide-react";

export function LlmJobActions({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"retry" | "run" | null>(null);
  const canRetry = status === "failed" || status === "dead";

  async function retry() {
    setPending("retry");
    await fetch(`/api/llm/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    }).catch(() => null);
    setPending(null);
    router.refresh();
  }

  async function runOne() {
    setPending("run");
    await fetch("/api/llm/jobs/run", { method: "POST" }).catch(() => null);
    setPending(null);
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {canRetry ? (
        <button
          type="button"
          onClick={retry}
          disabled={Boolean(pending)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-300/15 disabled:opacity-60"
        >
          {pending === "retry" ? <Loader2 className="animate-spin" size={12} /> : <RotateCcw size={12} />}
          重试
        </button>
      ) : null}
      {status === "queued" || status === "failed" ? (
        <button
          type="button"
          onClick={runOne}
          disabled={Boolean(pending)}
          className="inline-flex items-center gap-1 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-60"
        >
          {pending === "run" ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
          立即执行
        </button>
      ) : null}
    </div>
  );
}
