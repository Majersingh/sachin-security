// auth.ts
// Full Auth.js instance (Node runtime): adds the Credentials provider that looks
// users up in MongoDB and verifies bcrypt-hashed passwords. Used by the route
// handler and server-side `auth()` calls — NOT by middleware.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getCollection } from "@/app/lib/db";
import { authConfig } from "@/auth.config";
import { isRole } from "@/app/lib/rbac";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // Login accepts an email OR employee ID plus a password.
      credentials: {
        identifier: { label: "Email or Employee ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const identifier = String(creds?.identifier ?? "").trim();
        const password = String(creds?.password ?? "");
        if (!identifier || !password) return null;

        const users = await getCollection("users");
        const user = await users.findOne({
          $or: [
            { email: identifier.toLowerCase() },
            { employeeId: identifier },
            { userID: identifier },
          ],
          active: { $ne: false },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Returned object is merged into the JWT via callbacks in auth.config.ts.
        return {
          id: String(user._id),
          name: user.name ?? user.userName ?? user.email ?? identifier,
          email: user.email ?? null,
          role: isRole(user.role) ? user.role : "employee",
          employeeId: user.employeeId ?? null,
          mustResetPassword: !!user.mustResetPassword,
        };
      },
    }),
  ],
});
