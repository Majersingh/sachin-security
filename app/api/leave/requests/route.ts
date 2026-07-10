// app/api/leave/requests/route.ts
// Apply for leave (POST) and list requests (GET) scoped by role.
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { hasPermission } from "@/app/lib/rbac";
import { countLeaveDays } from "@/app/lib/leave";
import { computeBalances, getHolidaysInRange } from "@/app/lib/leaveServer";
import { getWorkingDays } from "@/app/lib/settingsServer";

// GET /api/leave/requests?status=&employeeId=&mine=1
export async function GET(request: Request) {
  const perm = await requirePermission("leave:read:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  const user = perm.user;

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const employeeIdParam = params.get("employeeId");
  const mine = params.get("mine") === "1";

  const query: any = {};
  if (status) query.status = status;

  const employees = await getCollection("employees");

  if (!mine && hasPermission(user.role, "leave:read:all")) {
    // HR/admin: all requests (optionally one employee)
    if (employeeIdParam) query.employeeId = employeeIdParam;
  } else if (!mine && hasPermission(user.role, "leave:approve:team")) {
    // Manager: own + direct reports
    const reports = await employees
      .find({ reportingManagerId: user.employeeId }, { projection: { employeeId: 1 } })
      .toArray();
    const ids = reports.map((r: any) => r.employeeId).filter(Boolean);
    query.employeeId = { $in: [user.employeeId, ...ids].filter(Boolean) };
  } else {
    // Self only
    query.employeeId = user.employeeId;
  }

  const coll = await getCollection("leaveRequests");
  const data = await coll.find(query).sort({ appliedAt: -1 }).toArray();
  return NextResponse.json({ success: true, data });
}

// POST /api/leave/requests  { type, fromDate, toDate, reason }
export async function POST(request: Request) {
  const perm = await requirePermission("leave:apply");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  const user = perm.user;

  if (!user.employeeId) {
    return NextResponse.json({ success: false, error: "No employee profile linked to this account" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "").trim();
  const fromDate = String(body.fromDate || "").trim();
  const toDate = String(body.toDate || "").trim();
  const reason = String(body.reason || "").trim();

  if (!type) return NextResponse.json({ success: false, error: "Leave type is required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return NextResponse.json({ success: false, error: "Valid from/to dates are required" }, { status: 400 });
  }
  if (toDate < fromDate) {
    return NextResponse.json({ success: false, error: "To date cannot be before from date" }, { status: 400 });
  }

  // Validate the leave type exists and is active.
  const typesColl = await getCollection("leaveTypes");
  const leaveType = await typesColl.findOne({ name: type, active: { $ne: false } });
  if (!leaveType) return NextResponse.json({ success: false, error: "Unknown leave type" }, { status: 400 });

  // Compute leave days over configured working days, excluding holidays.
  const [holidays, workingDays] = await Promise.all([getHolidaysInRange(fromDate, toDate), getWorkingDays()]);
  const days = countLeaveDays(fromDate, toDate, holidays, workingDays);
  if (days <= 0) {
    return NextResponse.json({ success: false, error: "Selected range has no working days (only Sundays/holidays)" }, { status: 400 });
  }

  // Enforce balance for paid types that have a quota.
  if (leaveType.paid !== false && Number(leaveType.annualQuota) > 0) {
    const balances = await computeBalances(user.employeeId, Number(fromDate.slice(0, 4)));
    const bal = balances.find((b) => b.name === type);
    if (bal && bal.remaining < days) {
      return NextResponse.json(
        { success: false, error: `Insufficient ${type} balance: ${bal.remaining} left, ${days} requested` },
        { status: 400 }
      );
    }
  }

  const now = new Date();
  const doc = {
    employeeId: user.employeeId,
    employeeName: user.name || user.employeeId,
    type,
    fromDate,
    toDate,
    days,
    reason,
    status: "Pending" as const,
    appliedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const coll = await getCollection("leaveRequests");
  const result = await coll.insertOne(doc);
  return NextResponse.json({ success: true, data: { ...doc, _id: result.insertedId } }, { status: 201 });
}
