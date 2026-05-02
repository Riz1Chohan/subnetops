import type {
  DesignCoreAddressRow,
  DesignCoreProposalRow,
  DesignCoreSiteBlock,
  DesignOutputTruthLabel,
  DesignProofStatus,
  DesignTraceConfidence,
  DesignTraceabilityItem,
  DesignTruthSourceType,
  NetworkObjectModel,
  Phase1PlanningTraceabilityControlSummary,
  PlanningInputDisciplineSummary,
  RequirementPropagationLifecycleStatus,
  RequirementPropagationTraceItem,
  RequirementsImpactClosureItem,
  RequirementsImpactClosureSummary,
  RequirementsScenarioProofSummary,
  SiteSummarizationReview,
  TransitPlanRow,
  LoopbackPlanRow,
} from "../designCore.types.js";

export const PHASE1_TRUTH_SOURCE_TYPE_POLICIES: Array<{ sourceType: DesignTruthSourceType; rule: string }> = [
  { sourceType: "USER_PROVIDED", rule: "Saved by the user as an explicit input; still needs downstream evidence before it becomes engineering authority." },
  { sourceType: "REQUIREMENT_MATERIALIZED", rule: "Created or strengthened by the backend requirement materializer from a captured requirement signal." },
  { sourceType: "BACKEND_COMPUTED", rule: "Computed inside backend design-core or engine code from source objects and validated inputs." },
  { sourceType: "ENGINE2_DURABLE", rule: "Owned by the durable enterprise IPAM workflow, approvals, conflicts, and ledger." },
  { sourceType: "INFERRED", rule: "Inferred by backend logic and must be visibly labelled; never implementation authority by itself." },
  { sourceType: "ESTIMATED", rule: "Estimate or sizing assumption; must expose calculation basis and review reason." },
  { sourceType: "IMPORTED", rule: "Imported/manual current-state evidence; must not be treated as validated discovery until reconciled." },
  { sourceType: "REVIEW_REQUIRED", rule: "Captured or computed but blocked from authoritative use until an engineer resolves the review reason." },
  { sourceType: "UNSUPPORTED", rule: "Known input or expectation that is intentionally not design-driving in the current engine." },
];

const REQUIRED_OUTPUTS = [
  "traceability",
  "planningInputDiscipline",
  "requirementsImpactClosure",
  "requirementsScenarioProof",
  "siteBlocks",
  "addressingRows",
  "proposedRows",
  "siteSummaries",
  "transitPlan",
  "loopbackPlan",
  "networkObjectModel",
  "routingSegmentation",
  "securityPolicyFlow",
  "implementationPlan",
  "vendorNeutralImplementationTemplates",
  "standardsAlignment",
  "reportTruth",
  "diagramTruth",
  "enterpriseAllocatorPosture",
] as const;

function confidenceFromClosure(item: RequirementsImpactClosureItem): DesignTraceConfidence {
  if (!item.captured) return "advisory";
  if (item.reflectionStatus === "concrete-output" || item.reflectionStatus === "policy-consequence") return "high";
  if (item.reflectionStatus === "review-evidence") return "medium";
  return "low";
}

function proofStatusFromClosure(item: RequirementsImpactClosureItem): DesignProofStatus {
  if (!item.captured) return "NOT_DESIGN_DRIVING";
  if (item.reflectionStatus === "concrete-output" || item.reflectionStatus === "policy-consequence") return "PROVEN";
  if (item.reflectionStatus === "review-evidence") return "PARTIAL";
  if (item.reflectionStatus === "traceable-only") return "REVIEW_REQUIRED";
  return "NOT_DESIGN_DRIVING";
}

function lifecycleFromClosure(item: RequirementsImpactClosureItem): RequirementPropagationLifecycleStatus {
  if (!item.captured) return "NOT_CAPTURED";
  if (item.reflectionStatus === "concrete-output" || item.reflectionStatus === "policy-consequence") return "FULLY_PROPAGATED";
  if (item.reflectionStatus === "review-evidence") return "REVIEW_REQUIRED";
  if (item.reflectionStatus === "traceable-only") return "CAPTURED_ONLY";
  return "UNSUPPORTED";
}

