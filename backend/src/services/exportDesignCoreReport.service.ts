import type { ProfessionalReport } from "./export.types.js";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function applyBackendDesignCoreToReport(report: ProfessionalReport, designCore: any) {
  if (!designCore || typeof designCore !== "object") return report;

  const addressingSection = report.sections.find((section) => section.title.toLowerCase().includes("addressing"));
  const routingSection = report.sections.find((section) => section.title.toLowerCase().includes("routing"));

  const proposedRows = Array.isArray(designCore.proposedRows) ? designCore.proposedRows : [];
  const siteSummaries = Array.isArray(designCore.siteSummaries) ? designCore.siteSummaries : [];
  const transitPlan = Array.isArray(designCore.transitPlan) ? designCore.transitPlan : [];
  const loopbackPlan = Array.isArray(designCore.loopbackPlan) ? designCore.loopbackPlan : [];
  const authority = designCore.authority && typeof designCore.authority === "object" ? designCore.authority : null;
  const generatedAt = authority?.generatedAt ? new Date(authority.generatedAt).toLocaleString() : asString(designCore.generatedAt, "unknown time");

  if (addressingSection) {
    addressingSection.tables = addressingSection.tables ?? [];
    addressingSection.paragraphs = [
      ...addressingSection.paragraphs,
      `Backend design-core snapshot source: ${asString(authority?.source, "backend-design-core")} • mode: ${asString(authority?.mode, "authoritative")} • generated: ${generatedAt} • engineer review required.`,
    ];

    if (proposedRows.length > 0) {
      addressingSection.tables.push({
        title: "Addressing Recommendations",
        headers: ["Site", "VLAN", "Segment", "Recommended Subnet", "Recommended Gateway", "Reason"],
        rows: proposedRows.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          String(row.vlanId ?? "—"),
          asString(row.vlanName, "—"),
          asString(row.proposedSubnetCidr, row.recommendedPrefix ? `/${row.recommendedPrefix}` : "Pending"),
          asString(row.proposedGatewayIp, "Pending"),
          asString(row.reason, "Review before implementation"),
        ]),
      });
    }

    if (siteSummaries.length > 0) {
      addressingSection.tables.push({
        title: "Site Block Review",
        headers: ["Site", "Current Block", "Minimum Summary", "Status", "Notes"],
        rows: siteSummaries.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          asString(row.currentSiteBlock, "Pending"),
          asString(row.minimumRequiredSummary, "Pending"),
          asString(row.status, "review"),
          Array.isArray(row.notes) ? row.notes.join(" ") : asString(row.notes, "Review before implementation"),
        ]),
      });
    }
  }

  if (routingSection) {
    routingSection.tables = routingSection.tables ?? [];

    if (transitPlan.length > 0) {
      routingSection.tables.push({
        title: "Transit Plan",
        headers: ["Site", "Type", "Subnet", "Endpoint", "Notes"],
        rows: transitPlan.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          asString(row.kind, "review"),
          asString(row.subnetCidr, "Pending"),
          asString(row.gatewayOrEndpoint, "Pending"),
          Array.isArray(row.notes) ? row.notes.join(" ") : asString(row.notes, "Review before implementation"),
        ]),
      });
    }

    if (loopbackPlan.length > 0) {
      routingSection.tables.push({
        title: "Loopback Plan",
        headers: ["Site", "Type", "Subnet / Endpoint", "Notes"],
        rows: loopbackPlan.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          asString(row.kind, "review"),
          asString(row.subnetCidr, asString(row.endpointIp, "Pending")),
          Array.isArray(row.notes) ? row.notes.join(" ") : asString(row.notes, "Review before implementation"),
        ]),
      });
    }
  }

  return report;
}
