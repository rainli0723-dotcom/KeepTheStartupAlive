"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, memo } from "react";
import {
  BriefcaseBusiness,
  FileText,
  GitBranch,
  Building2,
  LibraryBig,
  PlayCircle,
  ShieldCheck,
  SquareStack,
  UsersRound,
} from "lucide-react";

const navItems = [
  { href: "/enterprise", label: "企业管理", icon: Building2 },
  { href: "/workspaces", label: "沙盘工作区", icon: SquareStack },
  { href: "/simulation/start", label: "开始模拟", icon: PlayCircle },
  { href: "/organization", label: "组织档案", icon: BriefcaseBusiness },
  { href: "/roles", label: "角色库", icon: LibraryBig },
  { href: "/team", label: "数字孪生", icon: UsersRound },
  { href: "/scenarios", label: "场景库", icon: GitBranch },
  { href: "/reports", label: "复盘报告", icon: FileText },
  { href: "/security", label: "安全说明", icon: ShieldCheck },
];

const NavItem = memo(function NavItem({
  item,
  active,
  pressed,
  onMouseDown,
  onPointerEnter,
  onClick,
}: {
  item: typeof navItems[0];
  active: boolean;
  pressed: boolean;
  onMouseDown: () => void;
  onPointerEnter: () => void;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      className={`glass-nav-link ${active ? "glass-nav-link-active" : ""} ${
        pressed ? "glass-nav-link-pressed" : ""
      }`}
      onMouseDown={onMouseDown}
      onPointerEnter={onPointerEnter}
      onClick={onClick}
    >
      <Icon size={17} />
      <span>{item.label}</span>
      {active ? <span className="nav-active-badge">ACTIVE</span> : null}
    </Link>
  );
});

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [optimisticHref, setOptimisticHref] = useState("");

  // Prefetch all nav items once on mount
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  // Clean up optimistic state after navigation
  useEffect(() => {
    if (!optimisticHref) return;
    if (optimisticHref === pathname) {
      const timeoutId = setTimeout(() => setOptimisticHref(""), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [pathname, optimisticHref]);

  const handleMouseDown = useCallback((href: string) => {
    setOptimisticHref(href);
  }, []);

  const handlePointerEnter = useCallback((href: string) => {
    // Only prefetch if not already at this href
    if (pathname !== href) {
      router.prefetch(href);
    }
  }, [router, pathname]);

  return (
    <nav className="space-y-2 p-3">
      {navItems.map((item) => {
        const activePath = optimisticHref || pathname;
        const active = activePath === item.href || activePath.startsWith(`${item.href}/`);
        const pressed = optimisticHref === item.href && pathname !== item.href;

        return (
          <NavItem
            key={item.href}
            item={item}
            active={active}
            pressed={pressed}
            onMouseDown={() => handleMouseDown(item.href)}
            onPointerEnter={() => handlePointerEnter(item.href)}
            onClick={() => {
              if (pathname === item.href) setOptimisticHref("");
            }}
          />
        );
      })}
    </nav>
  );
}
