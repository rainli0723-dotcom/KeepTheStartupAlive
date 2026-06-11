"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export function DemoLaunchButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function launchDemo() {
    setPending(true);
    setError("");
    const response = await fetch("/api/demo", { method: "POST" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "创建 Demo 失败，请稍后重试。");
      setPending(false);
      return;
    }

    router.push(body.redirectTo ?? "/simulation/run");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={launchDemo}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-300/12 px-8 py-3 text-base font-semibold text-cyan-50 transition hover:border-cyan-200/60 hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
        {pending ? "正在创建 Demo..." : "一键启动 Demo"}
      </button>
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
    </div>
  );
}
