// app/api/employees/export/route.ts
// Export the employee directory as .xlsx, honouring the same search + filters as
// the search-employee page (so "export" matches exactly what the filter shows).
// Not paginated — returns every matching row (capped for safety).
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { EMPLOYEE_FIELDS } from "@/app/lib/employeeFields";

const MAX_ROWS = 20000;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const perm = await requirePermission("employees:read");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const p = new URL(request.url).searchParams;
  const search = (p.get("search") || "").trim();
  const searchBy = p.get("searchBy") || "name";

  // Same query shape as GET /api/employees.
  const query: any = {};
  if (search) {
    if (searchBy === "employeeId") {
      query.employeeId = { $regex: `^${escapeRegex(search)}$`, $options: "i" };
    } else {
      query.fullName = { $regex: search, $options: "i" };
    }
  }
  const eq = (key: string, val: string | null) => { if (val) query[key] = val; };
  eq("workLocation", p.get("workLocation"));
  eq("state", p.get("state"));
  eq("gender", p.get("gender"));
  eq("department", p.get("department"));
  eq("designation", p.get("designation"));

  const employees = await getCollection("employees");
  const rows = await employees
    .find(query, { projection: { _id: 0 } })
    .sort({ fullName: 1 })
    .limit(MAX_ROWS)
    .toArray();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Employees");

  // Every field defined in the model (registry order), with Employee ID first.
  const empIdField = EMPLOYEE_FIELDS.find((f) => f.key === "employeeId");
  const cols = [
    ...(empIdField ? [empIdField] : []),
    ...EMPLOYEE_FIELDS.filter((f) => f.key !== "employeeId"),
  ];

  ws.columns = cols.map((c) => ({
    key: c.key,
    width: Math.min(34, Math.max(12, c.label.length + 4)),
  }));

  // Header row (bold on dark fill).
  const header = ws.addRow(cols.map((c) => c.label));
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF404040" } };
    cell.alignment = { vertical: "middle" };
  });
  ws.views = [{ state: "frozen", ySplit: 1 }]; // keep header visible when scrolling

  for (const r of rows) {
    ws.addRow(cols.map((c) => {
      const v = (r as any)[c.key];
      return v == null ? "" : v;
    }));
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="employees-${stamp}.xlsx"`,
    },
  });
}
