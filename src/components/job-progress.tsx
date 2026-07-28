"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export type JobState = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress?: string;
  result?: unknown;
  error?: string;
};

export function useJobPolling(jobId: string | null, onComplete?: (result: unknown) => void) {
  const [state, setState] = useState<JobState | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 90;

    async function poll() {
      if (cancelled || attempts >= maxAttempts) return;
      attempts++;
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        if (cancelled) return;
        setState(data);
        if (data.status === "completed") { onComplete?.(data.result); return; }
        if (data.status === "failed") return;
        const delay = attempts < 5 ? 2000 : attempts < 15 ? 3000 : 5000;
        setTimeout(poll, delay);
      } catch { if (!cancelled) setTimeout(poll, 3000); }
    }
    poll();
    return () => { cancelled = true; };
  }, [jobId]);

  return state;
}

export function JobProgressBar({ state }: { state: JobState | null }) {
  if (!state) return null;
  const isActive = state.status === "queued" || state.status === "running";
  return (
    <div className={`rounded-lg border p-4 ${state.status === "failed" ? "border-rose-400/30 bg-rose-500/8" : state.status === "completed" ? "border-emerald-400/30 bg-emerald-500/8" : "border-cyan-300/20 bg-cyan-300/5"}`}>
      <div className="flex items-center gap-3">
        {isActive ? <Loader2 className="animate-spin text-cyan-300" size={20} /> : state.status === "completed" ? <CheckCircle2 className="text-emerald-300" size={20} /> : <XCircle className="text-rose-300" size={20} />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{state.status === "queued" ? "排队中" : state.status === "running" ? "AI 处理中" : state.status === "completed" ? "完成" : "失败"}</p>
          {state.progress && <p className="mt-0.5 text-xs text-slate-400 truncate">{state.progress}</p>}
        </div>
      </div>
      {isActive && <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: "60%" }} /></div>}
      {state.status === "failed" && state.error && <p className="mt-2 text-xs text-rose-300">{state.error}</p>}
    </div>
  );
}
