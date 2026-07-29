// app/api/leave/holidays/[id]/route.ts
// Delete a holiday (leave:manage).
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("leave:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  let _id: ObjectId;
  try { _id = new ObjectId(id); } catch { return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 }); }

  const collection = await getCollection("holidays");
  const result = await collection.deleteOne({ _id });
  if (result.deletedCount === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
