"use client";

import { useNotifications } from "@/components/notifications/use-notifications";

/** Unread-count dot for a bell icon; renders nothing when there's nothing unread. */
export function NotificationBellBadge() {
  const { unreadCount } = useNotifications();
  if (!unreadCount) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}
