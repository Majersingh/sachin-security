// app/api/account/change-password/route.ts
// Lets the logged-in user change their own password (used for the forced reset
// of temporary passwords, and voluntary changes).
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { getUsersCollection, hashPassword } from "@/app/lib/users";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!newPassword || String(newPassword).length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const users = await getUsersCollection();

  let user;
  try {
    user = await users.findOne({ _id: new ObjectId(session.user.id) });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(String(currentPassword || ""), user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const passwordHash = await hashPassword(String(newPassword));
  await users.updateOne(
    { _id: user._id },
    { $set: { passwordHash, mustResetPassword: false, updatedAt: new Date() } }
  );

  // The JWT still carries the old mustResetPassword flag; the client signs out
  // after this so the next login mints a fresh token.
  return NextResponse.json({ success: true });
}
