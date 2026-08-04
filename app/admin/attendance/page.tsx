"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, MapPin, Search, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { istDateString, istMonthString, formatWorked } from "@/app/lib/attendance";
import EmployeeCombobox from "@/app/components/EmployeeCombobox";

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

// A clock punch stores { at, lat, lng, accuracy }; link to Google Maps directions
// to where it was punched, if present.
const mapHref = (p?: { lat?: number; lng?: number } | null) =>
  p && typeof p.lat === "number" && typeof p.lng === "number"
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
    : null;

// Renders a clock time plus a location pin linking to where it was punched, and
// the distance from the assigned site at punch time (when recorded).
function TimeCell({ punch }: { punch?: { at?: string; lat?: number; lng?: number; distanceM?: number | null } | null }) {
  const href = mapHref(punch);
  const dist = typeof punch?.distanceM === "number" ? punch.distanceM : null;
  return (
    <span className="inline-flex items-center gap-1 text-gray-700">
      {fmtTime(punch?.at)}
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" title="View location on map" className="text-amber-600 hover:text-amber-700">
          <MapPin className="w-3.5 h-3.5" />
        </a>
      )}
      {dist !== null && (
        <span className="text-[11px] text-gray-400" title="Distance from assigned site at punch time">
          {dist} m
        </span>
      )}
    </span>
  );
}

const statusBadge = (status: string) => {
  const cls =
    status === "Present"
      ? "bg-green-100 text-green-800"
      : status === "Half Day"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-700";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{status}</span>;
};

