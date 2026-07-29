"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, X, Trash2 } from "lucide-react";
import { istMonthString } from "@/app/lib/attendance";

type Tab = "requests" | "types" | "holidays";

export default function AdminLeavePage() {
  const [tab, setTab] = useState<Tab>("requests");
  return (
    <div className="max-w-6xl mx-auto text-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Management</h1>
        <p className="text-gray-600">Approve requests, configure leave types and holidays</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {([["requests", "Requests"], ["types", "Leave Types"], ["holidays", "Holidays"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm ${tab === t ? "border-amber-600 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {tab === "requests" && <LeaveRequests />}
        {tab === "types" && <LeaveTypes />}
        {tab === "holidays" && <Holidays />}
      </div>
    </div>
  );
}

/* ---------- Requests ---------- */
function LeaveRequests() {
  const [status, setStatus] = useState("Pending");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/leave/requests${qs}`);
      const data = await res.json();
      if (data.success) setRows(data.data);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, decision: "Approved" | "Rejected") => {
    let note = "";
    if (decision === "Rejected") note = window.prompt("Reason for rejection (optional):") || "";
    setBusyId(id);
    try {
      const res = await fetch(`/api/leave/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, note }),
      });
      const data = await res.json();
      if (!data.success) alert(data.error || "Failed");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Employee</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">From</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">To</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Days</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Reason</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No requests</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{r.employeeName || r.employeeId}</div>
                      <div className="text-xs text-gray-500">{r.employeeId}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{r.type}</td>
                    <td className="px-3 py-2 text-gray-700">{r.fromDate}</td>
                    <td className="px-3 py-2 text-gray-700">{r.toDate}</td>
                    <td className="px-3 py-2 text-gray-700">{r.days}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={r.reason}>{r.reason || "—"}</td>
                    <td className="px-3 py-2">
                      {r.status === "Pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => decide(r._id, "Approved")} disabled={busyId === r._id} className="px-3 py-1 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Approve</button>
                          <button onClick={() => decide(r._id, "Rejected")} disabled={busyId === r._id} className="px-3 py-1 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">Reject</button>
                        </div>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${r.status === "Approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{r.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Leave Types ---------- */
function LeaveTypes() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", code: "", annualQuota: "", paid: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave/types");
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", code: "", annualQuota: "", paid: true }); setError(""); setShowForm(true); };
  const openEdit = (it: any) => { setEditing(it); setForm({ name: it.name, code: it.code || "", annualQuota: String(it.annualQuota ?? ""), paid: it.paid !== false }); setError(""); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const url = editing ? `/api/leave/types/${editing._id}` : "/api/leave/types";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, code: form.code, annualQuota: Number(form.annualQuota), paid: form.paid }),
      });
      const data = await res.json();
      if (data.success) { setShowForm(false); await load(); } else setError(data.error || "Failed");
    } finally { setSaving(false); }
  };

  const toggle = async (it: any) => {
    if (it.active === false) {
      await fetch(`/api/leave/types/${it._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: true }) });
    } else {
      if (!confirm("Deactivate this leave type?")) return;
      await fetch(`/api/leave/types/${it._id}`, { method: "DELETE" });
    }
    await load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600 text-sm">{items.length} leave types</p>
        <button onClick={openAdd} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Add Type</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Code</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Annual Quota</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Paid</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Status</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No leave types</td></tr>
              ) : items.map((it) => (
                <tr key={it._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900 font-medium">{it.name}</td>
                  <td className="px-4 py-2 text-gray-700">{it.code || "—"}</td>
                  <td className="px-4 py-2 text-gray-700">{it.annualQuota}</td>
                  <td className="px-4 py-2 text-gray-700">{it.paid === false ? "No" : "Yes"}</td>
                  <td className="px-4 py-2"><span className={`inline-flex px-2 py-1 text-xs rounded-full ${it.active === false ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}`}>{it.active === false ? "Inactive" : "Active"}</span></td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(it)} className="px-3 py-1 text-sm rounded-lg text-gray-700 hover:bg-gray-100">Edit</button>
                      <button onClick={() => toggle(it)} className={`px-3 py-1 text-sm rounded-lg font-medium ${it.active === false ? "text-green-700 hover:bg-green-50" : "text-red-600 hover:bg-red-50"}`}>{it.active === false ? "Activate" : "Deactivate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center border-b p-5">
              <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit" : "Add"} Leave Type</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Quota (days) *</label>
                <input type="number" min={0} required value={form.annualQuota} onChange={(e) => setForm({ ...form, annualQuota: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} className="w-4 h-4" />
                Paid leave
              </label>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Holidays ---------- */
function Holidays() {
  const [year, setYear] = useState(istMonthString().slice(0, 4));
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", name: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave/holidays?year=${year}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally { setLoading(false); }
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/leave/holidays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setForm({ date: "", name: "" }); await load(); } else setError(data.error || "Failed");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this holiday?")) return;
    await fetch(`/api/leave/holidays/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diwali" className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <button type="submit" disabled={saving} className="px-4 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center gap-1 disabled:bg-gray-400"><Plus className="w-4 h-4" /> Add</button>
        </form>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
          <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">No holidays for {year}.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {items.map((h) => (
            <li key={h._id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <span className="font-medium text-gray-900">{h.name}</span>
                <span className="text-gray-500 text-sm ml-3">{h.date}</span>
              </div>
              <button onClick={() => remove(h._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
