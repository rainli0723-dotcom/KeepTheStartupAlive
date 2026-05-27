"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

export function CycleForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput: String(form.get("userInput") ?? "") }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "启动经营会议失败，请检查 LLM 配置。");
      setPending(false);
      return;
    }

    const meetingId = body.meeting?.id;
    if (!meetingId) {
      setError("会议已生成，但没有返回会议 ID。");
      setPending(false);
      return;
    }

    router.push(`/meeting/${meetingId}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        className="field min-h-28"
        name="userInput"
        placeholder="输入本周期关注的问题、会议背景或你作为参与角色的发言，例如：我们是否应该在两个月内降价进入中小企业市场？"
      />
      {error ? (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      <button disabled={pending} className="glass-primary-button w-full gap-2 px-4 py-3 text-sm">
        {pending ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
        {pending ? "正在启动本轮经营会议..." : "启动本轮经营会议"}
      </button>
      {pending ? (
        <p className="text-xs text-[var(--muted)]">
          系统正在生成本轮机会/风险事件、参会角色观点和决策方案，完成后会自动进入会议界面。
        </p>
      ) : null}
    </form>
  );
}
