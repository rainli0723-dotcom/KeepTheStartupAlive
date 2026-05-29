"use client";

import {
  Archive,
  ChartSpline,
} from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  
  // 首页不显示侧边栏
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
        <SidebarNav />
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
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