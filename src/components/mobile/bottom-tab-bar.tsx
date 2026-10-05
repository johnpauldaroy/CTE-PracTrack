"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BarChart3, BookOpen, Calendar, FileText, Home, LayoutDashboard, School, ScrollText, Settings, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_ICONS = { AlertTriangle, BarChart3, BookOpen, Calendar, FileText, Home, LayoutDashboard, School, ScrollText, Settings, User, Users };
export type TabIconName = keyof typeof TAB_ICONS;

export interface TabItem {
  label: string;
  href: string;
  icon: TabIconName;
}

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** The tab whose href is the longest match for the path, so "Home" (the portal root) doesn't light up on every page. */
export function activeTabHref(pathname: string, items: TabItem[]) {
  return items
    .filter((item) => matches(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Phone navigation. On md+ screens the tabs move into MobileHeader. */
export function BottomTabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  const activeHref = activeTabHref(pathname, items);

  return (
    <nav className="sticky bottom-0 z-10 flex border-t bg-card md:hidden">
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = TAB_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 font-medium",
              items.length > 5 ? "text-[10px] tracking-tighter" : "text-xs",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
