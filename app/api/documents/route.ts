// app/api/documents/route.ts
// List employee documents (GET) and upload one (POST).
// Files are stored as base64 in the `uploads` collection (same pattern as resumes);
// metadata lives in `documents`.
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { getSessionUser, requirePermission } from "@/app/lib/apiAuth";
import { hasPermission } from "@/app/lib/rbac";
import { DOCUMENT_TYPES, ALLOWED_DOC_TYPES, MAX_DOC_BYTES } from "@/app/lib/documents";
import { putR2Object } from "@/app/lib/r2";

// GET /api/documents?employeeId=ss-1
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const canManage = hasPermission(user.role, "documents:manage");
  const param = new URL(request.url).searchParams.get("employeeId");

  // HR/admin can view a chosen employee's docs; everyone else only their own.
  const employeeId = canManage ? param : user.employeeId;
  if (!employeeId) return NextResponse.json({ success: true, data: [] });

  const collection = await getCollection("documents");
  const data = await collection.find({ employeeId }).sort({ createdAt: -1 }).toArray();
  // Never leak the file payload here.
  return NextResponse.json({ success: true, data });
}

// POST /api/documents  (multipart: file, employeeId, type, title)
export async function POST(request: Request) {
  const perm = await requirePermission("documents:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const employeeId = String(formData.get("employeeId") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const title = String(formData.get("title") || "").trim();

  if (!file) return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
  if (!employeeId) return NextResponse.json({ success: false, error: "employeeId is required" }, { status: 400 });
  if (!DOCUMENT_TYPES.includes(type as any)) {
    return NextResponse.json({ success: false, error: "Invalid document type" }, { status: 400 });
  }
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: "Only PDF, image or Word files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_DOC_BYTES) {
    return NextResponse.json({ success: false, error: "File must be less than 5MB" }, { status: 400 });
  }

  // Confirm the employee exists.
  const employees = await getCollection("employees");
  const emp = await employees.findOne({ employeeId }, { projection: { fullName: 1 } });
  if (!emp) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });

  // Store the file privately in R2 (not the public profile-photo path). It is
  // served back only through the permission-checked download route below.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const r2Key = `documents/${employeeId}/${uniqueId}.${ext}`;
  await putR2Object(r2Key, bytes, file.type);

  const now = new Date();
  const doc = {
    employeeId,
    type,
    title: title || file.name,
    r2Key,
    originalName: file.name,
    contentType: file.type,
    size: file.size,
    uploadedBy: perm.user.name || perm.user.email || perm.user.id,
    createdAt: now,
    updatedAt: now,
  };
  const documents = await getCollection("documents");
  const result = await documents.insertOne(doc);

  return NextResponse.json(
    { success: true, message: "Document uploaded", data: { ...doc, _id: result.insertedId } },
    { status: 201 }
  );
}
