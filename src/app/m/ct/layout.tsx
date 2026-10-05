import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { BottomTabBar, type TabItem } from "@/components/mobile/bottom-tab-bar";
const TABS = [{ label: "Home", href: "/m/ct", icon: "Home" }, { label: "Interns", href: "/m/ct/interns", icon: "Users" }, { label: "Sessions", href: "/m/ct/sessions", icon: "BookOpen" }, { label: "Profile", href: "/m/ct/profile", icon: "User" }] satisfies TabItem[];
export default async function CtLayout({ children }: { children: React.ReactNode }) { const session = await auth(); if (!session?.user || session.user.role !== "COOPERATING_TEACHER") redirect("/m/login"); return <div className="flex min-h-svh w-full flex-col bg-background"><MobileHeader notificationHref="/m/ct/notifications" items={TABS} /><main className="mx-auto w-full max-w-5xl flex-1 pb-4 md:px-2 md:py-4">{children}</main><BottomTabBar items={TABS} /></div>; }
