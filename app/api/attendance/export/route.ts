// app/api/attendance/export/route.ts
// Export one employee's monthly attendance as a colour-coded calendar .xlsx.
//   GET ?employeeId=ss-1&month=YYYY-MM
// Layout: weekday names as the header row, one cell per day showing the date,
// filled green (Present) / amber (Half Day) / red (Absent) / grey (Week-off) /
// blue (Holiday). Future days in the current month are left blank.
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString } from "@/app/lib/attendance";
import { getWorkingDays, getCompanySettings } from "@/app/lib/settingsServer";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Excel-style light fills (ARGB) — readable with black text.
const FILL = {
  present: "FFC6EFCE", // green
  halfDay: "FFFFEB9C", // amber
  absent: "FFFFC7CE", // red
  weekOff: "FFD9D9D9", // grey
  holiday: "FFBDD7EE", // blue
  header: "FF404040", // dark header
} as const;

type DayKind = "Present" | "Half Day" | "Absent" | "Week-off" | "Holiday" | "";

function solid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

export async function GET(request: NextRequest) {
  const perm = await requirePermission("attendance:read:all");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const params = new URL(request.url).searchParams;
  const employeeId = (params.get("employeeId") || "").trim();
  const month = (params.get("month") || "").trim();
  if (!employeeId || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ success: false, error: "employeeId and month (YYYY-MM) are required" }, { status: 400 });
  }

  const employees = await getCollection("employees");
  const employee = await employees.findOne(
    { employeeId },
    { projection: { _id: 0, employeeId: 1, fullName: 1, designation: 1, workLocation: 1 } }
  );
  if (!employee) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });

  const attendance = await getCollection("attendance");
  const records = await attendance.find({ employeeId, date: { $regex: `^${month}` } }).toArray();
  const byDate = new Map(records.map((r) => [r.date, r]));

  const holidaysColl = await getCollection("holidays");
  const holidays = await holidaysColl.find({ date: { $regex: `^${month}` }, active: { $ne: false } }).toArray();
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.name as string]));

  const workingSet = new Set(await getWorkingDays());
  const settings = await getCompanySettings();
  const companyName = settings.companyName || "Sachin Security Services";

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = istDateString();

  // Classify each day of the month.
  const kindOf = (day: number): { kind: DayKind; holiday?: string } => {
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(y, m - 1, day, 12)).getUTCDay();
    const holiday = holidayByDate.get(dateStr);
    if (holiday) return { kind: "Holiday", holiday };
    if (!workingSet.has(dow)) return { kind: "Week-off" };
    const rec = byDate.get(dateStr);
    if (rec?.status === "Present") return { kind: "Present" };
    if (rec?.status === "Half Day") return { kind: "Half Day" };
    if (dateStr <= today) return { kind: "Absent" };
    return { kind: "" }; // future day, not yet occurred
  };

  const fillFor = (kind: DayKind): ExcelJS.Fill | null => {
    switch (kind) {
      case "Present": return solid(FILL.present);
      case "Half Day": return solid(FILL.halfDay);
      case "Absent": return solid(FILL.absent);
      case "Week-off": return solid(FILL.weekOff);
      case "Holiday": return solid(FILL.holiday);
      default: return null;
    }
  };

  // ---- Build the workbook ----
  const wb = new ExcelJS.Workbook();
  wb.creator = companyName;
  wb.created = new Date();
  const ws = wb.addWorksheet(month, { views: [{ showGridLines: false }] });

  ws.columns = Array.from({ length: 7 }, () => ({ width: 14 }));
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFBFBFBF" } },
    left: { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
    right: { style: "thin", color: { argb: "FFBFBFBF" } },
  };

  let row = 1;
  const merge = (r: number) => ws.mergeCells(r, 1, r, 7);

  // Title block.
  merge(row); const t1 = ws.getCell(row, 1);
  t1.value = companyName;
  t1.font = { bold: true, size: 15 };
  t1.alignment = { horizontal: "center" };
  ws.getRow(row).height = 22; row++;

  merge(row); const t2 = ws.getCell(row, 1);
  t2.value = `Attendance — ${MONTH_NAMES[m]} ${y}`;
  t2.font = { bold: true, size: 12, color: { argb: "FF7A5C00" } };
  t2.alignment = { horizontal: "center" }; row++;

  merge(row); const t3 = ws.getCell(row, 1);
  t3.value = `${employee.fullName || employeeId} (${employeeId})`;
  t3.alignment = { horizontal: "center" };
  t3.font = { size: 11 }; row++;

  merge(row); const t4 = ws.getCell(row, 1);
  t4.value = [employee.designation, employee.workLocation].filter(Boolean).join("  ·  ") || "—";
  t4.alignment = { horizontal: "center" };
  t4.font = { size: 10, color: { argb: "FF808080" } }; row++;

  row++; // spacer

  // Legend.
  const legend: [string, string][] = [
    ["Present", FILL.present], ["Half Day", FILL.halfDay], ["Absent", FILL.absent],
    ["Week-off", FILL.weekOff], ["Holiday", FILL.holiday],
  ];
  legend.forEach(([label, argb], i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = label;
    cell.fill = solid(argb);
    cell.alignment = { horizontal: "center" };
    cell.font = { size: 10, bold: true };
    cell.border = border;
  });
  row++; row++; // legend + spacer

  // Weekday header row.
  const headerRow = row;
  WEEKDAYS.forEach((name, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = name;
    cell.fill = solid(FILL.header);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = border;
  });
  ws.getRow(headerRow).height = 20;
  row++;

  // Calendar grid — one row per week, Sunday-first.
  const firstDow = new Date(Date.UTC(y, m - 1, 1, 12)).getUTCDay();
  let day = 1;
  let gridRow = row;
  ws.getRow(gridRow).height = 44;
  for (let week = 0; day <= daysInMonth; week++) {
    gridRow = row + week;
    ws.getRow(gridRow).height = 44;
    for (let col = 0; col < 7; col++) {
      const cell = ws.getCell(gridRow, col + 1);
      cell.border = border;
      cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      const isBeforeStart = week === 0 && col < firstDow;
      if (isBeforeStart || day > daysInMonth) continue; // blank pad cell
      const { kind, holiday } = kindOf(day);
      const fill = fillFor(kind);
      if (fill) cell.fill = fill;
      const lines = [String(day)];
      if (kind) lines.push(kind === "Holiday" && holiday ? holiday : kind);
      cell.value = lines.join("\n");
      cell.font = { size: 10 };
      day++;
    }
  }

  // Summary block.
  let present = 0, halfDay = 0, absent = 0, weekOff = 0, holidayCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const k = kindOf(d).kind;
    if (k === "Present") present++;
    else if (k === "Half Day") halfDay++;
    else if (k === "Absent") absent++;
    else if (k === "Week-off") weekOff++;
    else if (k === "Holiday") holidayCount++;
  }
  const summaryRow = gridRow + 2;
  const summary: [string, number][] = [
    ["Present", present], ["Half Day", halfDay], ["Absent", absent],
    ["Week-off", weekOff], ["Holidays", holidayCount],
  ];
  summary.forEach(([label, value], i) => {
    const c = ws.getCell(summaryRow, i + 1);
    c.value = `${label}: ${value}`;
    c.font = { bold: true, size: 10 };
    c.alignment = { horizontal: "center" };
    c.border = border;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const safeName = (employee.fullName || employeeId).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance-${safeName}-${month}.xlsx"`,
    },
  });
}
