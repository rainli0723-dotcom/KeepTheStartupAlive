"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import {
  editableCapabilityFields,
  editableRoleOptions,
  metricsFromLines,
  resolveEditableRole,
} from "@/lib/team-member-form-utils";

export function TeamMemberForm({ horizontal = false }: { horizontal?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);
    const roleName = resolveEditableRole(
      String(form.get("rolePreset") ?? ""),
      String(form.get("roleCustom") ?? ""),
    );
    const capabilities = Object.fromEntries(
      editableCapabilityFields.map(([key]) => [key, Number(form.get(key))]),
    );

    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        roleName,
        isRealMember: form.get("isRealMember") === "on",
        capabilities,
        customMetrics: metricsFromLines(String(form.get("customMetrics") ?? "")),
        personality: form.get("personality"),
        communicationStyle: form.get("communicationStyle"),
        decisionPreference: form.get("decisionPreference"),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "新增角色失败，请检查字段是否完整。");
      setPending(false);
      return;
    }

    event.currentTarget.reset();
    setSuccess("数字孪生角色已生成，并已接入角色网络。");
    router.refresh();
    setPending(false);
  }

  if (horizontal) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-slate-200">
            名称
            <input className="twin-field mt-1 w-32" name="name" placeholder="姓名" required />
          </label>
          <label className="text-sm text-slate-200">
            角色
            <select className="twin-field mt-1 w-32" name="rolePreset" defaultValue="CEO" required>
              {editableRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-200">
            自定义
            <input
              className="twin-field mt-1 w-32"
              name="roleCustom"
              placeholder="自定义角色"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-sm text-cyan-50">
            <input className="accent-cyan-300" type="checkbox" name="isRealMember" />
            真实成员
          </label>
          <button
            disabled={pending}
            className="twin-primary-button inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
            {pending ? "新增中..." : "新增"}
          </button>
        </div>
        
        <div className="grid gap-3 md:grid-cols-6">
          {editableCapabilityFields.map(([key, label]) => (
            <label key={key} className="text-sm text-slate-200">
              {label}
              <input className="twin-field mt-1" type="number" name={key} min={0} max={100} defaultValue={60} />
            </label>
          ))}
        </div>

        <textarea
          className="twin-field min-h-16"
          name="customMetrics"
          placeholder={"自定义指标，每行一个：\n理性:80\n情绪化:30"}
        />
        <textarea className="twin-field min-h-16" name="personality" placeholder="个性化设定、价值观、专业边界、禁忌点" />
        <textarea className="twin-field min-h-16" name="communicationStyle" placeholder="沟通风格、常用表达、会议习惯" />
        <textarea className="twin-field min-h-16" name="decisionPreference" placeholder="决策偏好、风险偏好、压力反应" />
        
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            <AlertTriangle size={16} />
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="twin-success flex items-center gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
            <CheckCircle2 size={16} />
            {success}
          </div>
        ) : null}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-200">
          名称
          <input className="twin-field mt-1" name="name" placeholder="姓名或角色名称" required />
        </label>
        <label className="text-sm text-slate-200">
          角色
          <select className="twin-field mt-1" name="rolePreset" defaultValue="CEO" required>
            {editableRoleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm text-slate-200">
        其他职业 / 自定义角色
        <input
          className="twin-field mt-1"
          name="roleCustom"
          placeholder="可手动填写，例如：CLO、COO、产品负责人、风控负责人"
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">填写后会覆盖上方下拉选择。</span>
      </label>

      <label className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-sm text-cyan-50">
        <input className="accent-cyan-300" type="checkbox" name="isRealMember" />
        真实团队成员
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        {editableCapabilityFields.map(([key, label]) => (
          <label key={key} className="text-sm text-slate-200">
            {label}
            <input className="twin-field mt-1" type="number" name={key} min={0} max={100} defaultValue={60} />
          </label>
        ))}
      </div>

      <textarea
        className="twin-field min-h-20"
        name="customMetrics"
        placeholder={"自定义指标，每行一个：\n理性:80\n情绪化:30\n谈判能力:75"}
      />
      <textarea className="twin-field min-h-20" name="personality" placeholder="个性化设定、价值观、专业边界、禁忌点" />
      <textarea className="twin-field min-h-20" name="communicationStyle" placeholder="沟通风格、常用表达、会议习惯" />
      <textarea className="twin-field min-h-20" name="decisionPreference" placeholder="决策偏好、风险偏好、压力反应" />

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="twin-success flex items-center gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
          <CheckCircle2 size={16} />
          {success}
        </div>
      ) : null}

      <button
        disabled={pending}
        className="twin-primary-button inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="animate-spin" size={17} /> : <UserPlus size={17} />}
        {pending ? "正在接入角色网络..." : "新增数字孪生角色"}
      </button>
    </form>
  );
}
