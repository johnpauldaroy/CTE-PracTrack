import { redirect } from "next/navigation";
import { getLiveSession } from "@/lib/session";
import { AdminBottomNav, AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getLiveSession();
  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AdminHeader user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <AdminBottomNav />
    </div>
  );
}
