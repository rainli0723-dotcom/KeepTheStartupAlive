import Link from "next/link";
import { Play, Users, GitBranch, BriefcaseBusiness, LayoutDashboard, ShieldCheck } from "lucide-react";
import { DemoLaunchButton } from "@/components/demo-launch-button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e14] px-4">
      {/* Title */}
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold text-white md:text-5xl">Keep The Startup Alive</h1>
        <p className="text-lg text-[var(--muted)]">
          创业模拟沙盘 · 数字孪生团队
        </p>
      </div>

      {/* Description */}
      <p className="mb-10 max-w-md text-center text-base text-[var(--muted)]">
        上传企业背景，生成数字孪生管理层，模拟关键经营会议，
        输出可交付的决策纪要与复盘报告。
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <DemoLaunchButton />
        <Link
          href="/simulation/start"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
        >
          <Play size={18} />
          手动创建沙盘
        </Link>
      </div>
      <Link href="/security" className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-50">
        <ShieldCheck size={16} />
        查看企业安全与交付说明
      </Link>

      {/* Feature Cards - 简洁版 */}
      <div className="mt-16 grid gap-4 md:grid-cols-4 max-w-3xl">
        <FeatureCard 
          icon={<LayoutDashboard size={20} />}
          title="模拟经营"
          description="20轮经营周期"
        />
        <FeatureCard 
          icon={<Users size={20} />}
          title="数字孪生"
          description="创建虚拟成员"
        />
        <FeatureCard 
          icon={<GitBranch size={20} />}
          title="专项场景"
          description="多种挑战"
        />
        <FeatureCard 
          icon={<BriefcaseBusiness size={20} />}
          title="交付报告"
          description="纪要与复盘导出"
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
      <div className="mb-2 mx-auto text-cyan-200">{icon}</div>
      <h3 className="mb-1 font-semibold text-white">{title}</h3>
      <p className="text-xs text-[var(--muted)]">{description}</p>
    </div>
  );
}
