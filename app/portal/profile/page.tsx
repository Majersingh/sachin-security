"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const EDITABLE = [
  { key: "mobileNumber", label: "Mobile Number" },
  { key: "alternateNumber", label: "Alternate Number" },
  { key: "email", label: "Email" },
  { key: "currentAddress", label: "Current Address" },
  { key: "emergencyContactName", label: "Emergency Contact Name" },
  { key: "emergencyContactNumber", label: "Emergency Contact Number" },
  { key: "emergencyContactRelation", label: "Emergency Contact Relation" },
];

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noEmployee, setNoEmployee] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/profile");
      const data = await res.json();
      if (data.success) {
        if (data.noEmployee) setNoEmployee(true);
        setProfile(data.data);
        if (data.data) {
          const f: Record<string, string> = {};
          EDITABLE.forEach((e) => (f[e.key] = data.data[e.key] || ""));
          setForm(f);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("Profile updated");
        await load();
      } else {
        setError(data.error || "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="text-black">
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
        ) : noEmployee || !profile ? (
          <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
            <p className="text-gray-600">No employee profile is linked to this account.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
              <h1 className="text-xl font-bold text-gray-900">{profile.fullName}</h1>
              <p className="text-gray-500 text-sm">{profile.designation || "—"} · {profile.employeeId}</p>

              <div className="mt-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Employment</h2>
                <Row label="Department" value={profile.department} />
                <Row label="Designation" value={profile.designation} />
                <Row label="Work Location" value={profile.workLocation} />
                <Row label="Joining Date" value={profile.joiningDate} />
                <Row label="Reporting Manager" value={profile.reportingManager} />
              </div>

              <div className="mt-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Personal (read-only)</h2>
                <Row label="Date of Birth" value={profile.dateOfBirth} />
                <Row label="Gender" value={profile.gender} />
                <Row label="Blood Group" value={profile.bloodGroup} />
              </div>
            </div>

            {/* Editable contact + emergency */}
            <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">My Contact Details</h2>
              <p className="text-gray-500 text-xs mb-4">You can update these yourself. For other changes contact HR.</p>
              <form onSubmit={save} className="space-y-3">
                {EDITABLE.map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                ))}
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {msg && <p className="text-green-700 text-sm">{msg}</p>}
                <button type="submit" disabled={saving} className="bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-400 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
