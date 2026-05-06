import assert from "node:assert/strict";
import { createVlanSchema } from "../validators/vlan.schemas.js";
import { collectVlanAddressingValidationMessages } from "../validators/addressingTrust.schemas.js";
import { buildDiagramRenderModel } from "../domain/diagram/index.js";
import { findOverclaimRisks, reportCanClaimReady } from "../domain/reporting/index.js";
import type { DiagramNetworkObjectModelInput, DiagramOverlaySummaryInput } from "../domain/diagram/index.js";
import type { ReportExportEvidenceDocument } from "../domain/reporting/index.js";

function expectParseFailure(name: string, value: unknown, expectedText: string) {
  const result = createVlanSchema.safeParse(value);
  assert.equal(result.success, false, `${name}: expected schema to reject invalid network input`);
  assert.ok(result.success === false && result.error.issues.some((issue) => issue.message.includes(expectedText)), `${name}: expected issue containing ${expectedText}`);
}

const baseVlan = {
  siteId: "11111111-1111-4111-8111-111111111111",
  vlanId: 10,
  vlanName: "Corporate Users",
  purpose: "user access",
  subnetCidr: "10.20.10.0/24",
  gatewayIp: "10.20.10.1",
  dhcpEnabled: true,
  estimatedHosts: 120,
};

assert.equal(createVlanSchema.safeParse(baseVlan).success, true);
expectParseFailure("gateway outside subnet", { ...baseVlan, subnetCidr: "10.21.0.0/24", gatewayIp: "10.20.90.1" }, "outside 10.21.0.0/24");
expectParseFailure("noncanonical subnet", { ...baseVlan, subnetCidr: "10.20.10.9/24", gatewayIp: "10.20.10.1" }, "network boundary");
expectParseFailure("broadcast gateway", { ...baseVlan, gatewayIp: "10.20.10.255" }, "broadcast address");
assert.ok(collectVlanAddressingValidationMessages({ ...baseVlan, gatewayIp: "10.99.99.1" }).some((message) => message.includes("outside 10.20.10.0/24")));

const overlays: DiagramOverlaySummaryInput[] = [
  { key: "addressing", label: "Addressing", readiness: "ready", detail: "Addressing exists.", count: 1 },
  { key: "routing", label: "Routing", readiness: "review", detail: "Routing intent review.", count: 1 },
  { key: "security", label: "Security", readiness: "review", detail: "Security review.", count: 1 },
];

const diagramInput: DiagramNetworkObjectModelInput = {
  summary: { orphanedAddressRowCount: 0 },
  devices: [],
  routeDomains: [{ id: "rd-default", name: "Default", truthState: "planned", siteIds: ["site-hq"], subnetCidrs: ["10.20.10.0/24"], interfaceIds: [], linkIds: [], summarizationState: "review", notes: [] }],
  securityZones: [{ id: "zone-internal", name: "Internal", zoneRole: "internal", truthState: "planned", siteIds: ["site-hq"], vlanIds: [10], subnetCidrs: ["10.20.10.0/24"], routeDomainId: "rd-default", isolationExpectation: "restricted", notes: [] }],
  policyRules: [],
  dhcpPools: [],
  designGraph: {
    nodes: [
      { id: "graph-site-hq", objectType: "site", objectId: "site-hq", label: "HQ", truthState: "configured", notes: [] },
      { id: "graph-vlan-users", objectType: "vlan", objectId: "vlan-hq-users", label: "VLAN 10 Users", siteId: "site-hq", truthState: "planned", notes: [] },
      { id: "graph-subnet-users", objectType: "subnet", objectId: "10.20.10.0/24", label: "10.20.10.0/24", siteId: "site-hq", truthState: "planned", notes: [] },
    ],
    edges: [{ id: "edge-vlan-subnet", relationship: "vlan-uses-subnet", sourceNodeId: "graph-vlan-users", targetNodeId: "graph-subnet-users", truthState: "planned", required: true, notes: [] }],
    integrityFindings: [],
  },
  routingSegmentation: { reachabilityFindings: [] },
  securityPolicyFlow: { findings: [] },
  implementationPlan: { steps: [], verificationChecks: [], findings: [] },
};

const renderModel = buildDiagramRenderModel({ networkObjectModel: diagramInput, overlaySummaries: overlays, hotspots: [] });
const plannedNodes = renderModel.nodes.filter((node) => ["planned", "inferred", "proposed", "review-required"].includes(node.truthState));
assert.ok(plannedNodes.length > 0);
assert.equal(plannedNodes.some((node) => node.readiness === "ready"), false);
assert.equal(renderModel.edges.filter((edge) => edge.relatedObjectIds.length === 0 && !edge.relationship).length, 0);

const overclaimingReport: ReportExportEvidenceDocument = {
  readiness: "READY",
  proofBoundary: ["Modeled evidence only; live device state is not proven."],
  findings: [{ severity: "REVIEW_REQUIRED", code: "MANUAL_REVIEW", title: "Manual review remains", detail: "A review item remains.", affectedSectionKeys: ["addressing"], readinessImpact: "REVIEW_REQUIRED", remediation: "Resolve or keep review wording." }],
  sections: [{ key: "addressing", title: "Addressing", status: "verified", summary: "Addressing exists.", facts: ["10.20.10.0/24"], findings: [], evidence: ["backend addressing row"], limitations: [], recommendedActions: [] }],
};
assert.equal(reportCanClaimReady(overclaimingReport), false);
assert.ok(findOverclaimRisks(overclaimingReport).some((risk) => risk.includes("review/warning")));

const readyReport: ReportExportEvidenceDocument = {
  readiness: "READY",
  proofBoundary: ["Modeled evidence only; live device state is not proven."],
  findings: [{ severity: "PASSED", code: "REPORT_OK", title: "Report controlled", detail: "No blockers.", affectedSectionKeys: [], readinessImpact: "READY", remediation: "None." }],
  sections: [{ key: "addressing", title: "Addressing", status: "verified", summary: "Addressing exists.", facts: ["10.20.10.0/24"], findings: [], evidence: ["backend addressing row"], limitations: [], recommendedActions: [] }],
};
assert.equal(reportCanClaimReady(readyReport), true);
console.log("[V1] network engineer trust selftest passed");
