import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { BottomTabBar, type TabItem } from "@/components/mobile/bottom-tab-bar";

const TABS = [
  { label: "Home", href: "/m/supervisor", icon: "Home" },
  { label: "Interns", href: "/m/supervisor/interns", icon: "Users" },
  { label: "Alerts", href: "/m/supervisor/alerts", icon: "AlertTriangle" },
  { label: "Profile", href: "/m/supervisor/profile", icon: "User" },
] satisfies TabItem[];

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERVISOR") {
    redirect("/m/login");
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-background">
      <MobileHeader notificationHref="/m/supervisor/notifications" items={TABS} />
      <main className="mx-auto w-full max-w-5xl flex-1 pb-4 md:px-2 md:py-4">{children}</main>
      <BottomTabBar items={TABS} />
    </div>
  );
}
