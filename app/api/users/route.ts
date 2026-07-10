// app/api/users/route.ts
// Admin-only: list login accounts (the `users` collection) with search + pagination.
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/app/lib/users";
import { requireAdmin } from "@/app/lib/apiAuth";

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
