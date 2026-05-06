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

export function buildAllocatorConfidenceSummary(issues: DesignCoreIssue[]): AllocatorConfidenceSummary {
  const blockerCodes = Array.from(new Set(
    issues
      .filter((issue) => issue.severity === "ERROR" && [
        "ORG_BLOCK_INVALID",
        "SITE_BLOCK_INVALID",
        "SITE_BLOCK_OVERLAP",
        "SITE_BLOCK_OUTSIDE_ORG_RANGE",
        "SUBNET_INVALID",
        "SUBNET_OVERLAP_LOCAL",
        "SUBNET_OUTSIDE_SITE_BLOCK",
        "SUBNET_UNDERSIZED",
      ].includes(issue.code))
      .map((issue) => issue.code),
  ));

  const notes: string[] = [];
  let state: AllocatorConfidenceSummary["state"] = "high";
  if (blockerCodes.length >= 3) state = "low";
  else if (blockerCodes.length >= 1) state = "medium";

  if (state === "high") notes.push("Allocator confidence is high because there are no structural addressing blockers in the current snapshot.");
  if (state === "medium") notes.push("Allocator confidence is reduced because at least one structural addressing blocker still exists.");
  if (state === "low") notes.push("Allocator confidence is low because multiple structural blockers still exist. Backend proposals should be reviewed before trust increases.");

  return {
    state,
    blockerCodes,
    notes,
  };
}

export function buildTruthStateLedger(currentStateBoundary: CurrentStateBoundarySummary): TruthStateLedger {
  const notes: string[] = [];
  if (currentStateBoundary.discoveredObjectCount === 0) {
    notes.push("No discovered live-state objects exist yet. Current-state entries still represent saved planner data rather than imported evidence.");
  }
  if (currentStateBoundary.proposedObjectCount > 0) {
    notes.push("Backend-generated proposal objects are now tracked separately from saved planner objects.");
  }
  notes.push("As-built count remains zero until the product ingests verified deployment evidence.");

  return {
    configuredCount: currentStateBoundary.configuredObjectCount,
    inferredCount: currentStateBoundary.inferredObjectCount,
    proposedCount: currentStateBoundary.proposedObjectCount,
    discoveredCount: currentStateBoundary.discoveredObjectCount,
    asBuiltCount: 0,
    notes,
  };
}

export function buildCurrentStateBoundary(siteBlocks: SiteBlockRecord[], addressingRows: AddressRowRecord[], issues: DesignCoreIssue[]): CurrentStateBoundarySummary {
  const configuredObjectCount = siteBlocks.length + addressingRows.length;
  const proposedObjectCount = siteBlocks.filter((item) => item.proposedCidr).length + addressingRows.filter((item) => item.proposedSubnetCidr).length;
  const inferredObjectCount = 0;
  const discoveredObjectCount = 0;
  const currentStateReady = !issues.some((issue) => issue.severity === "ERROR" && [
    "ORG_BLOCK_INVALID",
    "SITE_BLOCK_INVALID",
    "SITE_BLOCK_OVERLAP",
    "SITE_BLOCK_OUTSIDE_ORG_RANGE",
    "SUBNET_INVALID",
    "SUBNET_OVERLAP_LOCAL",
    "SUBNET_UNDERSIZED",
    "SUBNET_OUTSIDE_SITE_BLOCK",
    "GATEWAY_INVALID",
    "GATEWAY_UNUSABLE",
  ].includes(issue.code));
  const proposedStateReady = siteBlocks.some((item) => Boolean(item.proposedCidr)) || addressingRows.some((item) => Boolean(item.proposedSubnetCidr));
  const liveMappingReady = currentStateReady && !issues.some((issue) => issue.code === "SITE_BLOCK_OVERLAP");
  const notes: string[] = [];

  if (!currentStateReady) {
    notes.push("Current-state trust is not yet clean enough for blind brownfield mapping because at least one saved addressing or boundary issue still exists.");
  }
  if (!proposedStateReady) {
    notes.push("No backend proposals were required or generated yet. That can be healthy if the saved model is already clean.");
  } else {
    notes.push("The snapshot now separates saved current-state objects from backend-generated proposed corrections.");
  }
  if (liveMappingReady) {
    notes.push("Site boundary and addressing conditions are clean enough to introduce future discovered-versus-proposed live mapping states.");
  }

  return {
    configuredObjectCount,
    proposedObjectCount,
    inferredObjectCount,
    discoveredObjectCount,
    currentStateReady,
    proposedStateReady,
    liveMappingReady,
    notes,
  };
}

export function buildAllocatorDeterminismSummary(
  issues: DesignCoreIssue[],
  siteBlocks: SiteBlockRecord[],
  proposals: DesignCoreProposalRow[],
): AllocatorDeterminismSummary {
  const blockingConditions = Array.from(new Set(
    issues
      .filter((issue) => issue.severity === "ERROR")
      .map((issue) => issue.code),
  )).sort();

  const evaluationOrder = proposals
    .map((proposal) => `${proposal.siteCode || proposal.siteName}:VLAN${proposal.vlanId}:/${proposal.recommendedPrefix}`)
    .sort((left, right) => left.localeCompare(right));

  let state: AllocatorDeterminismSummary["state"] = "high";
  if (blockingConditions.length >= 4) state = "low";
  else if (blockingConditions.length >= 1) state = "medium";

  const notes: string[] = [];
  if (siteBlocks.some((item) => Boolean(item.proposedCidr))) {
    notes.push("Backend site-block proposals are generated from a consistent free-space search inside the organization block.");
  }
  if (proposals.length > 0) {
    notes.push("Subnet proposals are ordered by prefix size, role priority, site identity, VLAN identifier, and row identifier so repeated evaluations stay stable for the same saved inputs.");
  } else {
    notes.push("No subnet proposals were required, so allocator determinism is judged mainly from saved-state cleanliness.");
  }
  if (blockingConditions.length > 0) {
    notes.push(`Determinism confidence is reduced because blocking conditions still exist: ${blockingConditions.join(", ")}.`);
  }

  return {
    state,
    evaluationOrder,
    blockingConditions,
    notes,
  };
}

export function buildStandardsEnforcementNotes(standardsAlignment: StandardsAlignmentSummary): string[] {
  const notes: string[] = [];
  const requiredViolations = standardsAlignment.evaluations
    .filter((item) => item.status === "violated" && item.strength === "required")
    .map((item) => item.title);

  if (requiredViolations.length > 0) {
    notes.push(`Required standards blockers remain: ${requiredViolations.join("; ")}.`);
  }

  return notes;
}

