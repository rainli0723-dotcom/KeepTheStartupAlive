"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Edit3, Loader2, Save, Trash2, X } from "lucide-react";
import type { CapabilityMap } from "@/lib/domain";
import { parseCapabilities, parseMetrics } from "@/lib/serializers";
import {
  customRoleOption,
  editableCapabilityFields,
  editableRoleOptions,
  metricsFromLines,
  metricsToLines,
  resolveEditableRole,
} from "@/lib/team-member-form-utils";

type EditableMember = {
  id: string;
  name: string;
  roleName: string;
  isRealMember: boolean;
  capabilities: string;
  customMetrics: string;
  personality: string;
  communicationStyle: string;
  decisionPreference: string;
};

export function TeamMemberCardActions({ member }: { member: EditableMember }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const parsedCapabilities = useMemo(() => parseCapabilities(member.capabilities), [member.capabilities]);
  const parsedMetrics = useMemo(() => parseMetrics(member.customMetrics), [member.customMetrics]);
  const isPresetRole = editableRoleOptions.includes(member.roleName);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const capabilities = Object.fromEntries(
      editableCapabilityFields.map(([key]) => [key, Number(form.get(key))]),
    ) as CapabilityMap;

    const response = await fetch(`/api/team/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        roleName: resolveEditableRole(
          String(form.get("rolePreset") ?? ""),
          String(form.get("roleCustom") ?? ""),
        ),
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
      setError(body.error ?? "保存失败，请检查字段后重试。");
      setPending(false);
      return;
    }

    setMessage("角色设定已更新。");
    setPending(false);
    setIsEditing(false);
    router.refresh();
  }

  async function deleteMember() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setError("");
      setMessage("");
      return;
    }

    setIsDeleting(true);
    setError("");
    const response = await fetch(`/api/team/${member.id}`, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "删除失败，请稍后重试。");
      setIsDeleting(false);
      setConfirmingDelete(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIsEditing((value) => !value);
            setConfirmingDelete(false);
            setError("");
            setMessage("");
          }}
          className="twin-secondary-button inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold"
        >
          {isEditing ? <X size={16} /> : <Edit3 size={16} />}
          {isEditing ? "取消编辑" : "编辑"}
        </button>
        <button
          type="button"
          onClick={deleteMember}
          disabled={isDeleting}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200/70 hover:bg-rose-500/18 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
          {confirmingDelete ? "确认删除" : "删除"}
        </button>
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
          <CheckCircle2 size={16} />
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : null}

      {isEditing ? (
        <form onSubmit={submit} className="space-y-3 border-t border-cyan-300/15 pt-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200">
              名称
              <input className="twin-field mt-1" name="name" defaultValue={member.name} required />
            </label>
            <label className="text-sm text-slate-200">
              角色
              <select className="twin-field mt-1" name="rolePreset" defaultValue={isPresetRole ? member.roleName : customRoleOption} required>
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
              defaultValue={isPresetRole ? "" : member.roleName}
              placeholder="可手动填写，例如：CLO、COO、法务顾问"
            />
          </label>

          <label className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-sm text-cyan-50">
            <input className="accent-cyan-300" type="checkbox" name="isRealMember" defaultChecked={member.isRealMember} />
            真实团队成员
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            {editableCapabilityFields.map(([key, label]) => (
              <label key={key} className="text-sm text-slate-200">
                {label}
                <input
                  className="twin-field mt-1"
                  type="number"
                  name={key}
                  min={0}
                  max={100}
                  defaultValue={parsedCapabilities[key]}
                />
              </label>
            ))}
          </div>

          <textarea className="twin-field min-h-20" name="customMetrics" defaultValue={metricsToLines(parsedMetrics)} />
          <textarea className="twin-field min-h-20" name="personality" defaultValue={member.personality} placeholder="个性化设定" />
          <textarea
            className="twin-field min-h-20"
            name="communicationStyle"
            defaultValue={member.communicationStyle}
            placeholder="沟通风格"
          />
          <textarea
            className="twin-field min-h-20"
            name="decisionPreference"
            defaultValue={member.decisionPreference}
            placeholder="决策偏好"
          />

          <button
            disabled={pending}
            className="twin-primary-button inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            {pending ? "正在保存..." : "保存角色设定"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
