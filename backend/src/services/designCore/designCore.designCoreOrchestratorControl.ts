import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  BrownfieldReadinessSummary,
  CurrentStateBoundarySummary,
  DesignCoreAddressRow,
  DesignCoreIssue,
  DesignCoreProposalRow,
  DesignCoreSiteBlock,
  DesignTraceabilityItem,
  DiscoveredStateImportPlanSummary,
  EnterpriseAllocatorPostureSummary,
  ImplementationReadinessSummary,
  NetworkObjectModel,
  V1PlanningTraceabilityControlSummary,
  V1RequirementsMaterializationControlSummary,
  V1RequirementsClosureControlSummary,
  V1CidrAddressingTruthControlSummary,
  V1EnterpriseIpamTruthControlSummary,
  PlanningInputCoverageSummary,
  PlanningInputDisciplineSummary,
  RequirementsCoverageSummary,
  RequirementsImpactClosureSummary,
  RequirementsScenarioProofSummary,
  StandardsAlignmentSummary,
  VendorNeutralImplementationTemplateModel,
} from "../designCore.types.js";

export const V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT = "V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT" as const;
// V1DesignCoreOrchestrator snapshot field is the named DesignCoreSnapshot control surface.

const REQUIREMENT_CONTEXT_PATHS = [
  "V1TraceabilityControl.requirementLineage",
  "V1RequirementsMaterialization.fieldOutcomes",
  "V1RequirementsClosure.closureMatrix",
] as const;

type V1SectionInput = {
  projectId: string;
  projectName: string;
  planningInputCoverage: PlanningInputCoverageSummary;
  planningInputDiscipline: PlanningInputDisciplineSummary;
  requirementsCoverage: RequirementsCoverageSummary;
  requirementsImpactClosure: RequirementsImpactClosureSummary;
  requirementsScenarioProof: RequirementsScenarioProofSummary;
  V1TraceabilityControl: V1PlanningTraceabilityControlSummary;
  V1RequirementsMaterialization: V1RequirementsMaterializationControlSummary;
  V1RequirementsClosure: V1RequirementsClosureControlSummary;
  V1CidrAddressingTruth: V1CidrAddressingTruthControlSummary;
  V1EnterpriseIpamTruth: V1EnterpriseIpamTruthControlSummary;
  traceability: DesignTraceabilityItem[];
  siteBlocks: DesignCoreSiteBlock[];
  addressingRows: DesignCoreAddressRow[];
  proposedRows: DesignCoreProposalRow[];
  enterpriseAllocatorPosture: EnterpriseAllocatorPostureSummary;
  standardsAlignment: StandardsAlignmentSummary;
  currentStateBoundary: CurrentStateBoundarySummary;
  brownfieldReadiness: BrownfieldReadinessSummary;
  discoveredStateImportPlan: DiscoveredStateImportPlanSummary;
  networkObjectModel: NetworkObjectModel;
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
  vendorNeutralImplementationTemplates: VendorNeutralImplementationTemplateModel;
  implementationReadiness: ImplementationReadinessSummary;
  issues: DesignCoreIssue[];
};

type SectionDraft = {
  sectionKey: V1SectionKey;
  label: string;
  snapshotPath: string;
  ownerEngine: string;
  sourceType: V1SectionSourceType;
  inputPaths: string[];
  outputPaths: string[];
  downstreamConsumers: string[];
  requirementContextRequired: boolean;
  requirementContextEvidence: string[];
  reportImpact: string;
  diagramImpact: string;
  validationReadinessImpact: string;
  proofGates: string[];
  present: boolean;
  itemCount: number;
  reviewCount: number;
  blockerCount: number;
  notes: string[];
};

export type V1SectionKey =
  | "sourceInputs"
  | "materializedObjects"
  | "addressingTruth"
  | "enterpriseIpamTruth"
  | "standardsTruth"
  | "objectModelTruth"
  | "graphTruth"
  | "routingTruth"
  | "securityTruth"
  | "implementationTruth"
  | "reportTruth"
  | "diagramTruth"
  | "readinessTruth";

export type V1SectionSourceType =
  | "BACKEND_COORDINATED"
  | "BACKEND_COMPUTED"
  | "BACKEND_CONTROL_LEDGER"
  | "ENGINE1_PLANNER"
  | "ENGINE2_DURABLE_AUTHORITY"
  | "REVIEW_GATED";

