// app/lib/settingsServer.ts
// Server-side access to the company settings singleton (stored in `settings` with key "company").
import { getCollection } from "@/app/lib/db";
import { DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/app/lib/settings";

export async function getCompanySettings(): Promise<CompanySettings> {
  const coll = await getCollection("settings");
  const doc = await coll.findOne({ key: "company" });
  if (!doc) return { ...DEFAULT_COMPANY_SETTINGS };
  // Merge over defaults so missing fields are always present.
  const { _id, key, updatedAt, ...rest } = doc as any;
  return { ...DEFAULT_COMPANY_SETTINGS, ...rest };
}

// Working-day weekday numbers (falls back to Mon–Sat).
export async function getWorkingDays(): Promise<number[]> {
  const s = await getCompanySettings();
  return Array.isArray(s.workingDays) && s.workingDays.length ? s.workingDays : DEFAULT_COMPANY_SETTINGS.workingDays;
}
