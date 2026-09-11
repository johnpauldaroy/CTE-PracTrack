import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileProfileCard } from "@/components/mobile/mobile-profile-card";

export default async function InternProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/m/login");

  return (
    <div className="p-4">
      <h1 className="font-heading mb-4 text-xl font-bold">Profile</h1>
      <MobileProfileCard user={session.user} />
    </div>
  );
}
