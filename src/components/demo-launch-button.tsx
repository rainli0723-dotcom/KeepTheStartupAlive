"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { demoTemplates } from "@/lib/demo-templates";

export function DemoLaunchButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [templateId, setTemplateId] = useState(demoTemplates[0]?.id ?? "");

  async function launchDemo() {
    setPending(true);
    setError("");
    const response = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
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
    <div className="flex w-full max-w-xl flex-col items-center gap-3">
      <div className="w-full rounded-lg border border-cyan-300/20 bg-black/20 p-3">
        <label className="mb-2 block text-left text-xs font-semibold text-cyan-100/80">选择演示行业</label>
        <select
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          disabled={pending}
          className="w-full rounded-md border border-cyan-300/25 bg-[#07111f] px-3 py-2 text-sm text-white outline-none focus:border-cyan-200"
        >
          {demoTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-left text-xs leading-5 text-slate-400">
          {demoTemplates.find((template) => template.id === templateId)?.description}
        </p>
      </div>
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
