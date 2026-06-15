import Link from "next/link";
import { Building2, Check, Database, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  {
    name: "试用版",
    price: "免费试用",
    description: "适合创始团队快速体验 AI 经营沙盘和复盘报告。",
    cta: "开始 Demo",
    href: "/simulation/start",
    features: ["一键 Demo", "行业模板", "Markdown 导出", "基础 LLM 记录"],
  },
  {
    name: "企业版",
    price: "按企业报价",
    description: "适合团队内部演练、管理层复盘、企业客户交付和多成员协作。",
    cta: "创建企业空间",
    href: "/register",
    highlighted: true,
    features: ["企业账号与成员权限", "PDF / Word / PPT / Markdown 报告", "SSO 配置占位", "用量限制与审计日志"],
  },
  {
    name: "私有化部署",
    price: "项目制交付",
    description: "适合有数据隔离、内网部署、审计、合规和定制交付要求的客户。",
    cta: "查看安全说明",
    href: "/security",
    features: ["PostgreSQL 生产部署", "独立 LLM Key", "私有化部署 Runbook", "备份恢复与数据删除流程"],
  },
];

const commercialReadiness = [
  { icon: <Building2 size={19} />, label: "企业空间", text: "支持企业、成员、管理员、编辑者、只读成员、审计和分享链接管理。" },
  { icon: <Database size={19} />, label: "生产数据库", text: "保留本地 SQLite 演示，同时提供 PostgreSQL schema、migration 和部署文档。" },
  { icon: <ShieldCheck size={19} />, label: "安全合规", text: "支持会话管理、密码修改、数据删除、只读分享撤销和关键操作审计。" },
  { icon: <KeyRound size={19} />, label: "商业化配置", text: "支持试用期、用量额度、SSO 配置占位和私有化部署材料。" },
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
            To B 商业化配置
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">AI 经营沙盘的企业版交付路径</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            KTSA 用数字孪生角色模拟经营会议，帮助创业团队、投资机构、孵化器和企业创新团队做决策演练、复盘和报告交付。
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
