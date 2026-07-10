// auth.config.ts
// Edge-safe Auth.js config (NO database / bcrypt imports here) so it can be used
// by middleware, which runs on the Edge runtime. The real Credentials provider
// (which needs MongoDB + bcrypt) is added in auth.ts, used only on the Node runtime.
import type { NextAuthConfig } from "next-auth";
import { permissionsForRole, isStaff, type Role } from "@/app/lib/rbac";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  // Providers are injected in auth.ts (Node runtime). Empty here keeps middleware edge-safe.
  providers: [],
  callbacks: {
    // Persist role/employeeId/reset-flag into the JWT at sign-in.
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role as Role;
        token.employeeId = (user as any).employeeId ?? null;
        token.mustResetPassword = (user as any).mustResetPassword ?? false;
      }
      return token;
    },
    // Expose the enriched fields (and derived permissions) on the session.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? "";
        session.user.role = (token.role as Role) ?? "employee";
        session.user.employeeId = (token.employeeId as string | null) ?? null;
        session.user.permissions = permissionsForRole(token.role as Role);
        session.user.mustResetPassword = !!token.mustResetPassword;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;

// Re-export for convenience where needed.
export { isStaff };
