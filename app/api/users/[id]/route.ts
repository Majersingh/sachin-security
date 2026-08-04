// app/api/users/[id]/route.ts
// Admin-only: update a login account's active status and/or role.
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/app/lib/users";
import { requireAdmin } from "@/app/lib/apiAuth";
import { isRole } from "@/app/lib/rbac";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const perm = await requireAdmin();
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  const messages: string[] = [];

  // --- active status ---
  if ("active" in body) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ success: false, error: "`active` must be a boolean" }, { status: 400 });
    }
    // Guard against an admin locking themselves out of the system.
    if (perm.user.id === id && body.active === false) {
      return NextResponse.json({ success: false, error: "You cannot deactivate your own account" }, { status: 400 });
    }
    update.active = body.active;
    messages.push(body.active ? "User activated" : "User deactivated");
  }

  // --- role ---
  if ("role" in body) {
    if (!isRole(body.role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }
    // Guard against an admin demoting themselves out of admin access.
    if (perm.user.id === id && body.role !== "admin") {
      return NextResponse.json({ success: false, error: "You cannot change your own role from admin" }, { status: 400 });
    }
    update.role = body.role;
    messages.push(`Role set to ${body.role}`);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
  }

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
  }

  update.updatedAt = new Date();
  const users = await getUsersCollection();
  const result = await users.updateOne({ _id }, { $set: update });
  if (result.matchedCount === 0) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: messages.join(" · ") });
}
