// app/lib/payroll.ts
// Pure payroll domain: the dynamic salary-component model, the auto-calculation
// engine, the default template, and formatting helpers. No server-only imports so
// both API routes and client UI can share it.

export type ComponentCategory = "info" | "earning" | "deduction" | "total";

// How a component's value is derived:
//  fixed          -> a flat amount the admin types
//  perDay         -> value(rateKey) * value(daysKey)   (e.g. Rate/Day × Duty)
//  percentOf      -> value(baseKey) * percent / 100     (e.g. HRA = 40% of Basic)
//  sumEarnings    -> Σ of all "earning" components      (Gross Pay)
//  sumDeductions  -> Σ of all "deduction" components    (Total Deduction)
//  net            -> Gross Pay − Total Deduction        (Net Pay)
export type CalcType =
  | "fixed"
  | "perDay"
  | "percentOf"
  | "sumEarnings"
  | "sumDeductions"
  | "net";

export interface SalaryComponent {
  key: string; // stable slug, unique within a structure
  label: string;
  category: ComponentCategory;
  calc: CalcType;
  amount?: number; // for calc "fixed"
  rateKey?: string; // for calc "perDay": per-day rate component
  daysKey?: string; // for calc "perDay": day-count component
  percent?: number; // for calc "percentOf"
  baseKey?: string; // for calc "percentOf": component to take % of
  autoFromAttendance?: "duty" | "extraDuty"; // pre-fill this info value from attendance
}

