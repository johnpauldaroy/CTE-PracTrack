import type { SessionUser } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: SessionUser["role"];
    supervisorSchoolIds?: string[];
    cooperatingTeacherProfileId?: string | null;
    internProfileId?: string | null;
  }
}
