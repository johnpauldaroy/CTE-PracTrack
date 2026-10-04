"use client";

import useSWR from "swr";

export interface Notice {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

const KEY = "/api/notifications";
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load notifications.");
  return response.json() as Promise<{ notifications: Notice[]; unreadCount: number }>;
};

/**
 * One SWR cache entry shared by every bell badge and notification list, so
 * marking an item read anywhere updates the badge everywhere. Polls every
 * minute while the tab is open (push delivery is a separate, optional layer).
 */
export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR(KEY, fetcher, { refreshInterval: 60_000 });

  async function markRead(id: string) {
    await mutate(
      async (current) => {
        await fetch(KEY, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        return current;
      },
      {
        optimisticData: (current) =>
          current
            ? {
                notifications: current.notifications.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
                unreadCount: Math.max(0, current.unreadCount - (current.notifications.some((n) => n.id === id && !n.readAt) ? 1 : 0)),
              }
            : { notifications: [], unreadCount: 0 },
        revalidate: true,
      },
    );
  }

  async function markAllRead() {
    await mutate(
      async (current) => {
        await fetch(KEY, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
        return current;
      },
      {
        optimisticData: (current) => ({
          notifications: (current?.notifications ?? []).map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
          unreadCount: 0,
        }),
        revalidate: true,
      },
    );
  }

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    markRead,
    markAllRead,
  };
}
