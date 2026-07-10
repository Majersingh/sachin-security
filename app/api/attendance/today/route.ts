// app/api/attendance/today/route.ts
// Current user's attendance record for today (drives the clock in/out UI).
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString } from "@/app/lib/attendance";

export async function GET() {
  const perm = await requirePermission("attendance:read:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const employeeId = perm.user.employeeId;
  if (!employeeId) {
    return NextResponse.json({ success: true, data: null, date: istDateString(), noEmployee: true });
  }

  const date = istDateString();
  const collection = await getCollection("attendance");
  const record = await collection.findOne({ employeeId, date });
  return NextResponse.json({ success: true, data: record, date });
}
