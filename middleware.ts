// middleware.ts
// Edge middleware: authentication + RBAC route gating using the edge-safe Auth.js config.
// JWT session strategy means the session is decoded from the cookie here with no DB access.
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { STAFF_ROLES, type Role } from "@/app/lib/rbac";

const { auth } = NextAuth(authConfig);

const CHANGE_PW_PATH = "/admin/change-password";
const CHANGE_PW_API = "/api/account/change-password";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role as Role | undefined;
  const mustReset = !!session?.user?.mustResetPassword;

  const isApi = pathname.startsWith("/api");
  const isLogin = pathname.startsWith("/admin/login");

  // Public: job listings for the careers site (GET only).
  if (pathname.startsWith("/api/jobs") && req.method === "GET") {
    return NextResponse.next();
  }

  // --- Not authenticated ---
  if (!session?.user) {
    if (isLogin) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // --- Force password reset for temp passwords, before anything else ---
  if (mustReset && !pathname.startsWith(CHANGE_PW_PATH) && pathname !== CHANGE_PW_API) {
    if (isApi) {
      return NextResponse.json({ error: "Password reset required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(CHANGE_PW_PATH, req.url));
  }

  // --- Authenticated visiting the login page -> send to role landing ---
  if (isLogin) {
    const dest = role && STAFF_ROLES.includes(role) ? "/admin" : "/portal";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // --- Employees cannot access the /admin back-office (change-password excepted) ---
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith(CHANGE_PW_PATH) &&
    !(role && STAFF_ROLES.includes(role))
  ) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // --- User management is admin-only (HR/managers are staff but not admins) ---
  if (
    (pathname.startsWith("/admin/users") || pathname.startsWith("/api/users")) &&
    role !== "admin"
  ) {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

// Run on the back-office, the self-service portal, and protected APIs.
// Excludes Auth.js (/api/auth), the public endpoints, and profile-photo downloads
// (shown on the public /employees/[id] verification page, so they must load
// without a session — resume downloads stay gated).
export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/api/:path((?!auth|contact|upload|apply-jobs|download/profile).*)",
  ],
};
