// d3-org-chart ships no TypeScript types; the chart is used via a thin wrapper
// (app/components/OrgChart.tsx) with a builder API, so an opaque module
// declaration is sufficient.
declare module "d3-org-chart";
