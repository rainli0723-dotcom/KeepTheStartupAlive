import Link from "next/link";
import { AppShell, EmptyState, PageHeader, Panel } from "@/components/app-shell";
import { OrganizationDocumentForm } from "@/components/organization-document-form";
import { OrganizationForm } from "@/components/organization-form";
import { ArchiveList } from "@/components/archive-list";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const example = [
  "公司阶段：A 轮前，核心产品已上线 6 个月，月收入约 18 万元。",
  "现金流：账上现金可支撑 7 个月，当前获客成本持续上升。",
  "团队：创始人负责销售与融资，CTO 管 5 人技术团队，缺少专职法务。",
  "客户：主要客户为中小企业，续费率不稳定，头部客户提出降价要求。",
  "风险：投资人要求两周内看到付费转化改善，否则可能推迟 TS。",
  "本轮希望模拟：是否降价进入更大市场，以及对现金流、品牌和融资的影响。",
];

export default async function OrganizationPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return (
      <AppShell>
        <EmptyState title="尚未创建组织档案" description="创建沙盘时会同步生成组织档案。" />
        <Link href="/setup" className="glass-primary-button mt-4 px-4 py-2 text-sm">
          去创建
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="组织档案"
        description="这里定义沙盘推演的企业现状。你可以手动填写基础信息，也可以导入公司情况文档，让后续会议更贴近真实业务。"
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <Panel className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">基础信息</h2>
          <OrganizationForm organization={workspace.organizationProfile} />
        </Panel>

        <div className="space-y-5">
          <Panel className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">导入公司情况文档</h2>
            <OrganizationDocumentForm />
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-3 text-lg font-semibold text-white">参考范例</h2>
            <div className="space-y-2 text-sm leading-6 text-[var(--muted)]">
              {example.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-3 text-lg font-semibold text-white">已导入资料</h2>
            <div className="space-y-2">
              {workspace.organizationProfile.documents.length ? (
                workspace.organizationProfile.documents.map((document) => (
                  <div key={document.id} className="rounded-md border border-[var(--line)] bg-white/[0.03] p-3 text-sm">
                    <div className="font-semibold text-white">{document.fileName}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {document.sourceKind} · {document.mimeType}
                    </div>
                    <p className="mt-2 line-clamp-3 text-[var(--muted)]">{document.extractedText.slice(0, 180)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">暂无导入资料。</p>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* 历史存档 */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">📜 历史存档</h2>
        <ArchiveList organizationProfileId={workspace.organizationProfileId} />
      </div>
    </AppShell>
  );
}
