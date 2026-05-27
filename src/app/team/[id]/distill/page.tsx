import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { DistillForm } from "@/components/distill-form";
import { SkillImportForm } from "@/components/skill-import-form";
import { getDb } from "@/lib/db";
import { ensureDatabase } from "@/lib/bootstrap-db";

export const dynamic = "force-dynamic";

export default async function DistillPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  const { id } = await params;
  const member = await getDb().teamMember.findUnique({
    where: { id },
    include: { distillationProfile: true, sourceDocuments: { orderBy: { createdAt: "desc" } } },
  });
  if (!member) notFound();

  const skillDocuments = member.sourceDocuments.filter((source) => source.sourceKind === "skill");
  const materialDocuments = member.sourceDocuments.filter((source) => source.sourceKind !== "skill");

  return (
    <AppShell>
      <PageHeader
        title={`${member.name} 的数字孪生配置`}
        description="上传真实资料生成可编辑画像，也可以导入 Skill，让该角色在会议中具备更明确的专业能力和行动方式。"
      />
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-5">
          <Panel className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">上传资料并蒸馏画像</h2>
            <DistillForm memberId={member.id} />
          </Panel>

          <div id="skill-import" className="scroll-mt-6">
            <Panel className="p-5 ring-1 ring-cyan-300/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Skill Matrix</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">导入数字孪生 Skill</h2>
                </div>
                <div className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                  新增能力上下文
                </div>
              </div>
              <SkillImportForm memberId={member.id} />
            </Panel>
          </div>

          <Link className="inline-block text-sm text-[var(--accent)]" href="/team">
            返回数字孪生列表
          </Link>
        </div>

        <div className="space-y-5">
          <Panel className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">当前画像</h2>
            {member.distillationProfile ? (
              <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
                <p><b className="text-white">语言风格：</b>{member.distillationProfile.languageStyle}</p>
                <p><b className="text-white">决策偏好：</b>{member.distillationProfile.decisionPreference}</p>
                <p><b className="text-white">价值观：</b>{member.distillationProfile.values}</p>
                <p><b className="text-white">压力反应：</b>{member.distillationProfile.pressureResponse}</p>
                <p><b className="text-white">专业边界：</b>{member.distillationProfile.professionalBoundary}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">尚未生成蒸馏画像。</p>
            )}
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">已导入 Skill</h2>
            <div className="space-y-2">
              {skillDocuments.length ? (
                skillDocuments.map((source) => (
                  <div key={source.id} className="rounded-md border border-[var(--line)] bg-white/[0.03] p-3 text-sm">
                    <div className="font-semibold text-white">{source.fileName}</div>
                    <p className="mt-2 line-clamp-3 text-[var(--muted)]">{source.extractedText.slice(0, 180)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">暂无 Skill。</p>
              )}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">材料记录</h2>
            <div className="space-y-2">
              {materialDocuments.map((source) => (
                <div key={source.id} className="rounded-md border border-[var(--line)] bg-white/[0.03] p-3 text-sm">
                  <div className="font-semibold text-white">{source.fileName}</div>
                  <div className="text-xs text-[var(--muted)]">{source.sourceKind} · {source.mimeType}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
