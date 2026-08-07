"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Download, Loader2, Plus, Send, StopCircle, Zap } from "lucide-react";
import type { MeetingInteractionLog } from "@/lib/simulation-run";
import { JobProgressBar, useJobPolling } from "@/components/job-progress";

type DecisionOptionView = {
  id: string;
  title: string;
  recommendation: string;
  upside: string;
  risk: string;
  resourceNeed: string;
};

type ParticipantView = {
  roleName: string;
  view: string;
};

type TeamMemberView = {
  id: string;
  name: string;
  roleName: string;
  isRealMember: boolean;
};

type MeetingView = {
  id: string;
  cycle: number;
  chair: string;
  agenda: string;
  conclusion: string;
  participantViews: ParticipantView[];
  interactions: MeetingInteractionLog[];
  businessEvent: {
    title: string;
    description: string;
    eventType: string;
  } | null;
  decisionOptions: DecisionOptionView[];
};

type RunState = {
  workspaceName: string;
  organizationName: string;
  userRole: string;
  status: string;
  completedCycles: number;
  totalCycles: number;
  lockedParticipants: string[];
  teamMembers: TeamMemberView[];
  selectedMemberIds: string[];
  latestMeeting: MeetingView | null;
};

type MeetingIntroItem =
  | { type: "system"; title: string; body: string }
  | { type: "message"; speaker: string; message: string }
  | { type: "conclusion"; title: string; body: string };

