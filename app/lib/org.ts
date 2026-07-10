// app/lib/org.ts
// Configuration-driven definition of the Organization Structure entities.
// Pure data + types (no server-only imports) so both API routes and client UI can import it.

export type OrgEntity =
  | "departments"
  | "designations"
  | "teams"
  | "branches"
  | "locations";

export type OrgFieldType = "text" | "textarea" | "select" | "ref";

export interface OrgField {
  key: string;
  label: string;
  type: OrgFieldType;
  required?: boolean;
  options?: string[]; // for type "select"
  refEntity?: OrgEntity; // for type "ref": dropdown sourced from another entity
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
      { key: "code", label: "Code", type: "text" },
      { key: "clientName", label: "Client Name", type: "text" },
      { key: "branch", label: "Managed by Branch", type: "ref", refEntity: "branches" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "city", label: "City", type: "text" },
      { key: "state", label: "State", type: "text" },
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
