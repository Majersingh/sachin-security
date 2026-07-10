// app/api/settings/company/route.ts
// Read/update the company settings singleton.
import { NextResponse } from "next/server";
import { getCollection } from "@/app/lib/db";
import { requirePermission } from "@/app/lib/apiAuth";
import { COMPANY_SETTINGS_KEYS, DEFAULT_COMPANY_SETTINGS } from "@/app/lib/settings";
import { getCompanySettings } from "@/app/lib/settingsServer";

export async function GET() {
  const perm = await requirePermission("org:read");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  const settings = await getCompanySettings();
  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(request: Request) {
  const perm = await requirePermission("org:manage");
  if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, any> = {};

  for (const key of COMPANY_SETTINGS_KEYS) {
    if (!(key in body)) continue;
    if (key === "workingDays") {
      const arr = Array.isArray(body.workingDays)
        ? body.workingDays.map((n: any) => Number(n)).filter((n: number) => n >= 0 && n <= 6)
        : DEFAULT_COMPANY_SETTINGS.workingDays;
      update.workingDays = Array.from(new Set(arr));
    } else {
      update[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
  }
  update.updatedAt = new Date();

  const coll = await getCollection("settings");
  await coll.updateOne({ key: "company" }, { $set: { key: "company", ...update } }, { upsert: true });

  const settings = await getCompanySettings();
  return NextResponse.json({ success: true, message: "Settings saved", data: settings });
}
