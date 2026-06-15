"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

export function PasswordChangeForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? "密码已修改，请重新登录其他设备" : body.error ?? "修改失败");
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
      <input name="currentPassword" type="password" required placeholder="当前密码" className="field" />
      <input name="newPassword" type="password" required minLength={8} placeholder="新密码，至少 8 位" className="field" />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
      >
        {pending ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
        修改密码
      </button>
      {message ? <div className="text-xs text-cyan-100 md:col-span-3">{message}</div> : null}
    </form>
  );
}
