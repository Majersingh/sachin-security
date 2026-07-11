"use client";
import { useState, useEffect } from "react";
import { Loader2, MapPin, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { formatWorked } from "@/app/lib/attendance";

interface Punch {
  at: string;
  distanceM?: number | null;
}
interface TodayRecord {
  clockIn?: Punch;
  clockOut?: Punch;
  status?: string;
  workedMinutes?: number;
}

const fmtDistance = (p?: Punch) =>
  typeof p?.distanceM === "number" ? `${p.distanceM} m from site` : null;

// Captures GPS via the browser. Rejects (and surfaces a clear error) if the user
// denies location — clocking in/out is impossible without it, matching the API rule.
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported on this device/browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

export default function AttendanceClock() {
  const [record, setRecord] = useState<TodayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [noEmployee, setNoEmployee] = useState(false);

  const loadToday = async () => {
    try {
      const res = await fetch("/api/attendance/today");
      const data = await res.json();
      if (data.success) {
        setRecord(data.data);
        setNoEmployee(!!data.noEmployee);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, []);

  const punch = async (type: "in" | "out") => {
    setError("");
    setBusy(true);
    try {
      let pos: GeolocationPosition;
      try {
        pos = await getPosition();
      } catch (geoErr: any) {
        setError(
          geoErr?.code === 1
            ? "Location access was denied. Please allow location to clock in/out."
            : "Could not get your location. Enable GPS/location and try again."
        );
        setBusy(false);
        return;
      }

      const res = await fetch("/api/attendance/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRecord(data.data);
      } else {
        setError(data.error || "Failed to record attendance");
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
      </div>
    );
  }

  if (noEmployee) {
    return <p className="text-sm text-gray-500">Attendance is available for employee accounts only.</p>;
  }

  const clockedIn = !!record?.clockIn;
  const clockedOut = !!record?.clockOut;

  return (
    <div className="text-left">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Today&apos;s Attendance</h2>
        {record?.status && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              record.status === "Present"
                ? "bg-green-100 text-green-800"
                : record.status === "Half Day"
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {record.status}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">Clock In</p>
          <p className="font-semibold text-gray-900">{fmtTime(record?.clockIn?.at)}</p>
          {fmtDistance(record?.clockIn) && (
            <p className="text-[11px] text-gray-400 mt-0.5">{fmtDistance(record?.clockIn)}</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">Clock Out</p>
          <p className="font-semibold text-gray-900">{fmtTime(record?.clockOut?.at)}</p>
          {fmtDistance(record?.clockOut) && (
            <p className="text-[11px] text-gray-400 mt-0.5">{fmtDistance(record?.clockOut)}</p>
          )}
        </div>
      </div>

      {clockedIn && clockedOut ? (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          Shift complete — worked {formatWorked(record?.workedMinutes)}
        </div>
      ) : (
        <button
          onClick={() => punch(clockedIn ? "out" : "in")}
          disabled={busy}
          className={`w-full py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 ${
            clockedIn ? "bg-gray-900 hover:bg-gray-800" : "bg-amber-600 hover:bg-amber-700"
          }`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : clockedIn ? (
            <LogOut className="w-4 h-4" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {busy ? "Capturing location…" : clockedIn ? "Clock Out" : "Clock In"}
        </button>
      )}

      <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-2">
        <MapPin className="w-3 h-3" /> Location is captured and required for each punch.
      </p>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
