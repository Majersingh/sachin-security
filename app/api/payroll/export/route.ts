// app/api/payroll/export/route.ts
// Export a location-wise payroll register as a single .xlsx workbook — one
// worksheet per work location. Each employee is a row; every salary component from
// their saved salary structure is a separate column (computed exactly like their
// payslip: attendance-driven duty, live location rate, gross/deductions/net).
//   GET ?month=YYYY-MM[&workLocation=<name>]
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { istDateString, istMonthString } from "@/app/lib/attendance";
import { getWorkingDays, getCompanySettings } from "@/app/lib/settingsServer";
import { readRates } from "@/app/lib/org";
import {
  computePayroll, sanitizeComponents, DEFAULT_PAYROLL_TEMPLATE,
  type ComponentCategory, type SalaryComponent,
} from "@/app/lib/payroll";

const HEADER_FILL = "FF404040";
const TOTAL_FILL = "FFF2F2F2";
// Header tint per component category, so earnings/deductions/totals read apart.
const CATEGORY_FILL: Record<ComponentCategory, string> = {
  info: "FFD9D9D9",
  earning: "FFC6EFCE",
  deduction: "FFFFC7CE",
  total: "FFFFEB9C",
};

function solid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

// Working days (configured weekdays) in `month` up to today (whole month if past).
function workingDaysSoFar(month: string, workingDays: number[]): number {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || month > istMonthString()) return 0;
  const today = istDateString();
  const lastDay = month === istMonthString() ? Number(today.slice(8, 10)) : new Date(Date.UTC(y, m, 0)).getUTCDate();
  const set = new Set(workingDays);
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    if (set.has(new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay())) count++;
  }
  return count;
}

