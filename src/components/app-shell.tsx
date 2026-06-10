"use client";

import {
  AppShellClient,
  EmptyState,
  MetricBar,
  PageHeader,
  Panel,
} from "./app-shell-client";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellClient auth={null}>{children}</AppShellClient>;
}

export { EmptyState, MetricBar, PageHeader, Panel };
