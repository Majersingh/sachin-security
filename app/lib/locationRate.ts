// app/lib/locationRate.ts
// Resolve an employee's pay rates from their posting site's rate card, matched on
// designation. Server-only (touches the DB). Kept in one place so the payroll
// structure view and payslip generation always agree on the live rate.
import { getCollection } from "@/app/lib/db";
import { readRates } from "@/app/lib/org";

export interface LocationRate {
  rate: number; // monthly / base rate
  ratePerDay: number; // per-day rate (feeds Basic = ratePerDay × duty)
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns the { rate, ratePerDay } for the employee's location + designation, or
// null when the site has no matching rate-card row.
export async function resolveLocationRate(
  employee: Record<string, unknown>
): Promise<LocationRate | null> {
  const location = String(employee.workLocation || "").trim();
  const designation = String(employee.designation || "").trim();
  if (!location || !designation) return null;

  const locations = await getCollection("locations");
  const site = await locations.findOne(
    { name: { $regex: `^${escapeRegex(location)}$`, $options: "i" } },
    { projection: { rates: 1 } }
  );
  if (!site) return null;

  const match = readRates(site.rates).find(
    (r) => r.designation.toLowerCase() === designation.toLowerCase()
  );
  return match ? { rate: match.rate, ratePerDay: match.ratePerDay } : null;
}
