"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBellBadge } from "@/components/notifications/notification-bell-badge";
import { activeTabHref, type TabItem } from "@/components/mobile/bottom-tab-bar";
import { cn } from "@/lib/utils";

export function MobileHeader({ notificationHref = "/", items = [] }: { notificationHref?: string; items?: TabItem[] }) {
  const pathname = usePathname();
  const activeHref = activeTabHref(pathname, items);

  return (
    <header className="sticky top-0 z-10 border-b bg-card md:border-b-2 md:border-primary">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <span className="font-heading text-lg font-bold text-secondary md:text-xl">CTE PracTrack</span>
        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                item.href === activeHref && "border-primary bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href={notificationHref} className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground" aria-label="Notifications">
          <Bell className="size-5" />
          <NotificationBellBadge />
        </Link>
      </div>
    </header>
  );
}
