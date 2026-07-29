// app/lib/employeeFields.ts
// Single source of truth for employee fields: what fields exist, how they are
// grouped, and which are mandatory. Add-employee, edit-employee and the
// /api/employees route all derive their field list + required validation from
// here, so changing a field or its `required` flag is a one-line edit.
//
// (Format rules like Aadhaar/PIN patterns stay in the form; this file owns the
// field catalogue and the "is it mandatory" question.)

export type FieldType = "text" | "email" | "tel" | "date" | "number" | "select" | "textarea";

export interface EmployeeField {
  key: string;
  label: string;
  section: string;
  type: FieldType;
  required: boolean;
  /** Value written when the form leaves this blank (persistence only). */
  default?: string;
  /** Server-managed field — not collected from the add-employee form body. */
  system?: boolean;
}

export const EMPLOYEE_FIELDS: EmployeeField[] = [
  // Personal Information
  { key: "fullName", label: "Full Name", section: "Personal Information", type: "text", required: true },
  { key: "fatherName", label: "Father's Name", section: "Personal Information", type: "text", required: true },
  { key: "motherName", label: "Mother's Name", section: "Personal Information", type: "text", required: true },
  { key: "dateOfBirth", label: "Date of Birth", section: "Personal Information", type: "date", required: true },
  { key: "gender", label: "Gender", section: "Personal Information", type: "select", required: true },
  { key: "bloodGroup", label: "Blood Group", section: "Personal Information", type: "select", required: false },
  { key: "maritalStatus", label: "Marital Status", section: "Personal Information", type: "select", required: false },
  { key: "profileUrl", label: "Profile Photo", section: "Personal Information", type: "text", required: true },
  { key: "profileFilename", label: "Profile Filename", section: "Personal Information", type: "text", required: true },

  // Contact Information
  { key: "mobileNumber", label: "Mobile Number", section: "Contact Information", type: "tel", required: true },
  { key: "alternateNumber", label: "Alternate Number", section: "Contact Information", type: "tel", required: false },
  { key: "email", label: "Email", section: "Contact Information", type: "email", required: false },
  { key: "currentAddress", label: "Current Address", section: "Contact Information", type: "textarea", required: false },
  { key: "permanentAddress", label: "Permanent Address", section: "Contact Information", type: "textarea", required: true },
  { key: "city", label: "City", section: "Contact Information", type: "text", required: true },
  { key: "state", label: "State", section: "Contact Information", type: "text", required: true },
  { key: "pincode", label: "PIN Code", section: "Contact Information", type: "text", required: true },

  // Government IDs
  { key: "aadharNumber", label: "Aadhaar Number", section: "Government IDs", type: "text", required: true },
  { key: "panNumber", label: "PAN Number", section: "Government IDs", type: "text", required: false },

  // Employment Details
  { key: "designation", label: "Designation", section: "Employment Details", type: "select", required: false },
  { key: "department", label: "Department", section: "Employment Details", type: "select", required: false },
  { key: "joiningDate", label: "Joining Date", section: "Employment Details", type: "date", required: true },
  { key: "employmentType", label: "Employment Type", section: "Employment Details", type: "select", required: false, default: "Full-time" },
  { key: "reportingManager", label: "Reporting Manager", section: "Employment Details", type: "text", required: false },
  { key: "workLocation", label: "Work Location", section: "Employment Details", type: "select", required: true },

  // Salary & Benefits
  { key: "basicSalary", label: "Basic Salary", section: "Salary & Benefits", type: "number", required: false },
  { key: "hra", label: "HRA", section: "Salary & Benefits", type: "number", required: false },
  { key: "otherAllowances", label: "Other Allowances", section: "Salary & Benefits", type: "number", required: false },
  { key: "pfNumber", label: "PF Number", section: "Salary & Benefits", type: "text", required: false },
  { key: "esiNumber", label: "ESI Number", section: "Salary & Benefits", type: "text", required: false },
  { key: "uanNumber", label: "UAN Number", section: "Salary & Benefits", type: "text", required: true },

  // Bank Details
  { key: "bankName", label: "Bank Name", section: "Bank Details", type: "text", required: true },
  { key: "accountNumber", label: "Account Number", section: "Bank Details", type: "text", required: true },
  { key: "ifscCode", label: "IFSC Code", section: "Bank Details", type: "text", required: true },
  { key: "branchName", label: "Branch Name", section: "Bank Details", type: "text", required: false },

  // Emergency Contact
  { key: "emergencyContactName", label: "Emergency Contact Name", section: "Emergency Contact", type: "text", required: false },
  { key: "emergencyContactNumber", label: "Emergency Contact Number", section: "Emergency Contact", type: "tel", required: false },
  { key: "emergencyContactRelation", label: "Emergency Contact Relation", section: "Emergency Contact", type: "text", required: false },

  // Server-managed (never collected from the form body)
  { key: "employeeId", label: "Employee ID", section: "System", type: "text", required: false, system: true },
  { key: "status", label: "Status", section: "System", type: "text", required: false, system: true, default: "Active" },
];

/** Fields the admin fills in on the form (excludes server-managed fields). */
export const EMPLOYEE_FORM_FIELDS = EMPLOYEE_FIELDS.filter((f) => !f.system);

/** Keys of every mandatory field. */
export const REQUIRED_EMPLOYEE_FIELDS = EMPLOYEE_FORM_FIELDS.filter((f) => f.required);

/** True when the given field key is mandatory per the registry. */
export const isFieldRequired = (key: string): boolean =>
  REQUIRED_EMPLOYEE_FIELDS.some((f) => f.key === key);

/** True when a value is absent/blank (matches the old `!value` / `.trim()` checks). */
export const isBlank = (v: unknown): boolean => v == null || String(v).trim() === "";

/**
 * Returns the mandatory fields missing from `data`, in form order.
 * Shared by the client form and the API so both agree on what's required.
 */
export function getMissingRequired(data: Record<string, unknown>): EmployeeField[] {
  return REQUIRED_EMPLOYEE_FIELDS.filter((f) => isBlank(data[f.key]));
}

/**
 * Builds the persisted value map for the form fields from a request body,
 * applying each field's default when blank. Server-managed fields are excluded
 * and must be set explicitly by the caller.
 */
export function buildEmployeeFieldValues(body: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of EMPLOYEE_FORM_FIELDS) {
    const v = body[f.key];
    out[f.key] = v == null || v === "" ? f.default ?? "" : v;
  }
  return out;
}
