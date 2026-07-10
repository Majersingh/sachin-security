// app/lib/attendance.ts
// Shared attendance helpers/types. Pure (no server-only imports) so client + server can use it.

export const ATTENDANCE_TZ = "Asia/Kolkata";
export const HALF_DAY_MINUTES = 240; // < 4 worked hours => Half Day

export type AttendanceStatus = "Present" | "Half Day" | "Absent";

export interface GeoPunch {
  at: string | Date;
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface AttendanceRecord {
  employeeId: string;
  date: string; // YYYY-MM-DD (IST)
  clockIn?: GeoPunch;
  clockOut?: GeoPunch;
  status: AttendanceStatus;
  workedMinutes?: number;
}

// YYYY-MM-DD in IST regardless of server timezone (en-CA => ISO-like date).
export function istDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ATTENDANCE_TZ }).format(d);
}

// Current YYYY-MM in IST.
export function istMonthString(d: Date = new Date()): string {
  return istDateString(d).slice(0, 7);
}

export function computeStatus(workedMinutes: number): AttendanceStatus {
  return workedMinutes < HALF_DAY_MINUTES ? "Half Day" : "Present";
}

// Validate an incoming GPS coordinate pair.
export function isValidGeo(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// Format worked minutes as "Xh Ym".
export function formatWorked(minutes?: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}
