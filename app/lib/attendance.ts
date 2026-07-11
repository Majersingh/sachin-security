// app/lib/attendance.ts
// Shared attendance helpers/types. Pure (no server-only imports) so client + server can use it.

export const ATTENDANCE_TZ = "Asia/Kolkata";
export const HALF_DAY_MINUTES = 240; // < 4 worked hours => Half Day

// --- Geofence tuning ---
// Default allowed distance from the assigned site, in metres. Chosen so ordinary
// phone GPS jitter (typically 10–30 m, worse near buildings) does not lock out a
// guard who is genuinely on site. Overridable per-site via `geofenceRadiusM`.
export const DEFAULT_GEOFENCE_RADIUS_M = 100;
// A reported accuracy worse than this means the fix came from Wi-Fi/IP, not GPS —
// too coarse to trust, so we reject and ask the user to retry under open sky.
export const MAX_ACCEPTABLE_ACCURACY_M = 200;
// We extend the radius by the reported accuracy (benefit of the doubt for GPS
// error) but cap that extension so a large accuracy can't wave someone in.
export const ACCURACY_ALLOWANCE_CAP_M = 50;

export type AttendanceStatus = "Present" | "Half Day" | "Absent";

export interface GeoPunch {
  at: string | Date;
  lat: number;
  lng: number;
  accuracy?: number;
  distanceM?: number | null; // metres from the assigned site at punch time (null = not enforced)
  siteName?: string; // the site the punch was checked against
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

// Parse a "lat, lng" string as pasted from Google Maps (e.g. "21.1702, 72.8311").
// Returns null if it isn't a valid coordinate pair.
export function parseLatLng(input: string): { lat: number; lng: number } | null {
  if (typeof input !== "string") return null;
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return isValidGeo(lat, lng) ? { lat, lng } : null;
}

// Great-circle (Haversine) distance between two points, in metres.
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface SiteGeo {
  lat?: unknown;
  lng?: unknown;
  geofenceRadiusM?: unknown;
  geofenceEnabled?: unknown; // false => don't block, only record distance
}

export interface GeofenceResult {
  ok: boolean;
  enforced: boolean; // false when the site has no coordinates configured
  distanceM: number | null; // rounded metres from the site (null when not enforced)
  radiusM: number;
  allowanceM: number;
  reason?: string; // human-readable rejection reason when ok === false
}

// Decide whether a punch at (punchLat, punchLng) is close enough to the assigned
// `site`. If the site has no coordinates we cannot enforce anything, so we allow
// the punch (enforced=false) — this keeps sites without coords working.
export function evaluateGeofence(
  site: SiteGeo | null | undefined,
  punchLat: number,
  punchLng: number,
  accuracy?: number | null
): GeofenceResult {
  const radiusM =
    typeof site?.geofenceRadiusM === "number" && site.geofenceRadiusM > 0
      ? site.geofenceRadiusM
      : DEFAULT_GEOFENCE_RADIUS_M;

  if (!site || !isValidGeo(site.lat, site.lng)) {
    return { ok: true, enforced: false, distanceM: null, radiusM, allowanceM: radiusM };
  }

  const distanceM = Math.round(haversineMeters(site.lat as number, site.lng as number, punchLat, punchLng));
  const acc = typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 0;
  const allowanceM = Math.round(radiusM + Math.min(acc, ACCURACY_ALLOWANCE_CAP_M));

  // Enforcement is off for this site: record the distance but never block.
  if (site.geofenceEnabled === false) {
    return { ok: true, enforced: false, distanceM, radiusM, allowanceM };
  }

  if (acc > MAX_ACCEPTABLE_ACCURACY_M) {
    return {
      ok: false,
      enforced: true,
      distanceM,
      radiusM,
      allowanceM,
      reason: `Location signal is too weak (±${Math.round(acc)} m). Move to open sky and try again.`,
    };
  }

  if (distanceM > allowanceM) {
    return {
      ok: false,
      enforced: true,
      distanceM,
      radiusM,
      allowanceM,
      reason: `You are ${distanceM} m from your site (must be within ${radiusM} m). Move closer and try again.`,
    };
  }

  return { ok: true, enforced: true, distanceM, radiusM, allowanceM };
}

// Format worked minutes as "Xh Ym".
export function formatWorked(minutes?: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}
