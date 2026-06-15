"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserX } from "lucide-react";

export function TenantMemberActions({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm("确定移除这个成员吗？如果成员已有账号，也会停用账号并退出所有会话。")) return;
    setPending(true);
    await fetch(`/api/enterprise/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove" }),
    }).catch(() => null);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-rose-300/25 bg-rose-300/10 px-2 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-300/15 disabled:opacity-60"
    >
      {pending ? <Loader2 className="animate-spin" size={12} /> : <UserX size={12} />}
      移除
    </button>
  );
}
