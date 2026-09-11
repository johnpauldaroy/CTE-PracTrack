import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettingsPage } from "@/components/admin/settings/settings-page";

export default async function Settings() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <SettingsPage user={session.user} />;
}
