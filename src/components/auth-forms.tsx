"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const payload =
      mode === "register"
        ? {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            tenantName: String(formData.get("tenantName") ?? ""),
          }
        : {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "请求失败，请重试");
      return;
    }

    router.push("/enterprise");
    router.refresh();
  }

  const isRegister = mode === "register";

  return (
    <form action={handleSubmit} className="glass-panel mx-auto w-full max-w-md p-6">
      <div className="mb-6">
        <div className="mb-3 inline-flex size-10 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
          {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />}
        </div>
        <h1 className="text-2xl font-semibold text-white">{isRegister ? "注册企业账号" : "登录 KTSA"}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {isRegister ? "创建企业空间后，沙盘、成员和审计记录会绑定到该企业。" : "登录后会进入你的企业空间。"}
        </p>
      </div>

      <div className="space-y-4">
        {isRegister ? (
          <>
            <Field label="姓名" name="name" autoComplete="name" />
            <Field label="企业名称" name="tenantName" autoComplete="organization" />
          </>
        ) : null}
        <Field label="邮箱" name="email" type="email" autoComplete="email" />
        <Field label="密码" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} />
      </div>

      {error ? <p className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRegister ? <UserPlus size={17} /> : <LogIn size={17} />}
        {loading ? "处理中..." : isRegister ? "创建企业空间" : "登录"}
      </button>

      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        {isRegister ? "已有账号？" : "还没有账号？"}
        <Link className="ml-1 text-cyan-100 hover:text-white" href={isRegister ? "/login" : "/register"}>
          {isRegister ? "去登录" : "注册企业账号"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
      />
    </label>
  );
}
