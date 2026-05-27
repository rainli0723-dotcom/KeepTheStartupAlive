import Link from "next/link";
import { Cpu, DatabaseZap, Radar, ScanFace, UploadCloud } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { TeamMemberCardActions } from "@/components/team-member-card-actions";
import { TeamMemberForm } from "@/components/team-member-form";
import { getActiveWorkspace } from "@/lib/workspace";
import { parseCapabilities, parseMetrics } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const capabilityLabels = {
  sales: "销售",
  technology: "技术",
  management: "管理",
  operations: "运营",
  financing: "融资",
  strategy: "战略",
};

export default async function TeamPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return (
      <AppShell>
        <EmptyState title="尚未创建沙盘" description="先创建沙盘，系统会自动生成推荐角色。" />
      </AppShell>
    );
  }

  const realCount = workspace.teamMembers.filter((member) => member.isRealMember).length;
  const distilledCount = workspace.teamMembers.filter((member) => member.distillationProfile).length;

  return (
    <AppShell>
      <div className="twin-lab overflow-hidden rounded-xl border border-cyan-300/20 bg-slate-950 text-slate-50 shadow-2xl shadow-cyan-950/30">
        <section className="relative border-b border-cyan-300/15 px-5 py-6 sm:px-7">
          <div className="twin-grid" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <ScanFace size={14} />
                Twin Lab
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">团队数字孪生控制台</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                创建真实成员或虚拟专家角色，调节六项能力与自定义人格指标，并通过资料蒸馏让角色参与经营会议推演。
              </p>
            </div>
            <div className="grid min-w-80 grid-cols-3 gap-3">
              <TwinStat label="角色节点" value={workspace.teamMembers.length} icon={<Cpu size={18} />} />
              <TwinStat label="真实成员" value={realCount} icon={<Radar size={18} />} />
              <TwinStat label="已蒸馏" value={distilledCount} icon={<DatabaseZap size={18} />} />
            </div>
          </div>
        </section>

        <div className="grid gap-5 p-5 sm:p-7">
          <section className="twin-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                <ScanFace size={19} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Create Node</p>
                <h2 className="mt-1 text-lg font-semibold text-white">新增数字孪生角色</h2>
              </div>
            </div>
            <TeamMemberForm horizontal={true} />
          </section>

          <div className="grid gap-4 grid-cols-2">
            {workspace.teamMembers.map((member, index) => {
              const capabilities = parseCapabilities(member.capabilities);
              const metrics = parseMetrics(member.customMetrics);
              return (
                <section key={member.id} className="twin-card group p-4" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
                  <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">{member.name}</h2>
                        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-xs text-cyan-100">
                          {member.roleName}
                        </span>
                        {member.isRealMember ? (
                          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-xs text-emerald-100">
                            真实成员
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-6 text-slate-300">{member.personality || "尚未填写个性化设定"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="twin-secondary-button inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold"
                        href={`/team/${member.id}/distill`}
                      >
                        <UploadCloud size={16} />
                        资料蒸馏
                      </Link>
                      <Link
                        className="glass-primary-button inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold"
                        href={`/team/${member.id}/distill#skill-import`}
                      >
                        <DatabaseZap size={16} />
                        导入 Skill
                      </Link>
                    </div>
                  </div>

                  <TeamMemberCardActions
                    member={{
                      id: member.id,
                      name: member.name,
                      roleName: member.roleName,
                      isRealMember: member.isRealMember,
                      capabilities: member.capabilities,
                      customMetrics: member.customMetrics,
                      personality: member.personality,
                      communicationStyle: member.communicationStyle,
                      decisionPreference: member.decisionPreference,
                    }}
                  />

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Object.entries(capabilities).map(([key, value]) => (
                      <TwinCapability key={key} label={capabilityLabels[key as keyof typeof capabilityLabels]} value={value} />
                    ))}
                  </div>

                  {metrics.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {metrics.map((metric) => (
                        <span key={metric.label} className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-slate-200">
                          {metric.label}: {metric.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TwinStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-cyan-300/20 bg-white/[0.06] p-3 backdrop-blur">
      <div className="mb-2 text-cyan-100">{icon}</div>
      <div className="font-mono text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-300">{label}</div>
    </div>
  );
}

function TwinCapability({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-cyan-100">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="twin-capability-fill h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
