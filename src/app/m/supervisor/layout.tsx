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
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-background">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto pb-4">{children}</main>
      <BottomTabBar items={TABS} />
    </div>
  );
}
