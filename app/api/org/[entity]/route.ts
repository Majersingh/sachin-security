// app/api/org/[entity]/route.ts
// List + create for any Organization Structure entity, driven by ORG_CONFIGS.
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { getOrgConfig, readGeo, readNumber, readBoolean, codePrefix } from "@/app/lib/org";
import { requirePermission } from "@/app/lib/apiAuth";
import type { Collection } from "mongodb";

// GET /api/org/:entity[?activeOnly=1]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> }
) {
  const { entity } = await context.params;
  const config = getOrgConfig(entity);
  if (!config) return NextResponse.json({ success: false, error: "Unknown entity" }, { status: 404 });

  const perm = await requirePermission("org:read");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const activeOnly = new URL(request.url).searchParams.get("activeOnly");
  const query: any = {};
  if (activeOnly === "1" || activeOnly === "true") query.active = { $ne: false };

  const collection = await getCollection(config.collection);
  const data = await collection.find(query).sort({ [config.displayField]: 1 }).toArray();

  return NextResponse.json({ success: true, data, count: data.length });
}

// POST /api/org/:entity
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> }
) {
  const { entity } = await context.params;
  const config = getOrgConfig(entity);
  if (!config) return NextResponse.json({ success: false, error: "Unknown entity" }, { status: 404 });

  const perm = await requirePermission("org:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const body = await request.json();

  // Build the document from configured fields only; validate required ones.
  const doc: Record<string, any> = {};
  for (const field of config.fields) {
    if (field.generated) continue; // filled in server-side below
    if (field.type === "geo") {
      // A geo field stores `lat`/`lng` numbers on the doc (not the field key).
      const g = readGeo(body);
      if (field.required && !g) {
        return NextResponse.json({ success: false, error: `${field.label} is required` }, { status: 400 });
      }
      if (g) {
        doc.lat = g.lat;
        doc.lng = g.lng;
      }
      continue;
    }
    if (field.type === "number") {
      const n = readNumber(body[field.key]);
      if (field.required && n === null) {
        return NextResponse.json({ success: false, error: `${field.label} is required` }, { status: 400 });
      }
      if (n !== null) doc[field.key] = n;
      continue;
    }
    if (field.type === "boolean") {
      doc[field.key] = readBoolean(body[field.key], field.default ?? false);
      continue;
    }
    const value = typeof body[field.key] === "string" ? body[field.key].trim() : body[field.key];
    if (field.required && !value) {
      return NextResponse.json({ success: false, error: `${field.label} is required` }, { status: 400 });
    }
    doc[field.key] = value ?? "";
  }

  const collection = await getCollection(config.collection);

  // Prevent duplicate names (case-insensitive) on the display field.
  const dupe = await collection.findOne({
    [config.displayField]: { $regex: `^${escapeRegex(String(doc[config.displayField]))}$`, $options: "i" },
  });
  if (dupe) {
    return NextResponse.json(
      { success: false, error: `${config.label} "${doc[config.displayField]}" already exists` },
      { status: 400 }
    );
  }

  // Auto-generate values for generated fields (e.g. a location's `code`).
  for (const field of config.fields) {
    if (field.generated && field.key === "code") {
      doc.code = await generateUniqueCode(collection, codePrefix(String(doc[config.displayField] || "")));
    }
  }

  doc.active = true;
  doc.createdAt = new Date();
  doc.updatedAt = new Date();

  const result = await collection.insertOne(doc);
  return NextResponse.json(
    { success: true, message: `${config.label} created`, data: { ...doc, _id: result.insertedId } },
    { status: 201 }
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Find the first free `${prefix}NNN` code not already used in the collection.
async function generateUniqueCode(collection: Collection, prefix: string): Promise<string> {
  for (let i = 1; i < 10000; i++) {
    const code = `${prefix}${String(i).padStart(3, "0")}`;
    const exists = await collection.findOne({ code });
    if (!exists) return code;
  }
  return `${prefix}${Date.now()}`;
}
