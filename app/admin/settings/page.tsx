"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, CalendarDays, Building2 } from "lucide-react";
import { WEEKDAYS, DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/app/lib/settings";

const TEXT_FIELDS: { key: keyof CompanySettings; label: string; full?: boolean }[] = [
  { key: "companyName", label: "Company Name", full: true },
  { key: "tagline", label: "Tagline", full: true },
  { key: "address", label: "Address", full: true },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/company");
        const data = await res.json();
        if (data.success) setSettings({ ...DEFAULT_COMPANY_SETTINGS, ...data.data });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleDay = (value: number) => {
    setSettings((s) => ({
      ...s,
      workingDays: s.workingDays.includes(value)
        ? s.workingDays.filter((d) => d !== value)
        : [...s.workingDays, value],
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setError(""); setSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) { setSettings({ ...DEFAULT_COMPANY_SETTINGS, ...data.data }); setMsg("Settings saved"); }
      else setError(data.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto text-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Settings</h1>
        <p className="text-gray-600">Company profile, working days and office timings</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Company Profile */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Company Profile</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {TEXT_FIELDS.map((f) => (
              <div key={f.key} className={f.full ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  value={(settings[f.key] as string) ?? ""}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Working Days */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Working Days</h2>
          <p className="text-gray-500 text-xs mb-4">Used for leave-day and attendance (absent) calculations.</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = settings.workingDays.includes(d.value);
              return (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => toggleDay(d.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${on ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Office Timings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Office Timings</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" value={settings.officeStartTime} onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="time" value={settings.officeEndTime} onChange={(e) => setSettings({ ...settings, officeEndTime: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {msg && <p className="text-green-700 text-sm">{msg}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="bg-amber-600 text-white px-6 py-2.5 rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-400 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Settings
          </button>
        </div>
      </form>

      {/* Links to related managed areas */}
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <Link href="/admin/leave" className="bg-white border border-gray-200 rounded-lg p-5 hover:bg-gray-50 flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-amber-600" />
          <div>
            <p className="font-semibold text-gray-900">Holidays</p>
            <p className="text-sm text-gray-500">Manage the holiday calendar (Leave → Holidays)</p>
          </div>
        </Link>
        <Link href="/admin/organization" className="bg-white border border-gray-200 rounded-lg p-5 hover:bg-gray-50 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-amber-600" />
          <div>
            <p className="font-semibold text-gray-900">Branch Settings</p>
            <p className="text-sm text-gray-500">Manage branches & locations (Organization)</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