// Make a string safe + unique as an Excel sheet name (≤31 chars, no []:*?/\).
function sheetName(raw: string, used: Set<string>): string {
  const base = (raw || "Unassigned").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Sheet";
  let name = base;
  let i = 1;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 25)} ${++i}`;
  used.add(name.toLowerCase());
  return name;
}

export async function GET(request: NextRequest) {
  const perm = await requirePermission("payroll:read");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const params = new URL(request.url).searchParams;
  const month = (params.get("month") || "").trim();
  const filterLocation = (params.get("workLocation") || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ success: false, error: "month (YYYY-MM) is required" }, { status: 400 });
  }

  // Employees (optionally narrowed to one location).
  const employeesColl = await getCollection("employees");
  const empQuery: Record<string, unknown> = {};
  if (filterLocation) empQuery.workLocation = filterLocation;
  const employees = await employeesColl
    .find(empQuery, {
      projection: {
        _id: 0, employeeId: 1, fullName: 1, aadharNumber: 1, uanNumber: 1,
        esiNumber: 1, designation: 1, workLocation: 1,
      },
    })
    .sort({ workLocation: 1, fullName: 1 })
    .toArray();
  const ids = employees.map((e) => e.employeeId).filter(Boolean);

  // Attendance tally for the month, in one query -> duty days per employee.
  const attendance = await getCollection("attendance");
  const attRecords = ids.length
    ? await attendance.find({ employeeId: { $in: ids }, date: { $regex: `^${month}` } }, { projection: { _id: 0, employeeId: 1, status: 1 } }).toArray()
    : [];
  const tally = new Map<string, { present: number; halfDay: number }>();
  for (const r of attRecords) {
    const t = tally.get(r.employeeId) || { present: 0, halfDay: 0 };
    if (r.status === "Present") t.present++;
    else if (r.status === "Half Day") t.halfDay++;
    tally.set(r.employeeId, t);
  }

  // Saved salary structures per employee (fall back to the default template).
  const structuresColl = await getCollection("salaryStructures");
  const structures = ids.length
    ? await structuresColl.find({ employeeId: { $in: ids } }, { projection: { _id: 0, employeeId: 1, components: 1 } }).toArray()
    : [];
  const structureByEmp = new Map(structures.map((s) => [s.employeeId, sanitizeComponents(s.components)]));

  // Location rate cards: locationName(lower) -> designation(lower) -> {rate, ratePerDay}.
  const locationsColl = await getCollection("locations");
  const locationDocs = await locationsColl.find({}, { projection: { _id: 0, name: 1, rates: 1 } }).toArray();
  const rateByLocation = new Map<string, Map<string, { rate: number; ratePerDay: number }>>();
  for (const loc of locationDocs) {
    const byDesig = new Map<string, { rate: number; ratePerDay: number }>();
    for (const r of readRates(loc.rates)) byDesig.set(r.designation.toLowerCase(), { rate: r.rate, ratePerDay: r.ratePerDay });
    rateByLocation.set(String(loc.name || "").toLowerCase(), byDesig);
  }

  const workDays = workingDaysSoFar(month, await getWorkingDays());
  const companyName = (await getCompanySettings()).companyName || "Sachin Security Services";

  // Group employees by work location (preserving the sorted order).
  const groups = new Map<string, typeof employees>();
  for (const e of employees) {
    const key = e.workLocation || "(No Location)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = companyName;
  wb.created = new Date();

  const ID_COLS = ["Employee ID", "Name", "Aadhaar No", "UAN No", "ESI No", "Designation"];
  const ATT_COLS = ["Present", "Half Day", "Absent", "Duty Days"];
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFBFBFBF" } },
    left: { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
    right: { style: "thin", color: { argb: "FFBFBFBF" } },
  };
  const usedNames = new Set<string>();

  if (groups.size === 0) {
    const ws = wb.addWorksheet("No Data");
    ws.getCell(1, 1).value = "No employees found for this selection.";
  }

  for (const [location, emps] of groups) {
    // Compute each employee's payroll and collect the ordered union of components.
    const colOrder: { key: string; label: string; category: ComponentCategory }[] = [];
    const seenCols = new Set<string>();
    const computedRows = emps.map((e) => {
      const t = tally.get(e.employeeId) || { present: 0, halfDay: 0 };
      const duty = t.present + t.halfDay * 0.5;
      const absent = Math.max(0, workDays - t.present - t.halfDay);
      const components: SalaryComponent[] = structureByEmp.get(e.employeeId) || DEFAULT_PAYROLL_TEMPLATE;
      const locRate = rateByLocation.get(String(location).toLowerCase())?.get(String(e.designation || "").toLowerCase());

      const overrides: Record<string, number> = {};
      for (const c of components) {
        if (c.autoFromAttendance === "duty") overrides[c.key] = duty;
        if (c.autoFromAttendance === "extraDuty") overrides[c.key] = 0;
        if (locRate && c.autoFromLocation === "rate") overrides[c.key] = locRate.rate;
        if (locRate && c.autoFromLocation === "ratePerDay") overrides[c.key] = locRate.ratePerDay;
      }
      const { values } = computePayroll(components, overrides);

      for (const c of components) {
        if (!seenCols.has(c.key)) { seenCols.add(c.key); colOrder.push({ key: c.key, label: c.label, category: c.category }); }
      }
      return { e, present: t.present, halfDay: t.halfDay, absent, duty, values };
    });

    const ws = wb.addWorksheet(sheetName(location, usedNames), { views: [{ showGridLines: false, state: "frozen", ySplit: 4, xSplit: 2 }] });
    const totalCols = ID_COLS.length + ATT_COLS.length + colOrder.length;

    // Title block.
    ws.mergeCells(1, 1, 1, totalCols);
    const t1 = ws.getCell(1, 1);
    t1.value = `${companyName} — Payroll Register`;
    t1.font = { bold: true, size: 14 };
    t1.alignment = { horizontal: "center" };
    ws.getRow(1).height = 20;

    ws.mergeCells(2, 1, 2, totalCols);
    const t2 = ws.getCell(2, 1);
    t2.value = `Location: ${location}   ·   Month: ${month}   ·   Working days: ${workDays}   ·   Employees: ${emps.length}`;
    t2.font = { size: 11, color: { argb: "FF7A5C00" }, bold: true };
    t2.alignment = { horizontal: "center" };

    // Header row (row 4).
    const HR = 4;
    const headerRow = ws.getRow(HR);
    let col = 1;
    const setHeader = (text: string, fill: string, dark: boolean) => {
      const cell = headerRow.getCell(col);
      cell.value = text;
      cell.fill = solid(fill);
      cell.font = { bold: true, color: { argb: dark ? "FFFFFFFF" : "FF000000" }, size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = border;
      col++;
    };
    ID_COLS.forEach((h) => setHeader(h, HEADER_FILL, true));
    ATT_COLS.forEach((h) => setHeader(h, HEADER_FILL, true));
    colOrder.forEach((c) => setHeader(c.label, CATEGORY_FILL[c.category], false));
    headerRow.height = 28;

    // Column widths.
    const widths = [14, 24, 18, 16, 16, 20, ...ATT_COLS.map(() => 10), ...colOrder.map(() => 14)];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

    // Data rows.
    const numericTotals = new Array(totalCols).fill(0); // index by 0-based column
    computedRows.forEach((row, idx) => {
      const r = ws.getRow(HR + 1 + idx);
      const cells: (string | number)[] = [
        row.e.employeeId || "", row.e.fullName || "", row.e.aadharNumber || "", row.e.uanNumber || "",
        row.e.esiNumber || "", row.e.designation || "",
        row.present, row.halfDay, row.absent, row.duty,
        ...colOrder.map((c) => Math.round((row.values[c.key] ?? 0) * 100) / 100),
      ];
      cells.forEach((v, i) => {
        const cell = r.getCell(i + 1);
        cell.value = v as ExcelJS.CellValue;
        cell.border = border;
        const numeric = i >= ID_COLS.length;
        cell.alignment = { horizontal: numeric ? "right" : "left", vertical: "middle" };
        if (i >= ID_COLS.length + ATT_COLS.length) cell.numFmt = "#,##0.00";
        if (numeric && typeof v === "number") numericTotals[i] += v;
      });
    });

    // Totals row.
    const totalRow = ws.getRow(HR + 1 + computedRows.length);
    for (let i = 0; i < totalCols; i++) {
      const cell = totalRow.getCell(i + 1);
      cell.fill = solid(TOTAL_FILL);
      cell.font = { bold: true };
      cell.border = border;
      if (i === 0) cell.value = "TOTAL";
      else if (i >= ID_COLS.length) {
        cell.value = Math.round(numericTotals[i] * 100) / 100;
        cell.alignment = { horizontal: "right" };
        if (i >= ID_COLS.length + ATT_COLS.length) cell.numFmt = "#,##0.00";
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const suffix = filterLocation ? `-${filterLocation.replace(/[^a-zA-Z0-9]+/g, "-")}` : "";
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payroll-register-${month}${suffix}.xlsx"`,
    },
  });
}
