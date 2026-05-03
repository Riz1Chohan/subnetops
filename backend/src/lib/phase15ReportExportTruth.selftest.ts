import assert from "node:assert/strict";
import { buildPhase15ReportExportTruthControl } from "../services/designCore/designCore.phase15ReportExportTruthControl.js";

const networkObjectModel: any = {
  summary: { deviceCount: 2, interfaceCount: 3, linkCount: 1 },
  devices: [{ id: "dev-core", truthState: "MATERIALIZED" }, { id: "dev-fw", truthState: "INFERRED" }],
  interfaces: [{ id: "if-core", truthState: "MATERIALIZED" }],
  links: [{ id: "link-wan", truthState: "INFERRED" }],
  securityZones: [{ id: "zone-guest", truthState: "MATERIALIZED" }],
  routeDomains: [{ id: "rd-default", truthState: "MATERIALIZED" }],
  dhcpPools: [{ id: "dhcp-guest" }],
  ipReservations: [],
};

const reportTruth: any = {
  overallReadiness: "review",
  overallReadinessLabel: "Review required",
  readiness: { routing: "review", security: "review", nat: "ready", implementation: "review" },
  blockedFindings: [],
  reviewFindings: [{ source: "security", severity: "WARNING", title: "Guest policy needs review", detail: "Guest internet flow needs engineer review." }],
  implementationReviewQueue: [{ id: "step-guest", title: "Prepare guest policy" }],
  verificationChecks: [],
  rollbackActions: [{ id: "rollback-guest", name: "Rollback guest policy" }],
  limitations: ["Live device state is not proven."],
};

const diagramTruth: any = {
  overallReadiness: "review",
  renderModel: { summary: { nodeCount: 4, edgeCount: 3 } },
  emptyStateReason: "",
};

const phase3RequirementsClosure: any = {
  closureMatrix: [{
    key: "guestAccess",
    label: "Guest access",
    active: true,
    lifecycleStatus: "FULLY_PROPAGATED",
    readinessImpact: "READY",
    actualAffectedEngines: ["requirements", "addressing", "security", "reportTruth", "diagramTruth"],
    expectedAffectedEngines: ["requirements", "addressing", "security", "implementation"],
    concreteOutputs: ["Guest VLAN", "Guest security flow"],
    missingConsumers: [],
    materializedObjectIds: ["zone-guest", "dhcp-guest"],
  }],
  fullPropagatedCount: 1,
  partialPropagatedCount: 0,
  reviewRequiredCount: 0,
  blockedCount: 0,
  missingConsumerCount: 0,
};

const summary = buildPhase15ReportExportTruthControl({
  reportTruth,
  diagramTruth,
  phase3RequirementsClosure,
  phase4CidrAddressingTruth: { validSubnetCount: 1, invalidSubnetCount: 0, overlapIssueCount: 0, blockedProposalCount: 0, undersizedSubnetCount: 0, gatewayIssueCount: 0, requirementAddressingGapCount: 0 } as any,
  phase5EnterpriseIpamTruth: { overallReadiness: "PASSED", durableAllocationCount: 1, conflictBlockerCount: 0, activeRequirementIpamGapCount: 0 } as any,
  phase8ValidationReadiness: { overallReadiness: "WARNING", blockingFindingCount: 0, findings: [] } as any,
  phase9NetworkObjectModel: { overallReadiness: "READY", findings: [] } as any,
  phase11RoutingSegmentation: { overallReadiness: "REVIEW_REQUIRED", routeIntentCount: 1, protocolIntentCount: 1, findings: [] } as any,
  phase12SecurityPolicyFlow: { overallReadiness: "REVIEW_REQUIRED", flowConsequenceCount: 1, zonePolicyReviewCount: 1, findings: [] } as any,
  phase13ImplementationPlanning: { overallReadiness: "REVIEW_REQUIRED", stepGateCount: 1, blockedStepGateCount: 0, findings: [] } as any,
  phase14ImplementationTemplates: { templateCount: 1, findings: [] } as any,
  networkObjectModel,
});

assert.equal(summary.contract, "PHASE15_REPORT_EXPORT_TRUTH_CONTRACT");
assert.equal(summary.role, "REPORT_EXPORT_BACKEND_TRUTH_REQUIREMENT_TRACEABILITY_DELIVERABLE_GATE");
assert(summary.sectionGates.some((row) => row.sectionKey === "requirement-traceability"));
assert(summary.traceabilityMatrix.some((row) => row.requirementKey === "guestAccess" && row.reportSection === "Requirement Traceability Matrix"));
assert(summary.truthLabelRows.some((row) => row.truthLabel === "BACKEND_COMPUTED"));
assert.equal(summary.pdfDocxCsvCovered, true);
assert(summary.proofBoundary.some((line) => line.includes("PDF/DOCX/CSV")));
assert.notEqual(summary.overallReadiness, "READY");
console.log("[phase15] Report/export truth selftest passed");
