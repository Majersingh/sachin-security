"use client";
import { useState, useEffect, useCallback, useMemo, use } from "react";
import Link from "next/link";
import {
  Loader2, ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, FileText, Download, Calculator, MapPin,
} from "lucide-react";
import {
  computePayroll, formatINR, amountInWords,
  type SalaryComponent, type ComponentCategory, type CalcType, type Payslip,
} from "@/app/lib/payroll";

const CATEGORIES: { value: ComponentCategory; label: string }[] = [
  { value: "info", label: "Info (input)" },
  { value: "earning", label: "Earning" },
  { value: "deduction", label: "Deduction" },
  { value: "total", label: "Total (auto)" },
];
// The calculation dropdown offers the real CalcTypes plus four "auto" modes that
// are really calc:"fixed" + an autoFromLocation/autoFromAttendance marker. modeOf()
// and setMode() translate between this dropdown value and the stored component.
type CalcMode = CalcType | "autoRate" | "autoRatePerDay" | "autoDuty" | "autoExtraDuty";
const CALC_OPTIONS: { value: CalcMode; label: string }[] = [
  { value: "fixed", label: "Fixed amount" },
  { value: "perDay", label: "Per day (rate × days)" },
  { value: "percentOf", label: "% of another" },
  { value: "sumEarnings", label: "Σ Earnings (Gross)" },
  { value: "sumDeductions", label: "Σ Deductions" },
  { value: "net", label: "Net (Gross − Deductions)" },
  { value: "autoRate", label: "Auto: Rate (from location)" },
  { value: "autoRatePerDay", label: "Auto: Rate/Day (from location)" },
  { value: "autoDuty", label: "Auto: Duty days (from attendance)" },
  { value: "autoExtraDuty", label: "Auto: Extra Duty days (from attendance)" },
];

const modeOf = (c: SalaryComponent): CalcMode =>
  c.autoFromLocation === "rate"
    ? "autoRate"
    : c.autoFromLocation === "ratePerDay"
    ? "autoRatePerDay"
    : c.autoFromAttendance === "duty"
    ? "autoDuty"
    : c.autoFromAttendance === "extraDuty"
    ? "autoExtraDuty"
    : c.calc;

const catColor: Record<ComponentCategory, string> = {
  info: "bg-slate-100 text-slate-700",
  earning: "bg-green-100 text-green-800",
  deduction: "bg-red-100 text-red-700",
  total: "bg-amber-100 text-amber-800",
};

