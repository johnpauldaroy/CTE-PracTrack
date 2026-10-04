"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNotifications, type Notice } from "@/components/notifications/use-notifications";

/**
 * The single notification list used by the admin bell panel, the admin
 * Notifications page, and every mobile Notifications screen. Clicking an item
 * marks it read and opens the screen it refers to (if it has one).
 */
export function NotificationList({
  limit,
  compact = false,
  onNavigate,
}: {
  limit?: number;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } = useNotifications();
  const visible = limit ? notifications.slice(0, limit) : notifications;

  async function open(notice: Notice) {
    if (!notice.readAt) await markRead(notice.id);
    if (notice.href) {
      onNavigate?.();
      router.push(notice.href);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-sm text-muted-foreground">
          {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
        </p>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead()}>
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading && <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="p-4 text-center text-sm text-destructive">Unable to load notifications.</p>}

      {!isLoading && !error && !visible.length && (
        <div className="flex flex-col items-center gap-2 rounded-xl border p-6 text-center text-sm text-muted-foreground">
          <BellOff className="size-5" />
          No notifications yet.
        </div>
      )}

      <ul className={cn("flex flex-col", compact ? "gap-1" : "gap-3")}>
        {visible.map((notice) => (
          <li key={notice.id}>
            <button
              type="button"
              onClick={() => open(notice)}
              className={cn(
                "flex w-full gap-3 rounded-xl border text-left transition-colors hover:bg-muted",
                compact ? "p-3" : "p-4",
                notice.readAt ? "bg-card" : "border-primary/40 bg-accent",
              )}
            >
              <span
                aria-hidden
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", notice.readAt ? "bg-transparent" : "bg-primary")}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">{notice.title}</span>
                <span className={cn("text-sm", compact && "line-clamp-2")}>{notice.body}</span>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={notice.createdAt}
                  title={formatInTimeZone(new Date(notice.createdAt), "Asia/Manila", "MMM d, yyyy h:mm a")}
                >
                  {formatDistanceToNow(new Date(notice.createdAt), { addSuffix: true })}
                </time>
              </span>
              <span className="sr-only">{notice.readAt ? "Read" : "Unread"}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
