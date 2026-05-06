import { parseJsonMap, valueAsBoolean, valueAsString } from "./designCore.helpers.js";
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

export function buildAllocationPolicySummary(
  organizationBlock: { validationState: "valid" | "missing" | "invalid" },
  siteBlocks: SiteBlockRecord[],
  addressingRows: AddressRowRecord[],
  transitPlan: TransitPlanRow[],
  loopbackPlan: LoopbackPlanRow[],
): AllocationPolicySummary {
  const notes: string[] = [];
  const configuredSiteBlocks = siteBlocks.filter((item) => Boolean(item.canonicalCidr)).length;
  const proposedSiteBlocks = siteBlocks.filter((item) => Boolean(item.proposedCidr)).length;
  const gatewayModes = new Set(addressingRows.map((row) => row.gatewayConvention).filter((value) => value !== "not-applicable"));

  let siteAllocationMode: AllocationPolicySummary["siteAllocationMode"] = "configured";
  if (configuredSiteBlocks > 0 && proposedSiteBlocks > 0) siteAllocationMode = "mixed";
  else if (configuredSiteBlocks === 0 && proposedSiteBlocks > 0) siteAllocationMode = "backend-proposed";

  let gatewayMode: AllocationPolicySummary["gatewayMode"] = "not-applicable";
  if (gatewayModes.size === 1) {
    gatewayMode = Array.from(gatewayModes)[0] as AllocationPolicySummary["gatewayMode"];
  } else if (gatewayModes.size > 1) {
    gatewayMode = "mixed";
  }

  if (siteAllocationMode === "mixed") {
    notes.push("Some site summary blocks are saved and some are currently backend-proposed. Confirm the final per-site hierarchy before treating it as review-ready.");
  }
  if (gatewayMode === "mixed") {
    notes.push("Gateway conventions vary across the project. That can be acceptable, but it should be deliberate rather than accidental.");
  }
  if (transitPlan.some((item) => item.kind === "proposed")) {
    notes.push("Transit allocations are currently planned with /31 preference where the environment looks multi-site.");
  }
  if (loopbackPlan.some((item) => item.kind === "proposed")) {
    notes.push("Loopbacks are currently planned as one /32 identity allocation per site when needed.");
  }

  return {
    organizationBlockStrategy: organizationBlock.validationState === "valid" ? "confirmed" : organizationBlock.validationState,
    siteAllocationMode,
    gatewayMode,
    transitMode: transitPlan.length > 0 ? "/31-preferred" : "deferred",
    loopbackMode: loopbackPlan.length > 0 ? "/32-per-site" : "deferred",
    notes,
  };
}

export function buildRoutingIntentSummary(
  project: ProjectWithDesignData,
  siteSummaries: SiteSummarizationReview[],
  transitPlan: TransitPlanRow[],
  loopbackPlan: LoopbackPlanRow[],
  issues: DesignCoreIssue[],
): RoutingIntentSummary {
  const platform = parseJsonMap(project.platformProfileJson);
  const topologyStyle: RoutingIntentSummary["topologyStyle"] = project.sites.length <= 1 ? "single-site" : "hub-and-spoke";
  const routingPosture = valueAsString(platform.routingPosture) || (project.sites.length <= 1 ? "single-site routed access" : "summarized multi-site routing");
  const hasSummaryBlocker = siteSummaries.some((item) => item.status === "missing") || issues.some((issue) => issue.code === "SITE_BLOCK_OVERLAP");
  const hasSummaryReview = siteSummaries.some((item) => item.status === "review");
  const proposedTransitCount = transitPlan.filter((item) => item.kind === "proposed").length;
  const proposedLoopbackCount = loopbackPlan.filter((item) => item.kind === "proposed").length;
  const notes: string[] = [];

  if (hasSummaryBlocker) notes.push("At least one site still lacks a stable summary boundary, so routing summarization is not yet clean enough to be treated as final.");
  else if (hasSummaryReview) notes.push("Site summary boundaries exist but still need review before they should drive protocol summarization decisions.");
  else notes.push("Site summary boundaries are clean enough to support routing-domain summarization planning.");

  if (project.sites.length > 1 && proposedTransitCount === 0 && !transitPlan.some((item) => item.kind === "existing")) {
    notes.push("The project looks multi-site, but no transit segments are confirmed yet. Review WAN adjacency and transport intent before implementation.");
  }
  if (proposedLoopbackCount === 0 && !loopbackPlan.some((item) => item.kind === "existing")) {
    notes.push("No loopback identity segments are confirmed yet. That may be acceptable for simpler environments, but routed designs often benefit from stable loopback references.");
  }

  return {
    topologyStyle,
    routingPosture,
    summarizationReadiness: hasSummaryBlocker ? "blocked" : hasSummaryReview ? "review" : "ready",
    transitReadiness: project.sites.length <= 1 ? "deferred" : proposedTransitCount > 0 || transitPlan.some((item) => item.kind === "existing") ? "ready" : "partial",
    loopbackReadiness: proposedLoopbackCount > 0 || loopbackPlan.some((item) => item.kind === "existing") ? "ready" : "partial",
    notes,
  };
}

