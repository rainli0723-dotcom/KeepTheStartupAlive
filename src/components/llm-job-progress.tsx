export function LlmJobProgress({ status, attempts, maxAttempts }: { status: string; attempts: number; maxAttempts: number }) {
  const progress = getProgress(status, attempts, maxAttempts);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{formatJobStatus(status)}</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${status === "dead" || status === "failed" ? "bg-rose-300" : "bg-cyan-300"}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function getProgress(status: string, attempts: number, maxAttempts: number) {
  if (status === "completed") return 100;
  if (status === "running") return 60;
  if (status === "failed") return Math.min(80, Math.max(20, Math.round((attempts / Math.max(1, maxAttempts)) * 80)));
  if (status === "dead") return 100;
  return 10;
}

function formatJobStatus(status: string) {
  const map: Record<string, string> = {
    queued: "排队中",
    running: "生成中",
    failed: "等待重试",
    dead: "已终止",
    completed: "已完成",
  };
  return map[status] ?? status;
}
