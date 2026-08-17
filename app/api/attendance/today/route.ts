// app/api/attendance/today/route.ts
// Current user's attendance record for today (drives the clock in/out UI).
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString, MAX_OPEN_SHIFT_HOURS } from "@/app/lib/attendance";

export async function GET() {
  const perm = await requirePermission("attendance:read:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const employeeId = perm.user.employeeId;
  if (!employeeId) {
    return NextResponse.json({ success: true, data: null, date: istDateString(), noEmployee: true });
  }

  const date = istDateString();
  const collection = await getCollection("attendance");
  let record = await collection.findOne({ employeeId, date });

  // If there's no open shift for today, surface an overnight shift still open from
  // a previous date (clocked in last night, not yet out) so the UI shows "Clock
  // Out" rather than a fresh "Clock In".
  if (!record?.clockIn) {
    const cutoff = new Date(Date.now() - MAX_OPEN_SHIFT_HOURS * 3600 * 1000);
    const open = await collection.findOne(
      { employeeId, clockIn: { $exists: true }, clockOut: { $exists: false }, "clockIn.at": { $gte: cutoff } },
      { sort: { "clockIn.at": -1 } }
    );
    if (open) record = open;
  }

  return NextResponse.json({ success: true, data: record, date });
}