export type V1OrchestratorReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface V1OrchestratorSectionRow {
  sectionKey: V1SectionKey;
  label: string;
  snapshotPath: string;
  ownerEngine: string;
  sourceType: V1SectionSourceType;
  inputPaths: string[];
  outputPaths: string[];
  downstreamConsumers: string[];
  requirementContextRequired: boolean;
  requirementContextEvidence: string[];
  reportImpact: string;
  diagramImpact: string;
  validationReadinessImpact: string;
  proofGates: string[];
  present: boolean;
  itemCount: number;
  reviewCount: number;
  blockerCount: number;
  readiness: V1OrchestratorReadiness;
  notes: string[];
}

export interface V1OrchestratorDependencyEdge {
  id: string;
  sourceSectionKey: V1SectionKey;
  targetSectionKey: V1SectionKey;
  relationship: string;
  required: boolean;
  evidence: string[];
}

export interface V1OrchestratorBoundaryFinding {
  id: string;
  severity: "INFO" | "WARNING" | "ERROR";
  code: string;
  title: string;
  detail: string;
  affectedSnapshotPath: string;
  readinessImpact: V1OrchestratorReadiness;
}

export interface V1DesignCoreOrchestratorControlSummary {
  contractVersion: typeof V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT;
  orchestratorRole: "DESIGN_CORE_COORDINATOR_NOT_GOD_FILE";
  coordinatorRule: string;
  requirementContextPaths: string[];
  requiredSnapshotSectionCount: number;
  presentSnapshotSectionCount: number;
  missingSnapshotSectionCount: number;
  sectionRows: V1OrchestratorSectionRow[];
  dependencyEdges: V1OrchestratorDependencyEdge[];
  boundaryFindings: V1OrchestratorBoundaryFinding[];
  frontendIndependentTruthRiskCount: number;
  requirementContextGapCount: number;
  reportContextGapCount: number;
  diagramContextGapCount: number;
  readinessContextGapCount: number;
  overallReadiness: V1OrchestratorReadiness;
  notes: string[];
}

function readinessFromCounts(blockerCount: number, reviewCount: number): V1OrchestratorReadiness {
  if (blockerCount > 0) return "BLOCKED";
  if (reviewCount > 0) return "REVIEW_REQUIRED";
  return "READY";
}

function withReadiness(row: SectionDraft): V1OrchestratorSectionRow {
  return {
    ...row,
    readiness: row.present ? readinessFromCounts(row.blockerCount, row.reviewCount) : "BLOCKED",
    notes: row.present ? row.notes : [...row.notes, "Required orchestrator snapshot section is missing; downstream consumers must not invent this truth."],
  };
}

function findingFromSection(row: V1OrchestratorSectionRow): V1OrchestratorBoundaryFinding | null {
  if (!row.present) {
    return {
      id: `V1-missing-${row.sectionKey}`,
      severity: "ERROR",
      code: "DESIGN_CORE_ORCHESTRATOR_SECTION_MISSING",
      title: `${row.label} is missing from design-core snapshot`,
      detail: `${row.snapshotPath} is required by the V1 orchestrator contract. Frontend/report/diagram consumers must not synthesize this section independently.`,
      affectedSnapshotPath: row.snapshotPath,
      readinessImpact: "BLOCKED",
    };
  }
  if (row.blockerCount > 0) {
    return {
      id: `V1-blocked-${row.sectionKey}`,
      severity: "ERROR",
      code: "DESIGN_CORE_ORCHESTRATOR_SECTION_BLOCKED",
      title: `${row.label} has blocking upstream findings`,
      detail: `${row.blockerCount} blocker(s) remain in ${row.snapshotPath}. Design-core may expose the finding, but cannot mark this section implementation-ready.`,
      affectedSnapshotPath: row.snapshotPath,
      readinessImpact: "BLOCKED",
    };
  }
  if (row.reviewCount > 0) {
    return {
      id: `V1-review-${row.sectionKey}`,
      severity: "WARNING",
      code: "DESIGN_CORE_ORCHESTRATOR_SECTION_REVIEW_REQUIRED",
      title: `${row.label} requires engineer review`,
      detail: `${row.reviewCount} review item(s) remain in ${row.snapshotPath}. The section is visible, but downstream consumers must keep review labels.`,
      affectedSnapshotPath: row.snapshotPath,
      readinessImpact: "REVIEW_REQUIRED",
    };
  }
  return null;
}