export default function AdminAttendancePage() {
  const [tab, setTab] = useState<"day" | "month">("day");

  // Daily
  const [date, setDate] = useState(istDateString());
  const [daySearch, setDaySearch] = useState("");
  const [dayStatus, setDayStatus] = useState<"" | "Present" | "Half Day" | "Absent">(""); // "" = all
  const [dayRows, setDayRows] = useState<any[]>([]);
  const [daySummary, setDaySummary] = useState<any>(null);
  const [dayPage, setDayPage] = useState(1);
  const [dayTotal, setDayTotal] = useState(0);
  const [dayTotalPages, setDayTotalPages] = useState(1);
  const DAY_PAGE_SIZE = 50;

  // Monthly
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(istMonthString());
  const [monthData, setMonthData] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const loadDay = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, page: String(targetPage), limit: String(DAY_PAGE_SIZE) });
      if (daySearch.trim()) params.set("search", daySearch.trim());
      if (dayStatus) params.set("status", dayStatus);
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDayRows(data.rows);
        setDaySummary(data.summary);
        setDayTotal(data.total ?? data.rows.length);
        setDayTotalPages(data.totalPages ?? 1);
        setDayPage(data.page ?? targetPage);
      }
    } finally {
      setLoading(false);
    }
  }, [date, daySearch, dayStatus]);

  const loadMonth = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?month=${month}&employeeId=${employeeId}`);
      const data = await res.json();
      if (data.success) setMonthData(data);
    } finally {
      setLoading(false);
    }
  }, [month, employeeId]);

  // Reload page 1 whenever the tab, date or search changes (search debounced).
  useEffect(() => {
    if (tab !== "day") return;
    const t = setTimeout(() => loadDay(1), 300);
    return () => clearTimeout(t);
  }, [tab, loadDay]);

  useEffect(() => {
    if (tab === "month") loadMonth();
  }, [tab, loadMonth]);

  return (
    <div className="max-w-6xl mx-auto text-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance</h1>
        <p className="text-gray-600">Daily attendance and monthly reports</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {(["day", "month"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm ${
              tab === t ? "border-amber-600 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "day" ? "Daily" : "Monthly Report"}
          </button>
        ))}
      </div>

      {tab === "day" ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              max={istDateString()}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={daySearch}
                onChange={(e) => setDaySearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {daySummary && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              <SummaryTile label="Present" value={daySummary.present} color="green" active={dayStatus === "Present"} onClick={() => setDayStatus((s) => (s === "Present" ? "" : "Present"))} />
              <SummaryTile label="Half Day" value={daySummary.halfDay} color="amber" active={dayStatus === "Half Day"} onClick={() => setDayStatus((s) => (s === "Half Day" ? "" : "Half Day"))} />
              <SummaryTile label="Absent" value={daySummary.absent} color="red" active={dayStatus === "Absent"} onClick={() => setDayStatus((s) => (s === "Absent" ? "" : "Absent"))} />
              <SummaryTile label="Total" value={daySummary.total} color="gray" active={dayStatus === ""} onClick={() => setDayStatus("")} />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Designation</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Location</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">In</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Out</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Worked</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dayRows.map((r) => (
                    <tr key={r.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{r.fullName}</div>
                        <div className="text-xs text-gray-500">{r.employeeId}</div>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{r.designation || "—"}</td>
                      <td className="px-4 py-2 text-gray-700">{r.workLocation || "—"}</td>
                      <td className="px-4 py-2"><TimeCell punch={r.clockIn} /></td>
                      <td className="px-4 py-2"><TimeCell punch={r.clockOut} /></td>
                      <td className="px-4 py-2 text-gray-700">{formatWorked(r.workedMinutes)}</td>
                      <td className="px-4 py-2">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dayTotal > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Showing {(dayPage - 1) * DAY_PAGE_SIZE + 1}–{Math.min(dayPage * DAY_PAGE_SIZE, dayTotal)} of {dayTotal}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => loadDay(dayPage - 1)} disabled={dayPage <= 1} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                <span>Page {dayPage} of {dayTotalPages}</span>
                <button onClick={() => loadDay(dayPage + 1)} disabled={dayPage >= dayTotalPages} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <EmployeeCombobox
              value={employeeId}
              onChange={(id) => setEmployeeId(id)}
              className="w-64"
            />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => {
                if (!employeeId) return;
                window.location.href = `/api/attendance/export?employeeId=${encodeURIComponent(employeeId)}&month=${month}`;
              }}
              disabled={!employeeId}
              title={employeeId ? "Download this month as a colour-coded Excel calendar" : "Select an employee first"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>

          {monthData?.summary && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              <SummaryTile label="Present" value={monthData.summary.present} color="green" />
              <SummaryTile label="Half Day" value={monthData.summary.halfDay} color="amber" />
              <SummaryTile label="Absent" value={monthData.summary.absent} color="red" />
              <SummaryTile label="Working Days" value={monthData.summary.workingDays} color="gray" />
            </div>
          )}

          {!employeeId ? (
            <p className="text-gray-500 text-sm py-6">Select an employee to view their monthly report.</p>
          ) : loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">In</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Out</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Worked</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(monthData?.records || []).length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No records for this month</td></tr>
                  ) : (
                    monthData.records.map((r: any) => (
                      <tr key={r.date}>
                        <td className="px-4 py-2 text-gray-800">{r.date}</td>
                        <td className="px-4 py-2"><TimeCell punch={r.clockIn} /></td>
                        <td className="px-4 py-2"><TimeCell punch={r.clockOut} /></td>
                        <td className="px-4 py-2 text-gray-700">{formatWorked(r.workedMinutes)}</td>
                        <td className="px-4 py-2">{statusBadge(r.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {monthData?.note && <p className="text-xs text-gray-400 mt-3">{monthData.note}</p>}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, color, active, onClick }: {
  label: string; value: number; color: string; active?: boolean; onClick?: () => void;
}) {
  const map: Record<string, string> = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-gray-50 text-gray-700",
  };
  const ring: Record<string, string> = {
    green: "ring-2 ring-green-500",
    amber: "ring-2 ring-amber-500",
    red: "ring-2 ring-red-500",
    gray: "ring-2 ring-gray-500",
  };
  const cls = `rounded-lg p-3 text-center ${map[color]} ${active ? ring[color] : ""}`;

  // Clickable (daily filter tiles) vs static (monthly view).
  if (!onClick) {
    return (
      <div className={cls}>
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-xs">{label}</p>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cls} transition hover:brightness-95 cursor-pointer`}>
      <p className="text-2xl font-bold">{value ?? 0}</p>
      <p className="text-xs">{label}{active ? " ✓" : ""}</p>
    </button>
  );
}
