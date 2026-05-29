"use client";

import { useEffect, useState } from "react";

type Archive = {
  id: string;
  name: string;
  stage: string;
  industry: string;
  product: string;
  market: string;
  cashflow: number;
  revenue: string;
  teamSize: number;
  governanceStructure: string;
  keyRisks: string;
  simulationEndedAt: string;
  finalOutcome: string | null;
  finalScore: number | null;
};

export function ArchiveList({ organizationProfileId }: { organizationProfileId: string }) {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/organization/archive?profileId=${organizationProfileId}`)
      .then(res => res.json())
      .then(data => {
        setArchives(data.archives || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [organizationProfileId]);

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">加载中...</div>;
  }

  if (archives.length === 0) {
    return <div className="text-sm text-[var(--muted)]">暂无历史存档。模拟结束后会自动生成存档。</div>;
  }

  return (
    <div className="grid gap-3">
      {archives.map((archive) => (
        <div
          key={archive.id}
          className="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white">{archive.name}</h3>
            {archive.finalScore !== null && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                archive.finalScore >= 70 ? "bg-green-500/20 text-green-300" :
                archive.finalScore >= 40 ? "bg-yellow-500/20 text-yellow-300" :
                "bg-red-500/20 text-red-300"
              }`}>
                得分: {archive.finalScore}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
            <div>阶段: {archive.stage}</div>
            <div>行业: {archive.industry}</div>
            <div>产品: {archive.product}</div>
            <div>市场: {archive.market}</div>
            <div>现金流: {archive.cashflow}%</div>
            <div>团队规模: {archive.teamSize}人</div>
          </div>
          {archive.finalOutcome && (
            <div className="mt-2 text-xs text-cyan-300">
              结果: {archive.finalOutcome}
            </div>
          )}
          <div className="mt-2 text-xs text-[var(--muted)]">
            模拟时间: {new Date(archive.simulationEndedAt).toLocaleString("zh-CN")}
          </div>
        </div>
      ))}
    </div>
  );
}