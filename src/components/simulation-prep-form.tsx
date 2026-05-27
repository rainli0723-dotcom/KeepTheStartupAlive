"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Building2, ChevronDown, ChevronRight, Loader2, Play, ShieldCheck, Target, Users } from "lucide-react";

type ScenarioPrep = {
  id: string;
  name: string;
  sandboxType: string;
  stage: string;
  description: string;
};

type TeamMemberPrep = {
  id: string;
  name: string;
  roleName: string;
  isRealMember: boolean;
  distillationProfile: unknown | null;
};

type OrganizationPrep = {
  name: string;
  stage: string;
  industry: string;
  product: string;
  market: string;
  cashflow: number;
  revenue: string;
  teamSize: number;
  governanceStructure: string;
  keyRisks: string;
};

export function SimulationPrepForm({
  organization,
  teamMembers,
  scenarios = [],
  selectedScenario = null,
  currentRole,
}: {
  organization: OrganizationPrep;
  teamMembers: TeamMemberPrep[];
  scenarios?: ScenarioPrep[];
  selectedScenario?: ScenarioPrep | null;
  currentRole: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  
  // Collapsible section states
  const [defaultsExpanded, setDefaultsExpanded] = useState(true);
  const [twinsExpanded, setTwinsExpanded] = useState(true);

  // Build role options from team members
  const roleOptions = useMemo(() => {
    const roles = new Set(teamMembers.map((member) => member.roleName));
    ["创始人", "CEO", "CTO", "CLO", "COO", "CFO", "CMO"].forEach((role) => roles.add(role));
    return [...roles];
  }, [teamMembers]);

  // Default roles that can be used - all from role library
  const defaultRoles = [
    // Core roles
    { id: "default-ceo", name: "CEO", roleName: "CEO", isRealMember: false, isDefault: true },
    { id: "default-cto", name: "CTO", roleName: "CTO", isRealMember: false, isDefault: true },
    { id: "default-cfo", name: "CFO", roleName: "CFO", isRealMember: false, isDefault: true },
    { id: "default-cmo", name: "CMO", roleName: "CMO", isRealMember: false, isDefault: true },
    { id: "default-coo", name: "COO", roleName: "COO", isRealMember: false, isDefault: true },
    { id: "default-clo", name: "CLO", roleName: "CLO", isRealMember: false, isDefault: true },
    { id: "default-founder", name: "创始人", roleName: "创始人", isRealMember: false, isDefault: true },
    // Business roles
    { id: "default-product", name: "产品负责人", roleName: "产品负责人", isRealMember: false, isDefault: true },
    { id: "default-sales", name: "销售负责人", roleName: "销售负责人", isRealMember: false, isDefault: true },
    { id: "default-ops", name: "运营负责人", roleName: "运营负责人", isRealMember: false, isDefault: true },
    { id: "default-cs", name: "客户成功负责人", roleName: "客户成功负责人", isRealMember: false, isDefault: true },
    { id: "default-marketing", name: "市场负责人", roleName: "市场负责人", isRealMember: false, isDefault: true },
    // Support roles
    { id: "default-legal", name: "法务顾问", roleName: "法务顾问", isRealMember: false, isDefault: true },
    { id: "default-compliance", name: "合规负责人", roleName: "合规负责人", isRealMember: false, isDefault: true },
    { id: "default-hr", name: "人力负责人", roleName: "人力负责人", isRealMember: false, isDefault: true },
    { id: "default-finance", name: "财务负责人", roleName: "财务负责人", isRealMember: false, isDefault: true },
    { id: "default-analyst", name: "数据分析师", roleName: "数据分析师", isRealMember: false, isDefault: true },
    { id: "default-architect", name: "技术架构师", roleName: "技术架构师", isRealMember: false, isDefault: true },
    // External roles
    { id: "default-investor", name: "投资人", roleName: "投资人", isRealMember: false, isDefault: true },
    { id: "default-board", name: "董事会成员", roleName: "董事会成员", isRealMember: false, isDefault: true },
    { id: "default-mentor", name: "创业导师", roleName: "创业导师", isRealMember: false, isDefault: true },
    { id: "default-expert", name: "行业专家", roleName: "行业专家", isRealMember: false, isDefault: true },
    { id: "default-customer", name: "客户代表", roleName: "客户代表", isRealMember: false, isDefault: true },
    { id: "default-supplier", name: "供应商代表", roleName: "供应商代表", isRealMember: false, isDefault: true },
    { id: "default-partner", name: "合作伙伴", roleName: "合作伙伴", isRealMember: false, isDefault: true },
    { id: "default-regulator", name: "监管方", roleName: "监管方", isRealMember: false, isDefault: true },
    { id: "default-competitor", name: "竞争对手观察员", roleName: "竞争对手观察员", isRealMember: false, isDefault: true },
    // Future roles
    { id: "default-region", name: "区域负责人", roleName: "区域负责人", isRealMember: false, isDefault: true },
    { id: "default-bu-head", name: "事业部负责人", roleName: "事业部负责人", isRealMember: false, isDefault: true },
    { id: "default-ma-advisor", name: "并购顾问", roleName: "并购顾问", isRealMember: false, isDefault: true },
    { id: "default-brand", name: "品牌负责人", roleName: "品牌负责人", isRealMember: false, isDefault: true },
    { id: "default-gr", name: "政府关系负责人", roleName: "政府关系负责人", isRealMember: false, isDefault: true },
    { id: "default-intl", name: "国际化负责人", roleName: "国际化负责人", isRealMember: false, isDefault: true },
    { id: "default-risk", name: "风控负责人", roleName: "风控负责人", isRealMember: false, isDefault: true },
  ];

  // Helper to get default role name from ID
  function getDefaultRoleName(id: string): string {
    const role = defaultRoles.find(r => r.id === id);
    return role ? role.name : id;
  }

  // Default selected scenario ID (empty string for no selection)
  const defaultScenarioId = selectedScenario?.id || "";

  // Collect all selected role IDs (both twins and defaults)
  function collectSelectedRoles(form: HTMLFormElement): { twinIds: string[], defaultIds: string[], allNames: string[] } {
    const formData = new FormData(form);
    const twinIds: string[] = [];
    const defaultIds: string[] = [];
    const allNames: string[] = [];
    
    // Check twin selections
    for (const member of teamMembers) {
      if (formData.get(`twin:${member.id}`) === "on") {
        twinIds.push(member.id);
        allNames.push(`${member.name}/${member.roleName}`);
      }
    }
    
    // Check default role selections  
    for (const role of defaultRoles) {
      if (formData.get(`default/${role.id}`) === "on") {
        defaultIds.push(role.id);
        allNames.push(role.name);
      }
    }
    
    return { twinIds, defaultIds, allNames };
  }

  // Handle form submission
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedRole = String(formData.get("userRole") ?? "CEO");
    const situation = String(formData.get("situation") ?? "");
    
    // Collect selected roles
    const { twinIds, defaultIds, allNames } = collectSelectedRoles(form);

    if (twinIds.length === 0 && defaultIds.length === 0) {
      setError("请至少选择一个本局参会的数字孪生角色或默认角色。");
      setPending(false);
      return;
    }

    // Get selected scenario ID
    const selectedScenarioIdValue = String(formData.get("selectedScenario") || "");

    // Use existing organization data, only update userRole, selected members, and scenario
    const workspaceResponse = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userRole: selectedRole, 
        selectedMemberIds: twinIds, 
        startNewRun: true, 
        situation,
        selectedScenarioId: selectedScenarioIdValue || null,
      }),
    });
    if (!workspaceResponse.ok) {
      setError("本局配置保存失败。");
      setPending(false);
      return;
    }

    // Format role names for display in meeting input
    const selectedTwinsDesc = twinIds.length > 0 
      ? teamMembers
          .filter((member) => twinIds.includes(member.id))
          .map((member) => `${member.name}/${member.roleName}`)
          .join("、")
      : "";
    const selectedDefaultsDesc = defaultIds.length > 0 
      ? defaultIds.map(id => getDefaultRoleName(id)).join("、")
      : "";
    
    // Combine twin and default role names
    const allSelectedNames = [...selectedTwinsDesc ? [selectedTwinsDesc] : [], ...selectedDefaultsDesc ? [selectedDefaultsDesc] : []].join("、");

    const cycleResponse = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedMemberIds: twinIds,
        userInput: [
          `本局用户参与身份：${selectedRole}`,
          `本局参会数字孪生角色：${selectedTwinsDesc}`,
          `本局参会默认角色：${selectedDefaultsDesc}`,
          situation ? `本局补充说明：${situation}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });
    const cycleBody = await cycleResponse.json().catch(() => ({}));
    if (!cycleResponse.ok) {
      setError(cycleBody.error ?? "会议启动失败，请检查 LLM 配置。");
      setPending(false);
      return;
    }

    if (!cycleBody.meeting?.id) {
      setError("会议已生成，但没有返回会议 ID。");
      setPending(false);
      return;
    }

    router.push("/simulation/overview");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="glass-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="text-cyan-200" size={19} />
          <h2 className="text-lg font-semibold text-white">1. 选择本局参与身份</h2>
        </div>
        <FieldLabel label="参与身份" required>
          <select className="field mt-1" name="userRole" defaultValue={currentRole} required>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FieldLabel>
      </section>

      <section className="glass-panel p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="text-fuchsia-200" size={19} />
            <h2 className="text-lg font-semibold text-white">2. 选择本局参会角色</h2>
            <RequiredBadge />
          </div>
          <p className="text-xs text-[var(--muted)]">可以选择数字孪生或默认角色参与会议</p>
        </div>

        {/* 默认角色选择 - 可折叠 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setDefaultsExpanded(!defaultsExpanded)}
            className="mb-2 flex w-full items-center justify-between text-sm text-cyan-200 font-semibold hover:text-cyan-100"
          >
            <span className="flex items-center gap-2">
              <Bot size={16} />
              🎯 默认角色（预设）· {defaultRoles.length} 个角色
            </span>
            {defaultsExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {defaultsExpanded && (
            <div className="grid gap-3 grid-cols-2">
              {defaultRoles.map((role) => (
                <label key={role.id} className="cyber-option">
                  <input 
                    className="mt-1 accent-cyan-300" 
                    type="checkbox" 
                    name={`default/${role.id}`}
                  />
                  <span>
                    <span className="block font-semibold text-white">
                      {role.name}
                    </span>
                    <span className="text-xs text-cyan-300">
                      默认角色 · 可直接调用
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 数字孪生选择 - 可折叠 */}
        {teamMembers.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setTwinsExpanded(!twinsExpanded)}
              className="mb-2 flex w-full items-center justify-between text-sm text-fuchsia-200 font-semibold hover:text-fuchsia-100"
            >
              <span className="flex items-center gap-2">
                <Users size={16} />
                🔮 数字孪生（已创建）· {teamMembers.length} 个角色
              </span>
              {twinsExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            {twinsExpanded && (
              <div className="grid gap-3 grid-cols-2">
                {teamMembers.map((member) => (
                  <label key={member.id} className="cyber-option">
                    <input className="mt-1 accent-cyan-300" type="checkbox" name={`twin:${member.id}`} />
                    <span>
                      <span className="block font-semibold text-white">
                        {member.name} / {member.roleName}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {member.isRealMember ? "真实成员" : "虚拟角色"} · {member.distillationProfile ? "已蒸馏" : "未蒸馏"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Scenario Selection Section */}
      {scenarios.length > 0 && (
        <section className="glass-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target className="text-emerald-200" size={19} />
            <h2 className="text-lg font-semibold text-white">选择专项场景（可选）</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--muted)]">
            选用场景后，本轮模拟将会受到该场景设定的影响。留空则不使用专项场景。
          </p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3 hover:bg-white/10">
              <input 
                type="radio" 
                name="selectedScenario" 
                value="" 
                defaultChecked={!defaultScenarioId}
                className="accent-cyan-300"
              />
              <span className="text-sm text-white">不使用专项场景</span>
            </label>
            {scenarios.map((scenario) => (
              <label key={scenario.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <input 
                  type="radio" 
                  name="selectedScenario" 
                  value={scenario.id}
                  defaultChecked={defaultScenarioId === scenario.id}
                  className="mt-1 accent-cyan-300"
                />
                <div>
                  <span className="block font-semibold text-white">{scenario.name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {scenario.sandboxType} · {scenario.stage}
                  </span>
                  <p className="mt-1 text-xs text-[var(--muted)]">{scenario.description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="text-amber-200" size={19} />
          <h2 className="text-lg font-semibold text-white">当前组织信息</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">组织名称</p>
            <p className="mt-1 font-semibold text-white">{organization.name}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">阶段</p>
            <p className="mt-1 font-semibold text-white">{organization.stage}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">行业</p>
            <p className="mt-1 font-semibold text-white">{organization.industry}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">产品/业务</p>
            <p className="mt-1 font-semibold text-white">{organization.product}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">目标市场</p>
            <p className="mt-1 font-semibold text-white">{organization.market}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">收入情况</p>
            <p className="mt-1 font-semibold text-white">{organization.revenue}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">现金流</p>
            <p className="mt-1 font-semibold text-white">{organization.cashflow}%</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">团队规模</p>
            <p className="mt-1 font-semibold text-white">{organization.teamSize} 人</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-[var(--muted)]">治理结构</p>
            <p className="mt-1 font-semibold text-white">{organization.governanceStructure}</p>
          </div>
        </div>
        {organization.keyRisks && (
          <div className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="text-xs text-amber-200">关键风险</p>
            <p className="mt-1 text-sm text-amber-100">{formatRisks(organization.keyRisks)}</p>
          </div>
        )}
        <FieldLabel label="本局补充情况" className="mt-3 block">
          <textarea
            className="field mt-1 min-h-20"
            name="situation"
            placeholder="补充本局的特殊背景、风险或机会。例如：投资人要求两周内看到付费转化；团队正在讨论是降进入新市场。"
          />
        </FieldLabel>
      </section>

      {error ? (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <button disabled={pending} className="glass-primary-button w-full gap-2 px-4 py-3 text-sm">
        {pending ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
        {pending ? "正在进入本局模拟..." : "开始本局 20 轮模拟"}
      </button>
    </form>
  );
}

function FieldLabel({
  label,
  required = false,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`text-sm text-[var(--muted)] ${className}`}>
      <span className="mb-1 flex items-center gap-2">
        <span>{label}</span>
        {required ? <RequiredBadge /> : null}
      </span>
      {children}
    </label>
  );
}

function RequiredBadge() {
  return (
    <span className="rounded-sm border border-cyan-300/35 bg-cyan-300/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-100">
      必填
    </span>
  );
}

function formatRisks(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join("、");
  } catch {
    return value;
  }
  return value;
}