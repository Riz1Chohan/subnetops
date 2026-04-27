import type { SegmentRole } from "../lib/cidr.js";
import type { StandardsRule, StandardsRulebookSummary, StandardsRuleStatus } from "../lib/networkStandardsRulebook.js";
import type { PlanningInputAuditItem, PlanningInputAuditSummary } from "../lib/planningInputAudit.js";

export interface DesignCoreIssue {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  entityType: "PROJECT" | "SITE" | "VLAN";
  entityId?: string;
}

export interface DesignCoreSiteBlock {
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  sourceValue?: string | null;
  canonicalCidr?: string;
  proposedCidr?: string;
  truthState: "configured" | "inferred" | "proposed";
  validationState: "valid" | "invalid";
  rangeSummary?: string;
  inOrganizationBlock: boolean | null;
  overlapsWithSiteIds: string[];
  notes: string[];
}

export interface DesignCoreAddressRow {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  truthState: "configured" | "inferred" | "proposed";
  sourceSubnetCidr: string;
  canonicalSubnetCidr?: string;
  proposedSubnetCidr?: string;
  sourceGatewayIp: string;
  effectiveGatewayIp?: string;
  proposedGatewayIp?: string;
  siteBlockCidr?: string | null;
  inSiteBlock: boolean | null;
  estimatedHosts: number | null;
  recommendedPrefix?: number;
  usableHosts?: number;
  capacityState: "unknown" | "fits" | "undersized";
  gatewayState: "valid" | "invalid" | "fallback";
  gatewayConvention: "first-usable" | "last-usable" | "custom" | "not-applicable";
  dhcpEnabled: boolean;
  notes: string[];
}

export interface DesignCoreProposalRow {
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  reason: string;
  recommendedPrefix: number;
  proposedSubnetCidr?: string;
  proposedGatewayIp?: string;
  notes: string[];
}

export interface DesignTraceabilityItem {
  sourceArea: "requirements" | "discovery" | "platform";
  sourceKey: string;
  sourceLabel: string;
  sourceValue: string;
  impacts: string[];
  confidence: "high" | "medium" | "advisory";
}

export interface CurrentStateBoundarySummary {
  configuredObjectCount: number;
  proposedObjectCount: number;
  inferredObjectCount: number;
  discoveredObjectCount: number;
  currentStateReady: boolean;
  proposedStateReady: boolean;
  liveMappingReady: boolean;
  notes: string[];
}

export interface SiteSummarizationReview {
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  currentSiteBlock?: string | null;
  minimumRequiredSummary?: string;
  status: "good" | "review" | "missing";
  coveredSubnetCount: number;
  notes: string[];
}

export interface TransitPlanRow {
  kind: "existing" | "proposed";
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  vlanId?: number;
  subnetCidr?: string;
  gatewayOrEndpoint?: string;
  notes: string[];
}

export interface LoopbackPlanRow {
  kind: "existing" | "proposed";
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  vlanId?: number;
  subnetCidr?: string;
  endpointIp?: string;
  notes: string[];
}

export interface TruthStateLedger {
  configuredCount: number;
  inferredCount: number;
  proposedCount: number;
  discoveredCount: number;
  asBuiltCount: number;
  notes: string[];
}


export interface AllocationPolicySummary {
  organizationBlockStrategy: "confirmed" | "missing" | "invalid";
  siteAllocationMode: "configured" | "mixed" | "backend-proposed";
  gatewayMode: "first-usable" | "last-usable" | "mixed" | "custom" | "not-applicable";
  transitMode: "/31-preferred" | "deferred";
  loopbackMode: "/32-per-site" | "deferred";
  notes: string[];
}

export interface RoutingIntentSummary {
  topologyStyle: "single-site" | "hub-and-spoke" | "multi-site";
  routingPosture: string;
  summarizationReadiness: "ready" | "review" | "blocked";
  transitReadiness: "ready" | "partial" | "deferred";
  loopbackReadiness: "ready" | "partial" | "deferred";
  notes: string[];
}

export interface SecurityIntentSummary {
  zoneNames: string[];
  managementIsolationExpected: boolean;
  guestIsolationExpected: boolean;
  remoteAccessExpected: boolean;
  eastWestSegmentationExpected: boolean;
  posture: "baseline" | "segmented" | "restricted";
  notes: string[];
}

export interface TraceabilityCoverageSummary {
  itemCount: number;
  coverageState: "strong" | "partial" | "thin";
  missingAreas: string[];
  notes: string[];
}
export interface WanPlanSummary {
  recommendedModel: "single-site" | "hub-and-spoke" | "partial-mesh" | "hybrid";
  siteLinkCount: number;
  transitStrategy: "existing-only" | "proposal-ready" | "deferred";
  centralization: "local" | "shared-services" | "hybrid";
  notes: string[];
}

export interface BrownfieldReadinessSummary {
  mode: "greenfield" | "brownfield" | "mixed";
  currentStateEvidence: "thin" | "partial" | "strong";
  importReadiness: "not-ready" | "review" | "ready";
  driftReviewReadiness: "not-ready" | "review" | "ready";
  notes: string[];
}

export interface AllocatorConfidenceSummary {
  state: "high" | "medium" | "low";
  blockerCodes: string[];
  notes: string[];
}


export interface RouteDomainSummary {
  domainModel: "single-domain" | "site-summarized" | "mixed";
  summarizationBoundariesReady: boolean;
  transitGraphReady: boolean;
  routeIdentityReady: boolean;
  notes: string[];
}

