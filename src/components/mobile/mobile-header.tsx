"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { NotificationBellBadge } from "@/components/notifications/notification-bell-badge";

export function MobileHeader({ notificationHref = "/" }: { notificationHref?: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3">
      <span className="font-heading text-lg font-bold text-secondary">CTE PracTrack</span>
      <Link href={notificationHref} className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground" aria-label="Notifications">
        <Bell className="size-5" />
        <NotificationBellBadge />
      </Link>
    </header>
  );
}