export function buildSecurityIntentSummary(project: ProjectWithDesignData, addressingRows: AddressRowRecord[]): SecurityIntentSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const zoneNames = Array.from(new Set(addressingRows.map((row) => row.role))).sort();
  const managementIsolationExpected = valueAsBoolean(requirements.management) || zoneNames.includes("MANAGEMENT");
  const guestIsolationExpected = valueAsBoolean(requirements.guestWifi) || zoneNames.includes("GUEST");
  const remoteAccessExpected = valueAsBoolean(requirements.remoteAccess);
  const eastWestSegmentationExpected = valueAsBoolean(requirements.iot) || zoneNames.includes("SERVER") || zoneNames.includes("IOT");
  const notes: string[] = [];
  if (guestIsolationExpected) notes.push("Guest access should remain separated from trusted user and management zones.");
  if (managementIsolationExpected) notes.push("Management plane traffic should be restricted to approved administrative paths.");
  if (remoteAccessExpected) notes.push("Remote access requirements imply VPN, identity, and logging control points.");
  if (eastWestSegmentationExpected) notes.push("East-west segmentation should be explicit where servers, management, IoT, or specialty segments exist.");

  let posture: SecurityIntentSummary["posture"] = "baseline";
  if (guestIsolationExpected || managementIsolationExpected || remoteAccessExpected) posture = "segmented";
  if (eastWestSegmentationExpected && (guestIsolationExpected || managementIsolationExpected)) posture = "restricted";

  return {
    zoneNames,
    managementIsolationExpected,
    guestIsolationExpected,
    remoteAccessExpected,
    eastWestSegmentationExpected,
    posture,
    notes,
  };
}

export function buildRouteDomainSummary(
  project: ProjectWithDesignData,
  siteSummaries: SiteSummarizationReview[],
  transitPlan: TransitPlanRow[],
  loopbackPlan: LoopbackPlanRow[],
): RouteDomainSummary {
  const notes: string[] = [];
  const domainModel: RouteDomainSummary["domainModel"] = project.sites.length <= 1
    ? "single-domain"
    : siteSummaries.every((item) => item.status === "good")
      ? "site-summarized"
      : "mixed";
  const summarizationBoundariesReady = siteSummaries.length > 0 && siteSummaries.every((item) => item.status === "good");
  const transitGraphReady = project.sites.length <= 1 || transitPlan.some((item) => item.kind === "existing" || item.kind === "proposed");
  const routeIdentityReady = loopbackPlan.some((item) => item.kind === "existing" || item.kind === "proposed") || project.sites.length <= 1;

  if (!summarizationBoundariesReady) notes.push("Route-domain summarization is not fully ready because at least one site still lacks a clean summary boundary.");
  else notes.push("Site summary boundaries are strong enough to anchor route-domain summarization.");
  if (!transitGraphReady) notes.push("Transit graph planning is still incomplete, so WAN adjacency intent should not yet be treated as final.");
  if (!routeIdentityReady) notes.push("Stable route-identity references are still incomplete because loopback planning is not yet present everywhere it would help.");

  return {
    domainModel,
    summarizationBoundariesReady,
    transitGraphReady,
    routeIdentityReady,
    notes,
  };
}

