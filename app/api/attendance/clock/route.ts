// app/api/attendance/clock/route.ts
// Clock in / clock out. GPS is MANDATORY — requests without a valid location are rejected.
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString, computeStatus, isValidGeo, evaluateGeofence, MAX_OPEN_SHIFT_HOURS } from "@/app/lib/attendance";

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

  // Geofence check: the punch must be within the assigned site's radius.
  // A guard's site is `employee.workLocation` (a location name); we look up that
  // location's coordinates. If the site has no coordinates configured we cannot
  // enforce a fence, so the punch is allowed (distanceM stays null).
  const employees = await getCollection("employees");
  const employee = await employees.findOne(
    { employeeId },
    { projection: { workLocation: 1 } }
  );
  const workLocation = typeof employee?.workLocation === "string" ? employee.workLocation.trim() : "";

  type Site = { lat?: unknown; lng?: unknown; geofenceRadiusM?: unknown; geofenceEnabled?: unknown; name?: string };
  let site: Site | null = null;
  if (workLocation) {
    const locations = await getCollection("locations");
    site = (await locations.findOne(
      { name: { $regex: `^${escapeRegex(workLocation)}$`, $options: "i" }, active: { $ne: false } },
      { projection: { lat: 1, lng: 1, geofenceRadiusM: 1, geofenceEnabled: 1, name: 1 } }
    )) as Site | null;
  }

  const fence = evaluateGeofence(site, lat, lng, typeof accuracy === "number" ? accuracy : null);
  if (!fence.ok) {
    return NextResponse.json({ success: false, error: fence.reason || "You are not at your assigned site." }, { status: 403 });
  }

  const date = istDateString();
  const now = new Date();
  const punch = {
    at: now,
    lat,
    lng,
    accuracy: typeof accuracy === "number" ? accuracy : null,
    distanceM: fence.distanceM,
    siteName: site?.name || workLocation || null,
  };

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
  // Duplicate clock-out for a shift already completed today.
  if (existing?.clockIn && existing.clockOut) {
    return NextResponse.json({ success: false, error: "Already clocked out today" }, { status: 400 });
  }

  // Which shift to close: today's open record if there is one; otherwise the most
  // recent still-open shift (clockIn set, no clockOut) started within the lookback
  // window. This closes an overnight shift that crossed midnight into a new date —
  // e.g. clocked in 10 PM yesterday, clocking out 6 AM today. The shift stays dated
  // to the day it started, so duty is credited there.
  let openRecord = existing?.clockIn && !existing.clockOut ? existing : null;
  if (!openRecord) {
    const cutoff = new Date(now.getTime() - MAX_OPEN_SHIFT_HOURS * 3600 * 1000);
    openRecord = await collection.findOne(
      { employeeId, clockIn: { $exists: true }, clockOut: { $exists: false }, "clockIn.at": { $gte: cutoff } },
      { sort: { "clockIn.at": -1 } }
    );
  }
  if (!openRecord?.clockIn) {
    return NextResponse.json({ success: false, error: "You must clock in before clocking out" }, { status: 400 });
  }

  const workedMinutes = Math.max(0, Math.round((now.getTime() - new Date(openRecord.clockIn.at).getTime()) / 60000));
  await collection.updateOne(
    { _id: openRecord._id },
    { $set: { clockOut: punch, workedMinutes, status: computeStatus(workedMinutes), updatedAt: now } }
  );
  const record = await collection.findOne({ _id: openRecord._id });
  const crossedDay = record?.date && record.date !== date;
  return NextResponse.json({
    success: true,
    message: crossedDay ? `Clocked out (shift of ${record.date})` : "Clocked out",
    data: record,
  });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
