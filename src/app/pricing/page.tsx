import Link from "next/link";
import { Building2, Check, Database, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Trial",
    price: "Free pilot",
    description: "For founder teams validating the AI strategy rehearsal workflow.",
    cta: "Start demo",
    href: "/simulation/start",
    features: [
      "1 enterprise workspace",
      "Demo role library and industry templates",
      "Markdown report export",
      "Basic LLM call logging",
    ],
  },
  {
    name: "Business",
    price: "Contract plan",
    description: "For accelerators, venture studios, and innovation teams running repeatable workshops.",
    cta: "Create enterprise account",
    href: "/register",
    highlighted: true,
    features: [
      "Team accounts and permissions",
      "PDF, Word, PPT, and Markdown reports",
      "Audit logs, data deletion, and health checks",
      "Usage review for LLM cost and operations",
    ],
  },
  {
    name: "Private Deployment",
    price: "Enterprise quote",
    description: "For customers that require isolated infrastructure, data residency, or private LLM routing.",
    cta: "Review security",
    href: "/security",
    features: [
      "PostgreSQL production profile",
      "Tenant-level data isolation",
      "Private model gateway configuration",
      "Deployment runbook and backup policy",
    ],
  },
];

const commercialReadiness = [
  { icon: <Building2 size={19} />, label: "Enterprise space", text: "Tenant, member, workspace, audit, and LLM operations are visible in one place." },
  { icon: <Database size={19} />, label: "Production data path", text: "PostgreSQL schema, migrations, and environment example are prepared for production rollout." },
  { icon: <ShieldCheck size={19} />, label: "Governance controls", text: "Admins can review logs and delete business data while preserving audit records." },
  { icon: <KeyRound size={19} />, label: "Access model", text: "Admin, editor, and viewer roles are available for enterprise team management." },
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
              Login
            </Link>
            <Link href="/enterprise" className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
              Enterprise
            </Link>
          </div>
        </nav>

        <div className="py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            <Sparkles size={14} />
            To B commercial package
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">Pricing for enterprise AI decision rehearsal</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            KTSA is packaged for pilots, repeatable business workshops, and private enterprise deployment. The product can be shown as a demo today and extended into a contracted rollout.
          </p>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-6 ${
                plan.highlighted ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[0.035]"
              }`}
            >
              <div className="text-sm font-semibold text-cyan-100">{plan.name}</div>
              <div className="mt-3 text-3xl font-semibold">{plan.price}</div>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-300">{plan.description}</p>
              <Link
                href={plan.href}
                className={`mt-5 inline-flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-semibold ${
                  plan.highlighted ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
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
