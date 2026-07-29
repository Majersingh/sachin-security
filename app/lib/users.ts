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
    email,
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
