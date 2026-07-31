// app/lib/users.ts
// Helpers for the `users` collection (login accounts). Node runtime only (uses bcrypt).
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getCollection } from "@/app/lib/db";
import type { Role } from "@/app/lib/rbac";

const BCRYPT_ROUNDS = 10;

export async function getUsersCollection() {
  return getCollection("users");
}

// Human-friendly but reasonably strong temporary password (no ambiguous chars).
export function generateTempPassword(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Create a login account for a newly-added employee. Idempotent: if a user
// already exists for this employeeId/email, it does nothing. Returns the
// generated temp password (shown once to HR) when a new account is created.
export async function createEmployeeUser(opts: {
  employeeId: string;
  email?: string;
  name?: string;
  role?: Role;
}): Promise<{ created: boolean; tempPassword: string | null }> {
  const users = await getUsersCollection();
  const email = opts.email?.trim().toLowerCase() || undefined;

  const orClauses: any[] = [{ employeeId: opts.employeeId }];
  if (email) orClauses.push({ email });
  const existing = await users.findOne({ $or: orClauses });
  if (existing) return { created: false, tempPassword: null };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await users.insertOne({
    employeeId: opts.employeeId,
    // Only set `email` when present. The unique+sparse index on `email` treats a
    // stored `null` as a value, so inserting null for every no-email employee
    // collides after the first — omitting the field lets the sparse index skip it.
    ...(email ? { email } : {}),
    name: opts.name || opts.employeeId,
    role: opts.role || "employee",
    passwordHash,
    active: true,
    mustResetPassword: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { created: true, tempPassword };
}

// Create a login account from admin-entered data (the "Add user" modal). Like
// createEmployeeUser but employeeId is optional and the role is chosen by the
// admin. Idempotent: refuses if a user already exists for the given email or
// employeeId. Returns the temp password (shown once) and the safe user doc.
export async function createUserAccount(opts: {
  name?: string;
  email?: string;
  employeeId?: string;
  role?: Role;
}): Promise<{ created: boolean; tempPassword: string | null; user?: any; reason?: "exists" | "missing-id" }> {
  const users = await getUsersCollection();
  const email = opts.email?.trim().toLowerCase() || undefined;
  const employeeId = opts.employeeId?.trim() || undefined;

  // A login needs at least one identifier to sign in with.
  if (!email && !employeeId) return { created: false, tempPassword: null, reason: "missing-id" };

  const orClauses: any[] = [];
  if (employeeId) orClauses.push({ employeeId });
  if (email) orClauses.push({ email });
  const existing = await users.findOne({ $or: orClauses });
  if (existing) return { created: false, tempPassword: null, reason: "exists" };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  // Only include identifiers that are present — a stored `null` on the unique+sparse
  // email/employeeId indexes would collide across all null-valued accounts.
  const doc: Record<string, any> = {
    name: opts.name?.trim() || email || employeeId,
    role: opts.role || "employee",
    passwordHash,
    active: true,
    mustResetPassword: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (employeeId) doc.employeeId = employeeId;
  if (email) doc.email = email;
  const res = await users.insertOne(doc as any);
  // Return the account without the password hash.
  return {
    created: true,
    tempPassword,
    user: {
      _id: String(res.insertedId),
      employeeId: doc.employeeId,
      email: doc.email,
      name: doc.name,
      role: doc.role,
      active: doc.active,
      mustResetPassword: doc.mustResetPassword,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  };
}
