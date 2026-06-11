"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, Edit2, Plus, Trash2 } from "lucide-react";

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
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this custom scenario?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/scenarios?id=${id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      alert("Delete failed.");
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
        alert("Failed to select scenario.");
      }
    } catch {
      alert("Failed to select scenario.");
    } finally {
      setSelecting(null);
    }
  }

  async function handleDeselectScenario() {
    setSelecting("none");
    try {
      const response = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedScenarioId: null }),
      });
      if (response.ok) {
        setSelectedScenarioId(null);
      } else {
        alert("Failed to clear scenario.");
      }
    } catch {
      alert("Failed to clear scenario.");
    } finally {
      setSelecting(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {scenarios.map((scenario) => {
        const isExpanded = expanded.has(scenario.id);
        const isSelected = selectedScenarioId === scenario.id;
        return (
          <article
            key={scenario.id}
            className={`rounded-lg border p-5 transition-colors ${
              isSelected ? "border-cyan-300/45 bg-cyan-300/10 shadow-lg shadow-cyan-500/10" : "border-white/10 bg-[#0f141b]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{scenario.name}</h2>
                  {scenario.isDefault ? (
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-300/15 px-2 py-0.5 text-xs text-cyan-200">Default</span>
                  ) : null}
                  {isSelected ? (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-300/15 px-2 py-0.5 text-xs text-emerald-200">
                      <CheckCircle2 size={12} />
                      Active
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">{scenario.sandboxType}</span>
                  <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">{scenario.stage}</span>
                  <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">{scenario.nodes.length} steps</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isSelected ? (
                  <button
                    type="button"
                    onClick={handleDeselectScenario}
                    disabled={selecting === "none"}
                    className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20 disabled:opacity-70"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectScenario(scenario.id)}
                    disabled={selecting === scenario.id}
                    className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-70"
                  >
                    <Plus size={12} />
                    Use
                  </button>
                )}
                {!scenario.isDefault ? (
                  <>
                    <Link
                      href={`/scenarios/new?edit=${scenario.id}`}
                      className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-white"
                      title="Edit scenario"
                    >
                      <Edit2 size={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(scenario.id)}
                      disabled={deleting === scenario.id}
                      className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-red-400"
                      title="Delete scenario"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleExpand(scenario.id)}
                  className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-white"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{scenario.description}</p>

            {isExpanded ? (
              <div className="mt-4 space-y-2">
                {scenario.nodes.map((node) => (
                  <div key={node.id} className="rounded-md border border-[var(--line)] bg-black/10 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${nodeTypeClass(node.nodeType)}`}>
                        {nodeTypeLabel(node.nodeType)}
                      </span>
                      <b className="text-white">{node.title}</b>
                    </div>
                    <p className="mt-2 text-[var(--muted)]">{node.content}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function nodeTypeLabel(type: string) {
  if (type === "event") return "Event";
  if (type === "decision") return "Decision";
  if (type === "condition") return "Condition";
  if (type === "result") return "Result";
  return type;
}

function nodeTypeClass(type: string) {
  if (type === "event") return "bg-amber-300/20 text-amber-200";
  if (type === "decision") return "bg-fuchsia-300/20 text-fuchsia-200";
  if (type === "condition") return "bg-orange-300/20 text-orange-200";
  return "bg-emerald-300/20 text-emerald-200";
}
