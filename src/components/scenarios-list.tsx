"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle2, Plus } from "lucide-react";

type ScenarioNode = {
  id: string;
  nodeType: string;
  title: string;
  content: string;
  effect: string;
  sortOrder: number;
};

type Scenario = {
  id: string;
  name: string;
  sandboxType: string;
  stage: string;
  description: string;
  nodes: ScenarioNode[];
  isDefault?: boolean;
};

type ScenariosListProps = {
  scenarios: Scenario[];
  selectedScenarioId?: string;
};

export function ScenariosList({ scenarios, selectedScenarioId: initialSelectedId }: ScenariosListProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(initialSelectedId ?? null);
  const [selecting, setSelecting] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这个场景吗？")) return;
    setDeleting(id);
    try {
      await fetch(`/api/scenarios?id=${id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      alert("删除失败");
    } finally {
      setDeleting(null);
    }
  }

  async function handleSelectScenario(id: string) {
    setSelecting(id);
    try {
      const response = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedScenarioId: id }),
      });
      if (response.ok) {
        setSelectedScenarioId(id);
      } else {
        alert("选用场景失败");
      }
    } catch {
      alert("选用场景出错");
    } finally {
      setSelecting(null);
    }
  }

  async function handleDeselectScenario() {
    setSelecting("null");
    try {
      const response = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedScenarioId: null }),
      });
      if (response.ok) {
        setSelectedScenarioId(null);
      } else {
        alert("取消选用失败");
      }
    } catch {
      alert("取消选用出错");
    } finally {
      setSelecting(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      {scenarios.map((scenario) => {
        const isExpanded = expanded.has(scenario.id);
        const isSelected = selectedScenarioId === scenario.id;
        return (
          <div key={scenario.id} className={`w-[calc(50%-8px)] rounded-xl border p-5 transition-all ${
            isSelected 
              ? "border-cyan-300/40 bg-cyan-300/10 shadow-lg shadow-cyan-500/20" 
              : "border-white/10 bg-[#0f141b]"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{scenario.name}</h2>
                  {scenario.isDefault && (
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-300/15 px-2 py-0.5 text-xs text-cyan-200">默认</span>
                  )}
                  {isSelected && (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/15 px-2 py-0.5 text-xs text-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      已选用
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">{scenario.sandboxType}</span>
                  <span className="text-xs text-[var(--muted)]">·</span>
                  <span className="text-xs text-[var(--muted)]">{scenario.stage}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isSelected ? (
                  <button
                    onClick={() => handleDeselectScenario()}
                    disabled={selecting === "null"}
                    className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20 disabled:opacity-70"
                  >
                    取消选用
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectScenario(scenario.id)}
                    disabled={selecting === scenario.id}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-70 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    选用场景
                  </button>
                )}
                {!scenario.isDefault && (
                  <>
                    <Link
                      href={`/scenarios/new?edit=${scenario.id}`}
                      className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-white"
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(scenario.id)}
                      disabled={deleting === scenario.id}
                      className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-red-400"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => toggleExpand(scenario.id)}
                  className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-white"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{scenario.description}</p>

            {isExpanded && (
              <div className="mt-4 space-y-2">
                {scenario.nodes.map((node) => (
                  <div key={node.id} className="rounded-md border border-[var(--line)] p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        node.nodeType === "event" ? "bg-amber-300/20 text-amber-200" :
                        node.nodeType === "decision" ? "bg-fuchsia-300/20 text-fuchsia-200" :
                        node.nodeType === "condition" ? "bg-orange-300/20 text-orange-200" :
                        "bg-emerald-300/20 text-emerald-200"
                      }`}>
                        {node.nodeType === "event" ? "事件" :
                         node.nodeType === "decision" ? "决策" :
                         node.nodeType === "condition" ? "条件" : "结果"}
                      </span>
                      <b className="text-white">{node.title}</b>
                    </div>
                    <p className="mt-1 text-[var(--muted)]">{node.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}