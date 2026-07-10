"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, KeyRound, Copy, Check, X, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";

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

  // Credentials returned by a password reset, shown once for the admin to share.
  const [resetResult, setResetResult] = useState<{ name: string; loginId: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
        setResetResult({ name: u.name || u.email || u.employeeId || "user", loginId: data.loginId, tempPassword: data.tempPassword });
        setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, mustResetPassword: true } : x)));
      } else {
        setError(data.error || "Failed to reset password");
      }
    } finally {
      setBusyId(null);
    }
  };

  const copyCreds = async () => {
    if (!resetResult) return;
    await navigator.clipboard.writeText(`Login ID: ${resetResult.loginId}\nTemporary password: ${resetResult.tempPassword}`);
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
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or employee ID…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
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

      {/* Reset-password result: shown once so the admin can share the credentials. */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Password reset for {resetResult.name}</h2>
              <button onClick={() => setResetResult(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Copy these now — the temporary password is shown only once and cannot be retrieved later. The user must change it on next login.</p>
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <p className="text-xs text-gray-500">Login ID</p>
                <p className="font-mono text-sm text-gray-900 break-all">{resetResult.loginId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Temporary password</p>
                <p className="font-mono text-base font-semibold text-gray-900">{resetResult.tempPassword}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={copyCreds} className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-medium flex items-center justify-center gap-2">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy credentials</>}
              </button>
              <button onClick={() => setResetResult(null)} className="px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
