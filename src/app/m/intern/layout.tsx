import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { BottomTabBar, type TabItem } from "@/components/mobile/bottom-tab-bar";

const TABS = [
  { label: "Home", href: "/m/intern", icon: "Home" },
  { label: "Attendance", href: "/m/intern/attendance", icon: "Calendar" },
  { label: "Sessions", href: "/m/intern/sessions", icon: "BookOpen" },
  { label: "Documents", href: "/m/intern/documents", icon: "FileText" },
  { label: "Profile", href: "/m/intern/profile", icon: "User" },
] satisfies TabItem[];

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT_INTERN") {
    redirect("/m/login");
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-background">
      <MobileHeader notificationHref="/m/intern/notifications" items={TABS} />
      <main className="mx-auto w-full max-w-5xl flex-1 pb-4 md:px-2 md:py-4">{children}</main>
      <BottomTabBar items={TABS} />
    </div>
  );
}
