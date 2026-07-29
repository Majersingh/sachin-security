// types/next-auth.d.ts
// Augment Auth.js session/user/JWT with our HRMS fields.
import type { Role, Permission } from "@/app/lib/rbac";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
      employeeId?: string | null;
      permissions: Permission[];
      mustResetPassword?: boolean;
    };
  }

  interface User {
    role: Role;
    employeeId?: string | null;
    mustResetPassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    employeeId?: string | null;
    mustResetPassword?: boolean;
  }
}
