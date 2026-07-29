// app/api/teams/[id]/members/route.ts
// Manage team membership. Membership is stored as `memberIds: string[]` (employee
// IDs) on the team document, so employees are never modified. Kept outside
// /api/org/* so it doesn't shadow the generic org-entity routes.
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";

function parseId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// GET — list the team's members (resolved to employee name/designation).
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("org:read");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const teams = await getCollection("teams");
  const team = await teams.findOne({ _id });
  if (!team) return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });

  const memberIds: string[] = Array.isArray(team.memberIds) ? team.memberIds : [];
  let members: any[] = [];
  if (memberIds.length) {
    const employees = await getCollection("employees");
    members = await employees
      .find(
        { employeeId: { $in: memberIds } },
        { projection: { _id: 0, employeeId: 1, fullName: 1, designation: 1, department: 1 } }
      )
      .toArray();
    members.sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
  }

  return NextResponse.json({ success: true, team: { id: String(team._id), name: team.name }, members, count: members.length });
}

// POST { employeeId } — add a member (idempotent via $addToSet).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("org:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const employeeId = String(body.employeeId || "").trim();
  if (!employeeId) return NextResponse.json({ success: false, error: "employeeId is required" }, { status: 400 });

  // Confirm the employee exists before adding.
  const employees = await getCollection("employees");
  const emp = await employees.findOne({ employeeId }, { projection: { _id: 0, employeeId: 1 } });
  if (!emp) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });

  const teams = await getCollection("teams");
  const result = await teams.updateOne(
    { _id },
    { $addToSet: { memberIds: employeeId }, $set: { updatedAt: new Date() } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });

  return NextResponse.json({ success: true, message: "Member added" });
}

// DELETE ?employeeId=ss-1 — remove a member.
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const perm = await requirePermission("org:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const { id } = await context.params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const employeeId = new URL(request.url).searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ success: false, error: "employeeId is required" }, { status: 400 });

  const teams = await getCollection("teams");
  const result = await teams.updateOne(
    { _id },
    { $pull: { memberIds: employeeId }, $set: { updatedAt: new Date() } } as any
  );
  if (result.matchedCount === 0) return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });

  return NextResponse.json({ success: true, message: "Member removed" });
}
