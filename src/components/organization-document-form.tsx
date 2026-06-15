"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";

export function OrganizationDocumentForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    const note = String(formData.get("note") ?? "").trim();
    const hasFile = file instanceof File && file.size > 0;

    if (!hasFile && !note) {
      setMessage("请先选择公司情况文档，或在下方填写公司情况说明。");
      return;
    }

    setPending(true);
    const response = await fetch("/api/organization/documents", {
      method: "POST",
      body: formData,
    });
    const body = await response.json().catch(() => ({}));

    setPending(false);
    if (response.ok) {
      if (form) form.reset();
      const updatedFields = body.analysis?.updatedFields;
      if (updatedFields?.length) {
        setMessage(`公司情况已导入并自动分析。已更新字段：${updatedFields.join("、")}。`);
      } else if (body.analysis?.summary) {
        setMessage(`公司情况已导入。${body.analysis.summary}`);
      } else {
        setMessage("公司情况文档已导入，并会参与后续会议推演。");
      }
      router.refresh();
    } else {
      setMessage(body.error ?? "导入失败");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="field" type="file" name="file" accept=".txt,.md,.pdf,.docx" />
      <textarea
        className="field min-h-28"
        name="note"
        placeholder="也可以直接补充公司情况：现金流、客户、团队状态、监管问题、融资进展、产品瓶颈等。"
      />
      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
      <button disabled={pending} className="glass-primary-button gap-2 px-4 py-2.5 text-sm">
        {pending ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
        {pending ? "正在导入..." : "导入公司情况"}
      </button>
    </form>
  );
}
