import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  STUDENT_INTERN: "/m/intern",
  SUPERVISOR: "/m/supervisor",
  COOPERATING_TEACHER: "/m/ct",
};

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(ROLE_HOME[session.user.role] ?? "/login");
}
