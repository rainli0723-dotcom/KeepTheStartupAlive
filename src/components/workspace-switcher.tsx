"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

type WorkspaceItem = {
  id: string;
  name: string;
  status: string;
  currentCycle: number;
  organizationName: string;
  industry: string;
  product: string;
  updatedAt: string;
  isActive: boolean;
  counts: {
    teamMembers: number;
    meetings: number;
    events: number;
  };
};

export function WorkspaceSwitcher({ workspaces }: { workspaces: WorkspaceItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");

  async function activate(workspaceId: string) {
    setPendingId(workspaceId);
    const response = await fetch("/api/workspaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });

    setPendingId("");
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4">
      {workspaces.map((workspace) => (
        <section key={workspace.id} className="glass-panel p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-white">{workspace.organizationName}</h2>
                {workspace.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-2 py-0.5 text-xs text-emerald-100">
                    <CheckCircle2 size={12} />
                    当前
                  </span>
                ) : null}
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-300">
                  {workspace.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{workspace.name}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {workspace.industry} · {workspace.product}
              </p>
            </div>
            <button
              type="button"
              onClick={() => activate(workspace.id)}
              disabled={workspace.isActive || pendingId === workspace.id}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingId === workspace.id ? <Loader2 className="animate-spin" size={16} /> : null}
              {workspace.isActive ? "已设为当前" : "切换到此沙盘"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Metric label="当前轮次" value={`${Math.max(0, workspace.currentCycle - 1)}/20`} />
            <Metric label="角色数" value={String(workspace.counts.teamMembers)} />
            <Metric label="会议数" value={String(workspace.counts.meetings)} />
            <Metric label="最近更新" value={new Date(workspace.updatedAt).toLocaleDateString("zh-CN")} />
          </div>
        </section>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
