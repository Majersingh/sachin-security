// app/api/payroll/structure/[employeeId]/route.ts
// Read / save an employee's salary structure (the editable, recurring config).
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { DEFAULT_PAYROLL_TEMPLATE, sanitizeComponents } from "@/app/lib/payroll";
import { resolveLocationRate } from "@/app/lib/locationRate";

async function loadEmployee(employeeId: string) {
  const employees = await getCollection("employees");
  return employees.findOne(
    { employeeId },
    { projection: { _id: 0, employeeId: 1, fullName: 1, workLocation: 1, designation: 1 } }
  );
}

// GET — returns the saved structure, or the default template (not yet persisted)
// when the employee has none, plus the employee's display info.
export async function GET(request: NextRequest, context: { params: Promise<{ employeeId: string }> }) {
  const perm = await requirePermission("payroll:read");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { employeeId } = await context.params;
  const employee = await loadEmployee(employeeId);
  if (!employee) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });

  const structures = await getCollection("salaryStructures");
  const existing = await structures.findOne({ employeeId });

  // The location rate card (by designation) is resolved live — Rate / Rate Per Day
  // are never stored on the structure; they always reflect the current location salary.
  const locationRate = await resolveLocationRate(employee);

  return NextResponse.json({
    success: true,
    employee,
    locationRate,
    structure: existing
      ? { ...existing, _id: String(existing._id), components: sanitizeComponents(existing.components) }
      : { employeeId, components: DEFAULT_PAYROLL_TEMPLATE, isDefault: true },
  });
}

// PUT — upsert the structure. Creates a refId on first save.
export async function PUT(request: NextRequest, context: { params: Promise<{ employeeId: string }> }) {
  const perm = await requirePermission("payroll:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { employeeId } = await context.params;
  const employee = await loadEmployee(employeeId);
  if (!employee) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const components = sanitizeComponents(body?.components);
  if (components.length === 0) {
    return NextResponse.json({ success: false, error: "At least one salary component is required" }, { status: 400 });
  }

  const structures = await getCollection("salaryStructures");
  const now = new Date();
  const existing = await structures.findOne({ employeeId });
  const refId = existing?.refId || `SS-${Date.now().toString(36).toUpperCase()}`;

  await structures.updateOne(
    { employeeId },
    {
      $set: { employeeId, components, active: true, updatedAt: now },
      $setOnInsert: { refId, createdAt: now },
    },
    { upsert: true }
  );

  return NextResponse.json({ success: true, message: "Salary structure saved", refId });
}
