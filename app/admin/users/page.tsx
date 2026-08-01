"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, KeyRound, Copy, Check, X, ChevronLeft, ChevronRight, ShieldAlert, UserPlus } from "lucide-react";
import { ROLES } from "@/app/lib/rbac";

interface User {
  _id: string;
  name?: string;
  email?: string;
  employeeId?: string;
  role: string;
  active?: boolean;
  mustResetPassword?: boolean;
}

const PAGE_SIZE = 25;

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Signed-in admin id, so we can prevent self-deactivation in the UI too.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // One-time credentials (from a reset or a new account), shown once to share.
  const [creds, setCreds] = useState<{ heading: string; loginId: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create-user modal.
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", employeeId: "", role: "employee" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setCurrentUserId(s?.user?.id ?? null))
      .catch(() => {});
  }, []);

  const load = useCallback(async (targetPage: number, search: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setTotal(data.total ?? data.data.length);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? targetPage);
      } else {
        setError(data.error || "Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced server search, resets to page 1.
  useEffect(() => {
    const t = setTimeout(() => load(1, query), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  const toggleActive = async (u: User) => {
    const next = !(u.active ?? true);
    setBusyId(u._id);
    setError("");
    try {
      const res = await fetch(`/api/users/${u._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, active: next } : x)));
      } else {
        setError(data.error || "Failed to update status");
      }
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (u: User) => {
    if (!confirm(`Reset password for ${u.name || u.email || u.employeeId}? Their current password will stop working.`)) return;
    setBusyId(u._id);
    setError("");
    setCopied(false);
    try {
      const res = await fetch(`/api/users/${u._id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCreds({ heading: `Password reset for ${u.name || u.email || u.employeeId || "user"}`, loginId: data.loginId, tempPassword: data.tempPassword });
        setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, mustResetPassword: true } : x)));
      } else {
        setError(data.error || "Failed to reset password");
      }
    } finally {
      setBusyId(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.email.trim() && !createForm.employeeId.trim()) {
      setCreateError("Enter an email or employee ID.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setCreateForm({ name: "", email: "", employeeId: "", role: "employee" });
        setCreds({
          heading: `Account created for ${data.user?.name || data.loginId}`,
          loginId: data.loginId,
          tempPassword: data.tempPassword,
        });
        load(1, query);
      } else {
        setCreateError(data.error || "Failed to create user");
      }
    } finally {
      setCreating(false);
    }
  };

  const copyCreds = async () => {
    if (!creds) return;
    await navigator.clipboard.writeText(`Login ID: ${creds.loginId}\nTemporary password: ${creds.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto text-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Activate or deactivate login accounts and reset passwords</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or employee ID…"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={() => { setCreateError(""); setShowCreate(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" /> New user
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Login ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
                  ) : (
                    users.map((u) => {
                      const active = u.active ?? true;
                      const isSelf = currentUserId === u._id;
                      return (
                        <tr key={u._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{u.name || "—"} {isSelf && <span className="text-xs text-gray-400">(you)</span>}</div>
                            {u.employeeId && <div className="text-xs text-gray-500">{u.employeeId}</div>}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{u.email || u.employeeId || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">{u.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                                {active ? "Active" : "Inactive"}
                              </span>
                              {u.mustResetPassword && (
                                <span className="text-xs text-amber-700" title="Must reset password on next login">· pending reset</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => toggleActive(u)}
                                disabled={busyId === u._id || (isSelf && active)}
                                title={isSelf && active ? "You cannot deactivate your own account" : active ? "Deactivate" : "Activate"}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40 ${
                                  active ? "border-red-300 text-red-700 hover:bg-red-50" : "border-green-300 text-green-700 hover:bg-green-50"
                                }`}
                              >
                                {busyId === u._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => resetPassword(u)}
                                disabled={busyId === u._id}
                                title="Reset password"
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 flex items-center gap-1"
                              >
                                <KeyRound className="w-3.5 h-3.5" /> Reset password
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => load(page - 1, query)} disabled={page <= 1} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                  <span>Page {page} of {totalPages}</span>
                  <button onClick={() => load(page + 1, query)} disabled={page >= totalPages} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create-user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Add user</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={createUser} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 font-normal">(email or employee ID required)</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="login ID — if no employee ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID <span className="text-gray-400 font-normal">(email or employee ID required)</span>
                </label>
                <input
                  type="text"
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, employeeId: e.target.value }))}
                  placeholder="login ID — e.g. ss-123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 capitalize"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <p className="text-xs text-gray-500">Provide an email or an employee ID (at least one). A temporary password is generated and shown once.</p>
              {createError && <p className="text-sm text-red-600">{createError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create user
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time credentials (reset or new account): shown once so the admin can share them. */}
      {creds && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{creds.heading}</h2>
              <button onClick={() => setCreds(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Copy these now — the temporary password is shown only once and cannot be retrieved later. The user must change it on next login.</p>
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <p className="text-xs text-gray-500">Login ID</p>
                <p className="font-mono text-sm text-gray-900 break-all">{creds.loginId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Temporary password</p>
                <p className="font-mono text-base font-semibold text-gray-900">{creds.tempPassword}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={copyCreds} className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-medium flex items-center justify-center gap-2">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy credentials</>}
              </button>
              <button onClick={() => setCreds(null)} className="px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
