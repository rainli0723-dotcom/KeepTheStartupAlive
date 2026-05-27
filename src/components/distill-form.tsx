"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanFace } from "lucide-react";

export function DistillForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/team/${memberId}/distill`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "蒸馏画像已生成" : body.error ?? "蒸馏失败，请检查 LLM 配置");
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input className="field" type="file" name="file" accept=".txt,.md,.pdf,.docx,audio/*" required />
      <p className="text-sm leading-6 text-[var(--muted)]">
        支持 txt/md/pdf/docx 与音频文件。音频在当前 MVP 中会保留上传记录；真实语音转写可接企业转写服务后替换。
      </p>
      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
      <button disabled={pending} className="glass-primary-button gap-2 px-4 py-2.5 text-sm">
        {pending ? <Loader2 className="animate-spin" size={16} /> : <ScanFace size={16} />}
        {pending ? "正在蒸馏..." : "上传并生成画像"}
      </button>
    </form>
  );
}
