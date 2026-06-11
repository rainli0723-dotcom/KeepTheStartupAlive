import { AppShell, PageHeader, Panel } from "@/components/app-shell";

const securityItems = [
  {
    title: "租户隔离",
    body: "企业数据按租户隔离。工作区、团队、报告、LLM、审计、成员和分享链接等关键操作都使用租户级访问校验。",
  },
  {
    title: "角色与权限",
    body: "KTSA 支持管理员、编辑者和只读成员。管理员负责成员和数据管理，编辑者负责模拟操作，只读成员只能查看结果。",
  },
  {
    title: "审计日志",
    body: "系统记录注册、邀请、工作区变更、团队变更、报告生成、报告分享、Prompt 更新和数据删除等关键操作。",
  },
  {
    title: "LLM 治理",
    body: "LLM 调用会记录服务商、模型、Prompt 版本、Token 用量、预估成本、重试次数、耗时、请求哈希和错误状态。",
  },
  {
    title: "数据导出与分享",
    body: "企业报告可导出为 PDF、Word、PPT 和 Markdown。只读报告链接使用随机 token，并支持过期或撤销。",
  },
  {
    title: "生产数据库",
    body: "本地开发使用 SQLite，生产环境使用 PostgreSQL，并配套迁移流程、连接池、备份、恢复演练和 staging / production 隔离。",
  },
  {
    title: "数据删除",
    body: "租户管理员可以删除企业业务数据，同时保留企业身份和审计记录，用于客户下线和数据最小化流程。",
  },
  {
    title: "商业合规文件",
    body: "正式付费前，应发布隐私政策、服务条款、DPA、信息安全附件和私有化部署手册，并与客户合同保持一致。",
  },
];

export default function SecurityPage() {
  return (
    <AppShell>
      <PageHeader
        title="安全与合规"
        description="面向企业客户的数据隔离、权限、审计、LLM 治理、数据导出、删除和生产部署能力。"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {securityItems.map((item) => (
          <Panel key={item.title} className="p-5">
            <h2 className="text-lg font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
