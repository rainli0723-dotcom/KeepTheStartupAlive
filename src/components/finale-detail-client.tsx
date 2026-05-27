"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Edit2, Save, X } from "lucide-react";
import type { FinaleReport } from "@/lib/finale";

type FinaleDetail = FinaleReport & {
  id: string;
  completedCycles: number;
  rawReport?: string;
};

type MeetingSummary = {
  id: string;
  cycle: number;
  chair: string;
  agenda: string;
  conclusion: string;
  businessEvent: { title: string; description: string; eventType: string } | null;
  participantViews: { roleName: string; view: string }[];
  decisionOptions: {
    id: string;
    title: string;
    recommendation: string;
    upside: string;
    risk: string;
    resourceNeed: string;
  }[];
  userInput: string;
  interactions: { speaker: string; message: string; evaluation?: string; assistantReply?: string; dialogueTurns?: { speaker: string; message: string }[] }[];
};

type FinaleDetailClientProps = {
  finale: FinaleDetail;
  meetings: MeetingSummary[];
};

export function FinaleDetailClient({ finale, meetings }: FinaleDetailClientProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [expandedCycles, setExpandedCycles] = useState<Set<number>>(new Set([meetings[meetings.length - 1]?.cycle ?? 1]));

  function toggleCycle(cycle: number) {
    setExpandedCycles((prev) => {
      const next = new Set(prev);
      if (next.has(cycle)) next.delete(cycle);
      else next.add(cycle);
      return next;
    });
  }

  function startEdit(field: string, currentValue: string) {
    setEditingSection(field);
    setEditedContent({ ...editedContent, [field]: currentValue });
  }

  function cancelEdit() {
    setEditingSection(null);
    setEditedContent({});
  }

  async function saveEdit(field: string) {
    setSaving(true);
    try {
      await fetch("/api/finale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: finale.id, [field]: editedContent[field] }),
      });
      setEditingSection(null);
      window.location.reload();
    } catch {
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  const sections: { key: keyof FinaleReport; label: string }[] = [
    { key: "title", label: "结局标题" },
    { key: "summary", label: "总结概述" },
    { key: "keyDrivers", label: "关键驱动" },
    { key: "decisionTrace", label: "决策轨迹" },
    { key: "alternativeEndings", label: "其他可能结局" },
    { key: "nextActions", label: "后续动作" },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部总结卡 */}
      <div className="rounded-xl border border-cyan-300/20 bg-[#111821] p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">AI 20 Round Finale</p>
            {editingSection === "title" ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-2xl font-semibold text-white"
                  value={editedContent.title ?? finale.title}
                  onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                />
                <button onClick={() => saveEdit("title")} disabled={saving} className="rounded-md bg-[#3370ff] px-3 py-2 text-white"><Save size={16} /></button>
                <button onClick={cancelEdit} className="rounded-md border border-white/20 px-3 py-2 text-white"><X size={16} /></button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-white">{finale.title}</h2>
                <button onClick={() => startEdit("title", finale.title)} className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-white"><Edit2 size={14} /></button>
              </div>
            )}
            {editingSection === "summary" ? (
              <div className="mt-3">
                <textarea
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm leading-6 text-white"
                  rows={3}
                  value={editedContent.summary ?? finale.summary}
                  onChange={(e) => setEditedContent({ ...editedContent, summary: e.target.value })}
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => saveEdit("summary")} disabled={saving} className="rounded-md bg-[#3370ff] px-3 py-1.5 text-sm text-white"><Save size={14} /> 保存</button>
                  <button onClick={cancelEdit} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white"><X size={14} /> 取消</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 group relative">
                <p className="text-sm leading-6 text-slate-300">{finale.summary}</p>
                <button onClick={() => startEdit("summary", finale.summary)} className="absolute right-0 top-0 rounded-md border border-white/10 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white"><Edit2 size={14} /></button>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-6 py-5 text-center lg:shrink-0">
            <div className="font-mono text-5xl font-semibold text-white">{Math.round(finale.score)}</div>
            <div className="mt-2 text-xs text-cyan-100">结局评分</div>
          </div>
        </div>
      </div>

      {/* 四象限概览 */}
      <div className="grid gap-4 lg:grid-cols-4">
        {(["keyDrivers", "decisionTrace", "alternativeEndings", "nextActions"] as const).map((sectionKey) => (
          <div key={sectionKey} className="rounded-lg border border-white/10 bg-[#0f141b] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{sections.find((s) => s.key === sectionKey)?.label}</h3>
              <button onClick={() => startEdit(sectionKey, Array.isArray(finale[sectionKey]) ? (finale[sectionKey] as string[]).join("\n") : String(finale[sectionKey] ?? ""))} className="rounded-md border border-white/10 p-1 text-slate-400 hover:text-white">
                <Edit2 size={12} />
              </button>
            </div>
            {editingSection === sectionKey ? (
              <div>
                <textarea
                  className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-2 text-xs leading-5 text-white"
                  rows={6}
                  value={editedContent[sectionKey] ?? ""}
                  onChange={(e) => setEditedContent({ ...editedContent, [sectionKey]: e.target.value })}
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => saveEdit(sectionKey)} disabled={saving} className="rounded-md bg-[#3370ff] px-2 py-1 text-xs text-white"><Save size={12} /> 保存</button>
                  <button onClick={cancelEdit} className="rounded-md border border-white/20 px-2 py-1 text-xs text-white"><X size={12} /> 取消</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs leading-5 text-slate-400">
                {Array.isArray(finale[sectionKey]) ? (
                  (finale[sectionKey] as string[]).map((item, i) => <p key={i}>{item}</p>)
                ) : (
                  <p>{String(finale[sectionKey] ?? "暂无")}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 对话回顾 - 可折叠的 20 轮 */}
      <div className="rounded-xl border border-white/10 bg-[#0f141b] p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">对话回顾 · {meetings.length} 轮</h3>
        <div className="space-y-2">
          {meetings.map((meeting) => {
            const isExpanded = expandedCycles.has(meeting.cycle);
            return (
              <div key={meeting.id} className="rounded-lg border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCycle(meeting.cycle)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#3370ff] px-2.5 py-0.5 text-xs font-bold text-white">C{meeting.cycle}</span>
                    <span className="font-semibold text-white">{meeting.agenda}</span>
                    <span className="text-xs text-slate-400">主持：{meeting.chair}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-white/10 px-4 py-4">
                    {/* 事件 */}
                    {meeting.businessEvent && (
                      <div className="mb-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">专项事件</div>
                        <div className="mt-1 font-semibold text-white">{meeting.businessEvent.title}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{meeting.businessEvent.description}</p>
                      </div>
                    )}
                    {/* 角色观点 */}
                    <div className="space-y-3">
                      {meeting.participantViews.map((view, idx) => (
                        <div key={`${view.roleName}-${idx}`} className="rounded-md border border-white/8 bg-white/[0.03] p-3">
                          <div className="text-xs font-semibold text-cyan-200">{view.roleName}</div>
                          <p className="mt-1 text-sm leading-5 text-slate-300">{view.view}</p>
                        </div>
                      ))}
                    </div>
                    {/* 决策选项 */}
                    {meeting.decisionOptions.length > 0 && (
                      <div className="mt-4">
                        <div className="mb-2 text-xs font-semibold text-slate-400">决策方案</div>
                        <div className="space-y-2">
                          {meeting.decisionOptions.map((opt) => (
                            <div key={opt.id} className="rounded-md border border-fuchsia-300/20 bg-fuchsia-300/10 p-3">
                              <div className="text-sm font-semibold text-white">{opt.title}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-300">{opt.recommendation}</div>
                              <div className="mt-2 grid gap-2 text-xs text-slate-400 lg:grid-cols-3">
                                <span><b className="text-emerald-200">收益：</b>{opt.upside}</span>
                                <span><b className="text-rose-200">风险：</b>{opt.risk}</span>
                                <span><b className="text-amber-200">资源：</b>{opt.resourceNeed}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 用户发言 */}
                    {meeting.userInput && (
                      <div className="mt-4 rounded-md border border-[#3370ff]/30 bg-[#3370ff]/10 p-3">
                        <div className="text-xs font-semibold text-[#3370ff]">用户发言</div>
                        <p className="mt-1 text-sm leading-5 text-slate-200">{meeting.userInput}</p>
                      </div>
                    )}
                    {/* 对话交互 */}
                    {meeting.interactions && meeting.interactions.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-400">对话过程</div>
                        {meeting.interactions.map((msg, idx) => (
                          <div key={idx} className="rounded-lg border border-white/10 bg-[#151c26] p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded-full bg-[#3370ff] px-2 py-0.5 text-xs font-bold text-white">用户</span>
                              <span className="text-xs text-slate-400">{msg.speaker}</span>
                            </div>
                            <p className="text-sm leading-5 text-slate-200">{msg.message}</p>
                            {msg.dialogueTurns && msg.dialogueTurns.map((turn, tIdx) => (
                              <div key={tIdx} className="mt-2 rounded-md border border-white/8 bg-white/[0.03] p-2">
                                <div className="mb-1 text-xs font-semibold text-cyan-200">{turn.speaker}</div>
                                <p className="text-xs leading-5 text-slate-300">{turn.message}</p>
                              </div>
                            ))}
                            {msg.assistantReply && (
                              <div className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 p-2">
                                <div className="mb-1 text-xs font-semibold text-amber-200">主持归纳</div>
                                <p className="text-xs leading-5 text-slate-300">{msg.assistantReply}</p>
                              </div>
                            )}
                            {msg.evaluation && (
                              <div className="mt-2 rounded-md border border-emerald-300/20 bg-emerald-300/8 p-2">
                                <div className="mb-1 text-xs font-semibold text-emerald-200">影响评估</div>
                                <p className="text-xs leading-5 text-emerald-100">{msg.evaluation}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 结论 */}
                    <div className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/8 p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">会议结论</div>
                      <p className="mt-1 text-sm leading-5 text-slate-200">{meeting.conclusion}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}