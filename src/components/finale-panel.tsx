"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FinaleReport } from "@/lib/finale";

type FinaleResponse = {
  finale: (FinaleReport & { id?: string; completedCycles?: number }) | null;
  error?: string;
};

export function FinalePanel({ fallback }: { fallback: FinaleReport }) {
  const [report, setReport] = useState<(FinaleReport & { id?: string; completedCycles?: number })>(fallback);
  const [status, setStatus] = useState("正在生成 AI 结算...");
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    async function generateFinale() {
      try {
        const response = await fetch("/api/finale", { method: "POST" });
        const body = (await response.json()) as FinaleResponse;
        if (!response.ok || !body.finale) {
          setStatus(body.error ?? "AI 结算暂不可用，当前展示规则兜底结局。");
          return;
        }
        setReport(body.finale);
        setStatus("AI 结算已生成并保存");
      } catch {
        setStatus("AI 结算暂不可用，当前展示规则兜底结局。");
      }
    }

    generateFinale();
  }, []);

  return (
    <section className="glass-panel mb-5 overflow-hidden p-5 ring-1 ring-cyan-300/25">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">AI 20 Round Finale</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{report.title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)]">{report.summary}</p>
          <p className="mt-3 text-xs text-cyan-100/80">{status}</p>
        </div>
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-center">
          <div className="font-mono text-4xl font-semibold text-white">{Math.round(report.score)}</div>
          <div className="mt-1 text-xs text-cyan-100">结局评分</div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <FinaleList title="关键驱动" items={report.keyDrivers} />
        <FinaleList title="决策轨迹" items={report.decisionTrace} />
        <FinaleList title="其他可能结局" items={report.alternativeEndings} />
        <FinaleList title="后续动作" items={report.nextActions} />
      </div>
      <div className="mt-5 flex justify-end">
        <Link href={`/finale/${report.id}`} className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/16">
          查看完整复盘报告
        </Link>
      </div>
    </section>
  );
}

function FinaleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white/[0.035] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      <div className="space-y-2 text-sm leading-6 text-[var(--muted)]">
        {items.length ? items.map((item) => <p key={item}>{item}</p>) : <p>暂无足够记录。</p>}
      </div>
    </div>
  );
}