function reviewReasonFromClosure(item: RequirementsImpactClosureItem) {
  if (!item.captured) return "Captured but not currently design-driving: requirement was not provided by the user.";
  if (item.reflectionStatus === "traceable-only") return "Requires manual review: captured direct requirement has traceability but no concrete backend object or policy consequence yet.";
  if (item.reflectionStatus === "review-evidence") return "Captured but not currently design-driving beyond review evidence in this engine phase.";
  return undefined;
}

function sourceRequirementId(sourceArea: string, key: string) {
  return `${sourceArea}:${key}`;
}

function label(
  outputKey: string,
  outputLabel: string,
  sourceType: DesignTruthSourceType,
  sourceEngine: string,
  proofStatus: DesignProofStatus,
  confidence: DesignTraceConfidence,
  consumerPath: string[],
  sourceRequirementIds: string[] = [],
  sourceObjectIds: string[] = [],
  reviewReason?: string,
): DesignOutputTruthLabel {
  return {
    outputKey,
    outputLabel,
    sourceType,
    sourceEngine,
    sourceRequirementIds,
    sourceObjectIds,
    confidence,
    proofStatus,
    reviewReason,
    consumerPath,
  };
}

function objectIdsFromAddressRows(rows: DesignCoreAddressRow[]) {
  return rows.slice(0, 25).map((row) => `vlan:${row.siteId}:${row.vlanId}`);
}

function requirementKeysFromTraceability(traceability: DesignTraceabilityItem[]) {
  return Array.from(new Set(traceability.filter((item) => item.sourceArea === "requirements" && item.sourceValue !== "Not selected").map((item) => sourceRequirementId(item.sourceArea, item.sourceKey))));
}

function buildRequirementLineage(input: {
  traceability: DesignTraceabilityItem[];
  requirementsImpactClosure: RequirementsImpactClosureSummary;
}): RequirementPropagationTraceItem[] {
  const traceByKey = new Map(input.traceability.map((item) => [`${item.sourceArea}:${item.sourceKey}`, item]));

  return input.requirementsImpactClosure.fieldOutcomes.map((item) => {
    const trace = traceByKey.get(sourceRequirementId("requirements", item.key));
    const proofStatus = proofStatusFromClosure(item);
    const confidence = confidenceFromClosure(item);
    const lifecycleStatus = lifecycleFromClosure(item);
    const reviewReason = reviewReasonFromClosure(item);

    return {
      requirementId: sourceRequirementId("requirements", item.key),
      sourceArea: "requirements",
      sourceKey: item.key,
      sourceValue: item.sourceValue,
      lifecycleStatus,
      normalizedRequirementSignal: item.captured ? `${item.key}=${item.sourceValue}` : `${item.key}=not-captured`,
      materializedSourceObjects: item.concreteOutputs,
      backendDesignCoreInputs: trace?.materializationTargets ?? [],
      engineOutputs: trace?.outputAreas ?? item.concreteOutputs,
      frontendConsumers: item.visibleIn.filter((entry) => /workspace|overview|page|plan|security|validation|diagram/i.test(entry)),
      reportExportConsumers: [trace?.reportEvidence ?? "Report/export traceability section"],
      diagramConsumers: [trace?.diagramEvidence ?? "Diagram impact is explicit no-op unless the backend object model exposes a visual object."],
      validationReadinessImpact: trace?.validationEvidence ?? (item.missingEvidence.join("; ") || "No validation impact because requirement is not captured or not design-driving."),
      sourceType: item.captured ? "USER_PROVIDED" : "UNSUPPORTED",
      sourceRequirementIds: [sourceRequirementId("requirements", item.key)],
      sourceObjectIds: item.concreteOutputs,
      sourceEngine: "designCore.requirementsImpactClosure",
      confidence,
      proofStatus,
      reviewReason,
    };
  });
}

