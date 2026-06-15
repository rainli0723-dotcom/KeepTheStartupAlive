"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function OrganizationDocumentActions({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm("确认删除这份公司资料？")) return;
    setPending(true);
    await fetch(`/api/organization/documents?documentId=${encodeURIComponent(documentId)}`, {
      method: "DELETE",
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
      {pending ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
      删除
    </button>
  );
}