export function buildPolicyConsequenceSummary(
  securityIntent: SecurityIntentSummary,
  traceability: DesignTraceabilityItem[],
): PolicyConsequenceSummary {
  const notes: string[] = [];
  const traceKeys = new Set(traceability.map((item) => `${item.sourceArea}:${item.sourceKey}`));

  const managementPlaneProtectionState: PolicyConsequenceSummary["managementPlaneProtectionState"] = securityIntent.managementIsolationExpected
    ? "expected"
    : traceKeys.has("discovery:securityPosture") || securityIntent.zoneNames.includes("MANAGEMENT")
      ? "partial"
      : "not-signaled";

  const guestContainmentState: PolicyConsequenceSummary["guestContainmentState"] = securityIntent.guestIsolationExpected
    ? "expected"
    : securityIntent.zoneNames.includes("GUEST")
      ? "partial"
      : "not-signaled";

  const remoteAccessControlState: PolicyConsequenceSummary["remoteAccessControlState"] = securityIntent.remoteAccessExpected
    ? "expected"
    : traceKeys.has("requirements:remoteAccess")
      ? "partial"
      : "not-signaled";

  const eastWestRestrictionState: PolicyConsequenceSummary["eastWestRestrictionState"] = securityIntent.eastWestSegmentationExpected
    ? "expected"
    : securityIntent.zoneNames.includes("SERVER") || securityIntent.zoneNames.includes("IOT")
      ? "partial"
      : "not-signaled";

  if (managementPlaneProtectionState !== "expected") notes.push("Management-plane policy consequences are not yet fully signaled from requirements and design structure.");
  if (guestContainmentState !== "expected" && securityIntent.zoneNames.includes("GUEST")) notes.push("Guest segments exist, but guest-containment intent still needs stronger policy consequence signaling.");
  if (remoteAccessControlState === "expected") notes.push("Remote access requirements imply identity, VPN, logging, and restricted management-plane consequences.");
  if (eastWestRestrictionState === "expected") notes.push("Server, IoT, and management presence imply stronger east-west restriction consequences.");

  return {
    managementPlaneProtectionState,
    guestContainmentState,
    remoteAccessControlState,
    eastWestRestrictionState,
    notes,
  };
}

export function buildWanPlanSummary(
  project: ProjectWithDesignData,
  transitPlan: TransitPlanRow[],
  traceability: DesignTraceabilityItem[],
): WanPlanSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const sharedServices = valueAsString(requirements.serverPlacement).toLowerCase();
  const internetModel = valueAsString(requirements.internetModel).toLowerCase();
  const notes: string[] = [];

  let recommendedModel: WanPlanSummary["recommendedModel"] = "single-site";
  if (project.sites.length > 1) recommendedModel = "hub-and-spoke";
  if (project.sites.length > 3 && internetModel.includes("local")) recommendedModel = "hybrid";
  if (project.sites.length > 4 && internetModel.includes("mesh")) recommendedModel = "partial-mesh";

  let centralization: WanPlanSummary["centralization"] = "local";
  if (sharedServices.includes("central") || sharedServices.includes("shared")) centralization = "shared-services";
  if (sharedServices.includes("hybrid")) centralization = "hybrid";

  const proposedTransitCount = transitPlan.filter((item) => item.kind === "proposed").length;
  const existingTransitCount = transitPlan.filter((item) => item.kind === "existing").length;
  let transitStrategy: WanPlanSummary["transitStrategy"] = "deferred";
  if (existingTransitCount > 0 && proposedTransitCount === 0) transitStrategy = "existing-only";
  if (proposedTransitCount > 0) transitStrategy = "proposal-ready";

  if (project.sites.length <= 1) notes.push("WAN planning is naturally minimal because the current design is single-site.");
  else notes.push(`Backend WAN view assumes ${recommendedModel} connectivity for ${project.sites.length} sites.`);
  if (centralization !== "local") notes.push(`Service placement suggests a ${centralization} WAN dependency model.`);
  if (traceability.some((item) => item.sourceArea === "platform" && item.sourceKey === "wanPosture")) {
    notes.push("Platform WAN posture exists and can support later discovered-versus-proposed reconciliation.");
  }

  return {
    recommendedModel,
    siteLinkCount: Math.max(project.sites.length - 1, 0),
    transitStrategy,
    centralization,
    notes,
  };
}

