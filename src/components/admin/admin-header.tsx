"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationBellBadge } from "@/components/notifications/notification-bell-badge";
import type { SessionUser } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Schools", href: "/schools" },
  { label: "Accounts", href: "/accounts" },
  { label: "Semesters", href: "/semesters" },
  { label: "Reports", href: "/reports" },
  { label: "Audit Log", href: "/audit-log" },
  { label: "Settings", href: "/settings" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .filter((p) => !/^(mr|ms|mrs|dr|prof)\.?$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return letters || name.slice(0, 2).toUpperCase();
}

export function AdminHeader({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="border-b-2 border-primary bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/dashboard" className="font-heading text-xl font-bold text-secondary">
          CTE PracTrack
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                  active && "border-primary bg-accent text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger
              className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <NotificationBellBadge />
            </PopoverTrigger>
            <PopoverContent align="end" className="flex max-h-[min(40rem,var(--available-height))] w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 overflow-hidden">
              <PopoverTitle>Notifications</PopoverTitle>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NotificationList limit={6} compact onNavigate={() => setNotificationsOpen(false)} />
              </div>
              <Link
                href="/notifications"
                onClick={() => setNotificationsOpen(false)}
                className="pt-1 text-center text-sm font-medium text-primary hover:underline"
              >
                View all notifications
              </Link>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" className="rounded-full" />}>
              <Avatar className="size-9">
                <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-48 max-w-72">
              <div className="px-2 py-1.5 text-sm">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground" title={user.email}>{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/settings" />}>My Account</DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="text-destructive">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
