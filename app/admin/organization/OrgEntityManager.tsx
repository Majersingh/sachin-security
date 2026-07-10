"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, X, Users, Trash2 } from "lucide-react";
import { ORG_CONFIGS, type OrgEntity } from "@/app/lib/org";
import EmployeeCombobox from "@/app/components/EmployeeCombobox";

// Generic list + create/edit/deactivate UI for any org entity, driven by ORG_CONFIGS.
// Reference fields store the referenced record's display name (e.g. department name).
export default function OrgEntityManager({ entity }: { entity: OrgEntity }) {
  const config = ORG_CONFIGS[entity];

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refOptions, setRefOptions] = useState<Record<string, string[]>>({});

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Team membership (only used when entity === "teams").
  const [membersTeam, setMembersTeam] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);

  const columns = config.fields.filter((f) => f.type !== "textarea");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/${entity}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally {
      setLoading(false);
    }
  }, [entity]);

  const loadRefs = useCallback(async () => {
    const refFields = config.fields.filter((f) => f.type === "ref" && f.refEntity);
    const out: Record<string, string[]> = {};
    await Promise.all(
      refFields.map(async (f) => {
        const refConfig = ORG_CONFIGS[f.refEntity!];
        const res = await fetch(`/api/org/${f.refEntity}?activeOnly=1`);
        const d = await res.json();
        if (d.success) out[f.key] = d.data.map((r: any) => r[refConfig.displayField]).filter(Boolean);
      })
    );
    setRefOptions(out);
  }, [config, entity]);

  useEffect(() => {
    load();
    loadRefs();
  }, [load, loadRefs]);

  const openAdd = () => {
    setEditing(null);
    setForm({});
    setError("");
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    const f: Record<string, string> = {};
    config.fields.forEach((fl) => (f[fl.key] = item[fl.key] ?? ""));
    setForm(f);
    setError("");
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editing ? `/api/org/${entity}/${editing._id}` : `/api/org/${entity}`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        await load();
      } else {
        setError(data.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: any) => {
    if (item.active === false) {
      await fetch(`/api/org/${entity}/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
    } else {
      if (!confirm(`Deactivate this ${config.label.toLowerCase()}?`)) return;
      await fetch(`/api/org/${entity}/${item._id}`, { method: "DELETE" });
    }
    await load();
  };

  const loadMembers = useCallback(async (teamId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      const data = await res.json();
      if (data.success) setMembers(data.members);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const openMembers = (team: any) => {
    setMembersTeam(team);
    setMembers([]);
    loadMembers(team._id);
  };

  const addMember = async (employeeId: string) => {
    if (!membersTeam || !employeeId) return;
    setMemberBusy(true);
    try {
      await fetch(`/api/teams/${membersTeam._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      await loadMembers(membersTeam._id);
    } finally {
      setMemberBusy(false);
    }
  };

  const removeMember = async (employeeId: string) => {
    if (!membersTeam) return;
    setMemberBusy(true);
    try {
      await fetch(`/api/teams/${membersTeam._id}/members?employeeId=${encodeURIComponent(employeeId)}`, { method: "DELETE" });
      await loadMembers(membersTeam._id);
    } finally {
      setMemberBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600 text-sm">{items.length} {config.labelPlural.toLowerCase()}</p>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add {config.label}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{c.label}</th>
                ))}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-gray-500">
                    No {config.labelPlural.toLowerCase()} yet
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-sm text-gray-800">{item[c.key] || "—"}</td>
                    ))}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${item.active === false ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}`}>
                        {item.active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {entity === "teams" && (
                          <button onClick={() => openMembers(item)} className="px-3 py-1 text-sm rounded-lg font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-1" title="Manage members">
                            <Users className="w-4 h-4" /> Members
                          </button>
                        )}
                        <button onClick={() => openEdit(item)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => toggleActive(item)}
                          className={`px-3 py-1 text-sm rounded-lg font-medium ${item.active === false ? "text-green-700 hover:bg-green-50" : "text-red-600 hover:bg-red-50"}`}
                        >
                          {item.active === false ? "Activate" : "Deactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editing ? `Edit ${config.label}` : `Add ${config.label}`}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              {config.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={2}
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  ) : field.type === "ref" || field.type === "select" ? (
                    <select
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      required={field.required}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select {field.label}</option>
                      {(field.type === "ref" ? refOptions[field.key] ?? [] : field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      required={field.required}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>
              ))}

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team members modal */}
      {membersTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-5">
              <h3 className="text-lg font-bold text-gray-900">Members — {membersTeam.name}</h3>
              <button onClick={() => setMembersTeam(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add member</label>
                <EmployeeCombobox value="" onChange={(id) => id && addMember(id)} placeholder="Search employee to add…" />
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </p>
                {membersLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
                ) : members.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">No members yet. Use the search above to add.</p>
                ) : (
                  <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {members.map((m) => (
                      <li key={m.employeeId} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{m.fullName}</div>
                          <div className="text-xs text-gray-500">
                            {m.employeeId}
                            {m.designation ? ` · ${m.designation}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(m.employeeId)}
                          disabled={memberBusy}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40"
                          title="Remove from team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
