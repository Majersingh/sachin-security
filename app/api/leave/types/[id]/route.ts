// app/api/leave/types/[id]/route.ts
// Update / deactivate a leave type (leave:manage).
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";

function parseId(id: string): ObjectId | null {
  try { return new ObjectId(id); } catch { return null; }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("leave:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, any> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.code === "string") update.code = body.code.trim();
  if (body.annualQuota !== undefined) {
    const q = Number(body.annualQuota);
    if (!Number.isFinite(q) || q < 0) return NextResponse.json({ success: false, error: "Invalid quota" }, { status: 400 });
    update.annualQuota = q;
  }
  if (typeof body.paid === "boolean") update.paid = body.paid;
  if (typeof body.active === "boolean") update.active = body.active;
  if (Object.keys(update).length === 0) return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
  update.updatedAt = new Date();

  const collection = await getCollection("leaveTypes");
  const result = await collection.updateOne({ _id }, { $set: update });
  if (result.matchedCount === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("leave:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const hard = new URL(request.url).searchParams.get("hard");
  const collection = await getCollection("leaveTypes");
  if (hard === "1" || hard === "true") {
    await collection.deleteOne({ _id });
  } else {
    await collection.updateOne({ _id }, { $set: { active: false, updatedAt: new Date() } });
  }
  return NextResponse.json({ success: true });
}
