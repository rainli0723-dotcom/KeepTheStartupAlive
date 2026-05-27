import { AppShell, EmptyState, PageHeader, Panel, MetricBar } from "@/components/app-shell";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { ensureRoleTemplates } from "@/lib/seed";
import { getActiveWorkspace } from "@/lib/workspace";
import { getDb } from "@/lib/db";
import { parseCapabilities, parseStringList } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const capabilityLabels = {
  sales: "销售",
  technology: "技术",
  management: "管理",
  operations: "运营",
  financing: "融资",
  strategy: "战略",
};

export default async function RolesPage() {
  await ensureDatabase();
  await ensureRoleTemplates();
  const workspace = await getActiveWorkspace();
  const roles = await getDb().roleTemplate.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const teamMembers = workspace ? await getDb().teamMember.findMany({ where: { workspaceId: workspace.id }, include: { distillationProfile: true } }) : [];

  return (
    <AppShell>
      <PageHeader title="全生命周期角色模板库" description="覆盖 OPC、初创团队、成长期和成熟公司，支持经营角色、专业支持、外部利益相关方和未来发展角色。" />

      {teamMembers.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-white">数字孪生角色</h2>
          <div className="grid gap-4 grid-cols-2">
            {teamMembers.map((member) => (
              <Panel key={member.id} className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{member.name}</h2>
                      {member.distillationProfile ? (
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/15 px-2 py-0.5 text-xs text-cyan-200">已蒸馏</span>
                      ) : (
                        <span className="rounded-full border border-amber-300/30 bg-amber-300/15 px-2 py-0.5 text-xs text-amber-200">未蒸馏</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)]">{member.roleName}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-slate-400">
                    {member.isRealMember ? "真实成员" : "虚拟角色"}
                  </span>
                </div>
                {member.distillationProfile && (
                  <div className="mt-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-2">
                    <p className="text-xs leading-5 text-cyan-200/80">
                      语言风格：{member.distillationProfile.languageStyle} · 决策倾向：{member.distillationProfile.decisionPreference}
                    </p>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 grid-cols-2">
        {roles.map((role) => {
          const capabilities = parseCapabilities(role.defaultCapabilities);
          return (
            <Panel key={role.id} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{role.name}</h2>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">{role.category}</p>
                </div>
                <span className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]">
                  {parseStringList(role.sandboxTypes).length} 类沙盘
                </span>
              </div>
              <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{role.description}</p>
              <div className="grid gap-2">
                {Object.entries(capabilities).map(([key, value]) => (
                  <MetricBar key={key} label={capabilityLabels[key as keyof typeof capabilityLabels]} value={value} />
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
