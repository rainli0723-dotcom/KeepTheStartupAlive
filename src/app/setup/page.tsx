import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { SetupForm } from "@/components/setup-form";

export default function SetupPage() {
  return (
    <AppShell>
      <PageHeader
        title="创建 To B 商业模拟沙盘"
        description="选择组织阶段、专项沙盘类型和参与身份，系统会自动推荐覆盖全生命周期的经营、专业支持、外部利益相关方和未来发展角色。"
      />
      <Panel className="p-6">
        <SetupForm />
      </Panel>
    </AppShell>
  );
}
