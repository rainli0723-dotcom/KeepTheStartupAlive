"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ScenarioFormProps = {
  editId?: string;
};

export function ScenarioForm({ editId }: ScenarioFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!!editId);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/scenarios`)
      .then((r) => r.json())
      .then((body) => {
        const scenario = body.scenarios?.find((s: { id: string }) => s.id === editId);
        if (scenario) {
          setFormData({
            name: scenario.name,
            sandboxType: scenario.sandboxType,
            stage: scenario.stage,
            description: scenario.description,
            eventTitle: scenario.nodes.find((n: { nodeType: string }) => n.nodeType === "event")?.title ?? "",
            eventContent: scenario.nodes.find((n: { nodeType: string }) => n.nodeType === "event")?.content ?? "",
            decisionTitle: scenario.nodes.find((n: { nodeType: string }) => n.nodeType === "decision")?.title ?? "",
            decisionContent: scenario.nodes.find((n: { nodeType: string }) => n.nodeType === "decision")?.content ?? "",
            resultTitle: scenario.nodes.find((n: { nodeType: string }) => n.nodeType === "result")?.title ?? "",
            resultContent: scenario.nodes.find((n: { nodeType: string }) => n.nodeType === "result")?.content ?? "",
          });
        }
        setLoading(false);
      });
  }, [editId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nodes = [
      {
        nodeType: "event",
        title: String(form.get("eventTitle")),
        content: String(form.get("eventContent")),
        effect: { cashflow: -5, growth: 5, teamPressure: 8 },
      },
      {
        nodeType: "decision",
        title: String(form.get("decisionTitle")),
        content: String(form.get("decisionContent")),
        effect: {},
      },
      {
        nodeType: "result",
        title: String(form.get("resultTitle")),
        content: String(form.get("resultContent")),
        effect: { survivalProbability: 6 },
      },
    ];
    const payload = {
      name: form.get("name"),
      sandboxType: form.get("sandboxType"),
      stage: form.get("stage"),
      description: form.get("description"),
      nodes,
    };
    const url = editId ? `/api/scenarios?id=${editId}` : "/api/scenarios";
    const method = editId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "场景已保存" : body.error ?? "场景保存失败");
    if (response.ok) router.push("/scenarios");
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">加载中...</div>;
  }

  const getVal = (name: string) => formData[name] ?? "";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input className="field" name="name" defaultValue={getVal("name")} placeholder="场景名称" required />
        <select className="field" name="sandboxType" defaultValue={getVal("sandboxType") || "legal_compliance"}>
          <option value="legal_compliance">法务/合规沙盘</option>
          <option value="financing">融资沙盘</option>
          <option value="pricing">产品定价沙盘</option>
          <option value="market_competition">市场竞争沙盘</option>
          <option value="organization">组织管理沙盘</option>
          <option value="crisis">危机应对沙盘</option>
          <option value="growth">增长策略沙盘</option>
        </select>
        <select className="field" name="stage" defaultValue={getVal("stage") || "growth"}>
          <option value="opc">OPC / 一人公司</option>
          <option value="seed">初创团队</option>
          <option value="growth">成长期公司</option>
          <option value="mature">成熟公司</option>
        </select>
      </div>
      <textarea className="field min-h-20" name="description" defaultValue={getVal("description")} placeholder="场景目标、适用对象和关键背景" required />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-[var(--line)] p-3">
          <h3 className="mb-3 font-semibold">事件节点</h3>
          <input className="field mb-2" name="eventTitle" defaultValue={getVal("eventTitle")} placeholder="例如：投资人撤资" required />
          <textarea className="field min-h-24" name="eventContent" defaultValue={getVal("eventContent")} placeholder="事件背景和触发条件" required />
        </section>
        <section className="rounded-md border border-[var(--line)] p-3">
          <h3 className="mb-3 font-semibold">决策节点</h3>
          <input className="field mb-2" name="decisionTitle" defaultValue={getVal("decisionTitle")} placeholder="例如：现金流保卫方案" required />
          <textarea className="field min-h-24" name="decisionContent" defaultValue={getVal("decisionContent")} placeholder="需要会议讨论的决策点" required />
        </section>
        <section className="rounded-md border border-[var(--line)] p-3">
          <h3 className="mb-3 font-semibold">结果节点</h3>
          <input className="field mb-2" name="resultTitle" defaultValue={getVal("resultTitle")} placeholder="例如：三个月缓冲期" required />
          <textarea className="field min-h-24" name="resultContent" defaultValue={getVal("resultContent")} placeholder="结果、指标和观察点" required />
        </section>
      </div>
      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
      <button className="glass-primary-button px-4 py-2.5 text-sm">
        {editId ? "更新场景" : "保存场景"}
      </button>
    </form>
  );
}
