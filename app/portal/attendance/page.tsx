"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { istMonthString, formatWorked } from "@/app/lib/attendance";

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

export default function MyAttendancePage() {
  const [month, setMonth] = useState(istMonthString());
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ present: number; halfDay: number }>({ present: 0, halfDay: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/me?month=${month}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="text-black">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{summary.present}</p>
              <p className="text-xs text-green-800">Present</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{summary.halfDay}</p>
              <p className="text-xs text-amber-800">Half Days</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No attendance recorded this month.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">In</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">Out</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">Worked</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((r) => (
                    <tr key={r.date}>
                      <td className="px-3 py-2 text-gray-800">{r.date}</td>
                      <td className="px-3 py-2 text-gray-700">{fmtTime(r.clockIn?.at)}</td>
                      <td className="px-3 py-2 text-gray-700">{fmtTime(r.clockOut?.at)}</td>
                      <td className="px-3 py-2 text-gray-700">{formatWorked(r.workedMinutes)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "Present" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
