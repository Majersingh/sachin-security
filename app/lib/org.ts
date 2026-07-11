// app/lib/org.ts
// Configuration-driven definition of the Organization Structure entities.
// Pure data + types (no server-only imports) so both API routes and client UI can import it.

export type OrgEntity =
  | "departments"
  | "designations"
  | "teams"
  | "branches"
  | "locations";

export type OrgFieldType = "text" | "textarea" | "select" | "ref" | "number" | "geo" | "boolean";

export interface OrgField {
  key: string;
  label: string;
  type: OrgFieldType;
  required?: boolean;
  options?: string[]; // for type "select"
  refEntity?: OrgEntity; // for type "ref": dropdown sourced from another entity
  generated?: boolean; // value is auto-generated server-side; hidden from the form
  default?: boolean; // for type "boolean": value used when the field is absent
  hint?: string; // small helper text shown under the field
}

export interface OrgEntityConfig {
  entity: OrgEntity;
  collection: string;
  label: string; // singular, e.g. "Department"
  labelPlural: string; // e.g. "Departments"
  displayField: string; // primary name field (used in tables + ref labels)
  fields: OrgField[];
}

export const ORG_CONFIGS: Record<OrgEntity, OrgEntityConfig> = {
  departments: {
    entity: "departments",
    collection: "departments",
    label: "Department",
    labelPlural: "Departments",
    displayField: "name",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  designations: {
    entity: "designations",
    collection: "designations",
    label: "Designation",
    labelPlural: "Designations",
    displayField: "title",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "department", label: "Department", type: "ref", refEntity: "departments" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  teams: {
    entity: "teams",
    collection: "teams",
    label: "Team",
    labelPlural: "Teams",
    displayField: "name",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "branch", label: "Branch", type: "ref", refEntity: "branches" },
      { key: "location", label: "Deployment Location", type: "ref", refEntity: "locations" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  // Branch = a company office (e.g. "Vadodara Head Office").
  branches: {
    entity: "branches",
    collection: "branches",
    label: "Branch",
    labelPlural: "Branches",
    displayField: "name",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "city", label: "City", type: "text" },
      { key: "state", label: "State", type: "text" },
      { key: "pincode", label: "Pincode", type: "text" },
    ],
  },
  // Location = a deployment/posting site where staff are stationed (often a client site).
  locations: {
    entity: "locations",
    collection: "locations",
    label: "Location",
    labelPlural: "Locations",
    displayField: "name",
    fields: [
      { key: "name", label: "Site Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text", generated: true },
      { key: "branch", label: "Managed by Branch", type: "ref", refEntity: "branches" },
      { key: "address", label: "Address", type: "textarea" },
      // Geofence: deployed staff can only clock in/out within `geofenceRadiusM`
      // of these coordinates. Stored as plain lat/lng numbers on the doc.
      {
        key: "geofenceEnabled",
        label: "Enforce geofence",
        type: "boolean",
        default: true,
        hint: "On: staff must be within the radius below to clock in/out. Off: they can clock in from anywhere (distance is still recorded).",
      },
      { key: "coordinates", label: "Site GPS Location", type: "geo" },
      { key: "geofenceRadiusM", label: "Allowed Radius (metres)", type: "number" },
    ],
  },
};

export const ORG_ENTITIES = Object.keys(ORG_CONFIGS) as OrgEntity[];

export function isOrgEntity(value: string): value is OrgEntity {
  return (ORG_ENTITIES as string[]).includes(value);
}

export function getOrgConfig(entity: string): OrgEntityConfig | null {
  return isOrgEntity(entity) ? ORG_CONFIGS[entity] : null;
}

// Coerce a value to a finite number, accepting numeric strings; "" => null.
export function readNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

// Coerce a value to boolean, accepting "true"/"false" strings; falls back to `dflt`.
export function readBoolean(value: unknown, dflt = false): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return dflt;
}

// Build a short uppercase code prefix from a name, e.g. "ABC Mall" -> "ABCM".
export function codePrefix(name: string): string {
  const clean = String(name).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
  return clean || "LOC";
}

// Read a { lat, lng } pair from a request body; returns null if absent/invalid.
export function readGeo(body: { lat?: unknown; lng?: unknown }): { lat: number; lng: number } | null {
  const lat = readNumber(body?.lat);
  const lng = readNumber(body?.lng);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
