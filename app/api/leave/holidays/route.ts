// app/api/leave/holidays/route.ts
// Holiday calendar: list (any authed) + create (leave:manage).
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";

export async function GET(request: Request) {
  const perm = await requirePermission("leave:read:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const year = new URL(request.url).searchParams.get("year");
  const query: any = {};
  if (year) query.date = { $regex: `^${year}` };

  const collection = await getCollection("holidays");
  const data = await collection.find(query).sort({ date: 1 }).toArray();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const perm = await requirePermission("leave:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const body = await request.json().catch(() => ({}));
  const date = String(body.date || "").trim();
  const name = String(body.name || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, error: "Valid date (YYYY-MM-DD) is required" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ success: false, error: "Holiday name is required" }, { status: 400 });

  const collection = await getCollection("holidays");
  const dupe = await collection.findOne({ date });
  if (dupe) return NextResponse.json({ success: false, error: "A holiday already exists on this date" }, { status: 400 });

  const now = new Date();
  const doc = { date, name, active: true, createdAt: now, updatedAt: now };
  const result = await collection.insertOne(doc);
  return NextResponse.json({ success: true, data: { ...doc, _id: result.insertedId } }, { status: 201 });
}
