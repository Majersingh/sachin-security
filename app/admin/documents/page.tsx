"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Upload, Download, Trash2 } from "lucide-react";
import { DOCUMENT_TYPES } from "@/app/lib/documents";
import EmployeeCombobox from "@/app/components/EmployeeCombobox";

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export default function AdminDocumentsPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<string>(DOCUMENT_TYPES[0]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const loadDocs = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?employeeId=${employeeId}`);
      const data = await res.json();
      if (data.success) setDocs(data.data);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setMsg("");
    if (!file) { setError("Please choose a file"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("employeeId", employeeId);
      fd.append("type", type);
      fd.append("title", title);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setMsg("Document uploaded");
        setTitle(""); setFile(null);
        const input = document.getElementById("doc-file") as HTMLInputElement | null;
        if (input) input.value = "";
        await loadDocs();
      } else {
        setError(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    await loadDocs();
  };

  return (
    <div className="max-w-5xl mx-auto text-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Documents</h1>
        <p className="text-gray-600">Upload and manage appointment letters, ID proofs and certificates</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
        <EmployeeCombobox
          value={employeeId}
          onChange={(id) => setEmployeeId(id)}
          className="max-w-sm"
        />

        <form onSubmit={upload} className="mt-4 grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="(optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm border-gray-300 border-1 rounded-lg p-2" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
          </div>
          <button type="submit" disabled={uploading || !employeeId} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 font-medium disabled:bg-gray-400 flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {msg && <p className="text-green-700 text-sm mt-2">{msg}</p>}
        <p className="text-xs text-gray-400 mt-2">PDF, image or Word · max 5MB</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Documents</h2>
        {!employeeId ? (
          <p className="text-gray-500 text-sm">Select an employee to view their documents.</p>
        ) : loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
        ) : docs.length === 0 ? (
          <p className="text-gray-500 text-sm">No documents for this employee.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Title</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Type</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Size</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {docs.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{d.title}</td>
                    <td className="px-4 py-2 text-gray-700">{d.type}</td>
                    <td className="px-4 py-2 text-gray-700">{fmtSize(d.size || 0)}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <a href={`/api/documents/${d._id}/download`} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Download"><Download className="w-4 h-4" /></a>
                        <button onClick={() => remove(d._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
