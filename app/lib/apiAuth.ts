// app/lib/apiAuth.ts
// Server-side helpers for API routes to enforce RBAC beyond the coarse middleware gate.
import { auth } from "@/auth";
import { hasPermission, type Permission, type Role } from "@/app/lib/rbac";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  employeeId?: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser) ?? null;
}

type PermissionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; status: number; error: string };

// Returns { ok:true, user } when allowed, otherwise a ready-to-return error shape.
export async function requirePermission(permission: Permission): Promise<PermissionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  if (!hasPermission(user.role, permission)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, user };
}

// Stricter than a permission check: only the `admin` role passes. Used for
// account administration (user management) which HR must not access.
export async function requireAdmin(): Promise<PermissionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  if (user.role !== "admin") return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, user };
}
