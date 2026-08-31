// app/api/attendance/route.ts
// Admin/HR attendance reports.
//   GET ?date=YYYY-MM-DD                 -> all employees' status for that day
//   GET ?month=YYYY-MM&employeeId=ss-1   -> one employee's monthly records + summary
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString, istMonthString } from "@/app/lib/attendance";
import { getWorkingDays } from "@/app/lib/settingsServer";
import { getHolidaysInRange } from "@/app/lib/leaveServer";

export async function GET(request: Request) {
  const perm = await requirePermission("attendance:read:all");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const params = new URL(request.url).searchParams;
  const employeeId = params.get("employeeId");
  const month = params.get("month");

  const attendance = await getCollection("attendance");

  // --- Monthly view for a single employee ---
  if (month && employeeId) {
    const records = await attendance
      .find({ employeeId, date: { $regex: `^${month}` } })
      .sort({ date: 1 })
      .toArray();

    const present = records.filter((r) => r.status === "Present").length;
    const halfDay = records.filter((r) => r.status === "Half Day").length;
    const wd = await getWorkingDays();
    const holidays = new Set(await getHolidaysInRange(`${month}-01`, `${month}-31`));
    const workingDays = countWorkingDaysSoFar(month, wd, holidays);
    const absent = Math.max(0, workingDays - present - halfDay);

    return NextResponse.json({
      success: true,
      mode: "month",
      month,
      employeeId,
      records,
      summary: { present, halfDay, absent, workingDays },
      note: "Absent = working days so far (excl. week-offs and holidays) minus present/half-day.",
    });
  }

  // --- Daily view across all employees (paginated + searchable + status filter) ---
  const date = params.get("date") || istDateString();
  const search = (params.get("search") || "").trim();
  const status = (params.get("status") || "").trim(); // "", "Present", "Half Day", "Absent"
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(params.get("limit") || "50", 10) || 50));
  const skip = (page - 1) * limit;

  const location = (params.get("location") || "").trim();

  const employees = await getCollection("employees");
  const empQuery: any = {};
  if (search) empQuery.fullName = { $regex: search, $options: "i" };
  if (location) empQuery.workLocation = location; // show only this site's staff

  // Status filter: restrict the employee set by their attendance status for the day.
  // Present/Half Day come from stored records; Absent = anyone with no such record.
  if (status === "Present" || status === "Half Day") {
    const ids = await attendance.distinct("employeeId", { date, status });
    empQuery.employeeId = { $in: ids };
  } else if (status === "Absent") {
    const nonAbsent = await attendance.distinct("employeeId", { date, status: { $in: ["Present", "Half Day"] } });
    empQuery.employeeId = { $nin: nonAbsent };
  }

  const total = await employees.countDocuments(empQuery);
  const empList = await employees
    .find(empQuery, { projection: { _id: 0, employeeId: 1, fullName: 1, designation: 1, workLocation: 1, status: 1 } })
    .sort({ fullName: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  // Only fetch the day's records for the employees on this page.
  const pageIds = empList.map((e) => e.employeeId).filter(Boolean);
  const dayRecords = await attendance.find({ date, employeeId: { $in: pageIds } }).toArray();
  const byEmp = new Map(dayRecords.map((r) => [r.employeeId, r]));

  const rows = empList
    .filter((e) => e.employeeId)
    .map((e) => {
      const rec = byEmp.get(e.employeeId);
      return {
        employeeId: e.employeeId,
        fullName: e.fullName,
        designation: e.designation || "",
        workLocation: e.workLocation || "",
        status: rec?.status || "Absent",
        clockIn: rec?.clockIn || null,
        clockOut: rec?.clockOut || null,
        workedMinutes: rec?.workedMinutes || 0,
      };
    });

  // Summary reflects the day across all matching employees (not just this page).
  // It respects the location filter (so a site shows its own breakdown) but not
  // the search/status filters. present/half-day come from stored records;
  // absent = everyone else.
  const scopeQuery: any = location ? { workLocation: location } : {};
  const totalEmployees = await employees.countDocuments(scopeQuery);
  const attFilter: any = { date };
  if (location) {
    const scopeIds = await employees.distinct("employeeId", scopeQuery);
    attFilter.employeeId = { $in: scopeIds };
  }
  const present = await attendance.countDocuments({ ...attFilter, status: "Present" });
  const halfDay = await attendance.countDocuments({ ...attFilter, status: "Half Day" });
  const summary = {
    present,
    halfDay,
    absent: Math.max(0, totalEmployees - present - halfDay),
    total: totalEmployees,
  };

  return NextResponse.json({
    success: true,
    mode: "day",
    date,
    rows,
    summary,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

// Count working days (configured weekdays, excluding holidays) from the 1st of
// `month` up to today (or month end if the month is in the past).
function countWorkingDaysSoFar(
  month: string,
  workingDays: number[] = [1, 2, 3, 4, 5, 6],
  holidays: Set<string> = new Set()
): number {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return 0;
  if (month > istMonthString()) return 0; // future month => nothing yet

  const today = istDateString();
  const lastDay =
    month === istMonthString()
      ? Number(today.slice(8, 10))
      : new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month = last day of this month

  const workingSet = new Set(workingDays);
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
    if (!workingSet.has(dow)) continue; // week-off
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;
    if (holidays.has(dateStr)) continue; // declared holiday
    count++;
  }
  return count;
}
