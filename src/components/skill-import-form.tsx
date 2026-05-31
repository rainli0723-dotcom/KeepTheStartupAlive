"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { skillPresets } from "@/lib/skill-presets";

export function SkillImportForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");

  const preset = skillPresets.find((item) => item.id === selectedPreset);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const form = event.currentTarget;
    const response = await fetch(`/api/team/${memberId}/skills`, {
      method: "POST",
      body: new FormData(form),
    });
    const body = await response.json().catch(() => ({}));

    setMessage(response.ok ? "Skill 已导入，会作为该数字孪生的能力上下文参与会议推演。" : body.error ?? "Skill 导入失败");
    setPending(false);
    if (response.ok) {
      if (form) form.reset();
      setSelectedPreset("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-[var(--muted)]">
        参考项目 Skill 预设
        <select
          className="field mt-1"
          name="presetId"
          value={selectedPreset}
          onChange={(event) => setSelectedPreset(event.target.value)}
        >
          <option value="">不使用预设</option>
          {skillPresets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {preset ? (
        <div className="rounded-md border border-cyan-300/20 bg-cyan-300/5 p-3 text-sm leading-6 text-[var(--muted)]">
          <div className="font-semibold text-white">{preset.focus}</div>
          <div className="mt-1 text-xs text-cyan-100">{preset.sourceUrl}</div>
        </div>
      ) : null}

      <label className="block text-sm text-[var(--muted)]">
        上传 Skill 文件
        <input className="field mt-1" type="file" name="file" accept=".txt,.md,.json" />
      </label>

      <label className="block text-sm text-[var(--muted)]">
        自定义 Skill 补充
        <textarea
          className="field mt-1 min-h-28"
          name="skillText"
          placeholder="粘贴 Skill 内容，例如：擅长融资谈判、法务审查、技术架构评估、增长实验设计等。可与上方预设叠加。"
        />
      </label>

      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
      <button disabled={pending} className="glass-primary-button gap-2 px-4 py-2.5 text-sm">
        {pending ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
        {pending ? "正在导入 Skill..." : "导入 Skill"}
      </button>
    </form>
  );
}
