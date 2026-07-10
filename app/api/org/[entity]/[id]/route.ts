// app/api/org/[entity]/[id]/route.ts
// Update + soft-delete (deactivate) for a single Organization Structure record.
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/app/lib/db";
import { getOrgConfig } from "@/app/lib/org";
import { requirePermission } from "@/app/lib/apiAuth";

function parseId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// PATCH /api/org/:entity/:id  — update configured fields and/or `active`.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await context.params;
  const config = getOrgConfig(entity);
  if (!config) return NextResponse.json({ success: false, error: "Unknown entity" }, { status: 404 });

  const perm = await requirePermission("org:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const _id = parseId(id);
  if (!_id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const update: Record<string, any> = {};

  for (const field of config.fields) {
    if (field.key in body) {
      const value = typeof body[field.key] === "string" ? body[field.key].trim() : body[field.key];
      if (field.required && !value) {
        return NextResponse.json({ success: false, error: `${field.label} is required` }, { status: 400 });
      }
      update[field.key] = value ?? "";
    }
  }
  if (typeof body.active === "boolean") update.active = body.active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
  }
  update.updatedAt = new Date();

  const collection = await getCollection(config.collection);
  const result = await collection.updateOne({ _id }, { $set: update });
  if (result.matchedCount === 0) {
    return NextResponse.json({ success: false, error: `${config.label} not found` }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: `${config.label} updated` });
}

// DELETE /api/org/:entity/:id — soft delete (deactivate). Pass ?hard=1 to remove permanently.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await context.params;
  const config = getOrgConfig(entity);
  if (!config) return NextResponse.json({ success: false, error: "Unknown entity" }, { status: 404 });

  const perm = await requirePermission("org:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const _id = parseId(id);
  if (!_id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const hard = new URL(request.url).searchParams.get("hard");
  const collection = await getCollection(config.collection);

  if (hard === "1" || hard === "true") {
    const result = await collection.deleteOne({ _id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: `${config.label} not found` }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `${config.label} deleted` });
  }

  const result = await collection.updateOne({ _id }, { $set: { active: false, updatedAt: new Date() } });
  if (result.matchedCount === 0) {
    return NextResponse.json({ success: false, error: `${config.label} not found` }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: `${config.label} deactivated` });
}
