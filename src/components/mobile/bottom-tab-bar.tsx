"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  Ellipsis,
  FileText,
  Home,
  LayoutDashboard,
  School,
  ScrollText,
  Settings,
  User,
  Users,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TAB_ICONS = { AlertTriangle, BarChart3, BookOpen, Calendar, FileText, Home, LayoutDashboard, School, ScrollText, Settings, User, Users };
export type TabIconName = keyof typeof TAB_ICONS;

export interface TabItem {
  label: string;
  href: string;
  icon: TabIconName;
}

/** The bar fits five slots; with more items the fifth becomes "More" and holds the rest. */
const MAX_TABS = 5;
const tabClass = "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-xs font-medium";

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** The tab whose href is the longest match for the path, so "Home" (the portal root) doesn't light up on every page. */
export function activeTabHref(pathname: string, items: TabItem[]) {
  return items
    .filter((item) => matches(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Phone navigation. On md+ screens the tabs move into the header. */
export function BottomTabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  const activeHref = activeTabHref(pathname, items);
  const visible = items.length > MAX_TABS ? items.slice(0, MAX_TABS - 1) : items;
  const overflow = items.slice(visible.length);

  return (
    <nav className="sticky bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      {visible.map((item) => {
        const Icon = TAB_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(tabClass, item.href === activeHref ? "text-primary" : "text-muted-foreground")}
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(tabClass, overflow.some((item) => item.href === activeHref) ? "text-primary" : "text-muted-foreground")}
              />
            }
          >
            <Ellipsis className="size-5" />
            More
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-auto min-w-48">
            {overflow.map((item) => {
              const Icon = TAB_ICONS[item.icon];
              return (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} />}
                  className={cn("gap-3 px-3 py-2.5", item.href === activeHref && "font-semibold text-primary")}
                >
                  <Icon className="size-4.5" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
