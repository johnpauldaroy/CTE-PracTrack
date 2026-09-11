import type { SessionUser } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: SessionUser["role"];
    supervisorSchoolId?: string | null;
    cooperatingTeacherProfileId?: string | null;
    internProfileId?: string | null;
  }
}
