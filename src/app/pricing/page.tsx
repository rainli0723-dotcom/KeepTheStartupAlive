import Link from "next/link";
import { Building2, Check, Database, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  {
    name: "试用版",
    price: "免费试点",
    description: "适合创业团队验证 AI 战略演练流程。",
    cta: "开始 Demo",
    href: "/simulation/start",
    features: ["1 个企业工作区", "Demo 角色库与行业模板", "Markdown 报告导出", "基础 LLM 调用日志"],
  },
  {
    name: "商业版",
    price: "合同定价",
    description: "适合加速器、投资机构、企业创新团队进行可复用工作坊。",
    cta: "注册企业账号",
    href: "/register",
    highlighted: true,
    features: ["团队账号与权限", "PDF、Word、PPT、Markdown 报告", "审计日志、数据删除、健康检查", "LLM 成本和任务运行记录"],
  },
  {
    name: "私有化部署",
    price: "企业报价",
    description: "适合需要独立基础设施、数据驻留或私有模型网关的客户。",
    cta: "查看安全说明",
    href: "/security",
    features: ["PostgreSQL 生产配置", "租户级数据隔离", "私有模型网关配置", "部署手册、备份和恢复策略"],
  },
];

const commercialReadiness = [
  { icon: <Building2 size={19} />, label: "企业空间", text: "租户、成员、工作区、审计和 LLM 运行情况集中管理。" },
  { icon: <Database size={19} />, label: "生产数据库路径", text: "已准备 PostgreSQL schema、迁移和生产环境配置示例。" },
  { icon: <ShieldCheck size={19} />, label: "治理控制", text: "管理员可查看日志、删除业务数据，并保留审计记录。" },
  { icon: <KeyRound size={19} />, label: "权限模型", text: "支持管理员、编辑者、只读成员，适合企业团队协作。" },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#05080f] text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-cyan-100">
            KTSA
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
              登录
            </Link>
            <Link href="/enterprise" className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
              企业空间
            </Link>
          </div>
        </nav>

        <div className="py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            <Sparkles size={14} />
            To B 商业化方案
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">面向企业客户的 AI 决策演练产品</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            KTSA 可用于试点演示、企业工作坊和私有化部署，帮助客户把战略讨论变成可复盘、可导出的模拟过程。
          </p>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-lg border p-6 ${plan.highlighted ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[0.035]"}`}>
              <div className="text-sm font-semibold text-cyan-100">{plan.name}</div>
              <div className="mt-3 text-3xl font-semibold">{plan.price}</div>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-300">{plan.description}</p>
              <Link href={plan.href} className={`mt-5 inline-flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-semibold ${plan.highlighted ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                {plan.cta}
              </Link>
              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-2 text-sm text-slate-200">
                    <Check className="mt-0.5 shrink-0 text-emerald-200" size={15} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {commercialReadiness.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <div className="text-cyan-200">{item.icon}</div>
              <h2 className="mt-3 font-semibold">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
