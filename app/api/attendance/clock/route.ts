// app/api/attendance/clock/route.ts
// Clock in / clock out. GPS is MANDATORY — requests without a valid location are rejected.
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString, computeStatus, isValidGeo } from "@/app/lib/attendance";

export async function POST(request: Request) {
  const perm = await requirePermission("attendance:write:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const employeeId = perm.user.employeeId;
  if (!employeeId) {
    return NextResponse.json({ success: false, error: "No employee profile linked to this account" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { type, lat, lng, accuracy } = body ?? {};

  if (type !== "in" && type !== "out") {
    return NextResponse.json({ success: false, error: "type must be 'in' or 'out'" }, { status: 400 });
  }

  // Hard requirement: no location => no punch.
  if (!isValidGeo(lat, lng)) {
    return NextResponse.json(
      { success: false, error: "Location is required to clock in/out. Please enable GPS/location access." },
      { status: 400 }
    );
  }

  const date = istDateString();
  const now = new Date();
  const punch = { at: now, lat, lng, accuracy: typeof accuracy === "number" ? accuracy : null };

  const collection = await getCollection("attendance");
  const existing = await collection.findOne({ employeeId, date });

  if (type === "in") {
    if (existing?.clockIn) {
      return NextResponse.json({ success: false, error: "Already clocked in today" }, { status: 400 });
    }
    await collection.updateOne(
      { employeeId, date },
      {
        $set: { clockIn: punch, status: "Present", updatedAt: now },
        $setOnInsert: { employeeId, date, createdAt: now },
      },
      { upsert: true }
    );
    const record = await collection.findOne({ employeeId, date });
    return NextResponse.json({ success: true, message: "Clocked in", data: record });
  }

  // type === "out"
  if (!existing?.clockIn) {
    return NextResponse.json({ success: false, error: "You must clock in before clocking out" }, { status: 400 });
  }
  if (existing.clockOut) {
    return NextResponse.json({ success: false, error: "Already clocked out today" }, { status: 400 });
  }

  const workedMinutes = Math.max(0, Math.round((now.getTime() - new Date(existing.clockIn.at).getTime()) / 60000));
  await collection.updateOne(
    { employeeId, date },
    { $set: { clockOut: punch, workedMinutes, status: computeStatus(workedMinutes), updatedAt: now } }
  );
  const record = await collection.findOne({ employeeId, date });
  return NextResponse.json({ success: true, message: "Clocked out", data: record });
}
