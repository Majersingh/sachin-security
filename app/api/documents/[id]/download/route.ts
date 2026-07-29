// app/api/documents/[id]/download/route.ts
// Permission-checked download: employees may only fetch their own documents; HR/admin any.
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/apiAuth";
import { hasPermission } from "@/app/lib/rbac";
import { getR2Object } from "@/app/lib/r2";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  let _id: ObjectId;
  try { _id = new ObjectId(id); } catch { return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 }); }

  const documents = await getCollection("documents");
  const doc = await documents.findOne({ _id });
  if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const canManage = hasPermission(user.role, "documents:manage");
  if (!canManage && doc.employeeId !== user.employeeId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (!doc.r2Key) return NextResponse.json({ success: false, error: "File missing" }, { status: 404 });

  const { bytes, contentType: r2Type } = await getR2Object(doc.r2Key);
  const buffer = Buffer.from(bytes);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": doc.contentType || r2Type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.originalName || "document"}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
