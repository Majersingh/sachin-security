// app/api/users/[id]/reset-password/route.ts
// Admin-only: reset a user's password to a fresh temporary one. The plaintext
// temp password is returned ONCE so the admin can hand it to the user; it is
// never stored. The user is forced to change it on next login.
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, generateTempPassword, hashPassword } from "@/app/lib/users";
import { requireAdmin } from "@/app/lib/apiAuth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const perm = await requireAdmin();
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ _id });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await users.updateOne(
    { _id },
    { $set: { passwordHash, mustResetPassword: true, updatedAt: new Date() } }
  );

  return NextResponse.json({
    success: true,
    // Shown once so the admin can share it with the user.
    loginId: user.email || user.employeeId,
    tempPassword,
  });
}
