"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";

export function ShareLinkActions({ linkId, status }: { linkId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const disabled = pending || status !== "active";

  async function revoke() {
    if (!confirm("确定撤销这个只读分享链接吗？撤销后外部访问会立即失效。")) return;
    setPending(true);
    await fetch(`/api/enterprise/share-links/${linkId}`, { method: "PATCH" }).catch(() => null);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={revoke}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-md border border-rose-300/25 bg-rose-300/10 px-2 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-300/15 disabled:opacity-50"
    >
      {pending ? <Loader2 className="animate-spin" size={12} /> : <Ban size={12} />}
      撤销
    </button>
  );
}
