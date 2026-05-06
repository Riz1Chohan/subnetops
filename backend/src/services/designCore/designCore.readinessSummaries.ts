import { parseJsonMap, valueAsString } from "./designCore.helpers.js";
import type { getProjectDesignData } from "./designCore.repository.js";
import type {
  DesignCoreIssue,
  DesignCoreAddressRow,
  DesignCoreSiteBlock,
  DesignCoreProposalRow,
  DesignTraceabilityItem,
  CurrentStateBoundarySummary,
  SiteSummarizationReview,
  TransitPlanRow,
  LoopbackPlanRow,
  TruthStateLedger,
  AllocationPolicySummary,
  RoutingIntentSummary,
  SecurityIntentSummary,
  TraceabilityCoverageSummary,
  WanPlanSummary,
  BrownfieldReadinessSummary,
  AllocatorConfidenceSummary,
  RouteDomainSummary,
  PolicyConsequenceSummary,
  DiscoveredStateImportPlanSummary,
  ImplementationReadinessSummary,
  EngineConfidenceSummary,
  AllocatorDeterminismSummary,
  StandardsAlignmentSummary,
  ActivePlanningInputSummary,
  PlanningInputCoverageSummary,
  RequirementsCoverageSummary,
  PlanningInputDisciplineItem,
  PlanningInputDisciplineSummary,
} from "../designCore.types.js";

type ProjectWithDesignData = NonNullable<Awaited<ReturnType<typeof getProjectDesignData>>>;
type SiteBlockRecord = DesignCoreSiteBlock;
type AddressRowRecord = DesignCoreAddressRow;

export function buildTraceabilityCoverageSummary(traceability: DesignTraceabilityItem[]): TraceabilityCoverageSummary {
  const missingAreas = ["requirements", "discovery", "platform"].filter((area) => !traceability.some((item) => item.sourceArea === area));
  const notes: string[] = [];
  let coverageState: TraceabilityCoverageSummary["coverageState"] = "thin";
  if (traceability.length >= 8 && missingAreas.length === 0) coverageState = "strong";
  else if (traceability.length >= 4) coverageState = "partial";

  if (missingAreas.length > 0) notes.push(`Traceability is still missing coverage from: ${missingAreas.join(", ")}.`);
  if (coverageState === "thin") notes.push("Design explainability is still shallow. Save more requirement, discovery, or platform details if this package will be used for review or migration planning.");
  if (coverageState === "strong") notes.push("Traceability covers requirements, discovery, and platform inputs strongly enough to support design review conversations.");

  return {
    itemCount: traceability.length,
    coverageState,
    missingAreas,
    notes,
  };
}

export function buildBrownfieldReadinessSummary(
  project: ProjectWithDesignData,
  currentStateBoundary: CurrentStateBoundarySummary,
  traceabilityCoverage: TraceabilityCoverageSummary,
): BrownfieldReadinessSummary {
  const discovery = parseJsonMap(project.discoveryJson);
  const requirements = parseJsonMap(project.requirementsJson);
  const notes: string[] = [];

  const topologyBaseline = valueAsString(discovery.topologyBaseline).toLowerCase();
  let mode: BrownfieldReadinessSummary["mode"] = "greenfield";
  if (topologyBaseline.includes("brownfield") || topologyBaseline.includes("existing")) mode = "brownfield";
  else if (topologyBaseline.includes("refresh") || topologyBaseline.includes("migration")) mode = "mixed";
  if (valueAsString(requirements.planningFor).toLowerCase().includes("upgrade") && mode === "greenfield") mode = "mixed";

  let currentStateEvidence: BrownfieldReadinessSummary["currentStateEvidence"] = "thin";
  const discoverySignals = [
    discovery.topologyBaseline,
    discovery.addressingVlanBaseline,
    discovery.routingTransportBaseline,
    discovery.securityPosture,
  ].map(valueAsString).filter(Boolean).length;
  if (discoverySignals >= 3) currentStateEvidence = "strong";
  else if (discoverySignals >= 1) currentStateEvidence = "partial";

  let importReadiness: BrownfieldReadinessSummary["importReadiness"] = "not-ready";
  if (currentStateBoundary.liveMappingReady && currentStateEvidence !== "thin") importReadiness = "ready";
  else if (currentStateEvidence !== "thin") importReadiness = "review";

  let driftReviewReadiness: BrownfieldReadinessSummary["driftReviewReadiness"] = "not-ready";
  if (traceabilityCoverage.coverageState === "strong" && currentStateBoundary.liveMappingReady) driftReviewReadiness = "ready";
  else if (traceabilityCoverage.coverageState !== "thin" || currentStateEvidence !== "thin") driftReviewReadiness = "review";

  if (mode !== "greenfield") notes.push("The project contains signs of brownfield or upgrade work, so discovered-state separation matters.");
  if (currentStateEvidence === "thin") notes.push("Discovery evidence is still thin, so live mapping import should not be treated as trusted current-state evidence yet.");
  if (!currentStateBoundary.liveMappingReady) notes.push("Saved addressing still needs cleanup before safe current-state reconciliation becomes credible.");
  if (driftReviewReadiness === "ready") notes.push("Traceability and boundary quality are strong enough to support future drift review workflows.");

  return {
    mode,
    currentStateEvidence,
    importReadiness,
    driftReviewReadiness,
    notes,
  };
}

