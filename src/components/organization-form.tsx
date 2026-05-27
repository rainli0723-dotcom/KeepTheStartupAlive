"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Organization = {
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
};

const stageOptions = [
  ["opc", "OPC / 一人公司"],
  ["small_team", "小型项目组"],
  ["seed", "种子期 / 天使轮"],
  ["growth", "A/B 轮成长期"],
  ["mature", "成熟公司业务单元"],
  ["incubator", "孵化器 / 加速器"],
];

export function OrganizationForm({ organization }: { organization: Organization }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/organization", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        stage: form.get("stage"),
        industry: form.get("industry"),
        product: form.get("product"),
        market: form.get("market"),
        cashflow: Number(form.get("cashflow")),
        revenue: form.get("revenue"),
        teamSize: Number(form.get("teamSize")),
        governanceStructure: form.get("governanceStructure"),
        keyRisks: form.get("keyRisks"),
      }),
    });
    setMessage(response.ok ? "组织档案已保存" : "保存失败，请检查必填项");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <label className="text-sm">
        组织名称
        <input className="field mt-1" name="name" defaultValue={organization.name} required />
      </label>
      <label className="text-sm">
        组织阶段
        <select className="field mt-1" name="stage" defaultValue={organization.stage}>
          {stageOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        行业
        <input className="field mt-1" name="industry" defaultValue={organization.industry} required />
      </label>
      <label className="text-sm">
        团队规模
        <input className="field mt-1" type="number" name="teamSize" min={1} defaultValue={organization.teamSize} required />
      </label>
      <label className="text-sm md:col-span-2">
        产品 / 业务
        <input className="field mt-1" name="product" defaultValue={organization.product} required />
      </label>
      <label className="text-sm md:col-span-2">
        目标市场
        <input className="field mt-1" name="market" defaultValue={organization.market} required />
      </label>
      <label className="text-sm">
        收入情况
        <input className="field mt-1" name="revenue" defaultValue={organization.revenue} required />
      </label>
      <label className="text-sm">
        现金流健康度
        <input className="field mt-1" type="number" name="cashflow" min={0} max={100} defaultValue={organization.cashflow} required />
      </label>
      <label className="text-sm md:col-span-2">
        治理结构
        <input className="field mt-1" name="governanceStructure" defaultValue={organization.governanceStructure} required />
      </label>
      <label className="text-sm md:col-span-2">
        关键风险
        <textarea
          className="field mt-1 min-h-24"
          name="keyRisks"
          defaultValue={formatRisks(organization.keyRisks)}
          placeholder="例如：现金流波动、关键角色缺口、客户续费不稳定、合规审查压力"
        />
      </label>
      <div className="md:col-span-2">
        {message ? <p className="mb-2 text-sm text-[var(--accent)]">{message}</p> : null}
        <button className="glass-primary-button px-4 py-2.5 text-sm">保存组织档案</button>
      </div>
    </form>
  );
}

function formatRisks(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join("、");
  } catch {
    return value;
  }
  return value;
}