function buildSectionRows(input: V1SectionInput): V1OrchestratorSectionRow[] {
  const graphSummary = input.networkObjectModel.designGraph.summary;
  const routingSummary = input.networkObjectModel.routingSegmentation.summary;
  const securitySummary = input.networkObjectModel.securityPolicyFlow.summary;
  const implementationSummary = input.networkObjectModel.implementationPlan.summary;
  const reportFindings = [
    ...(Array.isArray((input.reportTruth as any).blockedFindings) ? (input.reportTruth as any).blockedFindings : []),
    ...(Array.isArray((input.reportTruth as any).reviewFindings) ? (input.reportTruth as any).reviewFindings : []),
  ];
  const diagramFindings = [
    ...(Array.isArray((input.diagramTruth as any).blockedFindings) ? (input.diagramTruth as any).blockedFindings : []),
    ...(Array.isArray((input.diagramTruth as any).reviewFindings) ? (input.diagramTruth as any).reviewFindings : []),
    ...(Array.isArray((input.diagramTruth as any).hotspots) ? (input.diagramTruth as any).hotspots : []),
  ];

  const drafts: SectionDraft[] = [
    {
      sectionKey: "sourceInputs",
      label: "Source inputs and requirement context",
      snapshotPath: "planningInputCoverage / planningInputDiscipline / requirementsCoverage / traceability",
      ownerEngine: "designCore.inputNormalization + V1 traceability",
      sourceType: "BACKEND_CONTROL_LEDGER",
      inputPaths: ["project.requirementsJson", "project.sites", "project.vlans", "planningInputAudit"],
      outputPaths: ["planningInputCoverage", "planningInputDiscipline", "requirementsCoverage", "traceability"],
      downstreamConsumers: ["materialization", "addressing", "IPAM", "validation", "frontend", "report", "diagram"],
      requirementContextRequired: true,
      requirementContextEvidence: [...REQUIREMENT_CONTEXT_PATHS],
      reportImpact: "Requirement traceability and assumptions sections consume this context.",
      diagramImpact: "Requirement-driven overlays must trace back to this context when visually relevant.",
      validationReadinessImpact: "Captured-but-not-reflected inputs must remain review/blocking evidence.",
      proofGates: ["check:V1-planning-traceability", "check:V1-design-core-orchestrator"],
      present: input.traceability.length > 0 || input.requirementsCoverage.totalFieldCount > 0,
      itemCount: input.traceability.length + input.requirementsCoverage.totalFieldCount,
      reviewCount: input.planningInputDiscipline.notReflectedCount,
      blockerCount: 0,
      notes: ["Design-core receives normalized requirement context instead of letting downstream engines scrape random project fields."],
    },
    {
      sectionKey: "materializedObjects",
      label: "Materialized objects and explicit no-op/review reasons",
      snapshotPath: "V1RequirementsMaterialization",
      ownerEngine: "requirementsMaterialization.service + V1 policy ledger",
      sourceType: "BACKEND_CONTROL_LEDGER",
      inputPaths: ["requirementsJson", "V1 policy registry", "Project/Site/VLAN/DHCP records"],
      outputPaths: ["V1RequirementsMaterialization.fieldOutcomes", "materialized Site/VLAN/DHCP evidence"],
      downstreamConsumers: ["requirements closure", "addressing", "object model", "validation", "report", "diagram"],
      requirementContextRequired: true,
      requirementContextEvidence: ["V1RequirementsMaterialization.fieldOutcomes", "V1RequirementsClosure.closureMatrix"],
      reportImpact: "Report must show requirement outcomes instead of silently skipping fields.",
      diagramImpact: "Requirement-created objects become visual only when object evidence exists or a review reason is explicit.",
      validationReadinessImpact: "Silent drops and active policy gaps remain readiness findings.",
      proofGates: ["check:V1-requirements-materialization", "check:V1-design-core-orchestrator"],
      present: input.V1RequirementsMaterialization.totalPolicyCount > 0,
      itemCount: input.V1RequirementsMaterialization.totalPolicyCount,
      reviewCount: input.V1RequirementsMaterialization.reviewItemCount + input.V1RequirementsMaterialization.validationBlockerCount + input.V1RequirementsMaterialization.silentDropCount,
      blockerCount: input.V1RequirementsMaterialization.validationBlockerCount,
      notes: ["Materialization can create objects, engine-input signals, validation blockers, review items, explicit no-ops, or unsupported evidence only."],
    },
    {
      sectionKey: "addressingTruth",
      label: "Engine 1 CIDR/addressing truth",
      snapshotPath: "V1CidrAddressingTruth / addressingRows / proposedRows / siteBlocks",
      ownerEngine: "Engine 1 CIDR/address allocator",
      sourceType: "ENGINE1_PLANNER",
      inputPaths: ["siteBlocks", "VLAN subnet/gateway/host demand", "V1 requirements", "V1 closure"],
      outputPaths: ["V1CidrAddressingTruth", "addressingRows", "proposedRows"],
      downstreamConsumers: ["Engine 2 IPAM", "object model", "routing", "security", "report", "diagram", "validation"],
      requirementContextRequired: true,
      requirementContextEvidence: ["V1CidrAddressingTruth.requirementAddressingMatrix", "V1RequirementsClosure.closureMatrix"],
      reportImpact: "Addressing plan tables must come from backend CIDR rows and proof labels.",
      diagramImpact: "Subnet labels and site blocks must come from backend addressing truth only.",
      validationReadinessImpact: "Invalid CIDR, unsafe gateway, overlap, and undersized capacity remain blockers/review findings.",
      proofGates: ["check:V1-cidr-addressing", "engine:selftest:V1-cidr-addressing", "check:V1-design-core-orchestrator"],
      present: input.addressingRows.length > 0 || input.V1CidrAddressingTruth.totalAddressRowCount > 0,
      itemCount: input.V1CidrAddressingTruth.totalAddressRowCount + input.proposedRows.length + input.siteBlocks.length,
      reviewCount: input.V1CidrAddressingTruth.requirementAddressingGapCount,
      blockerCount: input.V1CidrAddressingTruth.invalidSubnetCount + input.V1CidrAddressingTruth.gatewayIssueCount + input.V1CidrAddressingTruth.overlapIssueCount + input.V1CidrAddressingTruth.undersizedSubnetCount,
      notes: ["Engine 1 is mathematical planner only; durable authority is delegated to Engine 2."],
    },
    {
      sectionKey: "enterpriseIpamTruth",
      label: "Engine 2 Enterprise IPAM durable truth",
      snapshotPath: "V1EnterpriseIpamTruth / enterpriseAllocatorPosture",
      ownerEngine: "Engine 2 enterprise IPAM",
      sourceType: "ENGINE2_DURABLE_AUTHORITY",
      inputPaths: ["Engine 1 plan rows", "Enterprise IPAM pools/allocations/DHCP/reservations/brownfield/approval ledger"],
      outputPaths: ["V1EnterpriseIpamTruth.reconciliationRows", "enterpriseAllocatorPosture"],
      downstreamConsumers: ["validation", "implementation", "report", "diagram labels", "readiness"],
      requirementContextRequired: true,
      requirementContextEvidence: ["V1EnterpriseIpamTruth.requirementIpamMatrix", "V1CidrAddressingTruth.requirementAddressingMatrix"],
      reportImpact: "Report must distinguish proposal-only planned subnets from durable approved allocations.",
      diagramImpact: "Address labels must not imply approval when Engine 2 says proposal-only/review/blocked.",
      validationReadinessImpact: "IPAM blockers and proposal-only rows prevent false implementation readiness.",
      proofGates: ["check:V1-enterprise-ipam", "engine:selftest:V1-enterprise-ipam", "check:V1-design-core-orchestrator"],
      present: Boolean(input.V1EnterpriseIpamTruth.contractVersion),
      itemCount: input.V1EnterpriseIpamTruth.reconciliationRows.length,
      reviewCount: input.V1EnterpriseIpamTruth.reviewRequiredCount + input.V1EnterpriseIpamTruth.activeRequirementIpamGapCount,
      blockerCount: input.V1EnterpriseIpamTruth.conflictBlockerCount,
      notes: ["Design-core reconciles Engine 1 proposals with Engine 2 authority; it does not pick a winner silently."],
    },
    {
      sectionKey: "standardsTruth",
      label: "Standards and rulebook context",
      snapshotPath: "standardsAlignment",
      ownerEngine: "networkStandardsRulebook + standardsAlignment",
      sourceType: "REVIEW_GATED",
      inputPaths: ["requirements", "addressing", "security intent", "allocation policy", "issues"],
      outputPaths: ["standardsAlignment.evaluations", "standards blockers"],
      downstreamConsumers: ["validation", "report", "implementation review"],
      requirementContextRequired: true,
      requirementContextEvidence: ["standardsAlignment.evaluations", "V1RequirementsClosure.closureMatrix"],
      reportImpact: "Standards findings must be visible in validation and limitations sections.",
      diagramImpact: "Diagram overlays can show standards warnings only when backend standards findings exist.",
      validationReadinessImpact: "Required standards violations remain blockers.",
      proofGates: ["check:V1-design-trust-policy", "check:V1-design-core-orchestrator"],
      present: input.standardsAlignment.evaluations.length > 0,
      itemCount: input.standardsAlignment.evaluations.length,
      reviewCount: input.standardsAlignment.reviewRuleIds.length,
      blockerCount: input.standardsAlignment.violatedRuleIds.length,
      notes: ["V1 only coordinates standards context; V1 will harden rule logic deeper."],
    },
    {
      sectionKey: "objectModelTruth",
      label: "Network object model truth",
      snapshotPath: "networkObjectModel",
      ownerEngine: "network object model",
      sourceType: "BACKEND_COMPUTED",
      inputPaths: ["addressingRows", "siteSummaries", "transitPlan", "loopbackPlan"],
      outputPaths: ["networkObjectModel.devices", "interfaces", "links", "zones", "policy/DHCP/reservation objects"],
      downstreamConsumers: ["design graph", "routing", "security", "implementation", "report", "diagram"],
      requirementContextRequired: true,
      requirementContextEvidence: ["networkObjectModel.summary", "V1RequirementsClosure.closureMatrix"],
      reportImpact: "Network object model report section must use backend object IDs and truth states.",
      diagramImpact: "Every diagram node/edge must map to a backend object or relationship ID.",
      validationReadinessImpact: "Missing or orphaned objects become graph/object-model findings.",
      proofGates: ["V1 engine matrix", "check:V1-design-core-orchestrator"],
      present: input.networkObjectModel.summary.deviceCount + input.networkObjectModel.summary.interfaceCount + input.networkObjectModel.summary.securityZoneCount > 0,
      itemCount: input.networkObjectModel.summary.deviceCount + input.networkObjectModel.summary.interfaceCount + input.networkObjectModel.summary.linkCount + input.networkObjectModel.summary.securityZoneCount,
      reviewCount: input.networkObjectModel.summary.orphanedAddressRowCount,
      blockerCount: 0,
      notes: ["V1 coordinates the existing object model; V1 will harden object truth states and lineage."],
    },
    {
      sectionKey: "graphTruth",
      label: "Design graph dependency truth",
      snapshotPath: "networkObjectModel.designGraph",
      ownerEngine: "design graph",
      sourceType: "BACKEND_COMPUTED",
      inputPaths: ["network objects", "route intents", "security flows", "implementation steps"],
      outputPaths: ["designGraph.nodes", "designGraph.edges", "integrityFindings"],
      downstreamConsumers: ["implementation dependencies", "diagram relationship rendering", "report", "validation"],
      requirementContextRequired: true,
      requirementContextEvidence: ["networkObjectModel.designGraph.summary", "V1RequirementsClosure.closureMatrix"],
      reportImpact: "Report can cite dependency graph counts and blockers.",
      diagramImpact: "Diagram edges must be backed by graph edges or explicit backend relationships.",
      validationReadinessImpact: "Graph blocking findings prevent implementation-ready claims.",
      proofGates: ["V1 engine matrix", "check:V1-design-core-orchestrator"],
      present: graphSummary.nodeCount > 0,
      itemCount: graphSummary.nodeCount + graphSummary.edgeCount,
      reviewCount: graphSummary.integrityFindingCount - graphSummary.blockingFindingCount,
      blockerCount: graphSummary.blockingFindingCount,
      notes: ["V1 exposes graph dependency context; V1 will deepen graph traversal and orphan detection."],
    },
    {
      sectionKey: "routingTruth",
      label: "Routing and segmentation context",
      snapshotPath: "routingIntent / routeDomain / networkObjectModel.routingSegmentation",
      ownerEngine: "routingSegmentation",
      sourceType: "REVIEW_GATED",
      inputPaths: ["route domains", "transit/loopback rows", "WAN/cloud requirements", "security zones"],
      outputPaths: ["routingSegmentation.routeIntents", "routeTables", "reachabilityFindings", "segmentationExpectations"],
      downstreamConsumers: ["security policy flow", "implementation", "validation", "report", "diagram"],
      requirementContextRequired: true,
      requirementContextEvidence: ["V1RequirementsClosure.closureMatrix", "routingSegmentation.summary"],
      reportImpact: "Routing review section must label route intent as review-gated planning, not full simulation.",
      diagramImpact: "WAN/logical diagrams must show route intent/review state from backend.",
      validationReadinessImpact: "Routing blockers and reachability review findings remain readiness gates.",
      proofGates: ["V1 routing selftest", "check:V1-design-core-orchestrator"],
      present: routingSummary.routeIntentCount > 0 || routingSummary.segmentationExpectationCount > 0,
      itemCount: routingSummary.routeIntentCount + routingSummary.routeEntryCount + routingSummary.segmentationExpectationCount,
      reviewCount: routingSummary.reachabilityFindingCount + routingSummary.nextHopReviewCount,
      blockerCount: routingSummary.blockingFindingCount,
      notes: ["V1 coordinates routing context only; V1 will upgrade protocol-aware planning."],
    },
    {
      sectionKey: "securityTruth",
      label: "Security policy flow context",
      snapshotPath: "securityIntent / policyConsequences / networkObjectModel.securityPolicyFlow",
      ownerEngine: "securityPolicyFlow",
      sourceType: "REVIEW_GATED",
      inputPaths: ["zones", "policies", "NAT", "routing segmentation", "security requirements"],
      outputPaths: ["securityPolicyFlow.flowRequirements", "policyMatrix", "findings"],
      downstreamConsumers: ["routing review", "implementation", "validation", "report", "security diagrams"],
      requirementContextRequired: true,
      requirementContextEvidence: ["V1RequirementsClosure.closureMatrix", "securityPolicyFlow.summary"],
      reportImpact: "Security review must expose missing/overbroad/review-required policy states.",
      diagramImpact: "Security flow diagrams must render backend flow requirements only.",
      validationReadinessImpact: "Missing policies, NAT gaps, broad policy review, and blockers remain readiness gates.",
      proofGates: ["V1 security policy selftest", "check:V1-design-core-orchestrator"],
      present: securitySummary.flowRequirementCount > 0 || securitySummary.policyMatrixRowCount > 0,
      itemCount: securitySummary.flowRequirementCount + securitySummary.policyMatrixRowCount + securitySummary.serviceObjectCount,
      reviewCount: securitySummary.findingCount - securitySummary.blockingFindingCount,
      blockerCount: securitySummary.blockingFindingCount + securitySummary.missingNatCount,
      notes: ["V1 coordinates security context only; V1 will harden policy consequences deeper."],
    },
    {
      sectionKey: "implementationTruth",
      label: "Implementation and vendor-neutral template context",
      snapshotPath: "networkObjectModel.implementationPlan / vendorNeutralImplementationTemplates",
      ownerEngine: "implementationPlan + implementationTemplates",
      sourceType: "REVIEW_GATED",
      inputPaths: ["object model", "graph", "routing", "security", "readiness findings"],
      outputPaths: ["implementationPlan.steps", "verificationChecks", "rollbackActions", "vendorNeutralImplementationTemplates"],
      downstreamConsumers: ["implementation page", "templates", "report", "validation"],
      requirementContextRequired: true,
      requirementContextEvidence: ["implementationPlan.summary", "V1RequirementsClosure.closureMatrix"],
      reportImpact: "Implementation section must show blockers/review and source evidence.",
      diagramImpact: "Implementation view can render only backend-backed implementation steps.",
      validationReadinessImpact: "Blocked implementation steps keep implementation execution readiness blocked.",
      proofGates: ["V1 implementation selftest", "V1 template selftest", "check:V1-design-core-orchestrator"],
      present: implementationSummary.stepCount > 0,
      itemCount: implementationSummary.stepCount + input.vendorNeutralImplementationTemplates.summary.templateCount,
      reviewCount: implementationSummary.reviewStepCount + input.vendorNeutralImplementationTemplates.summary.reviewTemplateCount,
      blockerCount: implementationSummary.blockedStepCount + input.vendorNeutralImplementationTemplates.summary.blockedTemplateCount,
      notes: ["V1 does not generate vendor commands; templates remain vendor-neutral and review-gated."],
    },
    {
      sectionKey: "reportTruth",
      label: "Report/export truth context",
      snapshotPath: "reportTruth",
      ownerEngine: "reportDiagramTruth + export services",
      sourceType: "BACKEND_COORDINATED",
      inputPaths: ["summary", "requirements", "addressing", "IPAM", "object model", "routing", "security", "implementation"],
      outputPaths: ["reportTruth", "exportDesignCoreReport", "export.service CSV rows"],
      downstreamConsumers: ["ProjectReportPage", "DOCX/PDF/CSV exports"],
      requirementContextRequired: true,
      requirementContextEvidence: ["V1RequirementsClosure.closureMatrix", "reportTruth"],
      reportImpact: "This is the backend report/export authority boundary.",
      diagramImpact: "Report may reference diagram truth but cannot invent diagram-ready objects.",
      validationReadinessImpact: "Report limitations and review queues prevent overclaiming.",
      proofGates: ["release artifact check", "export truth check", "check:V1-design-core-orchestrator"],
      present: Boolean(input.reportTruth),
      itemCount: reportFindings.length,
      reviewCount: reportFindings.length,
      blockerCount: 0,
      notes: ["Report/export consumers must consume backend snapshot sections; no frontend-only engineering facts."],
    },
    {
      sectionKey: "diagramTruth",
      label: "Diagram truth context",
      snapshotPath: "diagramTruth",
      ownerEngine: "backend diagram truth model",
      sourceType: "BACKEND_COORDINATED",
      inputPaths: ["network object model", "design graph", "routing", "security", "requirements closure"],
      outputPaths: ["diagramTruth.renderModel", "diagramTruth.hotspots", "diagram truth warnings"],
      downstreamConsumers: ["ProjectDiagramPage", "diagram renderer", "report diagram sections"],
      requirementContextRequired: true,
      requirementContextEvidence: ["diagramTruth", "V1RequirementsClosure.closureMatrix"],
      reportImpact: "Report diagram section must cite backend diagram truth and limitations.",
      diagramImpact: "This is the declared backend boundary for diagram rendering; frontend cannot invent topology.",
      validationReadinessImpact: "Diagram empty states and truth warnings remain visible.",
      proofGates: ["diagram truth check", "check:V1-diagram-layout-contract-rewrite", "check:V1-design-core-orchestrator"],
      present: Boolean(input.diagramTruth),
      itemCount: diagramFindings.length,
      reviewCount: diagramFindings.length,
      blockerCount: 0,
      notes: ["V1 coordinates diagram truth; V1 will harden renderer/layout in the master repair order."],
    },
    {
      sectionKey: "readinessTruth",
      label: "Aggregated validation/readiness context",
      snapshotPath: "summary / issues / implementationReadiness / currentStateBoundary",
      ownerEngine: "designCore.readiness aggregation",
      sourceType: "BACKEND_COORDINATED",
      inputPaths: ["issues", "standards", "IPAM", "graph", "routing", "security", "implementation", "discovery"],
      outputPaths: ["summary.designReviewReadiness", "summary.implementationExecutionReadiness", "issues", "implementationReadiness"],
      downstreamConsumers: ["validation", "overview", "report", "release proof"],
      requirementContextRequired: true,
      requirementContextEvidence: ["V1RequirementsClosure.closureMatrix", "issues", "implementationReadiness"],
      reportImpact: "Executive/readiness sections consume this aggregate gate.",
      diagramImpact: "Diagram controls can show readiness warnings but cannot downgrade/upgrade backend readiness.",
      validationReadinessImpact: "Final readiness aggregation remains backend-owned.",
      proofGates: ["validation service", "release discipline check", "check:V1-design-core-orchestrator"],
      present: Boolean(input.implementationReadiness && input.currentStateBoundary),
      itemCount: input.issues.length,
      reviewCount: input.issues.filter((issue) => issue.severity === "WARNING").length,
      blockerCount: input.issues.filter((issue) => issue.severity === "ERROR").length,
      notes: ["Design review readiness and implementation execution readiness are separate gates; UI cannot collapse them into a fake ready state."],
    },
  ];

  return drafts.map(withReadiness);
}

