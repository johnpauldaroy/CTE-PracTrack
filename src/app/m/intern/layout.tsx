import { redirect } from "next/navigation";
import { Home, Calendar, BookOpen, FileText, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { BottomTabBar } from "@/components/mobile/bottom-tab-bar";

const TABS = [
  { label: "Home", href: "/m/intern", icon: Home },
  { label: "Attendance", href: "/m/intern/attendance", icon: Calendar },
  { label: "Sessions", href: "/m/intern/sessions", icon: BookOpen },
  { label: "Documents", href: "/m/intern/documents", icon: FileText },
  { label: "Profile", href: "/m/intern/profile", icon: User },
];

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT_INTERN") {
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