export default function PayrollEditorPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId: rawId } = use(params);
  const employeeId = decodeURIComponent(rawId);

  const [employee, setEmployee] = useState<any>(null);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [locationRate, setLocationRate] = useState<{ rate: number; ratePerDay: number } | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Payslip generation
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Payslip[]>([]);
  const [attSummary, setAttSummary] = useState<{ present: number; halfDay: number; absent: number; workingDays: number } | null>(null);
  const [extraDuty, setExtraDuty] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [tab, setTab] = useState<"generate" | "config">("generate");

  useEffect(() => {
    fetch("/api/settings/company").then((r) => r.json()).then((d) => { if (d.success) setCompany(d.data); }).catch(() => {});
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/payroll/payslips?employeeId=${encodeURIComponent(employeeId)}`);
    const data = await res.json();
    if (data.success) setHistory(data.data);
  }, [employeeId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/structure/${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (data.success) {
        setEmployee(data.employee);
        setComponents(data.structure.components || []);
        setLocationRate(data.locationRate ?? null);
        setIsDefault(!!data.structure.isDefault);
        // Send admins straight to config when nothing is set up yet.
        if (data.structure.isDefault) setTab("config");
      }
      await loadHistory();
    } finally {
      setLoading(false);
    }
  }, [employeeId, loadHistory]);

  useEffect(() => { load(); }, [load]);

  // Attendance breakdown for the selected month (drives the auto Duty count).
  const loadAttSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance?month=${month}&employeeId=${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      setAttSummary(data.success && data.summary ? data.summary : null);
    } catch {
      setAttSummary(null);
    }
  }, [month, employeeId]);

  useEffect(() => { loadAttSummary(); }, [loadAttSummary]);

  const dutyDays = attSummary ? attSummary.present + attSummary.halfDay * 0.5 : 0;

  // Rate / Rate Per Day are resolved live from the location rate card, never stored.
  // Feed them into the live computation as overrides so the config preview shows the
  // real location salary (and everything derived from it, e.g. Basic, PF).
  const locationOverrides = useMemo(() => {
    const o: Record<string, number> = {};
    if (!locationRate) return o;
    for (const c of components) {
      if (c.autoFromLocation === "rate") o[c.key] = locationRate.rate;
      if (c.autoFromLocation === "ratePerDay") o[c.key] = locationRate.ratePerDay;
    }
    return o;
  }, [components, locationRate]);

  // Live computation for the preview column + totals.
  const computed = useMemo(() => computePayroll(components, locationOverrides), [components, locationOverrides]);

  const keyOptions = components.map((c) => ({ key: c.key, label: c.label }));

  const patch = (idx: number, p: Partial<SalaryComponent>) =>
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, ...p } : c)));

  // Apply a calculation-dropdown choice, translating the "auto" modes into a
  // fixed component carrying the right auto marker (and clearing stale markers).
  const setMode = (idx: number, mode: CalcMode) => {
    const clear = { autoFromLocation: undefined, autoFromAttendance: undefined };
    if (mode === "autoRate") patch(idx, { ...clear, calc: "fixed", autoFromLocation: "rate" });
    else if (mode === "autoRatePerDay") patch(idx, { ...clear, calc: "fixed", autoFromLocation: "ratePerDay" });
    else if (mode === "autoDuty") patch(idx, { ...clear, calc: "fixed", autoFromAttendance: "duty" });
    else if (mode === "autoExtraDuty") patch(idx, { ...clear, calc: "fixed", autoFromAttendance: "extraDuty" });
    else patch(idx, { ...clear, calc: mode });
  };

  const addComponent = () =>
    setComponents((prev) => [
      ...prev,
      { key: `field${Date.now()}`, label: "New Component", category: "earning", calc: "fixed", amount: 0 },
    ]);

  const remove = (idx: number) => setComponents((prev) => prev.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) =>
    setComponents((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const saveStructure = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/payroll/structure/${encodeURIComponent(employeeId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components }),
      });
      const data = await res.json();
      setMsg(data.success ? "Salary structure saved." : data.error || "Save failed");
      if (data.success) setIsDefault(false);
    } finally {
      setSaving(false);
    }
  };

  const buildOverrides = () => {
    const overrides: Record<string, number> = {};
    for (const [k, v] of Object.entries(edits)) {
      const n = parseFloat(v);
      if (v !== "" && Number.isFinite(n)) overrides[k] = n;
    }
    if (extraDuty.trim() !== "" && Number.isFinite(parseFloat(extraDuty))) {
      overrides.extraDuty = parseFloat(extraDuty);
    }
    return overrides;
  };

  // "Generate" — compute a preview only; nothing is saved.
  const runPreview = async () => {
    setGenerating(true);
    setMsg("");
    try {
      const res = await fetch(`/api/payroll/payslips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, overrides: buildOverrides(), preview: true }),
      });
      const data = await res.json();
      if (data.success) {
        setPayslip(data.payslip);
        setIsSaved(false);
      } else {
        setMsg(data.error || "Could not generate preview");
      }
    } finally {
      setGenerating(false);
    }
  };

  // "Save" — persist the payslip (asks before overwriting an existing month).
  const savePayslip = async (force = false) => {
    setGenerating(true);
    setMsg("");
    try {
      const res = await fetch(`/api/payroll/payslips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, overrides: buildOverrides(), force }),
      });
      const data = await res.json();
      if (data.success) {
        setPayslip(data.payslip);
        setIsSaved(true);
        await loadHistory();
        setMsg("Payslip saved.");
      } else if (data.exists) {
        if (confirm("A saved payslip for this month already exists. Replace it?")) {
          await savePayslip(true);
          return;
        }
      } else {
        setMsg(data.error || "Save failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  const viewFromHistory = (p: Payslip) => {
    setPayslip(p);
    setIsSaved(true);
    setMonth(p.month);
    document.getElementById("payslip-doc")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto text-black">
      <Link href="/admin/payroll" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Payroll
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{employee?.fullName || employeeId}</h1>
        <p className="text-gray-600 text-sm">
          {employeeId}{employee?.designation ? ` · ${employee.designation}` : ""}
          {employee?.workLocation ? ` · ${employee.workLocation}` : ""}
        </p>
        {isDefault && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
            No structure saved yet — this is the default template. Go to <b>Config Payments</b>, adjust and Save to attach it to this employee.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {([["generate", "Generate Payslip"], ["config", "Config Payments"]] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm ${
              tab === t ? "border-amber-600 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---- Config Payments tab: salary structure editor ---- */}
      {tab === "config" && (
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Calculator className="w-5 h-5 text-amber-600" /> Salary Structure</h2>
          <div className="flex gap-2">
            <button onClick={addComponent} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Add component
            </button>
            <button onClick={saveStructure} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save structure
            </button>
          </div>
        </div>

        {/* Location salary — resolved live from the site rate card by designation. */}
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm border ${locationRate ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
          <MapPin className="w-4 h-4 inline-block mr-1 -mt-0.5" />
          {locationRate ? (
            <>
              Auto-filled from location salary
              {employee?.workLocation ? ` (${employee.workLocation}` : ""}
              {employee?.designation ? ` · ${employee.designation})` : employee?.workLocation ? ")" : ""}:
              {" "}<b>Rate {formatINR(locationRate.rate)}</b> · <b>Rate/Day {formatINR(locationRate.ratePerDay)}</b>
            </>
          ) : (
            <>No location salary found for {employee?.designation ? `“${employee.designation}”` : "this designation"}
              {employee?.workLocation ? ` at ${employee.workLocation}` : ""}. Set a rate card for the location under Organisation → Locations.</>
          )}
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Component</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Calculation</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Config</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-900">Amount</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {components.map((c, idx) => (
                <tr key={c.key} className="align-top">
                  <td className="px-3 py-2">
                    <input
                      value={c.label}
                      onChange={(e) => patch(idx, { label: e.target.value })}
                      className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select value={c.category} onChange={(e) => patch(idx, { category: e.target.value as ComponentCategory })}
                      className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500">
                      {CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select value={modeOf(c)} onChange={(e) => setMode(idx, e.target.value as CalcMode)}
                      className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500">
                      {CALC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {c.calc === "perDay" ? (
                      <div className="flex flex-col gap-1">
                        <KeySelect label="Rate" value={c.rateKey} options={keyOptions} exclude={c.key} onChange={(v) => patch(idx, { rateKey: v })} />
                        <KeySelect label="Days" value={c.daysKey} options={keyOptions} exclude={c.key} onChange={(v) => patch(idx, { daysKey: v })} />
                      </div>
                    ) : c.calc === "percentOf" ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={c.percent ?? 0} onChange={(e) => patch(idx, { percent: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-gray-300 rounded" /> %
                        <KeySelect label="of" value={c.baseKey} options={keyOptions} exclude={c.key} onChange={(v) => patch(idx, { baseKey: v })} />
                      </div>
                    ) : c.autoFromLocation ? (
                      <span className="text-xs text-amber-600">auto-filled from location salary</span>
                    ) : c.calc === "fixed" ? (
                      <span className="text-xs text-gray-400">{c.autoFromAttendance ? `auto: ${c.autoFromAttendance} from attendance` : "typed amount"}</span>
                    ) : (
                      <span className="text-xs text-gray-400">auto-calculated</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.autoFromLocation ? (
                      <span className={`inline-block px-2 py-0.5 rounded ${catColor[c.category]}`} title="Resolved live from the location rate card">
                        {formatINR(computed.values[c.key] ?? 0)}
                      </span>
                    ) : c.calc === "fixed" && c.autoFromAttendance ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <input type="number" value={c.amount ?? 0} onChange={(e) => patch(idx, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right" />
                        <span className="text-[10px] text-gray-400" title="On a real payslip this comes from attendance (and the Extra Duty field). This value only affects the preview.">
                          preview only
                        </span>
                      </div>
                    ) : c.calc === "fixed" ? (
                      <input type="number" value={c.amount ?? 0} onChange={(e) => patch(idx, { amount: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right" />
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded ${catColor[c.category]}`}>{formatINR(computed.values[c.key] ?? 0)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => move(idx, -1)} className="p-1 hover:bg-gray-100 rounded" title="Move up"><ArrowUp className="w-3.5 h-3.5 text-gray-500" /></button>
                      <button onClick={() => move(idx, 1)} className="p-1 hover:bg-gray-100 rounded" title="Move down"><ArrowDown className="w-3.5 h-3.5 text-gray-500" /></button>
                      <button onClick={() => remove(idx)} className="p-1 hover:bg-red-50 rounded" title="Remove"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <Tile label="Gross Pay" value={formatINR(computed.grossPay)} color="green" />
          <Tile label="Total Deduction" value={formatINR(computed.totalDeduction)} color="red" />
          <Tile label="Net Pay" value={formatINR(computed.netPay)} color="amber" />
        </div>
        {msg && <p className="text-sm text-gray-600 mt-3">{msg}</p>}
      </section>
      )}

      {/* ---- Generate Payslip tab ---- */}
      {tab === "generate" && (
      <>
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-amber-600" /> Generate Payslip</h2>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPayslip(null); setEdits({}); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Extra Duty (days)</label>
            <input type="number" min={0} value={extraDuty} onChange={(e) => setExtraDuty(e.target.value)} placeholder="0"
              className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <button onClick={runPreview} disabled={generating || isDefault}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Generate preview
          </button>
          {isDefault && <span className="text-xs text-amber-700">Save the structure first.</span>}
        </div>

        {/* Attendance breakdown for the selected month (drives the auto Duty count) */}
        <div className="flex flex-wrap gap-2 mb-4 text-sm">
          <AttChip label="Present" value={attSummary?.present ?? 0} cls="bg-green-100 text-green-800" />
          <AttChip label="Half Day" value={attSummary?.halfDay ?? 0} cls="bg-amber-100 text-amber-800" />
          <AttChip label="Absent" value={attSummary?.absent ?? 0} cls="bg-red-100 text-red-700" />
          <AttChip label="Duty (auto)" value={dutyDays} cls="bg-slate-800 text-white" />
          {extraDuty.trim() !== "" && <AttChip label="Extra Duty" value={parseFloat(extraDuty) || 0} cls="bg-blue-100 text-blue-800" />}
        </div>

        {/* Adjust variable fixed amounts for this month (advances, deductions, etc.) */}
        {payslip && (
          <details className="mb-4 border border-gray-200 rounded-lg">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 select-none">Adjust amounts for this month</summary>
            <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-gray-100">
              {components.filter((c) => c.calc === "fixed" && !c.autoFromAttendance && !c.autoFromLocation).map((c) => (
                <label key={c.key} className="text-xs text-gray-500">
                  {c.label}
                  <input type="number" value={edits[c.key] ?? ""} placeholder={String(c.amount ?? 0)}
                    onChange={(e) => setEdits((p) => ({ ...p, [c.key]: e.target.value }))}
                    className="mt-0.5 w-full px-2 py-1 border border-gray-300 rounded text-gray-900" />
                </label>
              ))}
              <div className="col-span-full">
                <button onClick={runPreview} disabled={generating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-amber-600 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-60">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Update preview
                </button>
              </div>
            </div>
          </details>
        )}

        {payslip && (
          <div>
            <div className="flex items-center justify-end gap-2 mb-3">
              {!isSaved && <span className="text-xs text-amber-700 mr-auto">Preview — not saved yet.</span>}
              {isSaved && <span className="text-xs text-green-700 mr-auto">Saved ✓</span>}
              <button onClick={() => savePayslip(false)} disabled={generating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save payslip
              </button>
              <button onClick={() => downloadPayslipPDF(payslip)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            <PayslipDocument payslip={payslip} company={company} />
          </div>
        )}
      </section>

      {/* ---- History ---- */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-bold text-gray-900 mb-4">Payslip History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No payslips generated yet.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Month</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Ref</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Gross</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Deductions</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Net Pay</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((p) => (
                  <tr key={p.refId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800">{p.month}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{p.refId}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatINR(p.grossPay)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatINR(p.totalDeduction)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatINR(p.netPay)}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => viewFromHistory(p)} className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700" title="Open & download">
                        <FileText className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </>
      )}
    </div>
  );
}

function KeySelect({ label, value, options, exclude, onChange }: {
  label: string; value?: string; options: { key: string; label: string }[]; exclude: string; onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-gray-500">
      {label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="px-1.5 py-1 border border-gray-300 rounded text-gray-800">
        <option value="">—</option>
        {options.filter((o) => o.key !== exclude).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  );
}

function AttChip({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${cls}`}>
      {label}: {value}
    </span>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  const map: Record<string, string> = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-lg p-3 text-center ${map[color]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

// Capture the on-screen payslip document exactly as shown → single-page A4 PDF.
async function downloadPayslipPDF(p: Payslip) {
  const node = document.getElementById("payslip-doc");
  if (!node) return;
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pw) / canvas.width;
  pdf.addImage(img, "PNG", 0, 0, pw, Math.min(imgH, ph));
  pdf.save(`payslip-${p.employeeId}-${p.month}.pdf`);
}

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTH_NAMES[Number(mm)] || m} ${y}`;
};

// A styled, print-ready payslip. This exact node is what the PDF captures.
function PayslipDocument({ payslip: p, company }: { payslip: Payslip; company: any }) {
  const earnings = p.lines.filter((l) => l.category === "earning");
  const deductions = p.lines.filter((l) => l.category === "deduction");
  const rows = Math.max(earnings.length, deductions.length);
  const companyName = company?.companyName || "Sachin Security Services Pvt. Ltd.";
  const addr = company ? [company.address, [company.city, company.state, company.pincode].filter(Boolean).join(", ")].filter(Boolean) : [];

  return (
    <div id="payslip-doc" className="mx-auto bg-white text-gray-900" style={{ width: 794, padding: 32, border: "1px solid #e5e7eb" }}>
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b-2 border-amber-600">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" style={{ width: 64, height: 64, objectFit: "contain" }} crossOrigin="anonymous" />
        <div className="flex-1">
          <div className="text-xl font-bold text-gray-900">{companyName}</div>
          {addr.map((a: string, i: number) => <div key={i} className="text-xs text-gray-500">{a}</div>)}
          {company?.phone && <div className="text-xs text-gray-500">{company.phone} · {company.email}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-amber-700">SALARY SLIP</div>
          <div className="text-sm text-gray-600">{monthLabel(p.month)}</div>
        </div>
      </div>

      {/* Employee info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mt-4 mb-4">
        <InfoRow k="Employee" v={p.employeeName} />
        <InfoRow k="Employee ID" v={p.employeeId} />
        <InfoRow k="Designation" v={p.designation || "—"} />
        <InfoRow k="Work Location" v={p.workLocation || "—"} />
        {p.uanNumber && <InfoRow k="UAN No." v={p.uanNumber} />}
        {p.esiNumber && <InfoRow k="ESI No." v={p.esiNumber} />}
        <InfoRow k="Duty Days" v={String(p.dutyDays)} />
        <InfoRow k="Extra Duty" v={String(p.extraDutyDays)} />
        <InfoRow k="Ref No." v={p.refId} />
        <InfoRow k="Generated" v={new Date(p.generatedAt).toLocaleDateString("en-IN")} />
      </div>

      {/* Earnings / Deductions table */}
      <table className="w-full text-sm border border-gray-300" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th className="text-left px-3 py-1.5 bg-green-600 text-white border border-gray-300">Earnings</th>
            <th className="text-right px-3 py-1.5 bg-green-600 text-white border border-gray-300">Amount</th>
            <th className="text-left px-3 py-1.5 bg-red-600 text-white border border-gray-300">Deductions</th>
            <th className="text-right px-3 py-1.5 bg-red-600 text-white border border-gray-300">Amount</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={i % 2 ? "bg-gray-50" : "bg-white"}>
              <td className="px-3 py-1.5 border border-gray-200">{earnings[i]?.label ?? ""}</td>
              <td className="px-3 py-1.5 border border-gray-200 text-right">{earnings[i] ? formatINR(earnings[i].amount) : ""}</td>
              <td className="px-3 py-1.5 border border-gray-200">{deductions[i]?.label ?? ""}</td>
              <td className="px-3 py-1.5 border border-gray-200 text-right">{deductions[i] ? formatINR(deductions[i].amount) : ""}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="px-3 py-1.5 border border-gray-300 bg-green-50">Gross Pay</td>
            <td className="px-3 py-1.5 border border-gray-300 bg-green-50 text-right text-green-800">{formatINR(p.grossPay)}</td>
            <td className="px-3 py-1.5 border border-gray-300 bg-red-50">Total Deduction</td>
            <td className="px-3 py-1.5 border border-gray-300 bg-red-50 text-right text-red-700">{formatINR(p.totalDeduction)}</td>
          </tr>
        </tbody>
      </table>

      {/* Net pay */}
      <div className="flex items-center justify-between mt-4 px-4 py-3 bg-amber-600 text-white rounded">
        <span className="font-semibold">NET PAY</span>
        <span className="text-xl font-bold">{formatINR(p.netPay)}</span>
      </div>
      <div className="text-xs text-gray-600 italic mt-1">({amountInWords(p.netPay)})</div>

      <div className="text-[10px] text-gray-400 mt-6 pt-3 border-t border-gray-200">
        This is a system-generated payslip and does not require a signature.
      </div>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex">
      <span className="text-gray-500 w-32 shrink-0">{k}</span>
      <span className="font-medium text-gray-900">: {v}</span>
    </div>
  );
}
