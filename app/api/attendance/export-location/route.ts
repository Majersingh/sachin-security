// app/api/attendance/export-location/route.ts
// Export a whole location's monthly attendance as a muster-roll .xlsx.
//   GET ?location=SSS%20HO&month=YYYY-MM
// Grid: one row per employee, one column per day. Cell = P (present, green) /
// H (half day, amber) / A (absent, red); week-offs grey, holidays blue, future
// days blank. Trailing P/H/A totals per employee.
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString } from "@/app/lib/attendance";
import { getWorkingDays, getCompanySettings } from "@/app/lib/settingsServer";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const FILL = {
  present: "FFC6EFCE", halfDay: "FFFFEB9C", absent: "FFFFC7CE",
  weekOff: "FFD9D9D9", holiday: "FFBDD7EE", header: "FF404040",
} as const;
const solid = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const border: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};

export async function GET(request: NextRequest) {
  const perm = await requirePermission("attendance:read:all");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const params = new URL(request.url).searchParams;
  const location = (params.get("location") || "").trim();
  const month = (params.get("month") || "").trim();
  if (!location || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ success: false, error: "location and month (YYYY-MM) are required" }, { status: 400 });
  }

  const employeesColl = await getCollection("employees");
  const emps = await employeesColl
    .find({ workLocation: location }, { projection: { _id: 0, employeeId: 1, fullName: 1, designation: 1 } })
    .sort({ fullName: 1 })
    .toArray();

  const attendance = await getCollection("attendance");
  const empIds = emps.map((e) => e.employeeId).filter(Boolean);
  const records = empIds.length
    ? await attendance.find({ employeeId: { $in: empIds }, date: { $regex: `^${month}` } }).toArray()
    : [];
  const statusByEmpDate = new Map<string, string>();
  for (const r of records) statusByEmpDate.set(`${r.employeeId}|${r.date}`, r.status);

  const holidaysColl = await getCollection("holidays");
  const holidays = await holidaysColl.find({ date: { $regex: `^${month}` }, active: { $ne: false } }).toArray();
  const holidaySet = new Set(holidays.map((h) => h.date as string));

  const workingSet = new Set(await getWorkingDays());
  const settings = await getCompanySettings();
  const companyName = settings.companyName || "Sachin Security Services";

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = istDateString();

  // Per-day metadata (weekday / week-off / holiday) — same for every employee.
  const dayMeta = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(y, m - 1, day, 12)).getUTCDay();
    return { day, dateStr, dow, weekOff: !workingSet.has(dow), holiday: holidaySet.has(dateStr) };
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = companyName;
  wb.created = new Date();
  const ws = wb.addWorksheet(month, { views: [{ showGridLines: false }] });

  const totalCols = 2 + daysInMonth + 3; // Emp ID, Name, days…, P, H, A
  const cols: Partial<ExcelJS.Column>[] = [{ width: 10 }, { width: 26 }];
  for (let d = 0; d < daysInMonth; d++) cols.push({ width: 4.5 });
  cols.push({ width: 5 }, { width: 5 }, { width: 5 });
  ws.columns = cols;

  let row = 1;
  const titleMerge = (value: string, font: Partial<ExcelJS.Font>, argb?: string) => {
    ws.mergeCells(row, 1, row, totalCols);
    const c = ws.getCell(row, 1);
    c.value = value;
    c.font = font;
    c.alignment = { horizontal: "center" };
    if (argb) c.font = { ...font, color: { argb } };
    row++;
  };
  titleMerge(companyName, { bold: true, size: 14 });
  titleMerge(`Attendance — ${MONTH_NAMES[m]} ${y}   ·   ${location}`, { bold: true, size: 11 }, "FF7A5C00");
  titleMerge("P = Present   H = Half Day   A = Absent   ·   grey = Week-off   blue = Holiday", { size: 9 }, "FF808080");
  row++; // spacer

  // Weekday-letter row above the day numbers.
  const dowRow = row;
  dayMeta.forEach((dm, i) => {
    const c = ws.getCell(dowRow, 3 + i);
    c.value = DOW[dm.dow];
    c.alignment = { horizontal: "center" };
    c.font = { size: 8, color: { argb: "FF808080" } };
    c.border = border;
    if (dm.holiday) c.fill = solid(FILL.holiday);
    else if (dm.weekOff) c.fill = solid(FILL.weekOff);
  });
  row++;

  // Header row: Emp ID | Name | day numbers | P H A.
  const headerRow = row;
  const hId = ws.getCell(headerRow, 1); hId.value = "Emp ID";
  const hName = ws.getCell(headerRow, 2); hName.value = "Name";
  [hId, hName].forEach((c) => {
    c.fill = solid(FILL.header);
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    c.border = border;
  });
  dayMeta.forEach((dm, i) => {
    const c = ws.getCell(headerRow, 3 + i);
    c.value = dm.day;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = border;
    if (dm.holiday) { c.fill = solid(FILL.holiday); c.font = { bold: true }; }
    else if (dm.weekOff) { c.fill = solid(FILL.weekOff); c.font = { bold: true }; }
    else { c.fill = solid(FILL.header); c.font = { bold: true, color: { argb: "FFFFFFFF" } }; }
  });
  ["P", "H", "A"].forEach((lbl, i) => {
    const c = ws.getCell(headerRow, 3 + daysInMonth + i);
    c.value = lbl;
    c.fill = solid(FILL.header);
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center" };
    c.border = border;
  });
  ws.getRow(headerRow).height = 18;
  row++;

  // One row per employee.
  for (const e of emps) {
    const r = row;
    const cId = ws.getCell(r, 1); cId.value = e.employeeId; cId.font = { size: 9 }; cId.border = border;
    const cName = ws.getCell(r, 2); cName.value = e.fullName || ""; cName.font = { size: 9 }; cName.border = border;
    let P = 0, H = 0, A = 0;
    dayMeta.forEach((dm, i) => {
      const c = ws.getCell(r, 3 + i);
      c.border = border;
      c.alignment = { horizontal: "center" };
      c.font = { size: 9, bold: true };
      if (dm.holiday) { c.fill = solid(FILL.holiday); return; }
      if (dm.weekOff) { c.fill = solid(FILL.weekOff); return; }
      const st = statusByEmpDate.get(`${e.employeeId}|${dm.dateStr}`);
      if (st === "Present") { c.value = "P"; c.fill = solid(FILL.present); P++; }
      else if (st === "Half Day") { c.value = "H"; c.fill = solid(FILL.halfDay); H++; }
      else if (dm.dateStr <= today) { c.value = "A"; c.fill = solid(FILL.absent); A++; }
      // future day => blank
    });
    [P, H, A].forEach((v, i) => {
      const c = ws.getCell(r, 3 + daysInMonth + i);
      c.value = v;
      c.font = { bold: true, size: 9 };
      c.alignment = { horizontal: "center" };
      c.border = border;
    });
    row++;
  }

  if (emps.length === 0) {
    ws.getCell(row, 1).value = "No employees assigned to this location.";
  }

  // Keep Emp ID + Name and the header visible while scrolling the day grid.
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow }];

  const buffer = await wb.xlsx.writeBuffer();
  const safeLoc = location.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "location";
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance-${safeLoc}-${month}.xlsx"`,
    },
  });
}
