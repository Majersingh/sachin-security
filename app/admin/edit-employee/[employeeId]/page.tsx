"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { getMissingRequired, isFieldRequired } from "@/app/lib/employeeFields";

type FieldType = "text" | "date" | "number" | "textarea" | "select" | "ref";
interface Field { key: string; label: string; type?: FieldType; options?: string[]; ref?: "departments" | "designations" | "locations"; }

const BLOOD = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const SECTIONS: { title: string; fields: Field[] }[] = [
  { title: "Personal Information", fields: [
    { key: "fullName", label: "Full Name" },
    { key: "fatherName", label: "Father's Name" },
    { key: "motherName", label: "Mother's Name" },
    { key: "dateOfBirth", label: "Date of Birth", type: "date" },
    { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
    { key: "bloodGroup", label: "Blood Group", type: "select", options: BLOOD },
    { key: "maritalStatus", label: "Marital Status", type: "select", options: ["Single", "Married"] },
  ]},
  { title: "Contact Information", fields: [
    { key: "mobileNumber", label: "Mobile Number" },
    { key: "alternateNumber", label: "Alternate Number" },
    { key: "email", label: "Email" },
    { key: "currentAddress", label: "Current Address", type: "textarea" },
    { key: "permanentAddress", label: "Permanent Address", type: "textarea" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "pincode", label: "Pincode" },
  ]},
  { title: "Government IDs", fields: [
    { key: "aadharNumber", label: "Aadhar Number" },
    { key: "panNumber", label: "PAN Number" },
  ]},
  { title: "Employment Details", fields: [
    { key: "designation", label: "Designation", type: "ref", ref: "designations" },
    { key: "department", label: "Department", type: "ref", ref: "departments" },
    { key: "workLocation", label: "Work Location", type: "ref", ref: "locations" },
    { key: "joiningDate", label: "Joining Date", type: "date" },
    { key: "employmentType", label: "Employment Type", type: "select", options: ["Full-time", "Part-time", "Contract"] },
  ]},
  { title: "Salary & Benefits", fields: [
    { key: "basicSalary", label: "Basic Salary", type: "number" },
    { key: "hra", label: "HRA", type: "number" },
    { key: "otherAllowances", label: "Other Allowances", type: "number" },
    { key: "pfNumber", label: "PF Number" },
    { key: "esiNumber", label: "ESI Number" },
    { key: "uanNumber", label: "UAN Number" },
  ]},
  { title: "Bank Details", fields: [
    { key: "bankName", label: "Bank Name" },
    { key: "accountNumber", label: "Account Number" },
    { key: "ifscCode", label: "IFSC Code" },
    { key: "branchName", label: "Branch Name" },
  ]},
  { title: "Emergency Contact", fields: [
    { key: "emergencyContactName", label: "Contact Name" },
    { key: "emergencyContactNumber", label: "Contact Number" },
    { key: "emergencyContactRelation", label: "Relation" },
  ]},
];

export default function EditEmployeePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Record<string, any>>({});
  const [refs, setRefs] = useState<{ departments: string[]; designations: string[]; locations: string[] }>({ departments: [], designations: [], locations: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emp, dep, des, loc] = await Promise.all([
        fetch(`/api/employees/${employeeId}`).then((r) => r.json()),
        fetch("/api/org/departments?activeOnly=1").then((r) => r.json()),
        fetch("/api/org/designations?activeOnly=1").then((r) => r.json()),
        fetch("/api/org/locations?activeOnly=1").then((r) => r.json()),
      ]);
      if (emp.success) setForm(emp.data);
      else setError(emp.error || "Failed to load employee");
      setRefs({
        departments: dep.success ? dep.data.map((d: any) => d.name) : [],
        designations: des.success ? des.data.map((d: any) => d.title) : [],
        locations: loc.success ? loc.data.map((l: any) => l.name) : [],
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Required fields (driven by the central field registry).
    const missing = getMissingRequired(form);
    if (missing.length > 0) {
      setError(`${missing[0].label} is required`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => router.push("/admin/search-employee"), 1200);
      } else {
        setError(data.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto text-black">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
        <p className="text-gray-600">{form.fullName} · {employeeId}</p>
      </div>

      {saved ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-900">Employee updated</p>
          <p className="text-gray-500 text-sm">Redirecting…</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title} className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{section.title}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.fields.map((f) => {
                  const value = form[f.key] ?? "";
                  const options = f.type === "ref" ? refs[f.ref!] : f.options;
                  return (
                    <div key={f.key} className={f.type === "textarea" ? "md:col-span-2 lg:col-span-3" : ""}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {f.label} {isFieldRequired(f.key) && <span className="text-red-500">*</span>}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea required={isFieldRequired(f.key)} rows={2} value={value} onChange={(e) => set(f.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                      ) : f.type === "select" || f.type === "ref" ? (
                        <select required={isFieldRequired(f.key)} value={value} onChange={(e) => set(f.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option value="">Select</option>
                          {/* keep an out-of-list existing value selectable */}
                          {value && !(options || []).includes(value) && <option value={value}>{value}</option>}
                          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input required={isFieldRequired(f.key)} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={value} onChange={(e) => set(f.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Employment status — kept separate from the data fields since it's an
              HR action (e.g. marking that employment has ended), not entered data. */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Employment Status</h2>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status ?? "Active"}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive (Employment Ended)</option>
              </select>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-4">
            <button type="button" onClick={() => router.back()} className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 font-semibold" disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-300 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-5 h-5 animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
