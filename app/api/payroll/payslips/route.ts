// app/api/payroll/payslips/route.ts
// Generate a payslip (immutable monthly snapshot) and list payslips.
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { computePayroll, sanitizeComponents, type PayslipLine, type SalaryComponent } from "@/app/lib/payroll";

// Count duty days from attendance for a month: Present = 1, Half Day = 0.5.
async function dutyFromAttendance(employeeId: string, month: string) {
  const attendance = await getCollection("attendance");
  const [present, half] = await Promise.all([
    attendance.countDocuments({ employeeId, date: { $regex: `^${month}` }, status: "Present" }),
    attendance.countDocuments({ employeeId, date: { $regex: `^${month}` }, status: "Half Day" }),
  ]);
  return present + half * 0.5;
}

// GET /api/payroll/payslips?employeeId=..&month=YYYY-MM
export async function GET(request: NextRequest) {
  const perm = await requirePermission("payroll:read");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const params = new URL(request.url).searchParams;
  const employeeId = params.get("employeeId");
  const month = params.get("month");
  const query: Record<string, unknown> = {};
  if (employeeId) query.employeeId = employeeId;
  if (month) query.month = month;

  const payslips = await getCollection("payslips");
  const data = await payslips.find(query).sort({ month: -1, generatedAt: -1 }).limit(200).toArray();
  return NextResponse.json({ success: true, data: data.map((d) => ({ ...d, _id: String(d._id) })) });
}

// POST /api/payroll/payslips  { employeeId, month, overrides?, force? }
export async function POST(request: NextRequest) {
  const perm = await requirePermission("payroll:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const body = await request.json().catch(() => ({}));
  const employeeId = String(body?.employeeId || "");
  const month = String(body?.month || "");
  const force = body?.force === true;
  const manualOverrides: Record<string, number> = {};
  if (body?.overrides && typeof body.overrides === "object") {
    for (const [k, v] of Object.entries(body.overrides)) {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      if (Number.isFinite(n)) manualOverrides[k] = n;
    }
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ success: false, error: "month must be YYYY-MM" }, { status: 400 });
  }

  const employees = await getCollection("employees");
  const employee = await employees.findOne(
    { employeeId },
    { projection: { _id: 0, employeeId: 1, fullName: 1, workLocation: 1, designation: 1 } }
  );
  if (!employee) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });

  const structures = await getCollection("salaryStructures");
  const structure = await structures.findOne({ employeeId });
  if (!structure) {
    return NextResponse.json(
      { success: false, error: "Configure a salary structure for this employee first" },
      { status: 400 }
    );
  }
  const components = sanitizeComponents(structure.components) as SalaryComponent[];

  const preview = body?.preview === true;
  const refId = `PS-${month}-${employeeId}`;
  const payslips = await getCollection("payslips");

  // Only "fixed" components may be overridden — derived ones (perDay, percentOf,
  // totals) must always recompute, so a stray edit can't corrupt the formula.
  const overridable = new Set(components.filter((c) => c.calc === "fixed").map((c) => c.key));

  // Auto-fill duty (and any other attendance-linked info) then apply manual overrides.
  const dutyDays = await dutyFromAttendance(employeeId, month);
  const overrides: Record<string, number> = {};
  for (const c of components) {
    if (c.autoFromAttendance === "duty") overrides[c.key] = dutyDays;
    if (c.autoFromAttendance === "extraDuty") overrides[c.key] = manualOverrides["extraDuty"] ?? 0;
  }
  for (const [k, v] of Object.entries(manualOverrides)) {
    if (overridable.has(k)) overrides[k] = v; // ignore attempts to override derived lines
  }

  const { values, grossPay, totalDeduction, netPay } = computePayroll(components, overrides);
  const lines: PayslipLine[] = components.map((c) => ({
    key: c.key,
    label: c.label,
    category: c.category,
    calc: c.calc,
    amount: values[c.key] ?? 0,
  }));
  const dutyKey = components.find((c) => c.autoFromAttendance === "duty")?.key;
  const extraDutyKey = components.find((c) => c.autoFromAttendance === "extraDuty")?.key;

  const now = new Date();
  const doc = {
    refId,
    employeeId,
    employeeName: employee.fullName || "",
    workLocation: employee.workLocation || "",
    designation: employee.designation || "",
    month,
    dutyDays: dutyKey ? values[dutyKey] ?? dutyDays : dutyDays,
    extraDutyDays: extraDutyKey ? values[extraDutyKey] ?? 0 : 0,
    lines,
    grossPay,
    totalDeduction,
    netPay,
    generatedAt: now,
    generatedBy: perm.user.email || perm.user.name || "admin",
  };

  // Preview: compute and return without persisting (the "Generate" button).
  if (preview) {
    return NextResponse.json({ success: true, payslip: doc, preview: true });
  }

  // Save: block overwriting an existing month unless force (the "Save" button).
  const existing = await payslips.findOne({ refId });
  if (existing && !force) {
    return NextResponse.json(
      { success: false, error: "A payslip for this month already exists.", exists: true },
      { status: 409 }
    );
  }
  await payslips.replaceOne({ refId }, doc, { upsert: true });
  return NextResponse.json({ success: true, message: "Payslip saved", payslip: doc });
}
