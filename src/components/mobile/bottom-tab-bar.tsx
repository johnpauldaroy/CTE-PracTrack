"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BookOpen, Calendar, FileText, Home, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_ICONS = { AlertTriangle, BookOpen, Calendar, FileText, Home, User, Users };
export type TabIconName = keyof typeof TAB_ICONS;

export interface TabItem {
  label: string;
  href: string;
  icon: TabIconName;
}

export function BottomTabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex border-t bg-card">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = TAB_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
