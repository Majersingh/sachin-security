// app/api/documents/[id]/route.ts
// Delete a document (metadata + stored file). documents:manage only.
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { deleteR2Object } from "@/app/lib/r2";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("documents:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  let _id: ObjectId;
  try { _id = new ObjectId(id); } catch { return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 }); }

  const documents = await getCollection("documents");
  const doc = await documents.findOne({ _id });
  if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  // Remove the stored file from R2, then the metadata.
  if (doc.r2Key) {
    try { await deleteR2Object(doc.r2Key); } catch {}
  }
  await documents.deleteOne({ _id });

  return NextResponse.json({ success: true, message: "Document deleted" });
}
