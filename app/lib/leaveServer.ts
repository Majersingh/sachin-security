// app/lib/leaveServer.ts
// Server-side leave helpers (DB access). Node runtime only.
import { getCollection } from "@/app/lib/db";

export interface BalanceRow {
  name: string;
  code?: string;
  paid: boolean;
  allocated: number;
  used: number;
  remaining: number;
}

// Balances per leave type for an employee in a year: allocated (quota),
// used (sum of APPROVED request days), remaining.
export async function computeBalances(employeeId: string, year: number): Promise<BalanceRow[]> {
  const typesColl = await getCollection("leaveTypes");
  const reqColl = await getCollection("leaveRequests");

  const [types, approved] = await Promise.all([
    typesColl.find({ active: { $ne: false } }).sort({ name: 1 }).toArray(),
    reqColl.find({ employeeId, status: "Approved", fromDate: { $regex: `^${year}` } }).toArray(),
  ]);

  const usedByType: Record<string, number> = {};
  approved.forEach((r: any) => {
    usedByType[r.type] = (usedByType[r.type] || 0) + (r.days || 0);
  });

  return types.map((t: any) => {
    const allocated = Number(t.annualQuota) || 0;
    const used = usedByType[t.name] || 0;
    return {
      name: t.name,
      code: t.code,
      paid: t.paid !== false,
      allocated,
      used,
      remaining: Math.max(0, allocated - used),
    };
  });
}

// Holiday date strings (YYYY-MM-DD) within an inclusive range.
export async function getHolidaysInRange(from: string, to: string): Promise<string[]> {
  const coll = await getCollection("holidays");
  const rows = await coll.find({ date: { $gte: from, $lte: to }, active: { $ne: false } }).toArray();
  return rows.map((r: any) => r.date);
}
