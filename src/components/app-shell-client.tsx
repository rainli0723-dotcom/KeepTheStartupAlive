"use client";

import { Archive, ChartSpline, LogOut, UserCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarNav } from "./sidebar-nav";

export type ShellAuth = {
  user: {
    name: string;
    email: string;
    role: string;
  };
  tenant: {
    name: string;
    plan: string;
    status: string;
  };
} | null;

export function AppShellClient({ children, auth }: { children: React.ReactNode; auth: ShellAuth }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [currentAuth, setCurrentAuth] = useState<ShellAuth>(auth);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled) setCurrentAuth(result.auth ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentAuth(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isHomePage) {
    return (
      <div className="app-canvas min-h-screen text-[var(--foreground)]">
        <main>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-canvas min-h-screen text-[var(--foreground)]">
      <aside className="glass-sidebar fixed inset-y-0 left-0 hidden w-72 lg:block">
        <div className="relative border-b border-[var(--line)] px-6 py-6">
          <div className="cyber-corner cyber-corner-top" />
          <div className="flex items-center gap-3">
            <div className="brand-chip grid size-11 place-items-center">
              <Archive size={21} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-white">KTSA</div>
              <div className="text-xs text-[var(--muted)]">AI BUSINESS SANDBOX</div>
            </div>
          </div>
        </div>
        <div className="pb-44">
          <SidebarNav />
        </div>
        <AccountPanel auth={currentAuth} />
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

function AccountPanel({ auth }: { auth: ShellAuth }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="absolute inset-x-0 bottom-0 border-t border-[var(--line)] bg-black/10 p-4 backdrop-blur">
      {auth ? (
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-start gap-2">
            <UserCircle className="mt-0.5 shrink-0 text-cyan-100" size={18} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{auth.tenant.name}</div>
              <div className="truncate text-xs text-[var(--muted)]">{auth.user.email}</div>
              <div className="mt-1 text-xs text-cyan-100">
                {auth.user.role} · {auth.tenant.plan}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      ) : (
        <a
          href="/login"
          className="flex items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-300/15"
        >
          <UserCircle size={16} />
          登录企业账号
        </a>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="cyber-header mb-6 flex flex-col justify-between gap-4 p-5 md:flex-row md:items-end">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          KTSA OPERATING SANDBOX
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`glass-panel ${className}`}>{children}</section>;
}

export function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-mono text-cyan-100">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-white/10">
        <div className="cyber-meter h-2" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-panel border-dashed p-8 text-center">
      <ChartSpline className="mx-auto mb-3 text-[var(--accent)]" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}
