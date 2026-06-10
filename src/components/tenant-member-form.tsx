"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export function TenantMemberForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
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
      setError(result.error ?? "添加成员失败");
      return;
    }

    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
      <input name="name" required placeholder="成员姓名" className="field" />
      <input name="email" type="email" placeholder="邮箱，可稍后补充" className="field" />
      <select name="role" defaultValue="viewer" className="field">
        <option value="admin">管理员</option>
        <option value="editor">编辑者</option>
        <option value="viewer">只读</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        <UserPlus size={16} />
        {loading ? "添加中" : "添加"}
      </button>
      {error ? <p className="md:col-span-4 text-sm text-red-200">{error}</p> : null}
    </form>
  );
}
