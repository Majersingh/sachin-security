// app/lib/leave.ts
// Shared leave helpers/types. Pure (no server-only imports).

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveType {
  _id?: string;
  name: string;
  code?: string;
  annualQuota: number;
  paid: boolean;
  active?: boolean;
}

export interface LeaveRequest {
  _id?: string;
  employeeId: string;
  employeeName?: string;
  type: string; // leave type name
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  days: number;
  reason?: string;
  status: LeaveStatus;
  appliedAt?: string | Date;
  decidedBy?: string;
  decidedAt?: string | Date;
  decisionNote?: string;
}

// Inclusive list of YYYY-MM-DD dates from `from` to `to`.
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Count leave days between two dates, counting only working days (configurable
// weekday numbers, default Mon–Sat) and excluding provided holidays.
export function countLeaveDays(
  from: string,
  to: string,
  holidays: Iterable<string> = [],
  workingDays: number[] = [1, 2, 3, 4, 5, 6]
): number {
  const holidaySet = holidays instanceof Set ? holidays : new Set(holidays);
  const workingSet = new Set(workingDays);
  let count = 0;
  for (const date of eachDate(from, to)) {
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday
    if (!workingSet.has(dow)) continue;
    if (holidaySet.has(date)) continue;
    count++;
  }
  return count;
}

export function currentYear(): number {
  return new Date().getFullYear();
}
