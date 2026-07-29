// app/lib/rbac.ts
// Central definition of roles, permissions and helpers for RBAC.
// This is the single source of truth used by auth callbacks, middleware and API routes.

export type Role = "admin" | "hr" | "manager" | "employee";

export const ROLES: Role[] = ["admin", "hr", "manager", "employee"];

// Permission catalog. Grows per HRMS module. Format: "<resource>:<action>[:<scope>]".
export type Permission =
  // Employee / directory
  | "employees:read"
  | "employees:write"
  // Organization structure (departments, designations, teams, branches, hierarchy)
  | "org:read"
  | "org:manage"
  // Attendance
  | "attendance:read:self"
  | "attendance:write:self"
  | "attendance:read:team"
  | "attendance:read:all"
  // Leave
  | "leave:apply"
  | "leave:read:self"
  | "leave:approve:team"
  | "leave:read:all"
  | "leave:manage"
  // Documents
  | "documents:read:self"
  | "documents:manage"
  // Payroll (salary structures + payslips) — sensitive; admin/HR only
  | "payroll:read"
  | "payroll:manage"
  // Users & roles
  | "users:read"
  | "users:manage"
  // Notifications / announcements
  | "notifications:read"
  | "notifications:send";

// Role -> permissions. Admin implicitly gets everything (see hasPermission).
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [], // admin is all-access; handled specially in hasPermission
  hr: [
    "employees:read",
    "employees:write",
    "org:read",
    "org:manage",
    "attendance:read:all",
    "leave:read:all",
    "leave:manage",
    "leave:approve:team",
    "documents:read:self",
    "documents:manage",
    "payroll:read",
    "payroll:manage",
    "users:read",
    "users:manage",
    "notifications:read",
    "notifications:send",
  ],
  manager: [
    "employees:read",
    "org:read",
    "attendance:read:self",
    "attendance:write:self",
    "attendance:read:team",
    "leave:apply",
    "leave:read:self",
    "leave:approve:team",
    "documents:read:self",
    "notifications:read",
  ],
  employee: [
    "attendance:read:self",
    "attendance:write:self",
    "leave:apply",
    "leave:read:self",
    "documents:read:self",
    "notifications:read",
  ],
};

// Roles that may access the /admin back-office area. Employees use the self-service portal.
export const STAFF_ROLES: Role[] = ["admin", "hr", "manager"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

// Admin has every permission; others use their mapped list.
export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

// Resolve the full permission list for a role (admin returns all known permissions).
export function permissionsForRole(role: Role | undefined | null): Permission[] {
  if (!role) return [];
  if (role === "admin") {
    // Flatten every permission that appears in the catalog.
    const all = new Set<Permission>();
    (Object.keys(ROLE_PERMISSIONS) as Role[]).forEach((r) =>
      ROLE_PERMISSIONS[r].forEach((p) => all.add(p))
    );
    return Array.from(all);
  }
  return ROLE_PERMISSIONS[role] ?? [];
}
