"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export function TenantMemberForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setInviteUrl("");
    const response = await fetch("/api/enterprise/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? "viewer"),
      }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "邀请失败，请重试。");
      return;
    }

    if (result.invitationUrl) {
      const url = `${window.location.origin}${result.invitationUrl}`;
      setInviteUrl(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
    }
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
      <input name="name" required placeholder="成员姓名" className="field" />
      <input name="email" type="email" placeholder="邀请邮箱" className="field" />
      <select name="role" defaultValue="viewer" className="field">
        <option value="admin">管理员</option>
        <option value="editor">编辑者</option>
        <option value="viewer">只读成员</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        <UserPlus size={16} />
        {loading ? "邀请中" : "邀请成员"}
      </button>
      {error ? <p className="md:col-span-4 text-sm text-red-200">{error}</p> : null}
      {inviteUrl ? <p className="md:col-span-4 break-all text-sm text-emerald-200">邀请链接已复制：{inviteUrl}</p> : null}
    </form>
  );
}
