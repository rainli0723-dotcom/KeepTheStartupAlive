import { AppShell, PageHeader, Panel } from "@/components/app-shell";

const securityItems = [
  {
    title: "数据边界",
    body: "组织档案、上传资料、数字孪生角色和会议记录仅用于当前沙盘推演。当前版本不会把客户资料写入前端代码或公开页面。",
  },
  {
    title: "上传限制",
    body: "系统限制单个上传文件不超过 20MB，并仅接受 txt、md、docx、pdf 和常见音频文件，降低误传大文件和不可解析文件造成的风险。",
  },
  {
    title: "AI 调用说明",
    body: "需要 AI 生成、资料蒸馏或复盘增强时，相关上下文会发送给已配置的 LLM 服务商。企业正式使用前应确认供应商的数据处理政策。",
  },
  {
    title: "交付记录",
    body: "会议过程、角色观点、决策方案和复盘结论会沉淀为可导出的纪要和报告，便于企业内部复盘、审阅和留档。",
  },
  {
    title: "当前限制",
    body: "当前版本仍处于产品化阶段，尚未内置企业登录、多租户权限、审计日志和 SSO。正式 To B 部署前应补齐这些能力。",
  },
  {
    title: "部署建议",
    body: "生产环境建议使用 PostgreSQL、独立环境变量、私有网络访问控制、定期备份和监控告警；敏感客户建议采用私有化或专属实例。",
  },
];

export default function SecurityPage() {
  return (
    <AppShell>
      <PageHeader
        title="安全与企业交付说明"
        description="面向企业试用、采购评估和私有化部署前的基础说明。"
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
