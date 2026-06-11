"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function EnterpriseDangerZone() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function deleteEnterpriseData() {
    const confirmed = confirm("Delete all workspaces, meetings, reports, files, LLM jobs, and LLM logs for this enterprise? This cannot be undone.");
    if (!confirmed) return;

    setPending(true);
    const response = await fetch("/api/enterprise/data", { method: "DELETE" });
    setPending(false);

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      alert(result.error ?? "Delete failed");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={deleteEnterpriseData}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300/25 bg-rose-300/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 size={16} />
      {pending ? "Deleting..." : "Delete enterprise data"}
    </button>
  );
}
