"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Edit2, FileText, Link2, MessageSquare, Presentation, Save, X } from "lucide-react";
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
  interactions: {
    speaker: string;
    message: string;
    evaluation?: string;
    assistantReply?: string;
    dialogueTurns?: { speaker: string; message: string }[];
  }[];
};

type ReportComment = {
  id: string;
  author: string;
  body: string;
  status: string;
  createdAt: string;
};

type FinaleDetailClientProps = {
  finale: FinaleDetail;
  meetings: MeetingSummary[];
  comments: ReportComment[];
};

const sectionLabels: Record<keyof FinaleReport, string> = {
  outcomeType: "结局类型",
  title: "报告标题",
  summary: "管理层摘要",
  score: "综合评分",
  keyDrivers: "关键驱动因素",
  decisionTrace: "决策轨迹",
  alternativeEndings: "备选结局",
  nextActions: "下一步行动",
};

export function FinaleDetailClient({ finale, meetings, comments: initialComments }: FinaleDetailClientProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [comments, setComments] = useState(initialComments);
  const [commentBody, setCommentBody] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
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

  function downloadReport(format: "pdf" | "docx" | "pptx") {
    window.location.href = `/api/finale/${finale.id}/export?format=${format}`;
  }

  async function createShareLink() {
    const response = await fetch(`/api/finale/${finale.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: finale.title, expiresInDays: 30 }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error ?? "创建分享链接失败");
      return;
    }
    const absoluteUrl = `${window.location.origin}${result.url}`;
    setShareUrl(absoluteUrl);
    await navigator.clipboard?.writeText(absoluteUrl).catch(() => undefined);
  }

  function exportMarkdownReport() {
    const lines = [
      `# ${finale.title}`,
      "",
      `- 综合评分：${Math.round(finale.score)}`,
      `- 完成轮次：${finale.completedCycles}`,
      `- 结局类型：${finale.outcomeType}`,
      "",
      "## 管理层摘要",
      "",
      finale.summary,
      "",
      "## 关键驱动因素",
      "",
      ...finale.keyDrivers.map((item) => `- ${item}`),
      "",
      "## 决策轨迹",
      "",
      ...finale.decisionTrace.map((item) => `- ${item}`),
      "",
      "## 备选结局",
      "",
      ...finale.alternativeEndings.map((item) => `- ${item}`),
      "",
      "## 下一步行动",
      "",
      ...finale.nextActions.map((item) => `- ${item}`),
      "",
      "## 会议过程回顾",
      "",
      ...meetings.flatMap((meeting) => [
        `### 第 ${meeting.cycle} 轮：${meeting.agenda}`,
        "",
        meeting.businessEvent ? `事件：${meeting.businessEvent.title}` : "",
        meeting.businessEvent?.description ?? "",
        "",
        "角色发言：",
        ...meeting.participantViews.map((view) => `- ${view.roleName}: ${view.view}`),
        "",
        "决策选项：",
        ...meeting.decisionOptions.map((option) => `- ${option.title}: ${option.recommendation}`),
        "",
        `会议结论：${meeting.conclusion}`,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${finale.title}-report.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function saveEdit(field: string) {
    setSaving(true);
    try {
      const value = editedContent[field];
      await fetch("/api/finale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: finale.id, [field]: value }),
      });
      setEditingSection(null);
      window.location.reload();
    } catch {
      alert("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    const body = commentBody.trim();
    if (!body) return;
    setCommentSaving(true);
    const response = await fetch(`/api/reports/${finale.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const result = await response.json().catch(() => ({}));
    setCommentSaving(false);
    if (!response.ok) {
      alert(result.error ?? "评论保存失败");
      return;
    }
    setComments([...comments, { ...result.comment, createdAt: result.comment.createdAt ?? new Date().toISOString() }]);
    setCommentBody("");
  }

  const listSections: { key: "keyDrivers" | "decisionTrace" | "alternativeEndings" | "nextActions"; label: string }[] = [
    { key: "keyDrivers", label: sectionLabels.keyDrivers },
    { key: "decisionTrace", label: sectionLabels.decisionTrace },
    { key: "alternativeEndings", label: sectionLabels.alternativeEndings },
    { key: "nextActions", label: sectionLabels.nextActions },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cyan-300/20 bg-[#111821] p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">KTSA 复盘报告</p>
            {editingSection === "title" ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-2xl font-semibold text-white"
                  value={editedContent.title ?? finale.title}
                  onChange={(event) => setEditedContent({ ...editedContent, title: event.target.value })}
                />
                <button onClick={() => saveEdit("title")} disabled={saving} className="rounded-md bg-[#3370ff] px-3 py-2 text-white">
                  <Save size={16} />
                </button>
                <button onClick={cancelEdit} className="rounded-md border border-white/20 px-3 py-2 text-white">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-white">{finale.title}</h2>
                <button onClick={() => startEdit("title", finale.title)} className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-white">
                  <Edit2 size={14} />
                </button>
              </div>
            )}

            {editingSection === "summary" ? (
              <div className="mt-3">
                <textarea
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm leading-6 text-white"
                  rows={4}
                  value={editedContent.summary ?? finale.summary}
                  onChange={(event) => setEditedContent({ ...editedContent, summary: event.target.value })}
                />
                <EditActions onSave={() => saveEdit("summary")} onCancel={cancelEdit} saving={saving} />
              </div>
            ) : (
              <div className="group relative mt-3">
                <p className="text-sm leading-6 text-slate-300">{finale.summary}</p>
                <button onClick={() => startEdit("summary", finale.summary)} className="absolute right-0 top-0 rounded-md border border-white/10 p-1.5 text-slate-400 opacity-0 hover:text-white group-hover:opacity-100">
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 lg:shrink-0">
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-6 py-5 text-center">
              <div className="font-mono text-5xl font-semibold text-white">{Math.round(finale.score)}</div>
              <div className="mt-2 text-xs text-cyan-100">综合评分</div>
            </div>
            <ExportButtons onMarkdown={exportMarkdownReport} onDownload={downloadReport} onShare={createShareLink} />
            {shareUrl ? (
              <div className="max-w-[280px] break-all rounded-md border border-emerald-300/20 bg-emerald-300/10 p-2 text-xs text-emerald-100">
                分享链接已复制：{shareUrl}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {listSections.map((section) => (
          <div key={section.key} className="rounded-lg border border-white/10 bg-[#0f141b] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{section.label}</h3>
              <button
                onClick={() => startEdit(section.key, finale[section.key].join("\n"))}
                className="rounded-md border border-white/10 p-1 text-slate-400 hover:text-white"
              >
                <Edit2 size={12} />
              </button>
            </div>
            {editingSection === section.key ? (
              <div>
                <textarea
                  className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-2 text-xs leading-5 text-white"
                  rows={7}
                  value={editedContent[section.key] ?? ""}
                  onChange={(event) => setEditedContent({ ...editedContent, [section.key]: event.target.value })}
                />
                <EditActions onSave={() => saveEdit(section.key)} onCancel={cancelEdit} saving={saving} compact />
              </div>
            ) : (
              <div className="space-y-2 text-xs leading-5 text-slate-400">
                {finale[section.key].map((item, index) => (
                  <p key={index}>{item}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <ReportComments comments={comments} value={commentBody} saving={commentSaving} onChange={setCommentBody} onSubmit={addComment} />

      <div className="rounded-xl border border-white/10 bg-[#0f141b] p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">会议过程回顾 · {meetings.length} 轮</h3>
        <div className="space-y-2">
          {meetings.map((meeting) => {
            const isExpanded = expandedCycles.has(meeting.cycle);
            return (
              <div key={meeting.id} className="overflow-hidden rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => toggleCycle(meeting.cycle)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#3370ff] px-2.5 py-0.5 text-xs font-bold text-white">第 {meeting.cycle} 轮</span>
                    <span className="font-semibold text-white">{meeting.agenda}</span>
                    <span className="text-xs text-slate-400">主持：{meeting.chair}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {isExpanded ? <MeetingDetail meeting={meeting} /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReportComments({
  comments,
  value,
  saving,
  onChange,
  onSubmit,
}: {
  comments: ReportComment[];
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f141b] p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare size={18} className="text-cyan-200" />
        <h3 className="text-lg font-semibold text-white">报告评论</h3>
      </div>
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">{comment.author}</span>
              <span className="text-xs text-[var(--muted)]">{new Date(comment.createdAt).toLocaleString("zh-CN")}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{comment.body}</p>
          </div>
        ))}
        {comments.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无评论。</p> : null}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder="添加复盘批注、确认意见或下一步问题"
          className="field resize-none"
        />
        <button
          type="button"
          disabled={saving || !value.trim()}
          onClick={onSubmit}
          className="inline-flex items-center justify-center rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
        >
          发表评论
        </button>
      </div>
    </div>
  );
}

function EditActions({ onSave, onCancel, saving, compact = false }: { onSave: () => void; onCancel: () => void; saving: boolean; compact?: boolean }) {
  const className = compact ? "mt-2 flex gap-2 text-xs" : "mt-2 flex gap-2 text-sm";
  return (
    <div className={className}>
      <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-[#3370ff] px-3 py-1.5 text-white">
        <Save size={compact ? 12 : 14} />
        保存
      </button>
      <button onClick={onCancel} className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-white">
        <X size={compact ? 12 : 14} />
        取消
      </button>
    </div>
  );
}

function ExportButtons({
  onMarkdown,
  onDownload,
  onShare,
}: {
  onMarkdown: () => void;
  onDownload: (format: "pdf" | "docx" | "pptx") => void;
  onShare: () => void;
}) {
  return (
    <div className="grid gap-2">
      <button type="button" onClick={onMarkdown} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]">
        <Download size={16} />
        导出 Markdown
      </button>
      <button type="button" onClick={() => onDownload("pdf")} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15">
        <Download size={16} />
        导出 PDF
      </button>
      <button type="button" onClick={() => onDownload("docx")} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15">
        <FileText size={16} />
        导出 Word
      </button>
      <button type="button" onClick={() => onDownload("pptx")} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15">
        <Presentation size={16} />
        导出 PPT
      </button>
      <button type="button" onClick={onShare} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-300/15">
        <Link2 size={16} />
        创建只读分享
      </button>
    </div>
  );
}

function MeetingDetail({ meeting }: { meeting: MeetingSummary }) {
  return (
    <div className="border-t border-white/10 px-4 py-4">
      {meeting.businessEvent ? (
        <div className="mb-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">经营事件</div>
          <div className="mt-1 font-semibold text-white">{meeting.businessEvent.title}</div>
          <p className="mt-1 text-xs leading-5 text-slate-300">{meeting.businessEvent.description}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {meeting.participantViews.map((view, index) => (
          <div key={`${view.roleName}-${index}`} className="rounded-md border border-white/8 bg-white/[0.03] p-3">
            <div className="text-xs font-semibold text-cyan-200">{view.roleName}</div>
            <p className="mt-1 text-sm leading-5 text-slate-300">{view.view}</p>
          </div>
        ))}
      </div>

      {meeting.decisionOptions.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-slate-400">决策选项</div>
          <div className="space-y-2">
            {meeting.decisionOptions.map((option) => (
              <div key={option.id} className="rounded-md border border-fuchsia-300/20 bg-fuchsia-300/10 p-3">
                <div className="text-sm font-semibold text-white">{option.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-300">{option.recommendation}</div>
                <div className="mt-2 grid gap-2 text-xs text-slate-400 lg:grid-cols-3">
                  <span><b className="text-emerald-200">收益：</b>{option.upside}</span>
                  <span><b className="text-rose-200">风险：</b>{option.risk}</span>
                  <span><b className="text-amber-200">资源：</b>{option.resourceNeed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {meeting.userInput ? (
        <div className="mt-4 rounded-md border border-[#3370ff]/30 bg-[#3370ff]/10 p-3">
          <div className="text-xs font-semibold text-[#3370ff]">用户输入</div>
          <p className="mt-1 text-sm leading-5 text-slate-200">{meeting.userInput}</p>
        </div>
      ) : null}

      {meeting.interactions?.length ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs font-semibold text-slate-400">会议追问记录</div>
          {meeting.interactions.map((message, index) => (
            <div key={index} className="rounded-lg border border-white/10 bg-[#151c26] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#3370ff] px-2 py-0.5 text-xs font-bold text-white">用户</span>
                <span className="text-xs text-slate-400">{message.speaker}</span>
              </div>
              <p className="text-sm leading-5 text-slate-200">{message.message}</p>
              {message.dialogueTurns?.map((turn, turnIndex) => (
                <div key={turnIndex} className="mt-2 rounded-md border border-white/8 bg-white/[0.03] p-2">
                  <div className="mb-1 text-xs font-semibold text-cyan-200">{turn.speaker}</div>
                  <p className="text-xs leading-5 text-slate-300">{turn.message}</p>
                </div>
              ))}
              {message.assistantReply ? (
                <div className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 p-2">
                  <div className="mb-1 text-xs font-semibold text-amber-200">主持回应</div>
                  <p className="text-xs leading-5 text-slate-300">{message.assistantReply}</p>
                </div>
              ) : null}
              {message.evaluation ? (
                <div className="mt-2 rounded-md border border-emerald-300/20 bg-emerald-300/8 p-2">
                  <div className="mb-1 text-xs font-semibold text-emerald-200">判断依据</div>
                  <p className="text-xs leading-5 text-emerald-100">{message.evaluation}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/8 p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">会议结论</div>
        <p className="mt-1 text-sm leading-5 text-slate-200">{meeting.conclusion}</p>
      </div>
    </div>
  );
}
