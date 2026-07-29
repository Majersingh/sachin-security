"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, Search, ChevronLeft, ChevronRight, Wallet, Settings2, FileSpreadsheet } from "lucide-react";
import { istMonthString } from "@/app/lib/attendance";

interface EmployeeRow {
  employeeId: string;
  fullName: string;
  designation?: string;
  workLocation?: string;
}

const PAGE_SIZE = 50;

export default function PayrollListPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [exportMonth, setExportMonth] = useState(istMonthString());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Populate the work-location filter dropdown.
  useEffect(() => {
    fetch("/api/employees?meta=filters")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.filters) setLocations(d.filters.workLocations || []);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
        if (search.trim()) {
          params.set("search", search.trim());
          params.set("searchBy", "name");
        }
        if (workLocation) params.set("workLocation", workLocation);
        const res = await fetch(`/api/employees?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setRows(data.data);
          setTotal(data.total ?? data.data.length);
          setTotalPages(data.totalPages ?? 1);
          setPage(data.page ?? targetPage);
        }
      } finally {
        setLoading(false);
      }
    },
    [search, workLocation]
  );

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto text-black">
      <div className="mb-6 flex items-center gap-3">
        <Wallet className="w-7 h-7 text-amber-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-600">Configure salary structures and generate payslips</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <select
            value={workLocation}
            onChange={(e) => setWorkLocation(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All work locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Export a location-wise payroll register (one worksheet per location). */}
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="month"
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              title="Month for the attendance tally in the export"
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => {
                const p = new URLSearchParams({ month: exportMonth });
                if (workLocation) p.set("workLocation", workLocation);
                window.location.href = `/api/payroll/export?${p.toString()}`;
              }}
              title={workLocation ? `Export ${workLocation} as Excel` : "Export all locations — one worksheet each"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Employee ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Designation</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Work Location</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No employees found</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{r.employeeId}</td>
                      <td className="px-4 py-2 text-gray-900">{r.fullName}</td>
                      <td className="px-4 py-2 text-gray-700">{r.designation || "—"}</td>
                      <td className="px-4 py-2 text-gray-700">{r.workLocation || "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/admin/payroll/${encodeURIComponent(r.employeeId)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                        >
                          <Settings2 className="w-4 h-4" /> Manage payroll
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => load(page - 1)} disabled={page <= 1} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => load(page + 1)} disabled={page >= totalPages} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