export interface PolicyConsequenceSummary {
  managementPlaneProtectionState: "expected" | "partial" | "not-signaled";
  guestContainmentState: "expected" | "partial" | "not-signaled";
  remoteAccessControlState: "expected" | "partial" | "not-signaled";
  eastWestRestrictionState: "expected" | "partial" | "not-signaled";
  notes: string[];
}

export interface DiscoveredStateImportPlanSummary {
  readiness: "not-ready" | "review" | "ready";
  suggestedSources: string[];
  requiredNormalizations: string[];
  notes: string[];
}

export interface ImplementationReadinessSummary {
  state: "blocked" | "review" | "ready";
  blockers: string[];
  prerequisites: string[];
  notes: string[];
}

export interface EngineConfidenceSummary {
  state: "low" | "medium" | "high";
  score: number;
  drivers: string[];
  notes: string[];
}

export interface AllocatorDeterminismSummary {
  state: "high" | "medium" | "low";
  evaluationOrder: string[];
  blockingConditions: string[];
  notes: string[];
}

export interface StandardsRuleEvaluation {
  ruleId: string;
  title: string;
  authority: StandardsRule["authority"];
  strength: StandardsRule["strength"];
  status: StandardsRuleStatus;
  notes: string[];
}

export interface StandardsAlignmentSummary {
  rulebook: StandardsRulebookSummary;
  evaluations: StandardsRuleEvaluation[];
  appliedRuleIds: string[];
  deferredRuleIds: string[];
  violatedRuleIds: string[];
  reviewRuleIds: string[];
  notes: string[];
}

export interface ActivePlanningInputSummary {
  sourceArea: PlanningInputAuditItem["sourceArea"];
  key: string;
  impact: PlanningInputAuditItem["impact"];
  value: string;
  outputAreas: string[];
  note: string;
}

export interface PlanningInputCoverageSummary {
  audit: PlanningInputAuditSummary;
  directKeys: string[];
  indirectKeys: string[];
  notYetImplementedKeys: string[];
  activeInputs: ActivePlanningInputSummary[];
  activeDirectCount: number;
  activeIndirectCount: number;
  activeNotYetImplementedCount: number;
  notes: string[];
}

export interface RequirementsCoverageArea {
  id: string;
  title: string;
  status: "implemented" | "partial" | "missing";
  signals: string[];
  notes: string[];
}

export interface RequirementsCoverageSummary {
  areas: RequirementsCoverageArea[];
  implementedCount: number;
  partialCount: number;
  missingCount: number;
  missingAreaIds: string[];
  notes: string[];
}

export interface PlanningInputDisciplineItem {
  sourceArea: PlanningInputAuditItem["sourceArea"];
  key: string;
  impact: PlanningInputAuditItem["impact"];
  value: string;
  outputAreas: string[];
  reflectedInOutputs: boolean;
  reflectionNotes: string[];
}

export interface PlanningInputDisciplineSummary {
  items: PlanningInputDisciplineItem[];
  reflectedCount: number;
  notReflectedCount: number;
  notReflectedKeys: string[];
  notes: string[];
}

export interface DesignCoreSnapshot {
  projectId: string;
  projectName: string;
  generatedAt: string;
  authority: {
    source: "backend-design-core";
    mode: "authoritative";
    generatedAt: string;
    requiresEngineerReview: true;
  };
  organizationBlock?: {
    sourceValue?: string | null;
    canonicalCidr?: string;
    validationState: "valid" | "invalid" | "missing";
    notes: string[];
  };
  summary: {
    siteCount: number;
    vlanCount: number;
    validSiteBlockCount: number;
    validSubnetCount: number;
    issueCount: number;
    proposedSiteBlockCount: number;
    proposalCount: number;
    planningInputNotReflectedCount: number;
    traceabilityCount: number;
    summarizationReviewCount: number;
    transitPlanCount: number;
    loopbackPlanCount: number;
    readyForBackendAuthority: boolean;
    readyForLiveMappingSplit: boolean;
  };
  truthStateSummary: TruthStateLedger;
  allocationPolicy: AllocationPolicySummary;
  routingIntent: RoutingIntentSummary;
  routeDomain: RouteDomainSummary;
  securityIntent: SecurityIntentSummary;
  policyConsequences: PolicyConsequenceSummary;
  traceabilityCoverage: TraceabilityCoverageSummary;
  wanPlan: WanPlanSummary;
  brownfieldReadiness: BrownfieldReadinessSummary;
  discoveredStateImportPlan: DiscoveredStateImportPlanSummary;
  allocatorConfidence: AllocatorConfidenceSummary;
  implementationReadiness: ImplementationReadinessSummary;
  engineConfidence: EngineConfidenceSummary;
  allocatorDeterminism: AllocatorDeterminismSummary;
  standardsAlignment: StandardsAlignmentSummary;
  planningInputCoverage: PlanningInputCoverageSummary;
  planningInputDiscipline: PlanningInputDisciplineSummary;
  requirementsCoverage: RequirementsCoverageSummary;
  currentStateBoundary: CurrentStateBoundarySummary;
  siteBlocks: DesignCoreSiteBlock[];
  addressingRows: DesignCoreAddressRow[];
  proposedRows: DesignCoreProposalRow[];
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
  loopbackPlan: LoopbackPlanRow[];
  traceability: DesignTraceabilityItem[];
  standardsRulebook: StandardsRule[];
  planningInputAudit: PlanningInputAuditItem[];
  issues: DesignCoreIssue[];
}
