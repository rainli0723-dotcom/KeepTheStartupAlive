"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { skillPresets } from "@/lib/skill-presets";

export function SkillImportForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);

  const selectedPresets = skillPresets.filter((item) => selectedPresetIds.includes(item.id));

  function togglePreset(id: string) {
    setSelectedPresetIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

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
      setSelectedPresetIds([]);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="space-y-3">
        <div>
          <div className="text-sm text-[var(--muted)]">预设 Skills（可多选）</div>
          <p className="mt-1 text-xs text-slate-400">可同时叠加多个能力包，再配合上传文件或自定义补充。</p>
        </div>
        <div className="grid gap-2">
          {skillPresets.map((item) => {
            const checked = selectedPresetIds.includes(item.id);
            return (
              <label
                key={item.id}
                className={`rounded-md border p-3 text-sm transition ${
                  checked
                    ? "border-cyan-300/40 bg-cyan-300/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    className="mt-1 accent-cyan-300"
                    type="checkbox"
                    name="presetIds"
                    value={item.id}
                    checked={checked}
                    onChange={() => togglePreset(item.id)}
                  />
                  <span>
                    <span className="block font-semibold text-white">{item.name}</span>
                    <span className="mt-1 block text-xs text-slate-300">适合角色：{item.bestFor}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">{item.focus}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {selectedPresets.length ? (
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/5 p-3 text-xs leading-5 text-cyan-50">
            <div>
              已选择 {selectedPresets.length} 个 Skill：
              {selectedPresets.map((preset) => preset.name).join("、")}
            </div>
            {selectedPresets.length > 1 ? (
              <div className="mt-2 text-slate-300">
                多个 Skill 会合并使用；若能力要求冲突，将优先采用用户补充和角色职责，并把冲突转化为会议中的取舍判断。
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

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
