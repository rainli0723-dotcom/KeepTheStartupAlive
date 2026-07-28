"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingDown, TrendingUp, Users } from "lucide-react";

type AnalyticsData = {
  period: { start: string; end: string; days: number };
  users: { active: number; activePrev: number; change: number | null };
  simulations: { total: number; completed: number; active: number };
  reports: { exports: number };
  llm: {
    totalCalls: number;
    totalTokens: number;
    estimatedCostUsd: number;
    failureRate: number;
    dailyCalls: { date: string; count: number }[];
    byModel: { model: string; calls: number; cost: number; tokens: number }[];
    byTask: { task: string; count: number }[];
  };
  workspaces: { id: string; name: string; status: string; completedCycles: number; lastActive: string }[];
  shareLinks: { active: number; createdThisMonth: number };
};

export function EnterpriseAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/enterprise/analytics?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  if (loading) return <div className="p-6 text-sm text-slate-400">加载使用数据中...</div>;
  if (!data) return <div className="p-6 text-sm text-rose-400">无法加载使用数据。</div>;

  const formatCost = (usd: number) => `$${usd.toFixed(2)}`;
  const formatTokens = (n: number) => n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n > 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  const maxDaily = Math.max(1, ...data.llm.dailyCalls.map(d => d.count));

  return (
    <div className="space-y-5">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">使用数据</h2>
        <div className="flex gap-1 rounded-md border border-white/10 bg-white/5 p-0.5">
          {["7d", "30d", "90d"].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded ${range === r ? "bg-cyan-300/20 text-cyan-200" : "text-slate-400 hover:text-white"}`}
            >
              {r === "7d" ? "7 天" : r === "30d" ? "30 天" : "90 天"}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Users size={18} />}
          label="活跃用户"
          value={data.users.active}
          change={data.users.change}
          unit="人"
        />
        <MetricCard
          icon={<BarChart3 size={18} />}
          label="LLM 调用"
          value={data.llm.totalCalls}
          unit="次"
          subtitle={formatCost(data.llm.estimatedCostUsd) + " USD"}
        />
        <MetricCard
          icon={<TrendingUp size={18} />}
          label="模拟完成"
          value={data.simulations.completed}
          unit="个"
          subtitle={`${data.simulations.active} 活跃`}
        />
        <MetricCard
          icon={<TrendingDown size={18} />}
          label="失败率"
          value={data.llm.failureRate}
          unit="%"
          invert
          subtitle={`${data.llm.totalCalls} 次调用`}
        />
      </div>

      {/* Daily trend chart (SVG) */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">每日 LLM 调用趋势</h3>
        <div className="h-32">
          <svg viewBox={`0 0 ${data.llm.dailyCalls.length * 25} 120`} className="h-full w-full" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <line key={pct} x1="0" y1={120 - pct * 110} x2={data.llm.dailyCalls.length * 25} y2={120 - pct * 110} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            ))}
            {/* Data line */}
            <polyline
              fill="none"
              stroke="#67e8f9"
              strokeWidth="2"
              points={data.llm.dailyCalls.map((d, i) => `${i * 25 + 12},${120 - (d.count / maxDaily) * 110}`).join(" ")}
            />
            {/* Data dots */}
            {data.llm.dailyCalls.map((d, i) => (
              <circle key={i} cx={i * 25 + 12} cy={120 - (d.count / maxDaily) * 110} r="2" fill="#67e8f9" />
            ))}
          </svg>
        </div>
      </div>

      {/* Model breakdown + Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">模型用量</h3>
          <div className="space-y-2">
            {data.llm.byModel.map(m => (
              <div key={m.model} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{m.model}</span>
                <span className="text-slate-400">{m.calls} 次 · {formatCost(m.cost)} · {formatTokens(m.tokens)} tokens</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">任务分布</h3>
          <div className="space-y-2">
            {data.llm.byTask.map(t => (
              <div key={t.task} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{t.task}</span>
                <span className="text-slate-400">{t.count} 次</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent workspaces */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">最近工作区</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-2 pr-3">名称</th>
                <th className="pb-2 pr-3">状态</th>
                <th className="pb-2 pr-3">进度</th>
                <th className="pb-2">最后活跃</th>
              </tr>
            </thead>
            <tbody>
              {data.workspaces.map(w => (
                <tr key={w.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 text-white">{w.name}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${w.status === "active" ? "bg-emerald-300/15 text-emerald-300" : w.status === "ended" ? "bg-slate-300/15 text-slate-400" : "bg-amber-300/15 text-amber-300"}`}>
                      {w.status === "active" ? "运行中" : w.status === "ended" ? "已结束" : w.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{w.completedCycles}/20</td>
                  <td className="py-2 text-slate-500">{new Date(w.lastActive).toLocaleDateString("zh-CN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, change, unit, invert, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  change?: number | null;
  invert?: boolean;
  subtitle?: string;
}) {
  const changeBadge = change != null ? (
    <span className={`text-xs ml-1 ${change > 0 && !invert || change < 0 && invert ? "text-emerald-300" : change === 0 ? "text-slate-400" : "text-rose-300"}`}>
      {change > 0 ? "↑" : change < 0 ? "↓" : "→"}{Math.abs(change)}%
    </span>
  ) : null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-2 text-cyan-200/70">{icon}</div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
        <span className="text-sm text-slate-400 ml-0.5">{unit}</span>
        {changeBadge}
      </div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
    </div>
  );
}
