import Link from "next/link";
import { BarChart3, BriefcaseBusiness, FileText, GitBranch, LayoutDashboard, Play, ShieldCheck, Users } from "lucide-react";
import { DemoLaunchButton } from "@/components/demo-launch-button";

const proofPoints = [
  { label: "AI 董事会", value: "多角色逐轮讨论" },
  { label: "企业交付物", value: "PDF / Word / PPT" },
  { label: "治理能力", value: "租户 / 审计 / 日志" },
];

const useCases = [
  {
    icon: <BriefcaseBusiness size={20} />,
    title: "创业战略演练",
    description: "在真实会议前，先模拟融资、定价、招聘、交付和危机决策。",
  },
  {
    icon: <Users size={20} />,
    title: "AI 数字孪生会议",
    description: "让 CEO、CFO、CTO、法务、销售、投资人和客户角色共同质询同一个决策。",
  },
  {
    icon: <FileText size={20} />,
    title: "可交付报告",
    description: "将最终复盘导出为 PDF、Word、PPT 和 Markdown，方便管理层讨论。",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "企业级控制",
    description: "支持账号、企业空间、成员权限、审计记录、LLM 调用日志和数据删除。",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05080f] text-white">
      <section className="relative min-h-[92vh] overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(103,232,249,0.16),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.12),transparent_24%),linear-gradient(135deg,#05080f_0%,#07111f_45%,#111827_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-cyan-300/25" />

        <div className="relative mx-auto flex min-h-[84vh] max-w-7xl flex-col justify-between">
          <nav className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-cyan-100">KTSA</div>
              <div className="text-xs text-slate-400">AI 创业经营沙盘</div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/pricing" className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                商业方案
              </Link>
              <Link href="/login" className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
                登录
              </Link>
            </div>
          </nav>

          <div className="grid gap-8 py-14 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <BarChart3 size={14} />
                面向创业者、投资人和企业创新团队
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-normal md:text-7xl">
                Keep The Startup Alive
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                KTSA 是一个 AI 创业经营模拟沙盘，把企业背景转化为董事会式决策演练。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <DemoLaunchButton />
                <Link
                  href="/simulation/start"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Play size={18} />
                  开始模拟
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/25 p-4 backdrop-blur">
              <div className="grid gap-3">
                {proofPoints.map((item) => (
                  <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-cyan-100">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        {useCases.map((item) => (
          <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="mb-3 text-cyan-200">{item.icon}</div>
            <h2 className="font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-12 sm:px-6 md:flex-row lg:px-8">
        <Link href="/security" className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
          <ShieldCheck size={16} />
          安全与数据处理
        </Link>
        <Link href="/scenarios" className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
          <GitBranch size={16} />
          行业场景模板
        </Link>
        <Link href="/enterprise" className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
          <LayoutDashboard size={16} />
          企业空间
        </Link>
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
          <BarChart3 size={16} />
          管理后台
        </Link>
      </section>
    </main>
  );
}
