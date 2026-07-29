// app/api/leave/balance/route.ts
// Leave balances per type for a year. Self by default; approvers/HR may pass ?employeeId.
import { NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/apiAuth";
import { hasPermission } from "@/app/lib/rbac";
import { currentYear } from "@/app/lib/leave";
import { computeBalances } from "@/app/lib/leaveServer";

export async function GET(request: Request) {
  const perm = await requirePermission("leave:read:self");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  const user = perm.user;

  const params = new URL(request.url).searchParams;
  const year = Number(params.get("year")) || currentYear();
  const requested = params.get("employeeId");

  // Only privileged roles can view others' balances.
  const canViewOthers = hasPermission(user.role, "leave:read:all");
  const employeeId = requested && canViewOthers ? requested : user.employeeId;

  if (!employeeId) {
    return NextResponse.json({ success: true, year, employeeId: null, balances: [] });
  }

  const balances = await computeBalances(employeeId, year);
  return NextResponse.json({ success: true, year, employeeId, balances });
}
