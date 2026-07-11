"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, X, Users, Trash2, MapPin, LocateFixed, Navigation } from "lucide-react";
import { ORG_CONFIGS, type OrgEntity } from "@/app/lib/org";
import { parseLatLng } from "@/app/lib/attendance";
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
    config.fields.forEach((fl) => {
      if (fl.type === "geo") {
        // A geo field is backed by lat/lng on the doc, not by the field key.
        f.lat = item.lat != null ? String(item.lat) : "";
        f.lng = item.lng != null ? String(item.lng) : "";
      } else if (fl.type === "boolean") {
        // Stored as a real boolean; fall back to the field default when unset.
        const v = item[fl.key];
        f[fl.key] = (typeof v === "boolean" ? v : fl.default ?? false) ? "true" : "false";
      } else {
        f[fl.key] = item[fl.key] ?? "";
      }
    });
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
                      <td key={c.key} className="px-4 py-3 text-sm text-gray-800">
                        {c.type === "geo" ? (
                          typeof item.lat === "number" && typeof item.lng === "number" ? (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"
                              title={`${item.lat}, ${item.lng}`}
                            >
                              <MapPin className="w-3.5 h-3.5" /> Set
                            </a>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )
                        ) : c.type === "boolean" ? (
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              (typeof item[c.key] === "boolean" ? item[c.key] : c.default)
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {(typeof item[c.key] === "boolean" ? item[c.key] : c.default) ? "On" : "Off"}
                          </span>
                        ) : (
                          item[c.key] || "—"
                        )}
                      </td>
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
              {config.fields.filter((field) => !field.generated).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === "boolean" ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={(form[field.key] ?? "") === "" ? !!field.default : form[field.key] === "true"}
                      onClick={() =>
                        setForm({
                          ...form,
                          [field.key]:
                            ((form[field.key] ?? "") === "" ? !!field.default : form[field.key] === "true")
                              ? "false"
                              : "true",
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        ((form[field.key] ?? "") === "" ? !!field.default : form[field.key] === "true")
                          ? "bg-amber-600"
                          : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          ((form[field.key] ?? "") === "" ? !!field.default : form[field.key] === "true")
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  ) : field.type === "geo" ? (
                    <GeoPicker
                      lat={form.lat ?? ""}
                      lng={form.lng ?? ""}
                      address={form.address ?? ""}
                      onChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
                    />
                  ) : field.type === "number" ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        placeholder="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {field.key === "geofenceRadiusM" && (
                        <p className="text-xs text-gray-400 mt-1">
                          How far from the site staff may clock in/out. Leave blank for the default 100 m.
                        </p>
                      )}
                    </>
                  ) : field.type === "textarea" ? (
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
                  {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
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

// Capture a site's GPS coordinates. Admins usually add a site from their office,
// so the primary path is pasting "lat, lng" from Google Maps; a "use my location"
// button is offered for when they are physically on site.
function GeoPicker({
  lat,
  lng,
  address,
  onChange,
}: {
  lat: string;
  lng: string;
  address: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [locating, setLocating] = useState(false);

  const hasCoords = lat !== "" && lng !== "";

  const handlePaste = (value: string) => {
    setPaste(value);
    setMsg("");
    if (!value.trim()) return;
    const parsed = parseLatLng(value);
    if (parsed) {
      onChange(String(parsed.lat), String(parsed.lng));
      setPaste("");
    } else {
      setMsg("Couldn't read that. Paste as \"latitude, longitude\", e.g. 21.1702, 72.8311");
    }
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg("Location is not supported on this device/browser.");
      return;
    }
    setLocating(true);
    setMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(String(pos.coords.latitude), String(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMsg("Could not get your location. Allow location access or paste coordinates instead.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const addressMapHref = address.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
    : null;

  return (
    <div className="space-y-2">
      {/* Step 1: open the typed address on the map so the admin can find the spot. */}
      <a
        href={addressMapHref ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!addressMapHref}
        onClick={(e) => {
          if (!addressMapHref) e.preventDefault();
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg ${
          addressMapHref
            ? "bg-amber-600 text-white hover:bg-amber-700"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        <MapPin className="w-4 h-4" /> Open address on Google Maps
      </a>
      {!addressMapHref && (
        <p className="text-xs text-gray-400">Fill in the Address above first, then open it on the map.</p>
      )}

      {/* Step 2: on the map, right-click the exact site → copy the coordinates → paste here. */}
      <input
        type="text"
        value={paste}
        onChange={(e) => handlePaste(e.target.value)}
        placeholder="Paste coordinates here, e.g. 21.1702, 72.8311"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        Use my current location
      </button>

      {hasCoords ? (
        <div className="flex items-center gap-2 text-sm bg-green-50 text-green-800 rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">{lat}, {lng}</span>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline hover:no-underline"
          >
            <Navigation className="w-3.5 h-3.5" /> directions
          </a>
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            Clear
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          In Google Maps, right-click the exact site → click the coordinates to copy → paste above.
        </p>
      )}

      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
