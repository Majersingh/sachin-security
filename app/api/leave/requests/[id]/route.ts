// app/api/leave/requests/[id]/route.ts
// Approve / reject a leave request.
// - HR/admin (leave:manage) can decide any request.
// - Managers (leave:approve:team) can decide only their direct reports' requests.
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { hasPermission } from "@/app/lib/rbac";
import { computeBalances } from "@/app/lib/leaveServer";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("leave:approve:team");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  const user = perm.user;

  const { id } = await context.params;
  let _id: ObjectId;
  try { _id = new ObjectId(id); } catch { return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 }); }

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== "Approved" && status !== "Rejected") {
    return NextResponse.json({ success: false, error: "status must be Approved or Rejected" }, { status: 400 });
  }

  const coll = await getCollection("leaveRequests");
  const req = await coll.findOne({ _id });
  if (!req) return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
  if (req.status !== "Pending") {
    return NextResponse.json({ success: false, error: `Request already ${req.status.toLowerCase()}` }, { status: 400 });
  }

  // Authorization: HR/admin can decide anything; managers only their reports.
  const canManageAll = hasPermission(user.role, "leave:manage");
  if (!canManageAll) {
    if (req.employeeId === user.employeeId) {
      return NextResponse.json({ success: false, error: "You cannot approve your own leave" }, { status: 403 });
    }
    const employees = await getCollection("employees");
    const emp = await employees.findOne({ employeeId: req.employeeId }, { projection: { reportingManagerId: 1 } });
    if (!emp || emp.reportingManagerId !== user.employeeId) {
      return NextResponse.json({ success: false, error: "Not your team member" }, { status: 403 });
    }
  }

  // Re-check balance at approval time for paid leave (balance may have changed).
  if (status === "Approved") {
    const typesColl = await getCollection("leaveTypes");
    const leaveType = await typesColl.findOne({ name: req.type });
    if (leaveType && leaveType.paid !== false && Number(leaveType.annualQuota) > 0) {
      const balances = await computeBalances(req.employeeId, Number(String(req.fromDate).slice(0, 4)));
      const bal = balances.find((b) => b.name === req.type);
      if (bal && bal.remaining < req.days) {
        return NextResponse.json(
          { success: false, error: `Insufficient ${req.type} balance to approve: ${bal.remaining} left, ${req.days} requested` },
          { status: 400 }
        );
      }
    }
  }

  await coll.updateOne(
    { _id },
    {
      $set: {
        status,
        decidedBy: user.name || user.employeeId || user.id,
        decidedAt: new Date(),
        decisionNote: String(body.note || "").trim(),
        updatedAt: new Date(),
      },
    }
  );
  return NextResponse.json({ success: true, message: `Request ${status.toLowerCase()}` });
}
