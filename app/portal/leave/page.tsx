"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, CalendarDays } from "lucide-react";
import { istDateString, istMonthString } from "@/app/lib/attendance";

const statusBadge = (s: string) => {
  const cls = s === "Approved" ? "bg-green-100 text-green-800" : s === "Rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>;
};

export default function PortalLeavePage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ type: "", fromDate: "", toDate: "", reason: "" });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, typ, req, hol] = await Promise.all([
        fetch("/api/leave/balance").then((r) => r.json()),
        fetch("/api/leave/types").then((r) => r.json()),
        fetch("/api/leave/requests?mine=1").then((r) => r.json()),
        fetch(`/api/leave/holidays?year=${istMonthString().slice(0, 4)}`).then((r) => r.json()),
      ]);
      if (bal.success) setBalances(bal.balances);
      if (typ.success) setTypes(typ.data.filter((t: any) => t.active !== false));
      if (req.success) setRequests(req.data);
      if (hol.success) setHolidays(hol.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`Leave applied for ${data.data.days} day(s). Pending approval.`);
        setForm({ type: "", fromDate: "", toDate: "", reason: "" });
        await loadAll();
      } else {
        setError(data.error || "Failed to apply");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const today = istDateString();
  const upcoming = holidays.filter((h) => h.date >= today);

  return (
    <div className="text-black">
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Balances */}
            <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
              <h1 className="text-xl font-bold text-gray-900 mb-4">Leave Balance</h1>
              {balances.length === 0 ? (
                <p className="text-gray-500 text-sm">No leave types configured yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {balances.map((b) => (
                    <div key={b.name} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                      <p className="text-2xl font-bold text-amber-700">{b.remaining}</p>
                      <p className="text-xs text-gray-500">of {b.allocated} left · used {b.used}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Apply */}
            <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Apply for Leave</h2>
              <form onSubmit={apply} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                    <select
                      required
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select type</option>
                      {types.map((t) => (
                        <option key={t.name} value={t.name}>{t.name}{t.paid === false ? " (unpaid)" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
                      <input type="date" required value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                      <input type="date" required value={form.toDate} min={form.fromDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {msg && <p className="text-green-700 text-sm">{msg}</p>}
                <button type="submit" disabled={submitting} className="bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-400 flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Apply
                </button>
              </form>
            </div>

            {/* My requests */}
            <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">My Leave History</h2>
              {requests.length === 0 ? (
                <p className="text-gray-500 text-sm">No leave requests yet.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-900">Type</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-900">From</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-900">To</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-900">Days</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {requests.map((r) => (
                        <tr key={r._id}>
                          <td className="px-3 py-2 text-gray-800">{r.type}</td>
                          <td className="px-3 py-2 text-gray-700">{r.fromDate}</td>
                          <td className="px-3 py-2 text-gray-700">{r.toDate}</td>
                          <td className="px-3 py-2 text-gray-700">{r.days}</td>
                          <td className="px-3 py-2">{statusBadge(r.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Holidays */}
            <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-600" /> Upcoming Holidays
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming holidays listed.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {upcoming.map((h) => (
                    <li key={h._id} className="flex justify-between py-2 text-sm">
                      <span className="text-gray-800">{h.name}</span>
                      <span className="text-gray-500">{h.date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
