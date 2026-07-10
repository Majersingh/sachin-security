// app/api/attendance/me/route.ts
// Current user's monthly attendance records + summary counts.
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istMonthString } from "@/app/lib/attendance";

export async function GET(request: Request) {
  const perm = await requirePermission("attendance:read:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const employeeId = perm.user.employeeId;
  if (!employeeId) return NextResponse.json({ success: true, data: [], summary: { present: 0, halfDay: 0 } });

  const month = new URL(request.url).searchParams.get("month") || istMonthString();
  const collection = await getCollection("attendance");
  const data = await collection
    .find({ employeeId, date: { $regex: `^${month}` } })
    .sort({ date: 1 })
    .toArray();

  const summary = {
    present: data.filter((d) => d.status === "Present").length,
    halfDay: data.filter((d) => d.status === "Half Day").length,
  };

  return NextResponse.json({ success: true, month, data, summary });
}
