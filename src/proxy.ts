import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const ADMIN_ROUTES = ["/dashboard", "/schools", "/accounts", "/semesters", "/reports", "/settings"];
const MOBILE_ROLE_PREFIX: Record<string, string> = {
  STUDENT_INTERN: "/m/intern",
  SUPERVISOR: "/m/supervisor",
  COOPERATING_TEACHER: "/m/ct",
};
const PUBLIC_MOBILE_ROUTES = ["/m/login", "/m/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isMobileAppRoute = pathname.startsWith("/m/") && !PUBLIC_MOBILE_ROUTES.includes(pathname);

  if (isAdminRoute) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL(MOBILE_ROLE_PREFIX[session.user.role] ?? "/m/login", req.url));
    }
  }

  if (isMobileAppRoute) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/m/login", req.url));
    }
    const expectedPrefix = MOBILE_ROLE_PREFIX[session.user.role];
    if (session.user.role === "ADMIN" || !expectedPrefix || !pathname.startsWith(expectedPrefix)) {
      return NextResponse.redirect(
        new URL(session.user.role === "ADMIN" ? "/dashboard" : expectedPrefix ?? "/m/login", req.url),
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/schools/:path*", "/accounts/:path*", "/semesters/:path*", "/reports/:path*", "/settings/:path*", "/m/:path*"],
};
