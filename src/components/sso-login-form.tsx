"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

export function SsoLoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/sso/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(formData.get("email") ?? "") }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(body.error ?? "无法启动企业 SSO");
      return;
    }
    window.location.href = body.redirectTo;
  }

  return (
    <form action={submit} className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 text-sm font-semibold text-white">企业 SSO 登录</div>
      <div className="grid gap-2">
        <input name="email" type="email" required placeholder="输入企业邮箱" className="field" />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15 disabled:opacity-60"
        >
          {pending ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
          使用 SSO 登录
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}
    </form>
  );
}
