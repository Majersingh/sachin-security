// app/api/leave/types/route.ts
// Leave types: list (any authed user) + create (leave:manage).
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";

export async function GET() {
  const perm = await requirePermission("leave:read:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const collection = await getCollection("leaveTypes");
  const data = await collection.find({}).sort({ name: 1 }).toArray();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const perm = await requirePermission("leave:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });

  const annualQuota = Number(body.annualQuota);
  if (!Number.isFinite(annualQuota) || annualQuota < 0) {
    return NextResponse.json({ success: false, error: "Annual quota must be a non-negative number" }, { status: 400 });
  }

  const collection = await getCollection("leaveTypes");
  const dupe = await collection.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
  if (dupe) return NextResponse.json({ success: false, error: `Leave type "${name}" already exists` }, { status: 400 });

  const now = new Date();
  const doc = {
    name,
    code: String(body.code || "").trim(),
    annualQuota,
    paid: body.paid !== false, // default paid
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(doc);
  return NextResponse.json({ success: true, data: { ...doc, _id: result.insertedId } }, { status: 201 });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