export function buildDiscoveredStateImportPlanSummary(
  brownfieldReadiness: BrownfieldReadinessSummary,
  currentStateBoundary: CurrentStateBoundarySummary,
  traceabilityCoverage: TraceabilityCoverageSummary,
): DiscoveredStateImportPlanSummary {
  const suggestedSources = ["spreadsheet addressing export", "device inventory export", "configuration excerpts", "NMS or CMDB data"].filter(Boolean);
  const requiredNormalizations = [
    "canonical CIDR format",
    "site-code and site-name matching",
    "VLAN ID and VLAN name normalization",
    "gateway and subnet reconciliation",
    "truth-state tagging for discovered objects",
  ];
  const notes: string[] = [];
  let readiness: DiscoveredStateImportPlanSummary["readiness"] = "not-ready";

  if (brownfieldReadiness.importReadiness === "ready" && currentStateBoundary.liveMappingReady && traceabilityCoverage.coverageState !== "thin") readiness = "ready";
  else if (brownfieldReadiness.importReadiness !== "not-ready" || currentStateBoundary.liveMappingReady) readiness = "review";

  if (readiness === "not-ready") notes.push("Discovered-state import should wait until addressing boundaries and traceability are cleaner.");
  if (readiness === "review") notes.push("Discovered-state import looks feasible, but normalization and reconciliation rules should be confirmed before it is trusted for planning.");
  if (readiness === "ready") notes.push("The project is structurally ready for a first discovered-state import pass, as long as imported data is normalized into canonical design objects.");

  return {
    readiness,
    suggestedSources,
    requiredNormalizations,
    notes,
  };
}

export function buildImplementationReadinessSummary(
  issues: DesignCoreIssue[],
  currentStateBoundary: CurrentStateBoundarySummary,
  routeDomain: RouteDomainSummary,
  policyConsequences: PolicyConsequenceSummary,
): ImplementationReadinessSummary {
  const blockers = Array.from(new Set(
    issues
      .filter((issue) => issue.severity === "ERROR")
      .map((issue) => issue.code),
  )).sort();

  const prerequisites: string[] = [];
  const notes: string[] = [];
  if (!currentStateBoundary.currentStateReady) prerequisites.push("clean current-state addressing and gateway blockers");
  if (!routeDomain.summarizationBoundariesReady) prerequisites.push("confirm site summary boundaries");
  if (!routeDomain.transitGraphReady) prerequisites.push("confirm WAN adjacency and transit intent");
  if (policyConsequences.managementPlaneProtectionState !== "expected") prerequisites.push("confirm management-plane restriction intent");
  if (policyConsequences.guestContainmentState === "partial") prerequisites.push("confirm guest isolation policy consequences");

  let state: ImplementationReadinessSummary["state"] = "ready";
  if (blockers.length > 0) state = "blocked";
  else if (prerequisites.length > 0) state = "review";

  if (state === "blocked") notes.push("Implementation planning is blocked because structural design errors still exist.");
  if (state === "review") notes.push("Implementation planning can begin at a draft level, but prerequisite design confirmations are still outstanding.");
  if (state === "ready") notes.push("Implementation planning can proceed because no structural blockers remain and the main route and policy prerequisites are signaled.");

  return {
    state,
    blockers,
    prerequisites,
    notes,
  };
}