export interface SalaryStructure {
  refId: string; // internal reference, e.g. "SS-000042"
  employeeId: string;
  components: SalaryComponent[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// A payslip freezes the computed numbers for one month so history never changes.
export interface PayslipLine {
  key: string;
  label: string;
  category: ComponentCategory;
  calc: CalcType; // so the UI knows which lines are editable (only "fixed")
  amount: number;
}

export interface Payslip {
  refId: string; // e.g. "PS-2026-07-000042"
  employeeId: string;
  employeeName: string;
  workLocation: string;
  designation: string;
  month: string; // "YYYY-MM"
  dutyDays: number;
  extraDutyDays: number;
  lines: PayslipLine[];
  grossPay: number;
  totalDeduction: number;
  netPay: number;
  generatedAt: Date;
  generatedBy: string;
}

// ---- Default template ---------------------------------------------------------
// Pre-seeded so admins tweak rather than build from scratch. All rows are editable,
// removable and reorderable in the UI. Percentages/amounts here are sensible
// starting points, NOT legal advice — confirm statutory rates for your org.
export const DEFAULT_PAYROLL_TEMPLATE: SalaryComponent[] = [
  // Base inputs (not summed into gross; feed the formulas below)
  { key: "rate", label: "Rate", category: "info", calc: "fixed", amount: 0 },
  { key: "ratePerDay", label: "Rate Per Day", category: "info", calc: "fixed", amount: 0 },
  { key: "duty", label: "Duty (days)", category: "info", calc: "fixed", amount: 0, autoFromAttendance: "duty" },
  { key: "extraDuty", label: "Extra Duty (days)", category: "info", calc: "fixed", amount: 0, autoFromAttendance: "extraDuty" },

  // Earnings -> Gross Pay
  { key: "basic", label: "Basic Salary", category: "earning", calc: "perDay", rateKey: "ratePerDay", daysKey: "duty" },
  { key: "extraWages", label: "Extra Wages", category: "earning", calc: "perDay", rateKey: "ratePerDay", daysKey: "extraDuty" },
  { key: "hra", label: "HRA", category: "earning", calc: "fixed", amount: 0 },
  { key: "transport", label: "Transportation Allowance", category: "earning", calc: "fixed", amount: 0 },
  { key: "bonus", label: "Bonus", category: "earning", calc: "fixed", amount: 0 },
  { key: "grossPay", label: "Gross Pay", category: "total", calc: "sumEarnings" },

  // Deductions -> Total Deduction
  { key: "leaveDeduction", label: "Leave Deduction", category: "deduction", calc: "fixed", amount: 0 },
  { key: "pf", label: "Provident Fund (PF)", category: "deduction", calc: "percentOf", baseKey: "basic", percent: 12 },
  { key: "esic", label: "ESIC", category: "deduction", calc: "fixed", amount: 0 },
  { key: "ptax", label: "Professional Tax (P. Tax)", category: "deduction", calc: "fixed", amount: 0 },
  { key: "lwf", label: "Labour Welfare Fund (LWF)", category: "deduction", calc: "fixed", amount: 0 },
  { key: "canteen", label: "Canteen Deduction", category: "deduction", calc: "fixed", amount: 0 },
  { key: "advance", label: "Advance", category: "deduction", calc: "fixed", amount: 0 },
  { key: "uniform", label: "Uniform Deduction", category: "deduction", calc: "fixed", amount: 0 },
  { key: "police", label: "Police Verification / Medical Deduction", category: "deduction", calc: "fixed", amount: 0 },
  { key: "roomRent", label: "Room Rent", category: "deduction", calc: "fixed", amount: 0 },
  { key: "otherDeduction", label: "Other Deduction", category: "deduction", calc: "fixed", amount: 0 },
  { key: "recovery", label: "Recovery Amount", category: "deduction", calc: "fixed", amount: 0 },
  { key: "totalDeduction", label: "Total Deduction", category: "total", calc: "sumDeductions" },

  // Net
  { key: "netPay", label: "Net Pay", category: "total", calc: "net" },
];

export interface ComputeResult {
  values: Record<string, number>; // resolved amount per component key
  grossPay: number;
  totalDeduction: number;
  netPay: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Resolve every component to a number given optional overrides (e.g. attendance-fed
// duty days, or an admin's manual edit for a specific month). Resolution runs in
// dependency passes: fixed -> perDay -> percentOf -> category totals -> net.
export function computePayroll(
  components: SalaryComponent[],
  overrides: Record<string, number> = {}
): ComputeResult {
  const values: Record<string, number> = {};
  const val = (key?: string) => (key && Number.isFinite(values[key]) ? values[key] : 0);

  // Pass 1: fixed / info amounts (overrides win).
  for (const c of components) {
    if (c.calc === "fixed") {
      values[c.key] = key(overrides, c.key) ?? num(c.amount);
    }
  }
  // Pass 2: per-day (rate × days).
  for (const c of components) {
    if (c.calc === "perDay") {
      values[c.key] = key(overrides, c.key) ?? round2(val(c.rateKey) * val(c.daysKey));
    }
  }
  // Pass 3: percentage of another component.
  for (const c of components) {
    if (c.calc === "percentOf") {
      values[c.key] = key(overrides, c.key) ?? round2((val(c.baseKey) * num(c.percent)) / 100);
    }
  }
  // Pass 4: category sums.
  const sum = (cat: ComponentCategory) =>
    round2(components.filter((c) => c.category === cat).reduce((t, c) => t + val(c.key), 0));
  const grossPay = sum("earning");
  const totalDeduction = sum("deduction");
  const netPay = round2(grossPay - totalDeduction);

  for (const c of components) {
    if (c.calc === "sumEarnings") values[c.key] = grossPay;
    else if (c.calc === "sumDeductions") values[c.key] = totalDeduction;
    else if (c.calc === "net") values[c.key] = netPay;
  }

  return { values, grossPay, totalDeduction, netPay };
}

// Read an override value for a key (returns undefined if not overridden).
function key(overrides: Record<string, number>, k: string): number | undefined {
  return Number.isFinite(overrides[k]) ? overrides[k] : undefined;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

// Validate/normalize a components array coming from the client.
export function sanitizeComponents(input: unknown): SalaryComponent[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: SalaryComponent[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const label = String(r.label ?? "").trim();
    if (!label) continue;
    const base = slug(label);
    let k = base || `c${out.length}`;
    let i = 1;
    while (seen.has(k)) k = `${base}${i++}`;
    seen.add(k);
    const category: ComponentCategory = ["info", "earning", "deduction", "total"].includes(r.category as string)
      ? (r.category as ComponentCategory)
      : "earning";
    const calc: CalcType = ["fixed", "perDay", "percentOf", "sumEarnings", "sumDeductions", "net"].includes(
      r.calc as string
    )
      ? (r.calc as CalcType)
      : "fixed";
    out.push({
      key: typeof r.key === "string" && r.key ? r.key : k,
      label,
      category,
      calc,
      amount: num(r.amount),
      rateKey: r.rateKey ? String(r.rateKey) : undefined,
      daysKey: r.daysKey ? String(r.daysKey) : undefined,
      percent: r.percent != null ? num(r.percent) : undefined,
      baseKey: r.baseKey ? String(r.baseKey) : undefined,
      autoFromAttendance:
        r.autoFromAttendance === "duty" || r.autoFromAttendance === "extraDuty"
          ? r.autoFromAttendance
          : undefined,
    });
  }
  return out;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("")
    .slice(0, 30);
}

// ---- Formatting ---------------------------------------------------------------
export function formatINR(n: number): string {
  return "₹" + (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Amount in words (Indian numbering) for the payslip footer.
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero Rupees Only";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (x: number): string =>
    x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`;
  const threeDigits = (x: number): string =>
    `${x >= 100 ? ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " : "") : ""}${x % 100 ? twoDigits(x % 100) : ""}`;

  let words = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) words += threeDigits(crore) + " Crore ";
  if (lakh) words += threeDigits(lakh) + " Lakh ";
  if (thousand) words += threeDigits(thousand) + " Thousand ";
  if (rest) words += threeDigits(rest);
  return words.trim() + " Rupees Only";
}
