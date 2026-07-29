// app/api/users/route.ts
// Admin-only: list login accounts (the `users` collection) with search + pagination,
// and create a new login account.
import { NextResponse } from "next/server";
import { getUsersCollection, createUserAccount } from "@/app/lib/users";
import { requireAdmin } from "@/app/lib/apiAuth";
import { isRole } from "@/app/lib/rbac";

export async function GET(request: Request) {
  const perm = await requireAdmin();
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25));
  const skip = (page - 1) * limit;

  const query: any = {};
  if (search) {
    const rx = { $regex: search, $options: "i" };
    query.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
  }

  const users = await getUsersCollection();
  const total = await users.countDocuments(query);
  const list = await users
    .find(query, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const data = list.map((u: any) => ({ ...u, _id: String(u._id) }));

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

// POST /api/users — create a login account. Body: { name?, email?, employeeId?, role? }.
// Requires at least an email or employeeId; refuses if one already exists.
export async function POST(request: Request) {
  const perm = await requireAdmin();
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim();
  const employeeId = String(body?.employeeId || "").trim();
  const role = String(body?.role || "employee");

  if (!email && !employeeId) {
    return NextResponse.json({ success: false, error: "Provide an email or employee ID" }, { status: 400 });
  }
  if (!isRole(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  const result = await createUserAccount({
    name,
    email: email || undefined,
    employeeId: employeeId || undefined,
    role,
  });

  if (!result.created) {
    if (result.reason === "exists") {
      return NextResponse.json(
        { success: false, exists: true, error: "A user already exists for that email or employee ID" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: "Could not create user" }, { status: 400 });
  }

  return NextResponse.json(
    { success: true, user: result.user, loginId: email || employeeId, tempPassword: result.tempPassword },
    { status: 201 }
  );
}
