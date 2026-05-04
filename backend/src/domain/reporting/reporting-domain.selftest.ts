import assert from "node:assert/strict";
import { buildReportEvidenceDocument, buildV1ReportExportTruthControl, findOverclaimRisks, reportCanClaimReady } from "./index.js";

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

const summary = buildV1ReportExportTruthControl({
  reportTruth: {
    overallReadiness: "review",
    overallReadinessLabel: "Review required",
    blockedFindings: [],
    reviewFindings: [{ source: "security", severity: "WARNING", title: "Guest policy needs review", detail: "Guest internet flow needs engineer review." }],
    implementationReviewQueue: [{ id: "step-guest", title: "Prepare guest policy" }],
    verificationChecks: [],
    rollbackActions: [{ id: "rollback-guest", name: "Rollback guest policy" }],
    limitations: ["Live device state is not proven."],
  },
  diagramTruth: {
    overallReadiness: "review",
    renderModel: { summary: { nodeCount: 4, edgeCount: 3 } },
    emptyStateReason: "",
  },
  V1RequirementsClosure: {
    closureMatrix: [{
      key: "guestAccess",
      label: "Guest access",
      active: true,
      lifecycleStatus: "FULLY_PROPAGATED",
      actualAffectedEngines: ["requirements", "addressing", "security", "report", "diagram"],
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
  },
  V1CidrAddressingTruth: { validSubnetCount: 1, invalidSubnetCount: 0, overlapIssueCount: 0, blockedProposalCount: 0, undersizedSubnetCount: 0, gatewayIssueCount: 0, requirementAddressingGapCount: 0 },
  V1EnterpriseIpamTruth: { overallReadiness: "PASSED", durableAllocationCount: 1, conflictBlockerCount: 0, activeRequirementIpamGapCount: 0 },
  V1ValidationReadiness: { overallReadiness: "WARNING", blockingFindingCount: 0, findings: [] },
  V1NetworkObjectModel: { overallReadiness: "READY", findings: [] },
  V1RoutingSegmentation: { overallReadiness: "REVIEW_REQUIRED", routeIntentCount: 1, protocolIntentCount: 1, findings: [] },
  V1SecurityPolicyFlow: { overallReadiness: "REVIEW_REQUIRED", flowConsequenceCount: 1, zonePolicyReviewCount: 1, findings: [] },
  V1ImplementationPlanning: { overallReadiness: "REVIEW_REQUIRED", stepGateCount: 1, blockedStepGateCount: 0, findings: [] },
  V1ImplementationTemplates: { templateCount: 1, findings: [] },
  networkObjectModel,
});

assert.equal(summary.contract, "V1_REPORT_EXPORT_TRUTH_CONTRACT");
assert.equal(summary.role, "REPORT_EXPORT_BACKEND_TRUTH_REQUIREMENT_TRACEABILITY_DELIVERABLE_GATE");
assert(summary.sectionGates.some((row) => row.sectionKey === "requirement-traceability"));
assert(summary.traceabilityMatrix.some((row) => row.requirementKey === "guestAccess" && row.reportSection === "Requirement Traceability Matrix"));
assert(summary.truthLabelRows.some((row) => row.truthLabel === "DURABLE_IPAM"));
assert(summary.truthLabelRows.some((row) => row.truthLabel === "BACKEND_COMPUTED"));
assert.equal(summary.pdfDocxCsvCovered, true);
assert(summary.proofBoundary.some((line) => line.includes("PDF/DOCX/CSV")));
assert.notEqual(summary.overallReadiness, "READY");

const evidenceDocument = buildReportEvidenceDocument(summary);
assert.equal(evidenceDocument.readiness, summary.overallReadiness);
assert(evidenceDocument.sections.every((section) => section.evidence.length > 0));
assert.equal(reportCanClaimReady(evidenceDocument), false);
assert(findOverclaimRisks(evidenceDocument).some((risk) => risk.includes("must not claim")));

console.log("[V1] Reporting domain selftest passed");
