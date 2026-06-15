"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Loader2 } from "lucide-react";

export function UsageLimitForm({
  defaults,
}: {
  defaults: { trialEndsAt?: Date | string | null; monthlyLlmCalls: number; monthlyExports: number; monthlyWorkspaces: number };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const trialEndsAt = defaults.trialEndsAt ? new Date(defaults.trialEndsAt).toISOString().slice(0, 10) : "";

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/enterprise/usage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trialEndsAt: String(formData.get("trialEndsAt") ?? ""),
        monthlyLlmCalls: Number(formData.get("monthlyLlmCalls") ?? 0),
        monthlyExports: Number(formData.get("monthlyExports") ?? 0),
        monthlyWorkspaces: Number(formData.get("monthlyWorkspaces") ?? 0),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? "用量限制已保存" : body.error ?? "保存失败");
    if (response.ok) router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <input name="trialEndsAt" type="date" defaultValue={trialEndsAt} className="field" />
      <input name="monthlyLlmCalls" type="number" min={0} defaultValue={defaults.monthlyLlmCalls} placeholder="LLM 月额度" className="field" />
      <input name="monthlyExports" type="number" min={0} defaultValue={defaults.monthlyExports} placeholder="导出月额度" className="field" />
      <input name="monthlyWorkspaces" type="number" min={0} defaultValue={defaults.monthlyWorkspaces} placeholder="工作区月额度" className="field" />
      <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15 disabled:opacity-60">
        {pending ? <Loader2 className="animate-spin" size={14} /> : <Gauge size={14} />}
        保存
      </button>
      {message ? <div className="text-xs text-cyan-100 md:col-span-5">{message}</div> : null}
    </form>
  );
}
