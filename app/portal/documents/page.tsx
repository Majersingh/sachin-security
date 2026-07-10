"use client";
import { useState, useEffect } from "react";
import { Loader2, Download, FileText } from "lucide-react";

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export default function PortalDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        if (data.success) setDocs(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="text-black">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">My Documents</h1>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
          ) : docs.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents available. HR will upload your documents here.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {docs.map((d) => (
                <li key={d._id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{d.title}</p>
                      <p className="text-xs text-gray-500">{d.type} · {fmtSize(d.size || 0)}</p>
                    </div>
                  </div>
                  <a href={`/api/documents/${d._id}/download`} className="inline-flex items-center gap-1 text-sm text-amber-700 hover:underline shrink-0">
                    <Download className="w-4 h-4" /> Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