export function buildPhase1PlanningTraceabilityControl(input: {
  traceability: DesignTraceabilityItem[];
  planningInputDiscipline: PlanningInputDisciplineSummary;
  requirementsImpactClosure: RequirementsImpactClosureSummary;
  requirementsScenarioProof: RequirementsScenarioProofSummary;
  siteBlocks: DesignCoreSiteBlock[];
  addressingRows: DesignCoreAddressRow[];
  proposedRows: DesignCoreProposalRow[];
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
  loopbackPlan: LoopbackPlanRow[];
  networkObjectModel: NetworkObjectModel;
}): Phase1PlanningTraceabilityControlSummary {
  const sourceRequirementIds = requirementKeysFromTraceability(input.traceability);
  const addressObjectIds = objectIdsFromAddressRows(input.addressingRows);
  const networkObjectIds = [
    ...input.networkObjectModel.devices.slice(0, 10).map((item) => `device:${item.id}`),
    ...input.networkObjectModel.interfaces.slice(0, 10).map((item) => `interface:${item.id}`),
    ...input.networkObjectModel.securityZones.slice(0, 10).map((item) => `zone:${item.id}`),
  ];

  const outputLabels: DesignOutputTruthLabel[] = [
    label("traceability", "Requirement/design traceability rows", "BACKEND_COMPUTED", "designCore.traceability", "PARTIAL", "medium", ["ProjectOverviewPage", "ProjectReportPage", "export truth"], sourceRequirementIds),
    label("planningInputDiscipline", "Planning input reflection checks", "BACKEND_COMPUTED", "designCore.planningInputDiscipline", input.planningInputDiscipline.notReflectedCount ? "REVIEW_REQUIRED" : "PROVEN", input.planningInputDiscipline.notReflectedCount ? "medium" : "high", ["ProjectOverviewPage", "validation/readiness", "report truth"], sourceRequirementIds, [], input.planningInputDiscipline.notReflectedCount ? "Requires manual review: at least one captured planning input is not reflected in backend outputs." : undefined),
    label("requirementsImpactClosure", "Requirement impact closure matrix", "BACKEND_COMPUTED", "designCore.requirementsImpactClosure", input.requirementsImpactClosure.completionStatus === "complete" ? "PROVEN" : "REVIEW_REQUIRED", input.requirementsImpactClosure.completionStatus === "complete" ? "high" : "medium", ["ProjectOverviewPage", "Validation", "Report/export"], sourceRequirementIds),
    label("requirementsScenarioProof", "Runtime requirement scenario proof", "BACKEND_COMPUTED", "designCore.requirementsScenarioProof", input.requirementsScenarioProof.status === "passed" ? "PROVEN" : "REVIEW_REQUIRED", input.requirementsScenarioProof.status === "passed" ? "high" : "medium", ["ProjectOverviewPage", "Validation", "Report/export"], sourceRequirementIds),
    label("siteBlocks", "Site block planning rows", "BACKEND_COMPUTED", "Engine 1 CIDR/addressing", input.siteBlocks.length ? "PROVEN" : "REVIEW_REQUIRED", input.siteBlocks.length ? "high" : "medium", ["Addressing page", "Report addressing plan", "Diagram labels"], sourceRequirementIds, input.siteBlocks.map((item) => `site:${item.siteId}`)),
    label("addressingRows", "Site/VLAN addressing rows", "BACKEND_COMPUTED", "Engine 1 CIDR/addressing", input.addressingRows.length ? "PROVEN" : "REVIEW_REQUIRED", input.addressingRows.length ? "high" : "medium", ["Addressing page", "Validation", "Report addressing plan", "Diagram labels"], sourceRequirementIds, addressObjectIds),
    label("proposedRows", "Allocator proposal rows", "BACKEND_COMPUTED", "Engine 1 addressAllocator", input.proposedRows.length ? "PARTIAL" : "NOT_DESIGN_DRIVING", input.proposedRows.length ? "medium" : "advisory", ["Addressing page", "Review queue", "Report addressing appendix"], sourceRequirementIds),
    label("siteSummaries", "Site summarization review", "BACKEND_COMPUTED", "Engine 1 summarization review", input.siteSummaries.length ? "PROVEN" : "REVIEW_REQUIRED", input.siteSummaries.length ? "high" : "medium", ["Addressing hierarchy", "Report", "Validation"], sourceRequirementIds, input.siteSummaries.map((item) => `site:${item.siteId}`)),
    label("transitPlan", "WAN/transit address planning", "BACKEND_COMPUTED", "designCore transit planner", input.transitPlan.length ? "PARTIAL" : "REVIEW_REQUIRED", input.transitPlan.length ? "medium" : "low", ["WAN diagram", "Routing review", "Report"], sourceRequirementIds, input.transitPlan.map((item) => `transit:${item.siteId}:${item.vlanId ?? "review"}`), input.transitPlan.length ? undefined : "Requires manual review: no concrete transit rows are available yet."),
    label("loopbackPlan", "Loopback planning rows", "BACKEND_COMPUTED", "designCore loopback planner", input.loopbackPlan.length ? "PARTIAL" : "NOT_DESIGN_DRIVING", input.loopbackPlan.length ? "medium" : "advisory", ["Routing review", "Implementation planning", "Report appendix"], sourceRequirementIds, input.loopbackPlan.map((item) => `loopback:${item.siteId}:${item.vlanId ?? "review"}`)),
    label("networkObjectModel", "Network object model", "BACKEND_COMPUTED", "designCore.networkObjectModel", (input.networkObjectModel.summary.deviceCount + input.networkObjectModel.summary.interfaceCount + input.networkObjectModel.summary.linkCount + input.networkObjectModel.summary.securityZoneCount + input.networkObjectModel.summary.policyRuleCount + input.networkObjectModel.summary.dhcpPoolCount) ? "PROVEN" : "REVIEW_REQUIRED", (input.networkObjectModel.summary.deviceCount + input.networkObjectModel.summary.interfaceCount + input.networkObjectModel.summary.linkCount + input.networkObjectModel.summary.securityZoneCount + input.networkObjectModel.summary.policyRuleCount + input.networkObjectModel.summary.dhcpPoolCount) ? "high" : "medium", ["Core model", "Graph", "Routing", "Security", "Diagram", "Report"], sourceRequirementIds, networkObjectIds),
    label("routingSegmentation", "Routing and segmentation review", "BACKEND_COMPUTED", "designCore.routingSegmentation", input.networkObjectModel.routingSegmentation.summary.routingReadiness === "ready" ? "PROVEN" : "REVIEW_REQUIRED", input.networkObjectModel.routingSegmentation.summary.routingReadiness === "ready" ? "high" : "medium", ["Routing page", "Validation", "WAN/security diagrams", "Report"], sourceRequirementIds),
    label("securityPolicyFlow", "Security policy flow review", "BACKEND_COMPUTED", "designCore.securityPolicyFlow", input.networkObjectModel.securityPolicyFlow.summary.policyReadiness === "ready" ? "PROVEN" : "REVIEW_REQUIRED", input.networkObjectModel.securityPolicyFlow.summary.policyReadiness === "ready" ? "high" : "medium", ["Security page", "Validation", "Security diagram", "Report"], sourceRequirementIds),
    label("implementationPlan", "Implementation planning model", "BACKEND_COMPUTED", "designCore.implementationPlan", input.networkObjectModel.implementationPlan.summary.implementationReadiness === "ready" ? "PROVEN" : "REVIEW_REQUIRED", input.networkObjectModel.implementationPlan.summary.implementationReadiness === "ready" ? "high" : "medium", ["Implementation page", "Vendor-neutral templates", "Report"], sourceRequirementIds),
    label("vendorNeutralImplementationTemplates", "Vendor-neutral implementation templates", "BACKEND_COMPUTED", "designCore.implementationTemplates", input.networkObjectModel.implementationPlan.summary.stepCount ? "PARTIAL" : "REVIEW_REQUIRED", "medium", ["Implementation page", "Report appendix"], sourceRequirementIds),
    label("standardsAlignment", "Standards alignment summary", "BACKEND_COMPUTED", "designCore.standardsAlignment", "PARTIAL", "medium", ["Validation", "Report", "Readiness"], sourceRequirementIds),
    label("reportTruth", "Backend report truth model", "BACKEND_COMPUTED", "designCore.reportDiagramTruth", "PARTIAL", "medium", ["ProjectReportPage", "PDF/DOCX/CSV export"], sourceRequirementIds),
    label("diagramTruth", "Backend diagram truth model", "BACKEND_COMPUTED", "designCore.reportDiagramTruth", "PARTIAL", "medium", ["ProjectDiagramPage", "Report diagram truth section"], sourceRequirementIds, networkObjectIds),
    label("enterpriseAllocatorPosture", "Enterprise IPAM posture", "ENGINE2_DURABLE", "enterpriseAddressAllocator", "PARTIAL", "medium", ["Enterprise IPAM", "Addressing reconciliation", "Validation", "Report"], sourceRequirementIds),
  ];

  const missingLabels = REQUIRED_OUTPUTS.filter((key) => !outputLabels.some((item) => item.outputKey === key));
  const requirementLineage = buildRequirementLineage({
    traceability: input.traceability,
    requirementsImpactClosure: input.requirementsImpactClosure,
  });
  const reviewRequiredCount = outputLabels.filter((item) => item.proofStatus === "REVIEW_REQUIRED").length;
  const unsupportedCount = outputLabels.filter((item) => item.proofStatus === "UNSUPPORTED").length;

  return {
    contractVersion: "PHASE1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY",
    sourceTypePolicy: PHASE1_TRUTH_SOURCE_TYPE_POLICIES,
    outputLabels,
    requirementLineage,
    outputLabelCoverage: {
      requiredOutputCount: REQUIRED_OUTPUTS.length,
      labelledOutputCount: outputLabels.length,
      reviewRequiredCount,
      unsupportedCount,
      missingLabelCount: missingLabels.length,
      missingLabels: [...missingLabels],
    },
    requirementLineageCoverage: {
      capturedCount: requirementLineage.filter((item) => item.lifecycleStatus !== "NOT_CAPTURED").length,
      fullCount: requirementLineage.filter((item) => item.lifecycleStatus === "FULLY_PROPAGATED").length,
      partialCount: requirementLineage.filter((item) => item.lifecycleStatus === "PARTIALLY_PROPAGATED" || item.proofStatus === "PARTIAL").length,
      reviewRequiredCount: requirementLineage.filter((item) => item.lifecycleStatus === "REVIEW_REQUIRED" || item.proofStatus === "REVIEW_REQUIRED").length,
      notDesignDrivingCount: requirementLineage.filter((item) => item.proofStatus === "NOT_DESIGN_DRIVING").length,
      unsupportedCount: requirementLineage.filter((item) => item.lifecycleStatus === "UNSUPPORTED" || item.proofStatus === "UNSUPPORTED").length,
    },
    notes: [
      "Phase 1 makes truth/source/confidence labels explicit before deeper engine repairs continue.",
      "Requirement-driven output must show requirementId -> design object -> engine output -> UI/report/diagram consumer or carry a review/no-op reason.",
      "Captured but not currently design-driving inputs are not allowed to masquerade as backend engineering facts.",
      "Requires manual review means the backend captured or computed evidence but cannot prove the full propagation chain yet.",
    ],
  };
}
