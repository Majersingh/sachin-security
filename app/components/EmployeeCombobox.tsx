"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ChevronDown, X } from "lucide-react";

export interface EmployeeOption {
  employeeId: string;
  fullName: string;
  designation?: string;
}

interface Props {
  /** Currently selected employeeId. */
  value: string;
  /** Called with the picked employeeId (empty string when cleared). */
  onChange: (employeeId: string, employee?: EmployeeOption) => void;
  /** Label to display for a preselected value (e.g. stored manager name). */
  initialLabel?: string;
  placeholder?: string;
  /** employeeId to hide from results (e.g. an employee can't manage themselves). */
  excludeId?: string;
  /** Show a clear (×) button to reset the selection. */
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable, server-backed employee picker. Fetches a small page of results
 * (debounced) from /api/employees as the user types, so it scales to thousands
 * of employees without ever loading the full list into the browser.
 */
export default function EmployeeCombobox({
  value,
  onChange,
  initialLabel = "",
  placeholder = "Select employee…",
  excludeId,
  allowClear = false,
  disabled = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep the displayed label in sync when the parent changes the value/label.
  useEffect(() => {
    setLabel(initialLabel);
  }, [initialLabel, value]);

  // Debounced search against the paginated employees API.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (query.trim()) {
          params.set("search", query.trim());
          params.set("searchBy", "name");
        }
        const res = await fetch(`/api/employees?${params.toString()}`);
        const data = await res.json();
        if (data.success) setOptions(data.data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (o: EmployeeOption) => {
    setLabel(`${o.fullName} (${o.employeeId})`);
    onChange(o.employeeId, o);
    setQuery("");
    setOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLabel("");
    onChange("");
  };

  const visible = options.filter((o) => o.employeeId !== excludeId);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
      >
        <span className={`truncate ${value ? "text-gray-900" : "text-gray-400"}`}>
          {value ? label || value : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {allowClear && value && (
            <X onClick={clear} className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="relative p-2 border-b border-gray-100">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <li className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              </li>
            ) : visible.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-500 text-center">No employees found</li>
            ) : (
              visible.map((o) => (
                <li key={o.employeeId}>
                  <button
                    type="button"
                    onClick={() => pick(o)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 ${
                      o.employeeId === value ? "bg-amber-50" : ""
                    }`}
                  >
                    <div className="font-medium text-gray-900">{o.fullName}</div>
                    <div className="text-xs text-gray-500">
                      {o.employeeId}
                      {o.designation ? ` · ${o.designation}` : ""}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
