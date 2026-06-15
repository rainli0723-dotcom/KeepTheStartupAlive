"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

export function SessionActions() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function clearOtherSessions() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/auth/sessions", { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? `已退出其他 ${body.deleted ?? 0} 个登录会话` : body.error ?? "操作失败");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={clearOtherSessions}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
      >
        {pending ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
        退出其他会话
      </button>
      {message ? <div className="text-xs text-cyan-100">{message}</div> : null}
    </div>
  );
}
