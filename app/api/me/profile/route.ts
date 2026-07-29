// app/api/me/profile/route.ts
// Employee self-service: view own profile and edit a limited set of fields.
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/apiAuth";

// Fields an employee may change themselves. Everything else (name, govt IDs,
// employment, salary, bank) is HR-only.
const SELF_EDITABLE = [
  "mobileNumber",
  "alternateNumber",
  "email",
  "currentAddress",
  "emergencyContactName",
  "emergencyContactNumber",
  "emergencyContactRelation",
] as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!user.employeeId) return NextResponse.json({ success: true, data: null, noEmployee: true });

  const collection = await getCollection("employees");
  const employee = await collection.findOne({ employeeId: user.employeeId });
  if (!employee) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: employee, editableFields: SELF_EDITABLE });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!user.employeeId) return NextResponse.json({ success: false, error: "No employee profile linked" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, any> = {};
  for (const field of SELF_EDITABLE) {
    if (field in body) update[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "No editable fields provided" }, { status: 400 });
  }
  update.updatedAt = new Date();

  const collection = await getCollection("employees");
  const result = await collection.updateOne({ employeeId: user.employeeId }, { $set: update });
  if (result.matchedCount === 0) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

  return NextResponse.json({ success: true, message: "Profile updated" });
}
