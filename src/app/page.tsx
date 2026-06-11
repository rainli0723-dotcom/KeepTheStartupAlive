import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  GitBranch,
  LayoutDashboard,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DemoLaunchButton } from "@/components/demo-launch-button";

const proofPoints = [
  { label: "AI boardroom", value: "Role-based debate" },
  { label: "Enterprise output", value: "PDF / Word / PPT" },
  { label: "Governance", value: "Tenant, audit, logs" },
];

const useCases = [
  {
    icon: <BriefcaseBusiness size={20} />,
    title: "Founder strategy rehearsal",
    description: "Simulate financing, pricing, hiring, delivery, and crisis decisions before the real meeting.",
  },
  {
    icon: <Users size={20} />,
    title: "AI digital twin board",
    description: "Let CEO, CFO, CTO, legal, sales, investor, and customer roles challenge the same decision.",
  },
  {
    icon: <FileText size={20} />,
    title: "Board-ready report",
    description: "Export final reviews as PDF, Word, PPT, and Markdown for management discussion.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Enterprise controls",
    description: "Account, tenant space, member roles, audit trail, LLM call logs, and data deletion controls.",
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
              <div className="text-xs text-slate-400">AI BUSINESS SANDBOX</div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/pricing" className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                Pricing
              </Link>
              <Link href="/login" className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
                Login
              </Link>
            </div>
          </nav>

          <div className="grid gap-8 py-14 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <BarChart3 size={14} />
                For founders, investors, and innovation teams
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-normal md:text-7xl">
                Keep The Startup Alive
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                KTSA is an AI strategy simulation sandbox that turns your company context into a boardroom-style decision rehearsal.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <DemoLaunchButton />
                <Link
                  href="/simulation/start"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Play size={18} />
                  Start Simulation
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
          Security and data handling
        </Link>
        <Link href="/scenarios" className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
          <GitBranch size={16} />
          Industry templates
        </Link>
        <Link href="/enterprise" className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
          <LayoutDashboard size={16} />
          Enterprise space
        </Link>
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
          <BarChart3 size={16} />
          Admin console
        </Link>
      </section>
    </main>
  );
}