function buildDependencyEdges(rows: V1OrchestratorSectionRow[]): V1OrchestratorDependencyEdge[] {
  const present = new Set(rows.filter((row) => row.present).map((row) => row.sectionKey));
  const edge = (id: string, sourceSectionKey: V1SectionKey, targetSectionKey: V1SectionKey, relationship: string, evidence: string[]): V1OrchestratorDependencyEdge => ({
    id,
    sourceSectionKey,
    targetSectionKey,
    relationship,
    required: true,
    evidence: present.has(sourceSectionKey) && present.has(targetSectionKey) ? evidence : ["One or both required sections are missing from the orchestrator snapshot."],
  });

  return [
    edge("V1-source-to-materialization", "sourceInputs", "materializedObjects", "requirements normalize into materialization outcomes", ["V1 lineage feeds V1 policy outcomes."]),
    edge("V1-materialization-to-addressing", "materializedObjects", "addressingTruth", "materialized segment demand feeds Engine 1", ["V1/3 requirement rows feed V1 addressing matrix."]),
    edge("V1-addressing-to-ipam", "addressingTruth", "enterpriseIpamTruth", "Engine 1 planned rows reconcile with Engine 2 durable IPAM", ["V1 reconciliation rows map planned CIDRs to durable allocation states."]),
    edge("V1-ipam-to-object-model", "enterpriseIpamTruth", "objectModelTruth", "durable IPAM state gates object/model implementation confidence", ["Object labels must not overclaim when IPAM says proposal-only/review/blocked."]),
    edge("V1-object-model-to-graph", "objectModelTruth", "graphTruth", "backend objects become dependency graph nodes/edges", ["Design graph summarizes object relationships and blockers."]),
    edge("V1-graph-to-routing", "graphTruth", "routingTruth", "graph/object relationships support routing/segmentation review", ["Routing context consumes route domains, links, interfaces, and segmentation expectations."]),
    edge("V1-routing-to-security", "routingTruth", "securityTruth", "routing/segmentation context supports policy-flow review", ["Security flow expectations are meaningful only with zones and routing context."]),
    edge("V1-security-to-implementation", "securityTruth", "implementationTruth", "security/routing findings gate implementation steps", ["Implementation steps keep source evidence and blockers from routing/security findings."]),
    edge("V1-implementation-to-report", "implementationTruth", "reportTruth", "implementation readiness feeds report/export", ["Report implementation plan must show ready/review/blocked state."]),
    edge("V1-object-model-to-diagram", "objectModelTruth", "diagramTruth", "diagram rendering consumes backend objects/relationships", ["Diagram truth render model is derived from backend object model and graph."]),
    edge("V1-all-to-readiness", "reportTruth", "readinessTruth", "report/readiness outputs share the same backend aggregate", ["Summary and issues are produced once in design-core and consumed downstream."]),
  ];
}

