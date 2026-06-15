"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

export function SsoSettingsForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/enterprise/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: String(formData.get("provider") ?? "oidc"),
        issuer: String(formData.get("issuer") ?? ""),
        clientId: String(formData.get("clientId") ?? ""),
        clientSecret: String(formData.get("clientSecret") ?? ""),
        status: String(formData.get("status") ?? "testing"),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? "SSO 配置已保存" : body.error ?? "保存失败");
    if (response.ok) router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-[120px_1fr_1fr_120px_auto]">
      <select name="provider" defaultValue="oidc" className="field">
        <option value="oidc">OIDC</option>
        <option value="saml">SAML</option>
        <option value="microsoft">Microsoft</option>
        <option value="google">Google</option>
      </select>
      <input name="issuer" required placeholder="Issuer / Metadata URL" className="field" />
      <input name="clientId" required placeholder="Client ID" className="field" />
      <select name="status" defaultValue="testing" className="field">
        <option value="disabled">停用</option>
        <option value="testing">测试中</option>
        <option value="active">启用</option>
      </select>
      <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15 disabled:opacity-60">
        {pending ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
        保存
      </button>
      <input name="clientSecret" type="password" placeholder="Client Secret，可选" className="field md:col-span-2" />
      {message ? <div className="text-xs text-cyan-100 md:col-span-5">{message}</div> : null}
    </form>
  );
}