export function SimulationRunClient({ run }: { run: RunState }) {
  const router = useRouter();
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const [pending, setPending] = useState<"message" | "cycle" | "end" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [suggestedChoices, setSuggestedChoices] = useState<string[]>([]);
  const [localInteractions, setLocalInteractions] = useState<MeetingInteractionLog[]>([]);
  const [roundMemberIds, setRoundMemberIds] = useState<string[]>(
    run.selectedMemberIds.length ? run.selectedMemberIds : run.teamMembers.map((member) => member.id),
  );
  const [showFinaleModal, setShowFinaleModal] = useState(false);
  const [finaleData, setFinaleData] = useState<{ title: string; summary: string; score: number } | null>(null);
  const [decisionLocked, setDecisionLocked] = useState(false);
  const [visibleIntro, setVisibleIntro] = useState({ meetingId: "", count: 0 });
  const [cycleJobId, setCycleJobId] = useState<string | null>(null);
  const [finaleJobId, setFinaleJobId] = useState<string | null>(null);

  const cycleJobState = useJobPolling(cycleJobId, () => {
    router.refresh();
    setCycleJobId(null);
    setLocalInteractions([]);
    setSuggestedChoices([]);
    setDecisionLocked(false);
    setSelectedOptionId("");
    setPending(null);
  });

  const finaleJobState = useJobPolling(finaleJobId, (result: unknown) => {
    const data = result as { finale?: { title: string; summary: string; score: number } };
    if (data?.finale) {
      setFinaleData({ title: data.finale.title, summary: data.finale.summary, score: data.finale.score });
      setShowFinaleModal(true);
    }
    setFinaleJobId(null);
    setPending(null);
  });

  const meeting = run.latestMeeting;
  const introItems = useMemo<MeetingIntroItem[]>(() => {
    if (!meeting) return [];
    return [
      {
        type: "system",
        title: meeting.businessEvent?.title ?? "本轮事件",
        body: meeting.businessEvent?.description ?? "",
      },
      ...meeting.participantViews.map((view) => ({
        type: "message" as const,
        speaker: view.roleName,
        message: view.view,
      })),
      { type: "conclusion", title: "阶段结论", body: meeting.conclusion },
    ];
  }, [meeting]);
  const visibleIntroCount = meeting?.id === visibleIntro.meetingId ? visibleIntro.count : 0;
  const shownIntroItems = introItems.slice(0, visibleIntroCount);
  const introComplete = !meeting || visibleIntroCount >= introItems.length;
  const meetingId = meeting?.id ?? "";
  const introItemCount = introItems.length;
  const allInteractions = useMemo(
    () => [...(meeting?.interactions ?? []), ...localInteractions],
    [meeting?.interactions, localInteractions],
  );
  const isFinished = run.completedCycles >= run.totalCycles;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const revealNext = (count: number) => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        const nextCount = count + 1;
        setVisibleIntro({ meetingId, count: nextCount });
        if (nextCount < introItemCount) revealNext(nextCount);
      }, count === 0 ? 350 : 950);
    };

    if (meetingId && introItemCount > 0) revealNext(0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [meetingId, introItemCount]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleIntroCount, allInteractions]);

  function toggleRoundMember(memberId: string) {
    setRoundMemberIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  async function submitMessage(nextMessage?: string, optionId = selectedOptionId) {
    if (!meeting) return;
    const content = (nextMessage ?? message).trim();
    if (!content) {
      setError("请输入会议发言，或选择一个系统建议行动。");
      return;
    }

    setPending("message");
    setError("");

    const response = await fetch(`/api/meetings/${meeting.id}/interact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, selectedOptionId: optionId || undefined }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "LLM 实时讨论失败。");
      setPending(null);
      return;
    }

    const interaction = body.interaction;
    const turns = interaction.dialogueTurns || [];
    const evaluationText = interaction.evaluation || "";
    const assistantText = interaction.assistantReply || "";

    // Start with empty dialogue — turns will stream in one by one
    interaction.dialogueTurns = [];
    interaction.evaluation = "";
    interaction.assistantReply = "";
    setLocalInteractions((items) => [...items, interaction]);
    setSuggestedChoices(body.suggestedChoices ?? []);
    setMessage("");
    if (optionId) {
      setSelectedOptionId(optionId);
      setDecisionLocked(true);
    }
    setPending(null);

    // Stream each turn one at a time
    for (let i = 0; i < turns.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setLocalInteractions((items) => {
        const updated = [...items];
        const last = { ...updated[updated.length - 1] };
        last.dialogueTurns = [...(last.dialogueTurns || []), turns[i]];
        updated[updated.length - 1] = last;
        return updated;
      });
    }

    // Show evaluation after all turns
    await new Promise((r) => setTimeout(r, 500));
    setLocalInteractions((items) => {
      const updated = [...items];
      const last = { ...updated[updated.length - 1] };
      last.assistantReply = assistantText;
      last.evaluation = evaluationText;
      updated[updated.length - 1] = last;
      return updated;
    });
  }

  async function nextCycle() {
    if (roundMemberIds.length === 0) {
      setError("请至少选择一个下一轮参会角色。");
      return;
    }

    setPending("cycle");
    setError("");
    const recentInteraction = allInteractions.at(-1);
    const response = await fetch("/api/cycles?async=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedMemberIds: roundMemberIds,
        userInput: [
          "继续本局 20 轮模拟，本轮参会角色由用户重新选择。",
          recentInteraction ? `上一段用户互动：${recentInteraction.message}` : "",
          recentInteraction?.evaluation ? `LLM 实时判断：${recentInteraction.evaluation}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "下一轮生成失败。");
      setPending(null);
      return;
    }

    // Async mode: start polling
    if (body.jobId) {
      setCycleJobId(body.jobId);
    } else {
      // Fallback: old sync response
      router.refresh();
      setLocalInteractions([]);
      setSuggestedChoices([]);
      setDecisionLocked(false);
      setSelectedOptionId("");
      setPending(null);
    }
  }

  function exportMeetingBrief() {
    if (!meeting) return;
    const lines = [
      `# ${run.organizationName} - Round ${meeting.cycle} 经营会议纪要`,
      "",
      `- 沙盘：${run.workspaceName}`,
      `- 当前身份：${run.userRole}`,
      `- 会议主持：${meeting.chair}`,
      `- 会议议题：${meeting.agenda}`,
      "",
      "## 本轮事件",
      "",
      `### ${meeting.businessEvent?.title ?? "本轮事件"}`,
      "",
      meeting.businessEvent?.description ?? "",
      "",
      "## 角色观点",
      "",
      ...meeting.participantViews.flatMap((view) => [`### ${view.roleName}`, "", view.view, ""]),
      "## 阶段结论",
      "",
      meeting.conclusion,
      "",
      "## 决策方案",
      "",
      ...meeting.decisionOptions.flatMap((option, index) => [
        `### ${index + 1}. ${option.title}`,
        "",
        `- 建议：${option.recommendation}`,
        `- 机会：${option.upside}`,
        `- 风险：${option.risk}`,
        `- 资源需求：${option.resourceNeed}`,
        "",
      ]),
      "## 用户互动记录",
      "",
      ...(allInteractions.length
        ? allInteractions.flatMap((item) => [
            `### ${item.speaker}`,
            "",
            item.message,
            "",
            ...(item.dialogueTurns ?? []).flatMap((turn) => [`#### ${turn.speaker}`, "", turn.message, ""]),
            item.assistantReply ? `主持归纳：${item.assistantReply}` : "",
            item.evaluation ? `决策影响评估：${item.evaluation}` : "",
            "",
          ])
        : ["暂无用户互动。", ""]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${run.organizationName}-round-${meeting.cycle}-meeting-brief.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function endRun() {
    setPending("end");
    setError("");

    // End workspace first
    await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" }),
    });

    // Generate finale via async API
    try {
      const res = await fetch("/api/finale?async=1", { method: "POST" });
      const body = await res.json();
      if (body.jobId) {
        setFinaleJobId(body.jobId);
        return;
      }
      // Fallback: sync response
      if (body.finale) {
        setFinaleData({ title: body.finale.title, summary: body.finale.summary, score: body.finale.score });
        setShowFinaleModal(true);
        setPending(null);
        return;
      }
    } catch {
      // Fallback: try GET
      try {
        const res = await fetch("/api/finale");
        const body = await res.json();
        if (body.finale) {
          setFinaleData({
            title: body.finale.title,
            summary: body.finale.summary,
            score: body.finale.score,
          });
          setShowFinaleModal(true);
          setPending(null);
          return;
        }
      } catch {
        setError("结局生成失败，请刷新页面重试。");
      }
    }

    setPending(null);
  }

  const fetchAndShowFinale = useCallback(async () => {
    const res = await fetch("/api/finale");
    const body = await res.json();
    if (body.finale) {
      setFinaleData({ title: body.finale.title, summary: body.finale.summary, score: body.finale.score });
      setShowFinaleModal(true);
    } else {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    if (isFinished && !showFinaleModal) {
      const timeoutId = setTimeout(() => {
        fetchAndShowFinale();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [fetchAndShowFinale, isFinished, showFinaleModal]);

  return (
    <main className="min-h-screen bg-[#0c0f14] text-slate-100">
      {/* 结局弹窗 */}
      {showFinaleModal && finaleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-[#111821] to-[#0c0f14] p-8 shadow-2xl shadow-cyan-500/10">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border border-cyan-300/30 bg-cyan-300/20 px-6 py-3">
              <span className="font-mono text-3xl font-bold text-white">{finaleData.score}</span>
            </div>
            <div className="mt-8 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">KTSA 模拟结局</p>
              <h2 className="mt-3 text-2xl font-bold text-white">{finaleData.title}</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">{finaleData.summary}</p>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-md border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                返回仪表盘
              </button>
              <button
                onClick={() => {
                  fetch("/api/finale").then(async (res) => {
                    const body = await res.json();
                    if (body.finale?.id) {
                      router.push(`/finale/${body.finale.id}`);
                    } else {
                      router.push("/reports");
                    }
                  }).catch(() => router.push("/reports"));
                }}
                className="rounded-md bg-[#3370ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4e83ff]"
              >
                查看完整复盘
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-[310px_1fr]">
        <aside className="border-r border-white/10 bg-[#111821] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div className="border-b border-white/10 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              KTSA Meeting
            </div>
            <h1 className="text-lg font-semibold text-white">{run.workspaceName}</h1>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {run.organizationName} · {run.completedCycles}/{run.totalCycles} 轮
            </p>
          </div>

          <div className="space-y-4 p-4">
            <section>
              <div className="mb-2 text-xs font-semibold text-slate-400">当前会议</div>
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
                <div className="text-sm font-semibold text-white">Round {meeting?.cycle ?? "-"}</div>
                <div className="mt-1 text-xs leading-5 text-slate-300">{meeting?.agenda ?? "尚未生成会议"}</div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-400">下一轮参会角色</div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">{roundMemberIds.length}</span>
              </div>
              <div className="space-y-2">
                {run.teamMembers.map((member) => {
                  const checked = roundMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleRoundMember(member.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                        checked
                          ? "border-cyan-300/35 bg-cyan-300/12"
                          : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]"
                      }`}
                    >
                      <Avatar label={member.roleName} active={checked} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{member.name}</span>
                        <span className="block truncate text-xs text-slate-400">
                          {member.roleName} · {member.isRealMember ? "真实成员" : "虚拟角色"}
                        </span>
                      </span>
                      {checked ? <Check size={15} className="text-cyan-200" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">本轮决策方案</span>
                {decisionLocked && (
                  <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">已锁定</span>
                )}
              </div>
              {selectedOptionId && !decisionLocked && (
                <div className="mb-2 flex items-center justify-between rounded-md border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-2">
                  <span className="text-xs text-fuchsia-200">✓ 已选决策：{meeting?.decisionOptions.find(o => o.id === selectedOptionId)?.title}</span>
                  <button 
                    type="button"
                    onClick={() => setSelectedOptionId("")}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    取消选择
                  </button>
                </div>
              )}
              {decisionLocked && selectedOptionId && (
                <div className="mb-2 flex items-center rounded-md border border-fuchsia-300/50 bg-fuchsia-300/15 px-3 py-2">
                  <span className="text-xs text-fuchsia-200">🔒 已锁定决策：{meeting?.decisionOptions.find(o => o.id === selectedOptionId)?.title}</span>
                </div>
              )}
              <div className="space-y-2">
                {meeting?.decisionOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`block rounded-lg border p-3 transition-all duration-200 ${
                      decisionLocked
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    } ${
                      selectedOptionId === option.id && !decisionLocked
                        ? "border-fuchsia-300/60 bg-fuchsia-300/15 shadow-[0_0_12px_rgba(192,132,252,0.15)]"
                        : selectedOptionId === option.id && decisionLocked
                        ? "border-fuchsia-300/60 bg-fuchsia-300/15"
                        : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="decision"
                      disabled={decisionLocked}
                      checked={selectedOptionId === option.id}
                      onChange={() => setSelectedOptionId(option.id)}
                    />
                    <span className="block text-sm font-semibold text-white">{option.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">{option.recommendation}</span>
                    {option.upside && (
                      <div className="mt-2 text-xs text-emerald-300">↑ {option.upside}</div>
                    )}
                    {option.risk && (
                      <div className="mt-1 text-xs text-amber-300">↓ {option.risk}</div>
                    )}
                  </label>
                ))}
              </div>
            </section>
          </div>
        </aside>

        <section className="flex flex-col lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden">
          <header className="flex flex-col gap-3 border-b border-white/10 bg-[#151c26] px-5 py-4 md:flex-row md:items-center md:justify-between lg:shrink-0">
            <div>
              <div className="text-xs text-slate-400">当前身份：{run.userRole} · 主持：{meeting?.chair ?? "-"}</div>
              <h2 className="mt-1 text-xl font-semibold text-white">{meeting?.businessEvent?.title ?? "本轮专项事件"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportMeetingBrief}
                disabled={!meeting}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={16} />
                导出纪要
              </button>
              <button
                type="button"
                onClick={endRun}
                disabled={pending === "end"}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]"
              >
                {pending === "end" ? <Loader2 className="animate-spin" size={16} /> : <StopCircle size={16} />}
                {pending === "end" ? "正在生成结局…" : "主动结束"}
              </button>
            </div>
          </header>

          {error ? <div className="mx-5 mt-4 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</div> : null}
          {(cycleJobState || finaleJobState) && (
            <div className="mx-5 mt-4">
              <JobProgressBar state={cycleJobState || finaleJobState} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!meeting ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-lg font-semibold text-white">本局尚未生成会议</h2>
                <p className="mt-2 text-sm text-slate-300">请回到准备页开始第 1 轮。</p>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-4">
                {shownIntroItems.map((item, index) => (
                  <MeetingIntroEntry key={`${meeting.id}-${item.type}-${index}`} item={item} />
                ))}
                {!introComplete ? <TypingIndicator speaker={meeting.chair || "会议主持"} /> : null}
                {introComplete
                  ? allInteractions.map((item, index) => (
                      <div key={`${item.createdAt}-${index}`} className="space-y-3">
                        <ChatMessage speaker={item.speaker} message={item.message} mine />
                        {item.dialogueTurns?.map((turn, turnIndex) => (
                          <ChatMessage key={`${turn.speaker}-${turnIndex}`} speaker={turn.speaker} message={turn.message} />
                        ))}
                        {item.assistantReply ? <SystemCard title="会议主持归纳" body={item.assistantReply} /> : null}
                        {item.evaluation ? (
                          <div className="rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-300/15 to-cyan-300/10 px-5 py-4 shadow-[0_0_20px_rgba(16,185,229,0.1)]">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">本轮决策影响评估</div>
                            <p className="text-sm leading-6 text-emerald-50">{item.evaluation}</p>
                          </div>
                        ) : null}
                      </div>
                    ))
                  : null}
                <div ref={conversationEndRef} />
              </div>
            )}
          </div>

          <footer className="border-t border-white/10 bg-[#151c26] px-5 py-4">
            <div className="mx-auto max-w-4xl">
              {suggestedChoices.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {suggestedChoices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => submitMessage(choice, "")}
                      className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/16"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="rounded-xl border border-white/10 bg-[#0f141b] p-3 shadow-2xl shadow-black/20">
                <textarea
                  className="min-h-20 w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={!introComplete}
                  placeholder="输入你的发言、追问或决策倾向"
                />
                <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-400">
                    {introComplete ? `下一轮将使用左侧勾选的 ${roundMemberIds.length} 个角色。` : "会议发言正在逐条展开。"}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => submitMessage()}
                      disabled={pending === "message" || !introComplete}
                      className="inline-flex items-center gap-2 rounded-md bg-[#3370ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4e83ff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending === "message" ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      发送
                    </button>
                    {isFinished ? (
                      <Link href="/" className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">
                        查看结算
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={nextCycle}
                        disabled={pending === "cycle"}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pending === "cycle" ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                        下一轮
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}

function Avatar({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${active ? "bg-[#3370ff] text-white" : "bg-white/10 text-slate-300"}`}>
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

function MeetingIntroEntry({ item }: { item: MeetingIntroItem }) {
  if (item.type === "message") {
    return <ChatMessage speaker={item.speaker} message={item.message} />;
  }

  return <SystemCard title={item.title} body={item.body} tone={item.type === "conclusion" ? "success" : "info"} />;
}

function ChatMessage({ speaker, message, mine = false }: { speaker: string; message: string; mine?: boolean }) {
  return (
    <div className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine ? <Avatar label={speaker} active /> : null}
      <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        <div className="mb-1 text-xs text-slate-400">{speaker}</div>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${mine ? "rounded-tr-sm bg-[#3370ff] text-white" : "rounded-tl-sm bg-[#1d2633] text-slate-100"}`}>
          {message}
        </div>
      </div>
      {mine ? <Avatar label={speaker} /> : null}
    </div>
  );
}

function TypingIndicator({ speaker }: { speaker: string }) {
  return (
    <div className="flex justify-start gap-3">
      <Avatar label={speaker} active />
      <div className="flex max-w-[78%] flex-col items-start">
        <div className="mb-1 text-xs text-slate-400">{speaker}</div>
        <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[#1d2633] px-4 py-3 shadow-sm">
          <span className="size-1.5 animate-pulse rounded-full bg-slate-300" />
          <span className="size-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:120ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}

function SystemCard({ title, body, tone = "info" }: { title: string; body: string; tone?: "info" | "success" }) {
  return (
    <div className={`mx-auto max-w-3xl rounded-xl border px-4 py-3 text-sm leading-6 ${
      tone === "success"
        ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-50"
        : "border-white/10 bg-white/[0.045] text-slate-200"
    }`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
      <div>{body}</div>
    </div>
  );
}
