"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

export interface OrgChartDatum {
  id: string;
  parentId: string;
  name: string;
  position?: string;
  department?: string;
  image?: string;
}

export interface OrgChartHandle {
  expandAll: () => void;
  collapseAll: () => void;
  fit: () => void;
}

const escapeHtml = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/**
 * Thin React wrapper around d3-org-chart (bumbeishvili). The library is
 * imperative and touches the DOM, so it is instantiated in an effect and reused
 * across data changes. Control methods are exposed via a ref so the parent can
 * lay the toolbar out however it likes. Rendered client-side only.
 */
const OrgChart = forwardRef<OrgChartHandle, { data: OrgChartDatum[] }>(function OrgChart({ data }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { OrgChart } = await import("d3-org-chart");
      if (cancelled || !containerRef.current) return;
      if (!chartRef.current) chartRef.current = new OrgChart();

      chartRef.current
        .container(containerRef.current)
        .data(data)
        .nodeHeight(() => 128)
        .nodeWidth(() => 230)
        .childrenMargin(() => 50)
        .compactMarginBetween(() => 35)
        .compactMarginPair(() => 30)
        .neighbourMargin(() => 20)
        .nodeContent((d: any) => {
          const name = escapeHtml(d.data.name);
          const position = escapeHtml(d.data.position || "—");
          const dept = d.data.department ? `<div style="color:#9CA3AF;font-size:10px;margin-top:2px">${escapeHtml(d.data.department)}</div>` : "";
          const total = d.data._totalSubordinates || 0;
          const img = d.data.image;
          const avatar = img
            ? `<img src="${escapeHtml(img)}" style="width:44px;height:44px;border-radius:9999px;object-fit:cover;border:2px solid #fff;box-shadow:0 0 0 1px #E4E2E9" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>`
            : "";
          const fallback = `<div style="display:${img ? "none" : "flex"};width:44px;height:44px;border-radius:9999px;background:#FEF3C7;color:#B45309;align-items:center;justify-content:center;font-weight:600;font-size:15px;border:2px solid #fff">${escapeHtml(initials(d.data.name))}</div>`;
          return `
            <div style="width:${d.width}px;height:${d.height}px;padding-top:23px;box-sizing:border-box;font-family:Inter,system-ui,sans-serif">
              <div style="height:${d.height - 23}px;background:#fff;border:1px solid #E4E2E9;border-radius:10px;position:relative;padding:0 12px 10px">
                <div style="position:absolute;top:-22px;left:16px">${avatar}${fallback}</div>
                ${total ? `<div style="position:absolute;top:8px;right:10px;font-size:10px;color:#9CA3AF">${total} report${total > 1 ? "s" : ""}</div>` : ""}
                <div style="padding-top:28px;font-size:14px;font-weight:600;color:#08011E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
                <div style="color:#716E7B;font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${position}</div>
                ${dept}
                <div style="font-size:9px;color:#C7C5CE;margin-top:5px">#${escapeHtml(d.data.id)}</div>
              </div>
            </div>`;
        })
        .render();
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  useImperativeHandle(ref, () => ({
    expandAll: () => chartRef.current?.expandAll().render(),
    collapseAll: () => chartRef.current?.collapseAll().render(),
    fit: () => chartRef.current?.fit(),
  }));

  return <div ref={containerRef} className="w-full bg-gray-50 border border-gray-200 rounded-lg" style={{ height: 620 }} />;
});

export default OrgChart;