export function buildV1DesignCoreOrchestratorControl(input: V1SectionInput): V1DesignCoreOrchestratorControlSummary {
  const sectionRows = buildSectionRows(input);
  const dependencyEdges = buildDependencyEdges(sectionRows);
  const boundaryFindings = sectionRows
    .map(findingFromSection)
    .filter(Boolean) as V1OrchestratorBoundaryFinding[];

  const missingSnapshotSectionCount = sectionRows.filter((row) => !row.present).length;
  const frontendIndependentTruthRiskCount = 0;
  const requirementContextGapCount = sectionRows.filter((row) => row.requirementContextRequired && row.requirementContextEvidence.length === 0).length;
  const reportContextGapCount = sectionRows.filter((row) => row.reportImpact.trim().length === 0).length;
  const diagramContextGapCount = sectionRows.filter((row) => row.diagramImpact.trim().length === 0).length;
  const readinessContextGapCount = sectionRows.filter((row) => row.validationReadinessImpact.trim().length === 0).length;
  const blockerCount = boundaryFindings.filter((finding) => finding.readinessImpact === "BLOCKED").length + requirementContextGapCount + reportContextGapCount + diagramContextGapCount + readinessContextGapCount;
  const reviewCount = boundaryFindings.filter((finding) => finding.readinessImpact === "REVIEW_REQUIRED").length;

  return {
    contractVersion: V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT,
    orchestratorRole: "DESIGN_CORE_COORDINATOR_NOT_GOD_FILE",
    coordinatorRule: "Design-core coordinates normalized inputs and engine outputs; engineering truth must be computed in backend engines and exposed through named snapshot sections, not re-created in frontend/report/diagram consumers.",
    requirementContextPaths: [...REQUIREMENT_CONTEXT_PATHS],
    requiredSnapshotSectionCount: sectionRows.length,
    presentSnapshotSectionCount: sectionRows.length - missingSnapshotSectionCount,
    missingSnapshotSectionCount,
    sectionRows,
    dependencyEdges,
    boundaryFindings,
    frontendIndependentTruthRiskCount,
    requirementContextGapCount,
    reportContextGapCount,
    diagramContextGapCount,
    readinessContextGapCount,
    overallReadiness: readinessFromCounts(blockerCount, reviewCount),
    notes: [
      "V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT is a boundary contract, not a feature expansion.",
      "sourceInputs -> materializedObjects -> addressingTruth -> enterpriseIpamTruth -> objectModelTruth -> graphTruth -> routingTruth -> securityTruth -> implementationTruth -> reportTruth/diagramTruth -> readinessTruth is the canonical design-core coordination path.",
      "No frontend route, report section, or diagram view may compute authoritative engineering truth independently of these backend snapshot sections.",
    ],
  };
}
