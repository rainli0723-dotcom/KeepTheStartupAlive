"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Target, Zap, ArrowRight, Loader2, Sparkles, Play, Settings } from "lucide-react";

type Scenario = {
  id: string;
  name: string;
  sandboxType: string;
  stage: string;
  description: string;
};

export default function SimulationStartPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"scenario" | "free">("scenario");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Fetch scenarios from API
  useEffect(() => {
    fetch("/api/scenarios")
      .then(res => res.json())
      .then(data => {
        if (data.scenarios) {
          setScenarios(data.scenarios);
        }
      })
      .catch(console.error);
  }, []);

  async function startSimulation() {
    setPending(true);
    setError("");

    try {
      // Save workspace with mode and scenario
      const workspaceResponse = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startNewRun: true,
          selectedScenarioId: mode === "scenario" && selectedScenarioId ? selectedScenarioId : null,
        }),
      });

      if (!workspaceResponse.ok) {
        throw new Error("配置保存失败");
      }

      if (mode === "free") {
        // Free mode: start first cycle and go to simulation run page
        const cycleResponse = await fetch("/api/cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userInput: "本局为自由模式，系统自动生成第一个经营周期事件。",
          }),
        });
        
        if (!cycleResponse.ok) {
          const err = await cycleResponse.json().catch(() => ({}));
          throw new Error(err.error ?? "启动失败");
        }
        
        router.push("/simulation/run");
      } else {
        // Scenario mode: go to config page to select roles
        router.push("/simulation/config");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "启动失败");
      setPending(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="开始模拟"
        description="选择模拟模式，开启你的商业沙盘之旅"
      />

      {/* Mode Selection */}
      <div className="grid gap-5 md:grid-cols-2 mt-5">
        {/* 场景模式 */}
        <button
          onClick={() => setMode("scenario")}
          className={`group relative overflow-hidden rounded-xl border p-6 text-left transition-all ${
            mode === "scenario"
              ? "border-cyan-400/50 bg-cyan-400/10"
              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
          }`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${mode === "scenario" ? "bg-cyan-400/20" : "bg-white/10"}`}>
                <Target size={24} className={mode === "scenario" ? "text-cyan-300" : "text-white/60"} />
              </div>
              <h3 className="text-lg font-semibold text-white">选择场景模式</h3>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">
              连同角色和场景一同选择。适合有明确模拟目标的情况。
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-medium ${mode === "scenario" ? "text-cyan-300" : "text-white/60"}`}>
                {mode === "scenario" ? "✓ 已选择" : "选择"}
              </span>
              <ArrowRight size={16} className={mode === "scenario" ? "text-cyan-300" : "text-white/40"} />
            </div>
          </div>
          {mode === "scenario" && (
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-transparent" />
          )}
        </button>

        {/* 自由模式 */}
        <button
          onClick={() => setMode("free")}
          className={`group relative overflow-hidden rounded-xl border p-6 text-left transition-all ${
            mode === "free"
              ? "border-fuchsia-400/50 bg-fuchsia-400/10"
              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
          }`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${mode === "free" ? "bg-fuchsia-400/20" : "bg-white/10"}`}>
                <Zap size={24} className={mode === "free" ? "text-fuchsia-300" : "text-white/60"} />
              </div>
              <h3 className="text-lg font-semibold text-white">自由模式</h3>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">
              先进入模拟，等出现了问题或机遇，再去选择参会的角色。适合探索性模拟。
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-medium ${mode === "free" ? "text-fuchsia-300" : "text-white/60"}`}>
                {mode === "free" ? "✓ 已选择" : "选择"}
              </span>
              <ArrowRight size={16} className={mode === "free" ? "text-fuchsia-300" : "text-white/40"} />
            </div>
          </div>
          {mode === "free" && (
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-400/5 to-transparent" />
          )}
        </button>
      </div>

      {/* Scenario Selection - only show for 场景模式 */}
      {mode === "scenario" && scenarios.length > 0 && (
        <Panel className="mt-5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-300" />
            <h2 className="text-lg font-semibold text-white">选择专项场景</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--muted)]">
            选用场景后，本轮模拟将会受到该场景设定的影响。留空则不使用专项场景。
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {/* 不使用场景 */}
            <button
              onClick={() => setSelectedScenarioId("")}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                !selectedScenarioId
                  ? "border-cyan-400/50 bg-cyan-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 ${
                !selectedScenarioId ? "border-cyan-400 bg-cyan-400" : "border-white/30"
              }`} />
              <div>
                <p className="font-semibold text-white">不使用专项场景</p>
                <p className="text-xs text-[var(--muted)]">标准商业模拟</p>
              </div>
            </button>

            {/* 场景列表 */}
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenarioId(scenario.id)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                  selectedScenarioId === scenario.id
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                  selectedScenarioId === scenario.id ? "border-cyan-400 bg-cyan-400" : "border-white/30"
                }`} />
                <div>
                  <p className="font-semibold text-white">{scenario.name}</p>
                  <p className="text-xs text-cyan-300">{scenario.sandboxType} · {scenario.stage}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">{scenario.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* Free mode description */}
      {mode === "free" && (
        <Panel className="mt-5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={20} className="text-fuchsia-300" />
            <h2 className="text-lg font-semibold text-white">自由模式说明</h2>
          </div>
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p>• 进入模拟后，系统会生成一个经营周期事件</p>
            <p>• 当遇到问题或机遇时，再选择合适的角色来参与会议</p>
            <p>• 这种模式更适合探索性的商业模拟，没有固定的剧本</p>
            <p>• 你可以随时在模拟过程中调整参会角色</p>
          </div>
        </Panel>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={startSimulation}
        disabled={pending}
        className="mt-5 glass-primary-button w-full gap-2 px-4 py-4 text-base"
      >
        {pending ? (
          <Loader2 className="animate-spin" size={20} />
        ) : mode === "scenario" ? (
          <Settings size={20} />
        ) : (
          <Play size={20} />
        )}
        {pending ? "正在启动..." : mode === "scenario" ? "模拟配置" : "开始自由模拟"}
      </button>
    </AppShell>
  );
}