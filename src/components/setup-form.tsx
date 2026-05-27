"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "创建沙盘失败");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <label className="text-sm">
        组织名称
        <input className="field mt-1" name="name" defaultValue="Keep The Startup Alive" required />
      </label>
      <label className="text-sm">
        行业
        <input className="field mt-1" name="industry" defaultValue="AI 创业服务" required />
      </label>
      <label className="text-sm md:col-span-2">
        产品/业务
        <input className="field mt-1" name="product" defaultValue="AI 商业模拟沙盘" required />
      </label>
      <label className="text-sm md:col-span-2">
        目标市场
        <input className="field mt-1" name="market" defaultValue="初创团队、OPC、孵化器和成长期企业" required />
      </label>
      <label className="text-sm">
        组织阶段
        <select className="field mt-1" name="stage" defaultValue="seed">
          <option value="opc">OPC / 一人公司</option>
          <option value="small_team">小型项目组</option>
          <option value="seed">种子期 / 天使轮</option>
          <option value="growth">A/B 轮成长期</option>
          <option value="mature">成熟公司业务单元</option>
          <option value="incubator">孵化器 / 加速器</option>
        </select>
      </label>
      <label className="text-sm">
        沙盘类型
        <select className="field mt-1" name="sandboxType" defaultValue="growth">
          <option value="growth">增长策略沙盘</option>
          <option value="legal_compliance">法务/合规沙盘</option>
          <option value="financing">融资沙盘</option>
          <option value="pricing">产品定价沙盘</option>
          <option value="market_competition">市场竞争沙盘</option>
          <option value="organization">组织管理沙盘</option>
          <option value="crisis">危机应对沙盘</option>
        </select>
      </label>
      <label className="text-sm">
        用户参与身份
        <select className="field mt-1" name="userRole" defaultValue="CEO">
          <option>创始人</option>
          <option>CEO</option>
          <option>CTO</option>
          <option>CLO</option>
          <option>COO</option>
          <option>CFO</option>
        </select>
      </label>
      <div className="md:col-span-2">
        {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}
        <button
          className="glass-primary-button px-4 py-2.5 text-sm"
          disabled={pending}
        >
          {pending ? "正在创建..." : "创建商业模拟沙盘"}
        </button>
      </div>
    </form>
  );
}
