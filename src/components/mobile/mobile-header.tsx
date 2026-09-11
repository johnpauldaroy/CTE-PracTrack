"use client";

import { Bell } from "lucide-react";

export function MobileHeader({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3">
      <span className="font-heading text-lg font-bold text-secondary">CTE PracTrack</span>
      <button type="button" className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground" aria-label="Notifications">
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}