export function buildEngineConfidenceSummary(
  traceabilityCoverage: TraceabilityCoverageSummary,
  allocatorConfidence: AllocatorConfidenceSummary,
  brownfieldReadiness: BrownfieldReadinessSummary,
  implementationReadiness: ImplementationReadinessSummary,
  routeDomain: RouteDomainSummary,
  standardsAlignment: StandardsAlignmentSummary,
  planningInputCoverage: PlanningInputCoverageSummary,
  requirementsCoverage: RequirementsCoverageSummary,
): EngineConfidenceSummary {
  let score = 100;
  const drivers: string[] = [];
  const notes: string[] = [];

  if (allocatorConfidence.state === "medium") {
    score -= 15;
    drivers.push("allocator confidence reduced by structural addressing blockers");
  } else if (allocatorConfidence.state === "low") {
    score -= 30;
    drivers.push("allocator confidence reduced by multiple structural addressing blockers");
  } else {
    drivers.push("allocator confidence is strong");
  }

  if (traceabilityCoverage.coverageState === "partial") {
    score -= 10;
    drivers.push("traceability coverage is partial");
  } else if (traceabilityCoverage.coverageState === "thin") {
    score -= 20;
    drivers.push("traceability coverage is thin");
  } else {
    drivers.push("traceability coverage is strong");
  }

  if (brownfieldReadiness.currentStateEvidence === "partial") {
    score -= 8;
    drivers.push("current-state evidence is only partial");
  } else if (brownfieldReadiness.currentStateEvidence === "thin") {
    score -= 15;
    drivers.push("current-state evidence is thin");
  }

  if (!routeDomain.summarizationBoundariesReady) {
    score -= 10;
    drivers.push("route-domain summarization boundaries still need work");
  }
  if (!routeDomain.transitGraphReady) {
    score -= 7;
    drivers.push("WAN transit graph is not fully ready");
  }
  if (implementationReadiness.state === "blocked") {
    score -= 15;
    drivers.push("implementation readiness is blocked");
  } else if (implementationReadiness.state === "review") {
    score -= 5;
    drivers.push("implementation readiness still needs review");
  }

  if (standardsAlignment.violatedRuleIds.length > 0) {
    score -= Math.min(20, standardsAlignment.violatedRuleIds.length * 8);
    drivers.push("one or more required standards rulebook items are currently violated");
  }
  if (standardsAlignment.reviewRuleIds.length > 0) {
    score -= Math.min(10, standardsAlignment.reviewRuleIds.length * 2);
    drivers.push("some standards and best-practice items still need engineering review");
  }
  if (planningInputCoverage.activeNotYetImplementedCount > 0) {
    score -= Math.min(10, planningInputCoverage.activeNotYetImplementedCount * 3);
    drivers.push("the current project uses saved inputs that still do not change outputs deeply enough");
  }

  if (requirementsCoverage.missingCount > 0) {
    score -= Math.min(12, requirementsCoverage.missingCount * 2);
    drivers.push("some planning requirement areas are still missing or too shallow to drive strong outputs");
  }
  if (requirementsCoverage.partialCount > 0) {
    score -= Math.min(8, requirementsCoverage.partialCount);
    drivers.push("some planning requirement areas are only partially implemented in the current engine");
  }

  score = Math.max(0, Math.min(100, score));
  let state: EngineConfidenceSummary["state"] = "high";
  if (score < 80) state = "medium";
  if (score < 60) state = "low";

  if (state === "high") notes.push("Engine confidence is high enough for serious design review use, though not a substitute for implementation review.");
  if (state === "medium") notes.push("Engine confidence is usable, but the design still needs targeted review before it should be treated as review-ready.");
  if (state === "low") notes.push("Engine confidence is currently too low for blind trust because structural design or traceability weaknesses still remain.");

  return {
    state,
    score,
    drivers,
    notes,
  };
}

