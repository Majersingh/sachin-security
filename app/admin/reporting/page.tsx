"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, Search, Check, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronsDownUp, Maximize2 } from "lucide-react";
import EmployeeCombobox from "@/app/components/EmployeeCombobox";
import OrgChart, { OrgChartDatum, OrgChartHandle } from "@/app/components/OrgChart";

interface Emp {
  employeeId: string;
  fullName: string;
  designation?: string;
  department?: string;
  reportingManagerId?: string;
  reportingManager?: string;
}

interface HNode {
  employeeId: string;
  fullName: string;
  designation?: string;
  department?: string;
  reportingManagerId?: string;
  profileUrl?: string;
}

const PAGE_SIZE = 50;

export default function ReportingPage() {
  const [tab, setTab] = useState<"assign" | "tree">("assign");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Reporting Hierarchy</h1>
        <p className="text-gray-600">Assign reporting managers and view the organization chart</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-2">
        {(["assign", "tree"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm ${
              tab === t ? "border-amber-600 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "assign" ? "Assign" : "Hierarchy"}
          </button>
        ))}
      </div>

      {tab === "assign" ? <AssignTab /> : <HierarchyTab />}
    </div>
  );
}

/* ---------------- Assign tab (manager-assignment table) ---------------- */

function AssignTab() {
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});

  const loadEmployees = useCallback(async (targetPage: number, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
      if (search.trim()) {
        params.set("search", search.trim());
        params.set("searchBy", "name");
      }
      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
        setTotal(data.total ?? data.data.length);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? targetPage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReportCounts = useCallback(async () => {
    const res = await fetch("/api/employees?meta=reportCounts");
    const data = await res.json();
    if (data.success) setReportCounts(data.counts || {});
  }, []);

  useEffect(() => {
    loadReportCounts();
  }, [loadReportCounts]);

  useEffect(() => {
    const t = setTimeout(() => loadEmployees(1, query), 300);
    return () => clearTimeout(t);
  }, [query, loadEmployees]);

  const setManager = async (emp: Emp, managerId: string, managerName: string) => {
    setSavingId(emp.employeeId);
    setSavedId(null);
    try {
      const res = await fetch(`/api/employees/${emp.employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportingManagerId: managerId || "", reportingManager: managerName || "" }),
      });
      const data = await res.json();
      if (data.success) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.employeeId === emp.employeeId
              ? { ...e, reportingManagerId: managerId || "", reportingManager: managerName || "" }
              : e
          )
        );
        setSavedId(emp.employeeId);
        setTimeout(() => setSavedId(null), 1500);
        loadReportCounts();
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-black">
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employees by name…"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Designation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Direct Reports</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reporting Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No employees found</td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{emp.fullName}</div>
                        <div className="text-gray-500 text-xs">{emp.employeeId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{emp.designation || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{reportCounts[emp.employeeId] || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <EmployeeCombobox
                            value={emp.reportingManagerId || ""}
                            initialLabel={emp.reportingManager || ""}
                            excludeId={emp.employeeId}
                            allowClear
                            placeholder="— None —"
                            disabled={savingId === emp.employeeId}
                            onChange={(id, m) => setManager(emp, id, m?.fullName || "")}
                            className="w-full max-w-xs"
                          />
                          {savingId === emp.employeeId && <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />}
                          {savedId === emp.employeeId && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => loadEmployees(page - 1, query)} disabled={page <= 1} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {page} of {totalPages}</span>
                <button onClick={() => loadEmployees(page + 1, query)} disabled={page >= totalPages} className="p-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Hierarchy tab (d3-org-chart) ---------------- */

function HierarchyTab() {
  const [nodes, setNodes] = useState<HNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [rootId, setRootId] = useState("");
  const [rootLabel, setRootLabel] = useState("");
  const chartRef = useRef<OrgChartHandle>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/employees?meta=hierarchy");
        const data = await res.json();
        if (data.success) setNodes(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { nodeMap, childrenMap } = useMemo(() => {
    const nodeMap: Record<string, HNode> = {};
    const childrenMap: Record<string, HNode[]> = {};
    nodes.forEach((n) => {
      nodeMap[n.employeeId] = n;
    });
    nodes.forEach((n) => {
      const mgr = n.reportingManagerId;
      const key = mgr && nodeMap[mgr] ? mgr : "__root__";
      (childrenMap[key] ||= []).push(n);
    });
    Object.values(childrenMap).forEach((arr) => arr.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    return { nodeMap, childrenMap };
  }, [nodes]);

  // Flatten into the { id, parentId } shape d3-org-chart expects. The DFS with a
  // visited set guarantees a single acyclic tree even if the data has a cycle.
  const orgData: OrgChartDatum[] = useMemo(() => {
    if (!nodes.length) return [];
    const out: OrgChartDatum[] = [];
    const visited = new Set<string>();
    const push = (n: HNode, parentId: string) => {
      if (visited.has(n.employeeId)) return;
      visited.add(n.employeeId);
      out.push({
        id: n.employeeId,
        parentId,
        name: n.fullName,
        position: n.designation || "",
        department: n.department || "",
        image: n.profileUrl || "",
      });
      (childrenMap[n.employeeId] || []).forEach((c) => push(c, n.employeeId));
    };

    if (rootId && nodeMap[rootId]) {
      push(nodeMap[rootId], "");
    } else {
      const SYNTH = "__org__";
      out.push({ id: SYNTH, parentId: "", name: "Whole Organisation", position: `${nodes.length} people` });
      (childrenMap["__root__"] || []).forEach((r) => push(r, SYNTH));
      // Any node unreachable from a root (part of a pure cycle) attaches to root.
      nodes.forEach((n) => {
        if (!visited.has(n.employeeId)) push(n, SYNTH);
      });
    }
    return out;
  }, [nodes, rootId, nodeMap, childrenMap]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-black">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-72">
          <EmployeeCombobox
            value={rootId}
            initialLabel={rootLabel}
            allowClear
            placeholder="Whole organisation"
            onChange={(id, e) => {
              setRootId(id);
              setRootLabel(e ? `${e.fullName} (${e.employeeId})` : "");
            }}
          />
        </div>
        <button onClick={() => chartRef.current?.expandAll()} className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
          <ChevronsUpDown className="w-3.5 h-3.5" /> Expand all
        </button>
        <button onClick={() => chartRef.current?.collapseAll()} className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
          <ChevronsDownUp className="w-3.5 h-3.5" /> Collapse all
        </button>
        <button onClick={() => chartRef.current?.fit()} className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
          <Maximize2 className="w-3.5 h-3.5" /> Fit
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>
      ) : orgData.length === 0 ? (
        <p className="text-gray-500 text-sm py-6">No employees to display.</p>
      ) : (
        <OrgChart ref={chartRef} data={orgData} />
      )}
    </div>
  );
}
