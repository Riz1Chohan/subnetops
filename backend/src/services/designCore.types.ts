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
  prefix?: number;
  networkAddress?: string;
  broadcastAddress?: string;
  dottedMask?: string;
  wildcardMask?: string;
  totalAddresses?: number;
  usableAddresses?: number;
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
  roleSource?: "explicit" | "inferred" | "unknown";
  roleConfidence?: "high" | "medium" | "low";
  roleEvidence?: string;
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
  requiredUsableHosts?: number;
  recommendedUsableHosts?: number;
  bufferMultiplier?: number;
  capacityHeadroom?: number;
  usableHosts?: number;
  totalAddresses?: number;
  networkAddress?: string;
  broadcastAddress?: string;
  firstUsableIp?: string | null;
  lastUsableIp?: string | null;
  dottedMask?: string;
  wildcardMask?: string;
  capacityState: "unknown" | "fits" | "undersized";
  capacityBasis?: string;
  capacityExplanation?: string;
  allocatorExplanation?: string;
  allocatorParentCidr?: string;
  allocatorUsedRangeCount?: number;
  allocatorFreeRangeCount?: number;
  allocatorLargestFreeRange?: string;
  allocatorUtilizationPercent?: number;
  allocatorCanFitRequestedPrefix?: boolean;
  allocationReason?: string;
  engine1Explanation?: string;
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
  roleSource?: "explicit" | "inferred" | "unknown";
  roleConfidence?: "high" | "medium" | "low";
  roleEvidence?: string;
  allocatorExplanation?: string;
  allocatorParentCidr?: string;
  allocatorUsedRangeCount?: number;
  allocatorFreeRangeCount?: number;
  allocatorLargestFreeRange?: string;
  allocatorUtilizationPercent?: number;
  allocatorCanFitRequestedPrefix?: boolean;
  reason: string;
  recommendedPrefix: number;
  requiredUsableHosts?: number;
  proposedSubnetCidr?: string;
  proposedGatewayIp?: string;
  proposedNetworkAddress?: string;
  proposedBroadcastAddress?: string;
  proposedFirstUsableIp?: string | null;
  proposedLastUsableIp?: string | null;
  proposedDottedMask?: string;
  proposedWildcardMask?: string;
  proposedTotalAddresses?: number;
  proposedUsableHosts?: number;
  proposedCapacityHeadroom?: number;
  notes: string[];
}


export type DesignTruthSourceType =
  | "USER_PROVIDED"
  | "REQUIREMENT_MATERIALIZED"
  | "BACKEND_COMPUTED"
  | "ENGINE2_DURABLE"
  | "INFERRED"
  | "ESTIMATED"
  | "IMPORTED"
  | "REVIEW_REQUIRED"
  | "UNSUPPORTED";

export type DesignProofStatus =
  | "PROVEN"
  | "PARTIAL"
  | "REVIEW_REQUIRED"
  | "NOT_DESIGN_DRIVING"
  | "UNSUPPORTED"
  | "DRAFT_ONLY";

export type RequirementPropagationLifecycleStatus =
  | "NOT_CAPTURED"
  | "CAPTURED_ONLY"
  | "MATERIALIZED"
  | "PARTIALLY_PROPAGATED"
  | "FULLY_PROPAGATED"
  | "REVIEW_REQUIRED"
  | "BLOCKED"
  | "UNSUPPORTED";

export type DesignTraceConfidence = "high" | "medium" | "low" | "advisory";

export interface DesignSourceTraceLabel {
  sourceType: DesignTruthSourceType;
  sourceRequirementIds: string[];
  sourceObjectIds: string[];
  sourceEngine: string;
  confidence: DesignTraceConfidence;
  proofStatus: DesignProofStatus;
  reviewReason?: string;
}

export interface DesignOutputTruthLabel extends DesignSourceTraceLabel {
  outputKey: string;
  outputLabel: string;
  consumerPath: string[];
}

export interface RequirementPropagationTraceItem extends DesignSourceTraceLabel {
  requirementId: string;
  sourceArea: "requirements" | "discovery" | "platform";
  sourceKey: string;
  sourceValue: string;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  normalizedRequirementSignal: string;
  materializedSourceObjects: string[];
  backendDesignCoreInputs: string[];
  engineOutputs: string[];
  frontendConsumers: string[];
  reportExportConsumers: string[];
  diagramConsumers: string[];
  validationReadinessImpact: string;
}

export interface Phase1PlanningTraceabilityControlSummary {
  contractVersion: "PHASE1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY";
  sourceTypePolicy: Array<{ sourceType: DesignTruthSourceType; rule: string }>;
  outputLabels: DesignOutputTruthLabel[];
  requirementLineage: RequirementPropagationTraceItem[];
  outputLabelCoverage: {
    requiredOutputCount: number;
    labelledOutputCount: number;
    reviewRequiredCount: number;
    unsupportedCount: number;
    missingLabelCount: number;
    missingLabels: string[];
  };
  requirementLineageCoverage: {
    capturedCount: number;
    fullCount: number;
    partialCount: number;
    reviewRequiredCount: number;
    notDesignDrivingCount: number;
    unsupportedCount: number;
  };
  notes: string[];
}

export interface DesignTraceabilityItem extends DesignSourceTraceLabel {
  sourceArea: "requirements" | "discovery" | "platform";
  sourceKey: string;
  sourceLabel: string;
  sourceValue: string;
  impacts: string[];
  outputAreas?: string[];
  materializationTargets?: string[];
  designConsequence?: string;
  validationEvidence?: string;
  diagramEvidence?: string;
  reportEvidence?: string;
  consumerPath: string[];
  propagationLifecycleStatus: RequirementPropagationLifecycleStatus;
}


export type RequirementMaterializationDisposition =
  | "MATERIALIZED_OBJECT"
  | "ENGINE_INPUT_SIGNAL"
  | "VALIDATION_BLOCKER"
  | "REVIEW_ITEM"
  | "EXPLICIT_NO_OP"
  | "UNSUPPORTED";

export type RequirementMaterializationStatus =
  | "materialized"
  | "engine-input-signal"
  | "validation-blocker"
  | "review-required"
  | "explicit-no-op"
  | "unsupported"
  | "policy-missing";

export interface RequirementMaterializationOutcome {
  key: string;
  label: string;
  category: string;
  expectedDisposition: RequirementMaterializationDisposition;
  normalizedSignal: string;
  createdObjectTypes: string[];
  updatedObjectTypes: string[];
  backendDesignCoreInputs: string[];
  affectedEngines: string[];
  validationImpact: string;
  frontendImpact: string[];
  reportImpact: string;
  diagramImpact: string;
  noOpReason: string;
  reviewRequiredWhen: string[];
  unsupportedReason?: string;
  confidence: "high" | "medium" | "low" | "advisory";
  sourceValue: string;
  captured: boolean;
  active: boolean;
  materializationStatus: RequirementMaterializationStatus;
  evidenceObjectIds: string[];
  actualEvidence: string[];
  reviewReason?: string;
}

export interface Phase2RequirementsMaterializationControlSummary {
  contractVersion: "PHASE2_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT";
  totalPolicyCount: number;
  capturedFieldCount: number;
  activeFieldCount: number;
  materializedObjectCount: number;
  engineInputSignalCount: number;
  validationBlockerCount: number;
  reviewItemCount: number;
  explicitNoOpCount: number;
  unsupportedCount: number;
  policyMissingCount: number;
  silentDropCount: number;
  silentDropKeys: string[];
  fieldOutcomes: RequirementMaterializationOutcome[];
  notes: string[];
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

export type Phase7StandardsApplicabilityState = "APPLICABLE" | "NOT_APPLICABLE" | "REVIEW_REQUIRED" | "UNSUPPORTED";
export type Phase7StandardsSeverity = "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO";
export type Phase7StandardsEnforcementState = "PASS" | "WARN" | "BLOCK" | "REVIEW_REQUIRED" | "NOT_APPLICABLE";
export type Phase7StandardsReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface Phase7StandardsRuleRow {
  ruleId: string;
  title: string;
  authority: StandardsRule["authority"];
  strength: StandardsRule["strength"];
  applicabilityState: Phase7StandardsApplicabilityState;
  applicabilityCondition: string;
  severity: Phase7StandardsSeverity;
  enforcementState: Phase7StandardsEnforcementState;
  affectedEngines: string[];
  affectedObjectIds: string[];
  remediationGuidance: string;
  requirementRelationships: string[];
  exceptionPolicy: string;
  evidence: string[];
  notes: string[];
}

export interface Phase7StandardsRequirementActivation {
  requirementKey: string;
  requirementValue: string;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  activatedRuleIds: string[];
  blockingRuleIds: string[];
  reviewRuleIds: string[];
  readinessImpact: "PASSED" | "REVIEW_REQUIRED" | "BLOCKING" | "NOT_APPLICABLE";
  evidence: string[];
}

export interface Phase7StandardsFinding {
  id: string;
  severity: Phase7StandardsSeverity;
  code: "STANDARDS_RULE_BLOCKER" | "STANDARDS_RULE_REVIEW_REQUIRED" | "STANDARDS_RULE_WARNING";
  ruleId: string;
  title: string;
  detail: string;
  affectedEngine: string;
  affectedObjectIds: string[];
  remediationGuidance: string;
  readinessImpact: Phase7StandardsSeverity;
}

export interface Phase7StandardsAlignmentRulebookControlSummary {
  contractVersion: "PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT";
  rulebookRole: "ACTIVE_STANDARDS_RULEBOOK_NOT_DECORATIVE_TEXT";
  ruleCount: number;
  applicableRuleCount: number;
  passRuleCount: number;
  warningRuleCount: number;
  reviewRuleCount: number;
  blockingRuleCount: number;
  notApplicableRuleCount: number;
  requirementActivatedRuleCount: number;
  exceptionRequiredRuleCount: number;
  overallReadiness: Phase7StandardsReadiness;
  ruleRows: Phase7StandardsRuleRow[];
  requirementActivations: Phase7StandardsRequirementActivation[];
  findings: Phase7StandardsFinding[];
  notes: string[];
}


export type Phase8ValidationReadinessCategory = "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";

export type Phase8ValidationRuleCode =
  | "VALIDATION_REQUIREMENT_PROPAGATION_GAP"
  | "VALIDATION_GOLDEN_SCENARIO_CLOSURE_GAP"
  | "VALIDATION_CIDR_EDGE_CASE_BLOCKER"
  | "VALIDATION_CIDR_EDGE_CASE_WARNING"
  | "VALIDATION_CIDR_ADDRESSING_READINESS_GAP"
  | "VALIDATION_REQUIREMENT_ADDRESSING_GAP"
  | "VALIDATION_IPAM_DURABLE_AUTHORITY_GAP"
  | "VALIDATION_REQUIREMENT_IPAM_GAP"
  | "VALIDATION_ORCHESTRATOR_BOUNDARY_GAP"
  | "VALIDATION_STANDARDS_RULE_GAP"
  | "VALIDATION_ROUTING_SEGMENTATION_READINESS_GAP"
  | "VALIDATION_SECURITY_POLICY_READINESS_GAP"
  | "VALIDATION_IMPLEMENTATION_READINESS_GAP"
  | "VALIDATION_REPORT_TRUTH_WARNING"
  | "VALIDATION_DIAGRAM_TRUTH_WARNING"
  | "VALIDATION_DESIGN_CORE_ISSUE"
  | "VALIDATION_PASSED_STRICT_READINESS_GATE"
  | string;

export interface Phase8ValidationFinding {
  id: string;
  category: Phase8ValidationReadinessCategory;
  ruleCode: Phase8ValidationRuleCode;
  title: string;
  detail: string;
  sourceEngine: string;
  sourceSnapshotPath: string;
  affectedRequirementIds: string[];
  affectedRequirementKeys: string[];
  affectedObjectIds: string[];
  frontendImpact: string;
  reportImpact: string;
  diagramImpact: string;
  remediation: string;
  evidence: string[];
}

export interface Phase8ValidationCoverageRow {
  domain: string;
  sourceSnapshotPath: string;
  blockerCount: number;
  reviewRequiredCount: number;
  warningCount: number;
  infoCount: number;
  passedCount: number;
  readiness: Phase8ValidationReadinessCategory;
  evidence: string[];
}

export interface Phase8ValidationRequirementGateRow {
  requirementId: string;
  requirementKey: string;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  expectedAffectedEngines: string[];
  missingConsumers: string[];
  validationRuleCodes: string[];
  readinessImpact: Phase8ValidationReadinessCategory;
  evidence: string[];
}

export interface Phase8ValidationReadinessControlSummary {
  contractVersion: "PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT";
  validationRole: "STRICT_READINESS_AUTHORITY_NOT_ADVISORY_SUMMARY";
  validationCategories: Phase8ValidationReadinessCategory[];
  overallReadiness: Phase8ValidationReadinessCategory;
  validationGateAllowsImplementation: boolean;
  findingCount: number;
  blockingFindingCount: number;
  reviewRequiredFindingCount: number;
  warningFindingCount: number;
  infoFindingCount: number;
  passedFindingCount: number;
  requirementGateCount: number;
  blockedRequirementGateCount: number;
  reviewRequirementGateCount: number;
  coverageRows: Phase8ValidationCoverageRow[];
  requirementGateRows: Phase8ValidationRequirementGateRow[];
  findings: Phase8ValidationFinding[];
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

export interface RequirementImpactInventoryItem {
  key: string;
  label: string;
  category: string;
  impact: "direct" | "indirect" | "evidence";
  sourceValue: string;
  captured: boolean;
  outputAreas: string[];
  materializationTargets: string[];
  designConsequence: string;
}

export interface RequirementsCoverageSummary {
  areas: RequirementsCoverageArea[];
  implementedCount: number;
  partialCount: number;
  missingCount: number;
  missingAreaIds: string[];
  fieldInventory: RequirementImpactInventoryItem[];
  totalFieldCount: number;
  capturedFieldCount: number;
  directFieldCount: number;
  indirectFieldCount: number;
  evidenceFieldCount: number;
  notes: string[];
}

export interface RequirementsImpactClosureItem {
  key: string;
  label: string;
  category: string;
  impact: "direct" | "indirect" | "evidence";
  sourceValue: string;
  captured: boolean;
  reflectionStatus: "concrete-output" | "policy-consequence" | "review-evidence" | "traceable-only" | "not-captured";
  concreteOutputs: string[];
  visibleIn: string[];
  missingEvidence: string[];
}

export interface RequirementsImpactClosureSummary {
  totalFieldCount: number;
  capturedFieldCount: number;
  concreteFieldCount: number;
  policyFieldCount: number;
  reviewEvidenceFieldCount: number;
  traceableOnlyFieldCount: number;
  notCapturedFieldCount: number;
  handledFieldCount: number;
  explicitlyUnusedFieldCount: number;
  explicitlyUnusedKeys: string[];
  directCapturedTraceableOnlyKeys: string[];
  completionStatus: "complete" | "review-required";
  fieldOutcomes: RequirementsImpactClosureItem[];
  notes: string[];
}

export interface RequirementsScenarioProofSignal {
  id: string;
  label: string;
  requirementKeys: string[];
  expectedEvidence: string[];
  passed: boolean;
  evidence: string[];
  missingEvidence: string[];
  severity: "blocker" | "review" | "info";
}

export interface RequirementsScenarioProofSummary {
  status: "passed" | "review-required" | "blocked";
  scenarioName: string;
  selectedDrivers: string[];
  expectedSignalCount: number;
  passedSignalCount: number;
  missingSignalCount: number;
  blockerCount: number;
  reviewCount: number;
  signals: RequirementsScenarioProofSignal[];
  notes: string[];
}




export type Phase3ReadinessImpact = "PASSED" | "WARNING" | "REVIEW_REQUIRED" | "BLOCKING" | "UNSUPPORTED";
export type Phase3ScenarioClosureStatus = "passed" | "review-required" | "blocked" | "not-applicable";

export interface Phase3RequirementConsumerCoverage {
  captured: boolean;
  normalized: boolean;
  materialized: boolean;
  backendConsumed: boolean;
  addressingConsumed: boolean;
  routingConsumed: boolean;
  securityConsumed: boolean;
  implementationConsumed: boolean;
  validationConsumed: boolean;
  frontendVisible: boolean;
  reportVisible: boolean;
  diagramVisible: boolean;
  scenarioProven: boolean;
}

export interface Phase3RequirementClosureMatrixRow {
  requirementId: string;
  key: string;
  label: string;
  category: string;
  sourceValue: string;
  active: boolean;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  readinessImpact: Phase3ReadinessImpact;
  expectedAffectedEngines: string[];
  actualAffectedEngines: string[];
  missingConsumers: string[];
  consumerCoverage: Phase3RequirementConsumerCoverage;
  evidence: string[];
  reviewReason?: string;
}

export interface Phase3GoldenScenarioClosure {
  id: string;
  label: string;
  relevant: boolean;
  requiredRequirementKeys: string[];
  lifecycleStatus: Phase3ScenarioClosureStatus;
  missingRequirementKeys: string[];
  blockingRequirementKeys: string[];
  reviewRequirementKeys: string[];
  evidence: string[];
}

export interface Phase3RequirementsClosureControlSummary {
  contractVersion: "PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF";
  totalRequirementCount: number;
  capturedRequirementCount: number;
  activeRequirementCount: number;
  fullPropagatedCount: number;
  partialPropagatedCount: number;
  materializedOnlyCount: number;
  capturedOnlyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  unsupportedCount: number;
  notCapturedCount: number;
  missingConsumerCount: number;
  scenarioPassedCount: number;
  scenarioReviewCount: number;
  scenarioBlockedCount: number;
  closureMatrix: Phase3RequirementClosureMatrixRow[];
  goldenScenarioClosures: Phase3GoldenScenarioClosure[];
  notes: string[];
}



export type Phase4ReadinessImpact = "PASSED" | "WARNING" | "REVIEW_REQUIRED" | "BLOCKING" | "NOT_APPLICABLE";
export type Phase4CidrProofStatus = "passed" | "warning" | "blocked";

export interface Phase4CidrEdgeCaseProof {
  id: string;
  label: string;
  status: Phase4CidrProofStatus;
  evidence: string[];
  selftest: string;
}

export interface Phase4RequirementAddressingMatrixRow {
  requirementKey: string;
  sourceValue: string;
  active: boolean;
  expectedAddressingImpact: string;
  affectedRoles: SegmentRole[];
  materializedAddressingEvidence: string[];
  missingAddressingEvidence: string[];
  readinessImpact: Phase4ReadinessImpact;
  notes: string[];
}

export interface Phase4AddressingTruthRow {
  rowId: string;
  siteId: string;
  siteName: string;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  sourceSubnetCidr: string;
  canonicalSubnetCidr?: string;
  proposedSubnetCidr?: string;
  estimatedHosts: number | null;
  requiredUsableHosts?: number;
  recommendedPrefix?: number;
  usableHosts?: number;
  capacityState: "unknown" | "fits" | "undersized";
  gatewayState: "valid" | "invalid" | "fallback";
  inSiteBlock: boolean | null;
  allocatorParentCidr?: string;
  allocatorExplanation?: string;
  readinessImpact: Phase4ReadinessImpact;
  blockers: string[];
  evidence: string[];
}

export interface Phase4CidrAddressingTruthControlSummary {
  contractVersion: "PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH";
  totalAddressRowCount: number;
  validSubnetCount: number;
  invalidSubnetCount: number;
  undersizedSubnetCount: number;
  gatewayIssueCount: number;
  siteBlockIssueCount: number;
  overlapIssueCount: number;
  deterministicProposalCount: number;
  blockedProposalCount: number;
  requirementDrivenAddressingCount: number;
  requirementAddressingGapCount: number;
  edgeCaseProofs: Phase4CidrEdgeCaseProof[];
  requirementAddressingMatrix: Phase4RequirementAddressingMatrixRow[];
  addressingTruthRows: Phase4AddressingTruthRow[];
  notes: string[];
}


export type Phase5IpamReadinessImpact = "PASSED" | "WARNING" | "REVIEW_REQUIRED" | "BLOCKING" | "NOT_APPLICABLE";
export type Phase5IpamReconciliationState =
  | "ENGINE1_PROPOSAL_ONLY"
  | "ENGINE2_DURABLE_CANDIDATE"
  | "ENGINE2_APPROVED_ALLOCATION"
  | "ENGINE2_APPROVED_WITH_REVIEW_NOTES"
  | "ENGINE2_CONFLICT_REVIEW_BLOCKER"
  | "ENGINE2_STALE_ALLOCATION_REVIEW"
  | "ENGINE2_POOL_BLOCKED"
  | "ENGINE2_DHCP_CONFLICT_REVIEW"
  | "ENGINE2_RESERVATION_CONFLICT_REVIEW";

export interface Phase5EngineRelationshipSummary {
  engine1Role: string;
  engine2Role: string;
  designCoreRole: string;
}

export interface Phase5EnterpriseIpamReconciliationRow {
  rowId: string;
  siteId: string;
  siteName: string;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  engine1PlannedCidr: string;
  engine1ProposedCidr?: string;
  engine2AllocationId?: string;
  engine2AllocationCidr?: string;
  engine2AllocationStatus?: string;
  engine2PoolId?: string;
  engine2PoolName?: string;
  routeDomainKey: string;
  sourceTruth: "ENGINE1_PLANNED" | "ENGINE2_DURABLE";
  reconciliationState: Phase5IpamReconciliationState;
  readinessImpact: Phase5IpamReadinessImpact;
  approvedHashMatches: boolean;
  currentInputHash: string;
  dhcpScopeIds: string[];
  reservationIds: string[];
  blockers: string[];
  reviewReasons: string[];
  evidence: string[];
}

export interface Phase5EnterpriseIpamRequirementMatrixRow {
  requirementKey: string;
  label: string;
  active: boolean;
  expectedIpamImpact: string;
  plannedNeedCount: number;
  engine1ProposalOnlyCount: number;
  durableCandidateCount: number;
  approvedAllocationCount: number;
  conflictOrReviewBlockerCount: number;
  materializedIpamEvidence: string[];
  missingIpamEvidence: string[];
  readinessImpact: Phase5IpamReadinessImpact;
  notes: string[];
}

export interface Phase5EnterpriseIpamConflictRow {
  id: string;
  code: string;
  severity: "info" | "review" | "blocked";
  title: string;
  detail: string;
  readinessImpact: Phase5IpamReadinessImpact;
}

export interface Phase5EnterpriseIpamTruthControlSummary {
  contractVersion: "PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW";
  engineRelationship: Phase5EngineRelationshipSummary;
  routeDomainCount: number;
  durablePoolCount: number;
  durableAllocationCount: number;
  dhcpScopeCount: number;
  reservationCount: number;
  brownfieldNetworkCount: number;
  approvalCount: number;
  ledgerEntryCount: number;
  currentInputHash: string;
  overallReadiness: Phase5IpamReadinessImpact;
  engine1ProposalOnlyCount: number;
  durableCandidateCount: number;
  approvedAllocationCount: number;
  staleAllocationCount: number;
  conflictBlockerCount: number;
  reviewRequiredCount: number;
  dhcpConflictCount: number;
  reservationConflictCount: number;
  brownfieldConflictCount: number;
  reservePolicyConflictCount: number;
  activeRequirementIpamGapCount: number;
  reconciliationRows: Phase5EnterpriseIpamReconciliationRow[];
  requirementIpamMatrix: Phase5EnterpriseIpamRequirementMatrixRow[];
  conflictRows: Phase5EnterpriseIpamConflictRow[];
  notes: string[];
}



export type Phase6SectionKey =
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

export type Phase6SectionSourceType =
  | "BACKEND_COORDINATED"
  | "BACKEND_COMPUTED"
  | "BACKEND_CONTROL_LEDGER"
  | "ENGINE1_PLANNER"
  | "ENGINE2_DURABLE_AUTHORITY"
  | "REVIEW_GATED";

export type Phase6OrchestratorReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface Phase6OrchestratorSectionRow {
  sectionKey: Phase6SectionKey;
  label: string;
  snapshotPath: string;
  ownerEngine: string;
  sourceType: Phase6SectionSourceType;
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
  readiness: Phase6OrchestratorReadiness;
  notes: string[];
}

export interface Phase6OrchestratorDependencyEdge {
  id: string;
  sourceSectionKey: Phase6SectionKey;
  targetSectionKey: Phase6SectionKey;
  relationship: string;
  required: boolean;
  evidence: string[];
}

export interface Phase6OrchestratorBoundaryFinding {
  id: string;
  severity: "INFO" | "WARNING" | "ERROR";
  code: string;
  title: string;
  detail: string;
  affectedSnapshotPath: string;
  readinessImpact: Phase6OrchestratorReadiness;
}

export interface Phase6DesignCoreOrchestratorControlSummary {
  contractVersion: "PHASE6_DESIGN_CORE_ORCHESTRATOR_CONTRACT";
  orchestratorRole: "DESIGN_CORE_COORDINATOR_NOT_GOD_FILE";
  coordinatorRule: string;
  requirementContextPaths: string[];
  requiredSnapshotSectionCount: number;
  presentSnapshotSectionCount: number;
  missingSnapshotSectionCount: number;
  sectionRows: Phase6OrchestratorSectionRow[];
  dependencyEdges: Phase6OrchestratorDependencyEdge[];
  boundaryFindings: Phase6OrchestratorBoundaryFinding[];
  frontendIndependentTruthRiskCount: number;
  requirementContextGapCount: number;
  reportContextGapCount: number;
  diagramContextGapCount: number;
  readinessContextGapCount: number;
  overallReadiness: Phase6OrchestratorReadiness;
  notes: string[];
}

export interface PlanningInputDisciplineItem extends DesignSourceTraceLabel {
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


export type NetworkObjectTruthState =
  | "configured"
  | "inferred"
  | "proposed"
  | "discovered"
  | "planned"
  | "materialized"
  | "durable"
  | "imported"
  | "approved"
  | "review-required"
  | "blocked";

export type Phase9NetworkObjectType =
  | "network-device"
  | "network-interface"
  | "network-link"
  | "route-domain"
  | "security-zone"
  | "policy-rule"
  | "nat-rule"
  | "dhcp-pool"
  | "ip-reservation";

export type Phase9NetworkObjectImplementationReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED" | "DRAFT_ONLY" | "UNSUPPORTED";

export interface Phase9NetworkObjectProvenanceFields {
  objectType?: Phase9NetworkObjectType;
  objectRole?: string;
  sourceType?: DesignTruthSourceType;
  sourceRequirementIds?: string[];
  sourceObjectIds?: string[];
  sourceEngine?: string;
  confidence?: DesignTraceConfidence;
  proofStatus?: DesignProofStatus;
  implementationReadiness?: Phase9NetworkObjectImplementationReadiness;
  validationImpact?: string;
  frontendDisplayImpact?: string[];
  reportExportImpact?: string[];
  diagramImpact?: string[];
  reviewReason?: string;
}

export interface NetworkObjectProvenanceLabel extends DesignSourceTraceLabel {
  objectId: string;
  objectType: Phase9NetworkObjectType;
  objectRole: string;
  truthState: NetworkObjectTruthState;
  implementationReadiness: Phase9NetworkObjectImplementationReadiness;
  validationImpact: string;
  frontendDisplayImpact: string[];
  reportExportImpact: string[];
  diagramImpact: string[];
}

export type Phase9NetworkObjectReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface Phase9NetworkObjectLineageRow extends NetworkObjectProvenanceLabel {
  displayName: string;
  relatedObjectIds: string[];
  hasCompleteMetadata: boolean;
  missingMetadataFields: string[];
}

export interface Phase9RequirementObjectLineageRow {
  requirementId: string;
  sourceKey: string;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  expectedObjectTypes: Phase9NetworkObjectType[];
  actualObjectIds: string[];
  actualObjectTypes: Phase9NetworkObjectType[];
  missingObjectTypes: Phase9NetworkObjectType[];
  readinessImpact: Phase9NetworkObjectReadiness;
  notes: string[];
}

export interface Phase9NetworkObjectFinding {
  severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
  code: string;
  title: string;
  detail: string;
  affectedObjectIds: string[];
  readinessImpact: Phase9NetworkObjectReadiness;
  remediation: string;
}

export interface Phase9NetworkObjectModelControlSummary {
  contract: "PHASE9_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT";
  role: "TRUTH_LABELLED_NETWORK_OBJECT_MODEL_NOT_FAKE_TOPOLOGY";
  overallReadiness: Phase9NetworkObjectReadiness;
  objectCount: number;
  metadataCompleteObjectCount: number;
  metadataGapObjectCount: number;
  fakeAuthorityRiskCount: number;
  requirementLineageRowCount: number;
  requirementLineageGapCount: number;
  implementationReadyObjectCount: number;
  implementationReviewObjectCount: number;
  implementationBlockedObjectCount: number;
  objectLineage: Phase9NetworkObjectLineageRow[];
  requirementObjectLineage: Phase9RequirementObjectLineageRow[];
  findings: Phase9NetworkObjectFinding[];
  notes: string[];
}


export type DesignGraphNodeObjectType =
  | "site"
  | "vlan"
  | "subnet"
  | "network-device"
  | "network-interface"
  | "network-link"
  | "route-domain"
  | "security-zone"
  | "policy-rule"
  | "nat-rule"
  | "security-service"
  | "security-flow"
  | "implementation-stage"
  | "implementation-step"
  | "dhcp-pool"
  | "ip-reservation"
  | "route-intent"
  | "segmentation-flow";

export type DesignGraphRelationship =
  | "site-contains-device"
  | "site-contains-vlan"
  | "vlan-uses-subnet"
  | "device-owns-interface"
  | "interface-uses-subnet"
  | "interface-binds-link"
  | "interface-belongs-to-route-domain"
  | "interface-belongs-to-security-zone"
  | "route-domain-carries-subnet"
  | "security-zone-protects-subnet"
  | "security-zone-applies-policy"
  | "nat-rule-translates-zone"
  | "dhcp-pool-serves-subnet"
  | "ip-reservation-belongs-to-subnet"
  | "ip-reservation-owned-by-interface"
  | "network-link-terminates-on-device"
  | "network-link-terminates-on-interface"
  | "route-domain-owns-route"
  | "route-intent-targets-subnet"
  | "route-intent-exits-interface"
  | "security-zone-expects-flow"
  | "security-zone-initiates-security-flow"
  | "security-flow-targets-security-zone"
  | "security-flow-covered-by-policy"
  | "security-flow-uses-nat-rule"
  | "implementation-stage-contains-step"
  | "implementation-step-targets-object"
  | "implementation-step-verifies-flow"
  | "implementation-step-implements-route";

export interface DesignGraphNode {
  id: string;
  objectType: DesignGraphNodeObjectType;
  objectId: string;
  label: string;
  siteId?: string;
  truthState: NetworkObjectTruthState;
  notes: string[];
}

export interface DesignGraphEdge {
  id: string;
  relationship: DesignGraphRelationship;
  sourceNodeId: string;
  targetNodeId: string;
  truthState: NetworkObjectTruthState;
  required: boolean;
  notes: string[];
}

export interface DesignGraphIntegrityFinding {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  affectedObjectIds: string[];
  remediation: string;
}

export interface DesignGraphSummary {
  nodeCount: number;
  edgeCount: number;
  requiredEdgeCount: number;
  connectedObjectCount: number;
  orphanObjectCount: number;
  integrityFindingCount: number;
  blockingFindingCount: number;
  relationshipCoveragePercent: number;
  notes: string[];
}

export interface DesignGraph {
  summary: DesignGraphSummary;
  nodes: DesignGraphNode[];
  edges: DesignGraphEdge[];
  integrityFindings: DesignGraphIntegrityFinding[];
}

export type Phase10DesignGraphReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase10DesignGraphDependencyState = "CONNECTED" | "ORPHANED" | "MISSING_GRAPH_NODE" | "MISSING_REQUIRED_EDGE" | "MISSING_CONSUMER" | "REVIEW_REQUIRED";

export interface Phase10DesignGraphObjectCoverageRow { objectId: string; displayName: string; objectType: Phase9NetworkObjectType; truthState: NetworkObjectTruthState; sourceRequirementIds: string[]; graphNodeIds: string[]; relationshipIds: string[]; relationshipTypes: string[]; dependencyState: Phase10DesignGraphDependencyState; consumerSurfaces: string[]; missingConsumerSurfaces: string[]; notes: string[]; }
export interface Phase10RequirementDependencyPath { requirementId: string; sourceKey: string; lifecycleStatus: RequirementPropagationLifecycleStatus; expectedObjectTypes: Phase9NetworkObjectType[]; actualObjectIds: string[]; actualGraphNodeIds: string[]; actualRelationshipIds: string[]; actualRelationshipTypes: string[]; expectedRelationshipTypes: string[]; missingGraphNodeIds: string[]; missingRelationshipTypes: string[]; frontendConsumers: string[]; reportExportConsumers: string[]; diagramConsumers: string[]; validationConsumers: string[]; missingConsumerSurfaces: string[]; readinessImpact: Phase10DesignGraphReadiness; notes: string[]; }
export interface Phase10DesignGraphFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedObjectIds: string[]; readinessImpact: Phase10DesignGraphReadiness; remediation: string; }
export interface Phase10DesignGraphControlSummary { contract: "PHASE10_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT"; role: "REQUIREMENT_TO_OBJECT_TO_CONSUMER_DEPENDENCY_GRAPH"; overallReadiness: Phase10DesignGraphReadiness; graphNodeCount: number; graphEdgeCount: number; requiredEdgeCount: number; connectedObjectCount: number; orphanObjectCount: number; integrityFindingCount: number; blockingFindingCount: number; requirementPathCount: number; requirementPathReadyCount: number; requirementPathReviewCount: number; requirementPathBlockedCount: number; objectCoverageCount: number; objectCoverageReadyCount: number; objectCoverageGapCount: number; diagramOnlyObjectCount: number; unreferencedPolicyCount: number; routeWithoutNextHopCount: number; implementationStepWithoutSourceCount: number; requirementDependencyPaths: Phase10RequirementDependencyPath[]; objectCoverage: Phase10DesignGraphObjectCoverageRow[]; findings: Phase10DesignGraphFinding[]; notes: string[]; }

export interface NetworkObjectModelSummary {
  deviceCount: number;
  interfaceCount: number;
  linkCount: number;
  routeDomainCount: number;
  securityZoneCount: number;
  policyRuleCount: number;
  natRuleCount: number;
  dhcpPoolCount: number;
  ipReservationCount: number;
  configuredObjectCount: number;
  inferredObjectCount: number;
  proposedObjectCount: number;
  discoveredObjectCount: number;
  plannedObjectCount: number;
  materializedObjectCount: number;
  durableObjectCount: number;
  importedObjectCount: number;
  approvedObjectCount: number;
  reviewRequiredObjectCount: number;
  blockedObjectCount: number;
  phase9MetadataCompleteCount: number;
  phase9MetadataGapCount: number;
  implementationReadyObjectCount: number;
  implementationReviewObjectCount: number;
  implementationBlockedObjectCount: number;
  orphanedAddressRowCount: number;
  designGraphNodeCount: number;
  designGraphEdgeCount: number;
  designGraphIntegrityFindingCount: number;
  designGraphBlockingFindingCount: number;
  routeIntentCount: number;
  reachabilityFindingCount: number;
  segmentationExpectationCount: number;
  segmentationConflictCount: number;
  securityServiceObjectCount: number;
  securityFlowRequirementCount: number;
  securityPolicyFindingCount: number;
  securityPolicyBlockingFindingCount: number;
  securityPolicyMissingNatCount: number;
  implementationPlanStepCount: number;
  implementationPlanBlockedStepCount: number;
  implementationPlanReviewStepCount: number;
  implementationPlanFindingCount: number;
  implementationPlanBlockingFindingCount: number;
  notes: string[];
}

export interface NetworkDevice extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  deviceRole: "core-layer3-switch" | "branch-edge-router" | "security-firewall" | "routing-identity" | "unknown";
  truthState: NetworkObjectTruthState;
  managementIp?: string;
  routeDomainIds: string[];
  securityZoneIds: string[];
  interfaceIds: string[];
  notes: string[];
}

export interface NetworkInterface extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  deviceId: string;
  siteId: string;
  interfaceRole: "vlan-gateway" | "wan-transit" | "loopback" | "firewall-boundary" | "routed-uplink" | "unknown";
  /** Phase 85 compile compatibility: older proof code reads a human purpose field when present. */
  purpose?: string;
  truthState: NetworkObjectTruthState;
  vlanId?: number;
  subnetCidr?: string;
  ipAddress?: string;
  routeDomainId?: string;
  securityZoneId?: string;
  linkId?: string;
  notes: string[];
}

export interface NetworkLinkEndpoint {
  deviceId: string;
  interfaceId?: string;
  siteId: string;
  label: string;
}

export interface NetworkLink extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  linkRole: "site-wan-transit" | "vlan-gateway-binding" | "firewall-boundary" | "route-domain-membership" | "planned";
  /** Phase 85 compile compatibility: legacy scenario proof checks may classify by linkType. */
  linkType?: string;
  truthState: NetworkObjectTruthState;
  status: "modeled" | "planned" | "deferred";
  siteIds: string[];
  subnetCidr?: string;
  endpointA?: NetworkLinkEndpoint;
  endpointB?: NetworkLinkEndpoint;
  notes: string[];
}

export interface RouteDomain extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  scope: "project" | "site";
  truthState: NetworkObjectTruthState;
  siteIds: string[];
  subnetCidrs: string[];
  interfaceIds: string[];
  linkIds: string[];
  defaultRouteState: "not-required" | "required" | "present" | "review";
  summarizationState: "ready" | "review" | "blocked";
  notes: string[];
}

export interface SecurityZone extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  zoneRole: "internal" | "guest" | "management" | "dmz" | "voice" | "iot" | "wan" | "transit" | "unknown";
  truthState: NetworkObjectTruthState;
  siteIds: string[];
  vlanIds: number[];
  subnetCidrs: string[];
  routeDomainId: string;
  isolationExpectation: "open" | "restricted" | "isolated" | "review";
  notes: string[];
}

export interface PolicyRule extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  sourceZoneId: string;
  destinationZoneId: string;
  action: "allow" | "deny" | "review";
  services: string[];
  truthState: NetworkObjectTruthState;
  rationale: string;
  notes: string[];
}

export interface NatRule extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  sourceZoneId: string;
  destinationZoneId?: string;
  sourceSubnetCidrs: string[];
  translatedAddressMode: "interface-overload" | "static" | "pool" | "not-required" | "review";
  truthState: NetworkObjectTruthState;
  status: "required" | "not-required" | "review";
  notes: string[];
}

export interface DhcpPool extends Phase9NetworkObjectProvenanceFields {
  id: string;
  name: string;
  siteId: string;
  vlanId: number;
  subnetCidr: string;
  gatewayIp?: string;
  truthState: NetworkObjectTruthState;
  allocationState: "configured" | "proposed" | "review";
  notes: string[];
}

export interface IpReservation extends Phase9NetworkObjectProvenanceFields {
  id: string;
  ipAddress: string;
  subnetCidr: string;
  reservationRole: "gateway" | "loopback" | "transit-endpoint" | "management" | "review";
  ownerType: "interface" | "device" | "route-domain" | "security-zone" | "unknown";
  ownerId?: string;
  truthState: NetworkObjectTruthState;
  notes: string[];
}


export type Phase11RoutingSegmentationReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase11RoutingControlState = "ROUTING_INTENT" | "ROUTING_REVIEW" | "ROUTING_BLOCKER" | "ROUTING_SIMULATION_UNAVAILABLE";
export type Phase11ProtocolIntentCategory = "connected" | "static" | "summary" | "default" | "ospf" | "bgp" | "route-leaking" | "ecmp" | "redistribution" | "cloud-route-table" | "wan-posture" | "wan-failover" | "asymmetric-routing" | "segmentation-reachability";
export interface Phase11ProtocolIntentRow { id: string; category: Phase11ProtocolIntentCategory; name: string; routeDomainId?: string; routeDomainName?: string; siteId?: string; sourceRouteIntentIds: string[]; sourceObjectIds: string[]; requirementKeys: string[]; controlState: Phase11RoutingControlState; readinessImpact: Phase11RoutingSegmentationReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase11RequirementRoutingMatrixRow { requirementKey: string; requirementLabel: string; active: boolean; expectedProtocolCategories: Phase11ProtocolIntentCategory[]; actualProtocolIntentIds: string[]; missingProtocolCategories: Phase11ProtocolIntentCategory[]; readinessImpact: Phase11RoutingSegmentationReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase11RouteDomainReviewRow { routeDomainId: string; routeDomainName: string; vrfName?: string; subnetCount: number; connectedRouteCount: number; staticRouteCount: number; summaryRouteCount: number; defaultRouteCount: number; routeConflictCount: number; segmentationExpectationCount: number; readinessImpact: Phase11RoutingSegmentationReadiness; notes: string[]; }
export interface Phase11RoutingFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedObjectIds: string[]; readinessImpact: Phase11RoutingSegmentationReadiness; remediation: string; }
export interface Phase11RoutingSegmentationControlSummary { contract: "PHASE11_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT"; role: "ROUTING_INTENT_REVIEW_NOT_PACKET_SIMULATION"; overallReadiness: Phase11RoutingSegmentationReadiness; routeDomainCount: number; routeIntentCount: number; protocolIntentCount: number; connectedRouteIntentCount: number; staticRouteIntentCount: number; summaryRouteIntentCount: number; defaultRouteIntentCount: number; ospfReviewCount: number; bgpReviewCount: number; routeLeakingReviewCount: number; ecmpReviewCount: number; redistributionReviewCount: number; cloudRouteTableReviewCount: number; wanPostureReviewCount: number; segmentationReachabilityReviewCount: number; asymmetricRoutingReviewCount: number; requirementRoutingMatrixCount: number; activeRequirementRoutingGapCount: number; blockedProtocolIntentCount: number; reviewProtocolIntentCount: number; simulationUnavailableCount: number; findingCount: number; blockingFindingCount: number; reviewFindingCount: number; routingReadiness: "ready" | "review" | "blocked"; segmentationReadiness: "ready" | "review" | "blocked"; routeDomainReviews: Phase11RouteDomainReviewRow[]; protocolIntents: Phase11ProtocolIntentRow[]; requirementRoutingMatrix: Phase11RequirementRoutingMatrixRow[]; siteReachabilityChecks: SiteToSiteReachabilityCheck[]; findings: Phase11RoutingFinding[]; notes: string[]; }

export type Phase12SecurityPolicyReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase12SecurityPolicyState = "REQUIRED" | "RECOMMENDED" | "BLOCKED" | "MISSING" | "OVERBROAD" | "SHADOWED" | "REVIEW_REQUIRED" | "NOT_APPLICABLE";
export type Phase12SecurityControlCategory = "zone-matrix" | "business-service" | "default-deny" | "guest-isolation" | "management-plane" | "dmz-exposure" | "remote-access" | "cloud-hybrid" | "nat" | "logging" | "broad-permit" | "shadowing" | "policy-consequence" | "voice" | "iot-printer-camera";
export interface Phase12RequirementSecurityMatrixRow { requirementKey: string; requirementLabel: string; active: boolean; expectedSecurityCategories: Phase12SecurityControlCategory[]; actualFlowRequirementIds: string[]; actualPolicyMatrixRowIds: string[]; missingSecurityCategories: Phase12SecurityControlCategory[]; readinessImpact: Phase12SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase12ZonePolicyReviewRow { id: string; sourceZoneId: string; sourceZoneName: string; sourceZoneRole: SecurityZone["zoneRole"]; destinationZoneId: string; destinationZoneName: string; destinationZoneRole: SecurityZone["zoneRole"]; defaultPosture: SecurityPolicyMatrixRow["defaultPosture"]; explicitPolicyRuleIds: string[]; requiredFlowIds: string[]; natRequiredFlowIds: string[]; phase12PolicyState: Phase12SecurityPolicyState; readinessImpact: Phase12SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase12FlowConsequenceRow { id: string; flowRequirementId: string; name: string; sourceZoneName: string; destinationZoneName: string; expectedAction: SecurityFlowRequirement["expectedAction"]; observedPolicyAction?: SecurityFlowRequirement["observedPolicyAction"]; serviceNames: string[]; natRequired: boolean; loggingRequired: boolean; matchedPolicyRuleIds: string[]; matchedNatRuleIds: string[]; requirementKeys: string[]; phase12PolicyState: Phase12SecurityPolicyState; readinessImpact: Phase12SecurityPolicyReadiness; consequenceSummary: string; reviewReason?: string; notes: string[]; }
export interface Phase12NatReviewRow { id: string; natReviewId: string; natRuleId: string; natRuleName: string; sourceZoneName: string; destinationZoneName?: string; status: SecurityNatReview["status"]; coveredFlowRequirementIds: string[]; missingFlowRequirementIds: string[]; phase12PolicyState: Phase12SecurityPolicyState; readinessImpact: Phase12SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase12LoggingReviewRow { id: string; flowRequirementId: string; flowName: string; required: boolean; matchedPolicyRuleIds: string[]; phase12PolicyState: Phase12SecurityPolicyState; readinessImpact: Phase12SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase12ShadowingReviewRow { id: string; ruleId: string; ruleName: string; sequence: number; action: PolicyRule["action"]; broadMatch: boolean; shadowsRuleIds: string[]; shadowedByRuleIds: string[]; phase12PolicyState: Phase12SecurityPolicyState; readinessImpact: Phase12SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase12SecurityPolicyFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedObjectIds: string[]; readinessImpact: Phase12SecurityPolicyReadiness; remediation: string; }
export interface Phase12SecurityPolicyFlowControlSummary { contract: "PHASE12_SECURITY_POLICY_FLOW_CONTRACT"; role: "ZONE_SERVICE_NAT_LOGGING_POLICY_REVIEW_NOT_FIREWALL_CONFIG"; overallReadiness: Phase12SecurityPolicyReadiness; serviceObjectCount: number; serviceGroupCount: number; zonePolicyReviewCount: number; flowConsequenceCount: number; requirementSecurityMatrixCount: number; activeRequirementSecurityGapCount: number; requiredFlowCount: number; missingFlowCount: number; blockedFlowCount: number; overbroadPolicyCount: number; shadowedRuleCount: number; loggingReviewCount: number; loggingGapCount: number; natReviewCount: number; missingNatCount: number; reviewRequiredCount: number; findingCount: number; blockingFindingCount: number; reviewFindingCount: number; policyReadiness: "ready" | "review" | "blocked"; natReadiness: "ready" | "review" | "blocked"; requirementSecurityMatrix: Phase12RequirementSecurityMatrixRow[]; zonePolicyReviews: Phase12ZonePolicyReviewRow[]; flowConsequences: Phase12FlowConsequenceRow[]; natReviews: Phase12NatReviewRow[]; loggingReviews: Phase12LoggingReviewRow[]; shadowingReviews: Phase12ShadowingReviewRow[]; findings: Phase12SecurityPolicyFinding[]; notes: string[]; }

export interface RouteIntent {
  id: string;
  name: string;
  routeDomainId: string;
  routeDomainName: string;
  siteId?: string;
  routeKind: "connected" | "default" | "static" | "summary";
  destinationCidr: string;
  nextHopType: "connected-interface" | "site-gateway" | "transit-link" | "security-boundary" | "engineer-review";
  nextHopObjectId?: string;
  administrativeState: "present" | "proposed" | "missing" | "review";
  truthState: NetworkObjectTruthState;
  routePurpose: string;
  evidence: string[];
  notes: string[];
}

export interface RouteTableEntry {
  id: string;
  routeDomainId: string;
  routeDomainName: string;
  siteId?: string;
  sourceRouteIntentId: string;
  routeKind: RouteIntent["routeKind"];
  destinationCidr: string;
  destinationPrefix: number;
  nextHopType: RouteIntent["nextHopType"];
  nextHopObjectId?: string;
  administrativeDistance: number;
  pathScope: "local" | "site-summary" | "inter-site" | "internet-edge" | "review";
  routeState: "active" | "proposed" | "missing" | "review";
  evidence: string[];
  notes: string[];
}

export interface RoutingConflictReview {
  id: string;
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  routeDomainId: string;
  affectedRouteIntentIds: string[];
  remediation: string;
}

export interface SiteToSiteReachabilityCheck {
  id: string;
  routeDomainId: string;
  routeDomainName: string;
  sourceSiteId: string;
  sourceSiteName: string;
  destinationSiteId: string;
  destinationSiteName: string;
  destinationSummaryCidr?: string;
  forwardState: "reachable" | "missing" | "review";
  returnState: "reachable" | "missing" | "review";
  overallState: "satisfied" | "missing-forward" | "missing-return" | "review";
  forwardRouteIntentIds: string[];
  returnRouteIntentIds: string[];
  notes: string[];
}

export interface RouteDomainRoutingTable {
  routeDomainId: string;
  routeDomainName: string;
  connectedRouteCount: number;
  defaultRouteCount: number;
  staticRouteCount: number;
  summaryRouteCount: number;
  missingRouteCount: number;
  routeEntryCount: number;
  conflictCount: number;
  reachabilityCheckCount: number;
  routeIntents: RouteIntent[];
  routeEntries: RouteTableEntry[];
  conflictReviews: RoutingConflictReview[];
  reachabilityChecks: SiteToSiteReachabilityCheck[];
  notes: string[];
}

export interface SegmentationFlowExpectation {
  id: string;
  name: string;
  sourceZoneId: string;
  sourceZoneName: string;
  destinationZoneId: string;
  destinationZoneName: string;
  expectedAction: "allow" | "deny" | "review";
  observedPolicyAction?: "allow" | "deny" | "review";
  services: string[];
  state: "satisfied" | "missing-policy" | "conflict" | "review";
  severityIfMissing: "ERROR" | "WARNING";
  rationale: string;
  notes: string[];
}

export interface RoutingSegmentationReachabilityFinding {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  routeDomainId?: string;
  affectedObjectIds: string[];
  remediation: string;
}

export interface RoutingSegmentationSummary {
  routeIntentCount: number;
  routeTableCount: number;
  connectedRouteCount: number;
  defaultRouteCount: number;
  staticRouteCount: number;
  summaryRouteCount: number;
  missingRouteCount: number;
  segmentationExpectationCount: number;
  satisfiedSegmentationExpectationCount: number;
  missingPolicyCount: number;
  conflictingPolicyCount: number;
  reachabilityFindingCount: number;
  blockingFindingCount: number;
  routeEntryCount: number;
  routeConflictCount: number;
  siteReachabilityCheckCount: number;
  missingForwardPathCount: number;
  missingReturnPathCount: number;
  nextHopReviewCount: number;
  routingReadiness: "ready" | "review" | "blocked";
  segmentationReadiness: "ready" | "review" | "blocked";
  notes: string[];
}

export interface RoutingSegmentationModel {
  summary: RoutingSegmentationSummary;
  routeTables: RouteDomainRoutingTable[];
  routeIntents: RouteIntent[];
  routeEntries: RouteTableEntry[];
  routeConflictReviews: RoutingConflictReview[];
  siteReachabilityChecks: SiteToSiteReachabilityCheck[];
  segmentationExpectations: SegmentationFlowExpectation[];
  reachabilityFindings: RoutingSegmentationReachabilityFinding[];
}

export interface SecurityServiceObject {
  id: string;
  name: string;
  protocolHint: "any" | "application" | "tcp" | "udp" | "icmp";
  portHint?: string;
  serviceGroupIds: string[];
  broadMatch: boolean;
  implementationReviewRequired: boolean;
  notes: string[];
}

export interface SecurityServiceGroup {
  id: string;
  name: string;
  serviceNames: string[];
  broadMatch: boolean;
  implementationReviewRequired: boolean;
  notes: string[];
}

export interface SecurityFlowRequirement {
  id: string;
  name: string;
  sourceZoneId: string;
  sourceZoneName: string;
  destinationZoneId: string;
  destinationZoneName: string;
  expectedAction: "allow" | "deny" | "review";
  observedPolicyAction?: "allow" | "deny" | "review";
  observedPolicyRuleId?: string;
  observedPolicyRuleName?: string;
  serviceNames: string[];
  matchedPolicyRuleIds: string[];
  natRequired: boolean;
  matchedNatRuleIds: string[];
  state: "satisfied" | "missing-policy" | "conflict" | "missing-nat" | "review";
  severityIfMissing: "ERROR" | "WARNING";
  ruleOrderSensitive: boolean;
  implicitDenyExpected: boolean;
  loggingRequired: boolean;
  rationale: string;
  truthState: NetworkObjectTruthState;
  requirementKeys?: string[];
  phase12PolicyState?: Phase12SecurityPolicyState;
  consequenceSummary?: string;
  reviewReason?: string;
  notes: string[];
}

export interface SecurityPolicyMatrixRow {
  id: string;
  sourceZoneId: string;
  sourceZoneName: string;
  sourceZoneRole: SecurityZone["zoneRole"];
  destinationZoneId: string;
  destinationZoneName: string;
  destinationZoneRole: SecurityZone["zoneRole"];
  defaultPosture: "allow" | "deny" | "review";
  explicitPolicyRuleIds: string[];
  requiredFlowIds: string[];
  natRequiredFlowIds: string[];
  state: "ready" | "review" | "blocked";
  phase12PolicyState?: Phase12SecurityPolicyState;
  reviewReason?: string;
  notes: string[];
}

export interface SecurityRuleOrderReview {
  id: string;
  sequence: number;
  ruleId: string;
  ruleName: string;
  sourceZoneId: string;
  sourceZoneName: string;
  destinationZoneId: string;
  destinationZoneName: string;
  action: PolicyRule["action"];
  services: string[];
  broadMatch: boolean;
  shadowsRuleIds: string[];
  shadowedByRuleIds: string[];
  loggingRequired: boolean;
  state: "ready" | "review" | "blocked";
  phase12PolicyState?: Phase12SecurityPolicyState;
  reviewReason?: string;
  notes: string[];
}

export interface SecurityNatReview {
  id: string;
  natRuleId: string;
  natRuleName: string;
  sourceZoneId: string;
  sourceZoneName: string;
  destinationZoneId?: string;
  destinationZoneName?: string;
  translatedAddressMode: NatRule["translatedAddressMode"];
  status: NatRule["status"];
  coveredFlowRequirementIds: string[];
  missingFlowRequirementIds: string[];
  state: "ready" | "review" | "blocked";
  phase12PolicyState?: Phase12SecurityPolicyState;
  reviewReason?: string;
  notes: string[];
}

export interface SecurityPolicyFinding {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  affectedObjectIds: string[];
  remediation: string;
}

export interface SecurityPolicyFlowSummary {
  serviceObjectCount: number;
  serviceGroupCount: number;
  policyMatrixRowCount: number;
  ruleOrderReviewCount: number;
  natReviewCount: number;
  flowRequirementCount: number;
  satisfiedFlowCount: number;
  missingPolicyCount: number;
  conflictingPolicyCount: number;
  missingNatCount: number;
  broadPermitFindingCount: number;
  shadowedRuleCount: number;
  implicitDenyGapCount: number;
  loggingGapCount: number;
  findingCount: number;
  blockingFindingCount: number;
  policyReadiness: "ready" | "review" | "blocked";
  natReadiness: "ready" | "review" | "blocked";
  notes: string[];
}

export interface SecurityPolicyFlowModel {
  summary: SecurityPolicyFlowSummary;
  serviceObjects: SecurityServiceObject[];
  serviceGroups: SecurityServiceGroup[];
  policyMatrix: SecurityPolicyMatrixRow[];
  ruleOrderReviews: SecurityRuleOrderReview[];
  natReviews: SecurityNatReview[];
  flowRequirements: SecurityFlowRequirement[];
  findings: SecurityPolicyFinding[];
}


export type ImplementationPlanStageType =
  | "preparation"
  | "operational-safety"
  | "addressing-and-vlans"
  | "routing"
  | "security"
  | "services"
  | "verification"
  | "rollback";

export type ImplementationPlanStepCategory =
  | "preparation"
  | "operational-safety"
  | "vlan-and-interface"
  | "routed-interface"
  | "routing"
  | "security-policy"
  | "security-policy-and-nat"
  | "nat"
  | "dhcp"
  | "verification"
  | "rollback"
  | "documentation";

export type ImplementationPlanTargetObjectType =
  | "design-graph"
  | "network-device"
  | "network-interface"
  | "route-intent"
  | "security-flow"
  | "policy-rule"
  | "nat-rule"
  | "dhcp-pool"
  | "report";


export interface ImplementationDependencyGraphEdge {
  id: string;
  source: "design-graph" | "object-model" | "engine-derived";
  relationship: DesignGraphRelationship | "implementation-step-depends-on" | "object-supports-implementation-step";
  sourceObjectType?: DesignGraphNodeObjectType | ImplementationPlanTargetObjectType;
  sourceObjectId?: string;
  sourceStepId?: string;
  targetObjectType?: DesignGraphNodeObjectType | ImplementationPlanTargetObjectType;
  targetObjectId?: string;
  targetStepId?: string;
  required: boolean;
  reason: string;
}

export interface ImplementationDependencyGraph {
  edgeCount: number;
  designGraphEdgeCount: number;
  objectModelEdgeCount: number;
  engineDerivedEdgeCount: number;
  stepDependencyEdgeCount: number;
  preciseSecurityDependencyCount: number;
  edges: ImplementationDependencyGraphEdge[];
  notes: string[];
}

export interface ImplementationPlanStage {
  id: string;
  name: string;
  stageType: ImplementationPlanStageType;
  sequence: number;
  objective: string;
  exitCriteria: string[];
}

export interface ImplementationPlanDependency {
  stepId: string;
  reason: string;
}

export interface ImplementationPlanStep {
  id: string;
  title: string;
  stageId: string;
  category: ImplementationPlanStepCategory;
  sequence: number;
  siteId?: string;
  targetObjectType: ImplementationPlanTargetObjectType;
  targetObjectId?: string;
  action: "create" | "update" | "verify" | "review" | "document" | "rollback";
  readiness: "ready" | "review" | "blocked" | "deferred";
  readinessReasons: string[];
  blockers: string[];
  riskLevel: "low" | "medium" | "high";
  engineerReviewRequired: boolean;
  dependencies: ImplementationPlanDependency[];
  dependencyObjectIds: string[];
  graphDependencyEdgeIds: string[];
  upstreamFindingIds: string[];
  blastRadius: string[];
  implementationIntent: string;
  sourceEvidence: string[];
  requiredEvidence: string[];
  expectedOutcome: string;
  acceptanceCriteria: string[];
  rollbackIntent: string;
  notes: string[];
}

export interface ImplementationPlanVerificationCheck {
  id: string;
  name: string;
  checkType: "addressing" | "routing" | "policy" | "nat" | "dhcp" | "operational-safety" | "connectivity" | "documentation" | "rollback";
  verificationScope: "object" | "flow" | "route" | "safety" | "cross-cutting";
  sourceEngine: "object-model" | "routing" | "security-policy" | "implementation";
  relatedStepIds: string[];
  relatedObjectIds: string[];
  expectedResult: string;
  requiredEvidence: string[];
  acceptanceCriteria: string[];
  readiness: "ready" | "review" | "blocked";
  blockingStepIds: string[];
  failureImpact: string;
  notes: string[];
}

export interface ImplementationPlanRollbackAction {
  id: string;
  name: string;
  relatedStepIds: string[];
  triggerCondition: string;
  rollbackIntent: string;
  notes: string[];
}

export interface ImplementationPlanFinding {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  affectedStepIds: string[];
  remediation: string;
}

export interface ImplementationPlanSummary {
  stageCount: number;
  stepCount: number;
  readyStepCount: number;
  reviewStepCount: number;
  blockedStepCount: number;
  deferredStepCount: number;
  verificationCheckCount: number;
  objectLevelVerificationCheckCount: number;
  routeLevelVerificationCheckCount: number;
  flowLevelVerificationCheckCount: number;
  blockedVerificationCheckCount: number;
  rollbackVerificationCheckCount: number;
  rollbackActionCount: number;
  dependencyCount: number;
  graphDependencyEdgeCount: number;
  graphBackedStepDependencyCount: number;
  preciseSecurityDependencyCount: number;
  operationalSafetyGateCount: number;
  operationalSafetyBlockedGateCount: number;
  highRiskStepWithSafetyDependencyCount: number;
  stepWithBlastRadiusCount: number;
  stepWithRequiredEvidenceCount: number;
  stepWithRollbackIntentCount: number;
  findingCount: number;
  blockingFindingCount: number;
  implementationReadiness: "ready" | "review" | "blocked";
  notes: string[];
}

export interface ImplementationPlanModel {
  summary: ImplementationPlanSummary;
  stages: ImplementationPlanStage[];
  steps: ImplementationPlanStep[];
  dependencyGraph: ImplementationDependencyGraph;
  verificationChecks: ImplementationPlanVerificationCheck[];
  rollbackActions: ImplementationPlanRollbackAction[];
  findings: ImplementationPlanFinding[];
}





export type Phase13ImplementationReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase13ImplementationState = "READY" | "REVIEW_REQUIRED" | "BLOCKED" | "DRAFT_ONLY" | "UNSUPPORTED";
export interface Phase13ImplementationStageGateRow { stageId: string; stageName: string; stageType: ImplementationPlanStageType; sequence: number; stepIds: string[]; readyStepIds: string[]; reviewStepIds: string[]; blockedStepIds: string[]; exitCriteria: string[]; readinessImpact: Phase13ImplementationReadiness; blockers: string[]; evidence: string[]; notes: string[]; }
export interface Phase13ImplementationStepGateRow { stepId: string; title: string; stageId: string; category: ImplementationPlanStepCategory; targetObjectType: ImplementationPlanTargetObjectType; targetObjectId?: string; sourceObjectIds: string[]; sourceRequirementIds: string[]; sourceTruthState?: NetworkObjectTruthState; preconditions: string[]; operatorAction: string; verificationEvidence: string[]; rollbackStep: string; riskLevel: ImplementationPlanStep["riskLevel"]; dependencyStepIds: string[]; blockingDependencyIds: string[]; readinessState: Phase13ImplementationState; readinessImpact: Phase13ImplementationReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface Phase13ImplementationDependencyGateRow { dependencyId: string; sourceStepId?: string; targetStepId?: string; sourceObjectId?: string; targetObjectId?: string; relationship: ImplementationDependencyGraphEdge["relationship"]; required: boolean; readinessImpact: Phase13ImplementationReadiness; evidence: string[]; notes: string[]; }
export interface Phase13ImplementationFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedStepIds: string[]; readinessImpact: Phase13ImplementationReadiness; remediation: string; }
export interface Phase13ImplementationPlanningControlSummary { contract: "PHASE13_IMPLEMENTATION_PLANNING_CONTRACT"; role: "VERIFIED_SOURCE_OBJECT_GATED_IMPLEMENTATION_PLAN_NOT_VENDOR_CONFIG"; overallReadiness: Phase13ImplementationReadiness; stageGateCount: number; stepGateCount: number; readyStepGateCount: number; reviewStepGateCount: number; blockedStepGateCount: number; highRiskStepCount: number; highRiskStepWithSafetyGateCount: number; dependencyGateCount: number; graphBackedDependencyCount: number; verificationEvidenceGateCount: number; rollbackGateCount: number; requirementLineageGapCount: number; sourceObjectGapCount: number; blockedFindingCount: number; reviewFindingCount: number; findingCount: number; implementationReadiness: ImplementationPlanSummary["implementationReadiness"]; stageGates: Phase13ImplementationStageGateRow[]; stepGates: Phase13ImplementationStepGateRow[]; dependencyGates: Phase13ImplementationDependencyGateRow[]; findings: Phase13ImplementationFinding[]; notes: string[]; }

export type VendorNeutralImplementationTemplateReadiness = "ready" | "review" | "blocked";

export interface VendorNeutralImplementationTemplateSummary {
  source: "backend-implementation-plan";
  templateCount: number;
  groupCount: number;
  variableCount: number;
  readyTemplateCount: number;
  reviewTemplateCount: number;
  blockedTemplateCount: number;
  highRiskTemplateCount: number;
  verificationLinkedTemplateCount: number;
  rollbackLinkedTemplateCount: number;
  vendorSpecificCommandCount: 0;
  commandGenerationAllowed: false;
  templateReadiness: VendorNeutralImplementationTemplateReadiness;
  notes: string[];
}

export interface VendorNeutralImplementationTemplateVariable {
  id: string;
  name: string;
  required: boolean;
  source: string;
  exampleValue: string;
  notes: string[];
}

export interface VendorNeutralImplementationTemplateGroup {
  id: string;
  stageId: string;
  name: string;
  objective: string;
  readiness: VendorNeutralImplementationTemplateReadiness;
  templateIds: string[];
  exitCriteria: string[];
  notes: string[];
}

export interface VendorNeutralImplementationTemplate {
  id: string;
  stepId: string;
  stageId: string;
  stageName: string;
  title: string;
  category: ImplementationPlanStepCategory;
  sequence: number;
  targetObjectType: ImplementationPlanTargetObjectType;
  targetObjectId?: string;
  readiness: VendorNeutralImplementationTemplateReadiness;
  riskLevel: ImplementationPlanStep["riskLevel"];
  engineerReviewRequired: boolean;
  vendorNeutralIntent: string;
  commandGenerationAllowed: false;
  commandGenerationReason: string;
  variableIds: string[];
  preChecks: string[];
  neutralActions: string[];
  verificationEvidence: string[];
  rollbackEvidence: string[];
  acceptanceCriteria: string[];
  linkedVerificationCheckIds: string[];
  linkedRollbackActionIds: string[];
  dependencyStepIds: string[];
  dependencyObjectIds: string[];
  graphDependencyEdgeIds: string[];
  blastRadius: string[];
  blockerReasons: string[];
  proofBoundary: string[];
  notes: string[];
}

export interface VendorNeutralImplementationTemplateModel {
  summary: VendorNeutralImplementationTemplateSummary;
  safetyNotice: string;
  groups: VendorNeutralImplementationTemplateGroup[];
  variables: VendorNeutralImplementationTemplateVariable[];
  templates: VendorNeutralImplementationTemplate[];
  proofBoundary: string[];
}


export type Phase14ImplementationTemplateDomain =
  | "addressing"
  | "vlans"
  | "dhcp"
  | "routing"
  | "security-policy"
  | "nat"
  | "wan"
  | "cloud-edge"
  | "monitoring"
  | "validation"
  | "rollback";
export type Phase14ImplementationTemplateReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export interface Phase14ImplementationTemplateDomainRow { domain: Phase14ImplementationTemplateDomain; templateCount: number; readyTemplateCount: number; reviewTemplateCount: number; blockedTemplateCount: number; readinessImpact: Phase14ImplementationTemplateReadiness; templateIds: string[]; evidence: string[]; }
export interface Phase14ImplementationTemplateGateRow { templateId: string; stepId: string; title: string; domain: Phase14ImplementationTemplateDomain; targetObjectType: ImplementationPlanTargetObjectType; targetObjectId?: string; readinessImpact: Phase14ImplementationTemplateReadiness; sourceObjectIds: string[]; sourceRequirementIds: string[]; variableIds: string[]; requiredVariableCount: number; missingDataBlockers: string[]; vendorNeutralActions: string[]; evidenceRequired: string[]; rollbackRequirement: string; commandGenerationAllowed: false; commandGenerationDisabledReason: string; linkedVerificationCheckIds: string[]; linkedRollbackActionIds: string[]; dependencyStepIds: string[]; proofBoundary: string[]; notes: string[]; }
export interface Phase14ImplementationTemplateFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedTemplateIds: string[]; readinessImpact: Phase14ImplementationTemplateReadiness; remediation: string; }
export interface Phase14ImplementationTemplateControlSummary { contract: "PHASE14_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT"; role: "VENDOR_NEUTRAL_TEMPLATES_NO_PLATFORM_COMMANDS_SOURCE_OBJECT_GATED"; overallReadiness: Phase14ImplementationTemplateReadiness; commandGenerationAllowed: false; vendorSpecificCommandCount: 0; templateCount: number; domainCount: number; readyTemplateCount: number; reviewTemplateCount: number; blockedTemplateCount: number; sourceObjectGapCount: number; requirementLineageGapCount: number; variableGapCount: number; evidenceGapCount: number; rollbackGapCount: number; commandLeakCount: number; findingCount: number; blockedFindingCount: number; reviewFindingCount: number; domainRows: Phase14ImplementationTemplateDomainRow[]; templateGates: Phase14ImplementationTemplateGateRow[]; findings: Phase14ImplementationTemplateFinding[]; proofBoundary: string[]; notes: string[]; }


export type Phase15ReportExportTruthReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase15ReportTruthLabel = "USER_PROVIDED" | "REQUIREMENT_MATERIALIZED" | "BACKEND_COMPUTED" | "ENGINE2_DURABLE" | "INFERRED" | "ESTIMATED" | "REVIEW_REQUIRED" | "BLOCKED" | "UNSUPPORTED";
export interface Phase15ReportSectionGateRow { sectionKey: string; title: string; required: boolean; readinessImpact: Phase15ReportExportTruthReadiness; reportSection: string; frontendLocation: string; truthLabels: Phase15ReportTruthLabel[]; evidence: string[]; blockers: string[]; }
export interface Phase15ReportTraceabilityMatrixRow { requirementKey: string; requirementLabel: string; designConsequence: string; enginesAffected: string[]; frontendLocation: string; reportSection: string; diagramImpact: string; readinessStatus: Phase15ReportExportTruthReadiness; missingConsumers: string[]; sourceObjectIds: string[]; }
export interface Phase15ReportTruthLabelRow { truthLabel: Phase15ReportTruthLabel; count: number; reportUsage: string; readinessImpact: Phase15ReportExportTruthReadiness; evidence: string[]; }
export interface Phase15ReportExportTruthFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedSectionKeys: string[]; readinessImpact: Phase15ReportExportTruthReadiness; remediation: string; }
export interface Phase15ReportExportTruthControlSummary { contract: "PHASE15_REPORT_EXPORT_TRUTH_CONTRACT"; role: "REPORT_EXPORT_BACKEND_TRUTH_REQUIREMENT_TRACEABILITY_DELIVERABLE_GATE"; overallReadiness: Phase15ReportExportTruthReadiness; requiredSectionCount: number; readySectionCount: number; reviewSectionCount: number; blockedSectionCount: number; traceabilityRowCount: number; missingTraceabilityConsumerCount: number; truthLabelRowCount: number; blockedTruthLabelCount: number; pdfDocxCsvCovered: boolean; findingCount: number; blockedFindingCount: number; reviewFindingCount: number; sectionGates: Phase15ReportSectionGateRow[]; traceabilityMatrix: Phase15ReportTraceabilityMatrixRow[]; truthLabelRows: Phase15ReportTruthLabelRow[]; findings: Phase15ReportExportTruthFinding[]; proofBoundary: string[]; notes: string[]; }

export type DesignTruthReadiness = "ready" | "review" | "blocked" | "unknown";

export interface BackendTruthFinding { title: string; detail: string; severity: "ERROR" | "WARNING" | "INFO"; source: "design-graph" | "routing" | "security" | "implementation" | "validation"; }
export interface BackendReportTruthVerificationSummary { checkType: string; totalCount: number; blockedCount: number; reviewCount: number; readyCount: number; }
export interface BackendReportTruthModel {
  overallReadiness: DesignTruthReadiness;
  overallReadinessLabel: string;
  summary: { deviceCount: number; linkCount: number; routeDomainCount: number; securityZoneCount: number; routeIntentCount: number; securityFlowCount: number; implementationStepCount: number; blockedImplementationStepCount: number; blockedVerificationCheckCount: number; };
  readiness: { routing: DesignTruthReadiness; security: DesignTruthReadiness; nat: DesignTruthReadiness; implementation: DesignTruthReadiness; };
  blockedFindings: BackendTruthFinding[];
  reviewFindings: BackendTruthFinding[];
  implementationReviewQueue: ImplementationPlanStep[];
  verificationChecks: ImplementationPlanVerificationCheck[];
  verificationCoverage: BackendReportTruthVerificationSummary[];
  rollbackActions: ImplementationPlanRollbackAction[];
  limitations: string[];
}
export interface BackendDiagramTruthHotspot { title: string; detail: string; readiness: DesignTruthReadiness; scopeLabel: string; }
export interface BackendDiagramTruthOverlaySummary { key: "addressing" | "routing" | "security" | "nat" | "implementation" | "verification" | "operational-safety"; label: string; readiness: DesignTruthReadiness; detail: string; count: number; }
export interface BackendDiagramTruthNode { id: string; objectType: "site" | "network-device" | "network-interface" | "network-link" | "route-domain" | "security-zone"; label: string; readiness: DesignTruthReadiness; notes: string[]; }
export interface BackendDiagramTruthEdge { id: string; relationship: string; sourceId: string; targetId: string; readiness: DesignTruthReadiness; notes: string[]; }
export type BackendDiagramRenderLayer = "site" | "device" | "interface" | "routing" | "security" | "implementation" | "verification";
export type BackendDiagramRenderOverlayKey = "addressing" | "routing" | "security" | "nat" | "implementation" | "verification" | "operational-safety";
export interface BackendDiagramRenderNode {
  id: string;
  objectId: string;
  objectType: DesignGraphNodeObjectType;
  label: string;
  groupId?: string;
  siteId?: string;
  layer: BackendDiagramRenderLayer;
  readiness: DesignTruthReadiness;
  truthState: NetworkObjectTruthState;
  x: number;
  y: number;
  sourceEngine: "design-graph" | "object-model" | "routing" | "security" | "implementation";
  relatedFindingIds: string[];
  notes: string[];
}
export interface BackendDiagramRenderEdge {
  id: string;
  relationship: DesignGraphRelationship | "implementation-dependency" | "verification-target";
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  readiness: DesignTruthReadiness;
  overlayKeys: BackendDiagramRenderOverlayKey[];
  relatedObjectIds: string[];
  notes: string[];
}
export interface BackendDiagramRenderGroup {
  id: string;
  groupType: "site" | "route-domain" | "security-zone" | "implementation-stage";
  label: string;
  readiness: DesignTruthReadiness;
  nodeIds: string[];
  notes: string[];
}
export interface BackendDiagramRenderOverlay {
  key: BackendDiagramRenderOverlayKey;
  label: string;
  readiness: DesignTruthReadiness;
  nodeIds: string[];
  edgeIds: string[];
  hotspotIndexes: number[];
  detail: string;
}
export interface BackendDiagramRenderModel {
  summary: {
    nodeCount: number;
    edgeCount: number;
    groupCount: number;
    overlayCount: number;
    backendAuthored: true;
    layoutMode: "backend-deterministic-grid" | "professional-topology-layout" | "professional-view-separated-layout" | "professional-scope-mode-layout" | "professional-usability-polish-layout" | "phase16-backend-truth-layout-contract";
    contractId?: "PHASE16_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT";
    truthContract?: "backend-only-render-model";
    modeCount?: number;
  };
  nodes: BackendDiagramRenderNode[];
  edges: BackendDiagramRenderEdge[];
  groups: BackendDiagramRenderGroup[];
  overlays: BackendDiagramRenderOverlay[];
  emptyState?: { reason: string; requiredInputs: string[]; };
}
export interface BackendDiagramTruthModel {
  overallReadiness: DesignTruthReadiness;
  hasModeledTopology: boolean;
  emptyStateReason?: string;
  topologySummary: { siteCount: number; deviceCount: number; interfaceCount: number; linkCount: number; routeDomainCount: number; securityZoneCount: number; };
  nodes: BackendDiagramTruthNode[];
  edges: BackendDiagramTruthEdge[];
  overlaySummaries: BackendDiagramTruthOverlaySummary[];
  hotspots: BackendDiagramTruthHotspot[];
  renderModel: BackendDiagramRenderModel;
}

export type Phase16DiagramTruthReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase16DiagramModeKey = "physical" | "logical" | "wan-cloud" | "security" | "per-site" | "implementation";
export interface Phase16DiagramModeContractRow { contract: "PHASE16_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT"; mode: Phase16DiagramModeKey; purpose: string; allowedRenderLayers: BackendDiagramRenderLayer[]; requiredBackendEvidence: string[]; forbiddenFrontendBehavior: string[]; status: "AVAILABLE" | "REVIEW_REQUIRED" | "BLOCKED"; readinessImpact: Phase16DiagramTruthReadiness; evidenceCount: number; notes: string[]; }
export interface Phase16DiagramRenderCoverageRow { rowType: "node" | "edge"; renderId: string; backendObjectId: string; objectType?: DesignGraphNodeObjectType; relationship?: string; truthState?: NetworkObjectTruthState; readiness: DesignTruthReadiness; hasBackendIdentity: boolean; hasTruthState: boolean; hasReadiness: boolean; sourceEngine: string; relatedFindingIds: string[]; modeImpacts: Phase16DiagramModeKey[]; }
export interface Phase16DiagramTruthFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedRenderIds: string[]; readinessImpact: Phase16DiagramTruthReadiness; remediation: string; }
export interface Phase16DiagramTruthControlSummary { contract: "PHASE16_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT"; role: "BACKEND_ONLY_DIAGRAM_RENDERER_NO_PRETTY_GARBAGE"; overallReadiness: Phase16DiagramTruthReadiness; backendAuthored: boolean; renderNodeCount: number; renderEdgeCount: number; modeContractCount: number; blockedModeCount: number; reviewModeCount: number; nodesWithoutBackendObjectId: number; edgesWithoutRelatedObjects: number; inferredOrReviewVisibleCount: number; findingCount: number; blockedFindingCount: number; reviewFindingCount: number; modeContracts: Phase16DiagramModeContractRow[]; renderCoverage: Phase16DiagramRenderCoverageRow[]; findings: Phase16DiagramTruthFinding[]; proofBoundary: string[]; notes: string[]; }


export type Phase17PlatformBomReadiness = "ADVISORY_READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase17PlatformBomConfidence = "estimated" | "review" | "placeholder";
export interface Phase17PlatformBomRow { contract: "PHASE17_PLATFORM_BOM_FOUNDATION_CONTRACT"; category: string; item: string; quantity: number | string; unit: string; scope: string; calculationBasis: string; sourceRequirementIds: string[]; sourceObjectIds: string[]; confidence: Phase17PlatformBomConfidence; readinessImpact: Phase17PlatformBomReadiness; manualReviewNote: string; notes: string[]; }
export interface Phase17PlatformBomRequirementDriver { contract: "PHASE17_PLATFORM_BOM_FOUNDATION_CONTRACT"; requirementId: string; value: string; affectedRows: string[]; evidence: string; readinessImpact: Phase17PlatformBomReadiness; }
export interface Phase17PlatformBomFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedRows: string[]; readinessImpact: Phase17PlatformBomReadiness; remediation: string; }
export interface Phase17PlatformBomFoundationControlSummary { contract: "PHASE17_PLATFORM_BOM_FOUNDATION_CONTRACT"; role: "BACKEND_CONTROLLED_ADVISORY_BOM_NO_FAKE_SKUS"; sourceOfTruthLevel: "backend-computed-advisory-estimate"; procurementAuthority: "ADVISORY_ONLY_NOT_FINAL_SKU"; overallReadiness: Phase17PlatformBomReadiness; siteCount: number; usersPerSite: number; totalEstimatedUsers: number; growthMarginPercent: number; localPortDemandPerSite: number; poeDemandPerSite: number; modeledDeviceCount: number; modeledInterfaceCount: number; rowCount: number; estimatedRowCount: number; reviewRowCount: number; placeholderRowCount: number; requirementDriverCount: number; rows: Phase17PlatformBomRow[]; requirementDrivers: Phase17PlatformBomRequirementDriver[]; assumptions: string[]; licensingPlaceholders: string[]; reviewItems: string[]; findings: Phase17PlatformBomFinding[]; totals: { lineItems: number; hardwareCategories: number; reviewItems: number; placeholderItems: number; }; proofBoundary: string[]; notes: string[]; }


export type Phase18DiscoveryReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED" | "NOT_READY";
export type Phase18DiscoveryState = "NOT_PROVIDED" | "MANUALLY_ENTERED" | "IMPORTED" | "VALIDATED" | "CONFLICTING" | "REVIEW_REQUIRED";
export interface Phase18DiscoveryAreaRow { contract: "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT"; areaKey: string; area: string; state: Phase18DiscoveryState; sourceType: string; requiredFor: string[]; evidenceCount: number; sourceRequirementIds: string[]; sourceObjectIds: string[]; readinessImpact: Phase18DiscoveryReadiness; reviewReason: string; notes: string[]; }
export interface Phase18DiscoveryImportTargetRow { contract: "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT"; targetKey: string; target: string; state: Phase18DiscoveryState; sourceExamples: string[]; requiredFor: string[]; sourceRequirementIds: string[]; readinessImpact: Phase18DiscoveryReadiness; reconciliationNeed: string; notes: string[]; }
export interface Phase18DiscoveryTask { contract: "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT"; taskId: string; requirementId: string; title: string; detail: string; linkedTargets: string[]; priority: "HIGH" | "MEDIUM" | "LOW"; state: "OPEN" | "REVIEW_READY" | "COMPLETE"; readinessImpact: Phase18DiscoveryReadiness; blockers: string[]; }
export interface Phase18DiscoveryRequirementDriver { contract: "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT"; requirementId: string; value: string; affectedAreas: string[]; affectedImportTargets: string[]; generatedTaskIds: string[]; evidence: string; readinessImpact: Phase18DiscoveryReadiness; }
export interface Phase18DiscoveryFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedAreas: string[]; affectedImportTargets: string[]; readinessImpact: Phase18DiscoveryReadiness; remediation: string; }
export interface Phase18DiscoveryCurrentStateControlSummary { contract: "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT"; role: "MANUAL_DISCOVERY_BOUNDARY_NO_LIVE_DISCOVERY_CLAIMS"; sourceOfTruthLevel: "manual-discovery-boundary"; currentStateAuthority: "MANUAL_OR_IMPORTED_EVIDENCE_ONLY_NOT_LIVE_DISCOVERY"; overallReadiness: Phase18DiscoveryReadiness; brownfieldMode: string; importReadiness: string; siteCount: number; savedSiteCount: number; modeledDeviceCount: number; modeledInterfaceCount: number; configuredObjectCount: number; discoveredObjectCount: number; persistedIpamObjectCount: number; areaRowCount: number; importTargetCount: number; taskCount: number; openTaskCount: number; requirementDriverCount: number; manuallyEnteredEvidenceCount: number; importedEvidenceCount: number; validatedEvidenceCount: number; conflictingEvidenceCount: number; reviewRequiredCount: number; stateCounts: Record<Phase18DiscoveryState, number>; areaRows: Phase18DiscoveryAreaRow[]; importTargets: Phase18DiscoveryImportTargetRow[]; tasks: Phase18DiscoveryTask[]; requirementDrivers: Phase18DiscoveryRequirementDriver[]; findings: Phase18DiscoveryFinding[]; proofBoundary: string[]; notes: string[]; }


export type Phase19AiDraftReadiness = "SAFE_DRAFT_ONLY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase19AiDraftState = "NO_AI_DRAFT" | "AI_DRAFT" | "REVIEW_REQUIRED" | "CONVERTED_TO_STRUCTURED_INPUT" | "VALIDATED_AFTER_REVIEW" | "BLOCKED";
export type Phase19AiGateState = "ENFORCED" | "REVIEW_REQUIRED" | "MISSING";

export interface Phase19AiDraftGateRow {
  contract: "PHASE19_AI_DRAFT_HELPER_CONTRACT";
  gateKey: string;
  gate: string;
  required: true;
  state: Phase19AiGateState;
  evidence: string[];
  blocksAuthority: boolean;
  consumerImpact: string;
}

export interface Phase19AiDraftObjectRow {
  contract: "PHASE19_AI_DRAFT_HELPER_CONTRACT";
  objectId: string;
  objectType: "project" | "requirement-profile" | "site" | "vlan" | "validation-explanation" | "note";
  objectLabel: string;
  state: Phase19AiDraftState;
  sourceType: "AI_DRAFT";
  proofStatus: "DRAFT_ONLY" | "REVIEW_REQUIRED";
  downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED";
  sourceRequirementIds: string[];
  reviewRequired: boolean;
  materializationPath: string[];
  notes: string[];
}

export interface Phase19AiDraftFinding {
  severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
  code: string;
  title: string;
  detail: string;
  affectedObjects: string[];
  readinessImpact: Phase19AiDraftReadiness;
  remediation: string;
}

export interface Phase19AiDraftHelperControlSummary {
  contract: "PHASE19_AI_DRAFT_HELPER_CONTRACT";
  role: "AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY";
  sourceOfTruthLevel: "ai-draft-only-review-gated";
  aiAuthority: "DRAFT_ONLY_NOT_AUTHORITATIVE";
  overallReadiness: Phase19AiDraftReadiness;
  draftApplyPolicy: "SELECTIVE_REVIEW_REQUIRED_BEFORE_STRUCTURED_SAVE";
  aiDerivedObjectCount: number;
  reviewRequiredObjectCount: number;
  gateCount: number;
  enforcedGateCount: number;
  missingGateCount: number;
  hasAiDraftMetadata: boolean;
  hasAiAppliedObjects: boolean;
  providerMode: "local" | "openai" | "unknown" | "not-used";
  gateRows: Phase19AiDraftGateRow[];
  draftObjectRows: Phase19AiDraftObjectRow[];
  findings: Phase19AiDraftFinding[];
  proofBoundary: string[];
  notes: string[];
}



export type Phase20ProofReadiness = "PROOF_READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type Phase20ReleaseGateState = "PASSED" | "REVIEW_REQUIRED" | "BLOCKED";

export interface Phase20EngineProofRow {
  contract: "PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  phase: number;
  engineKey: string;
  expectedContract: string;
  status: "PROVEN" | "REVIEW_REQUIRED" | "BLOCKED" | "MISSING" | "CONTRACT_GAP";
  readinessImpact: Phase20ProofReadiness;
  proofFocus: string;
  evidence: string[];
  blockers: string[];
}

export interface Phase20ScenarioProofRow {
  contract: "PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  scenarioKey: string;
  scenarioName: string;
  requirementsCovered: string[];
  expectedProofChain: string[];
  expectedEnginePhases: number[];
  actualEvidence: string[];
  missingEvidence: string[];
  readinessImpact: Phase20ProofReadiness;
  notes: string[];
}

export interface Phase20ReleaseGateRow {
  contract: "PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  gateKey: string;
  gate: string;
  required: true;
  state: Phase20ReleaseGateState;
  evidence: string[];
  remediation: string;
}

export interface Phase20Finding {
  severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
  code: string;
  title: string;
  detail: string;
  affectedItems: string[];
  readinessImpact: Phase20ProofReadiness;
  remediation: string;
}

export interface Phase20FinalProofPassControlSummary {
  contract: "PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  role: "FINAL_CROSS_ENGINE_REQUIREMENT_TO_RELEASE_PROOF_GATE";
  releaseTarget: "A_MINUS_A_PLANNING_PLATFORM_NOT_A_PLUS";
  sourceOfTruthLevel: "final-cross-engine-proof-gate";
  overallReadiness: Phase20ProofReadiness;
  scenarioCount: number;
  scenarioProofReadyCount: number;
  scenarioReviewCount: number;
  scenarioBlockedCount: number;
  engineProofCount: number;
  engineProofReadyCount: number;
  engineProofReviewCount: number;
  engineProofBlockedCount: number;
  gateCount: number;
  passedGateCount: number;
  reviewGateCount: number;
  blockedGateCount: number;
  scenarioRows: Phase20ScenarioProofRow[];
  engineProofRows: Phase20EngineProofRow[];
  releaseGates: Phase20ReleaseGateRow[];
  findings: Phase20Finding[];
  proofBoundary: string[];
  notes: string[];
}

export interface NetworkObjectModel {
  summary: NetworkObjectModelSummary;
  routeDomains: RouteDomain[];
  securityZones: SecurityZone[];
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  links: NetworkLink[];
  policyRules: PolicyRule[];
  natRules: NatRule[];
  dhcpPools: DhcpPool[];
  ipReservations: IpReservation[];
  designGraph: DesignGraph;
  routingSegmentation: RoutingSegmentationModel;
  securityPolicyFlow: SecurityPolicyFlowModel;
  implementationPlan: ImplementationPlanModel;
  integrityNotes: string[];
}


export interface EnterpriseAllocatorPlanRowSummary {
  family: "ipv4" | "ipv6";
  poolId: string;
  poolName: string;
  routeDomainKey: string;
  target: string;
  siteId?: string;
  vlanId?: number;
  requestedPrefix: number;
  proposedCidr?: string;
  status: "allocated" | "blocked" | "skipped";
  explanation: string;
}

export interface EnterpriseAllocatorReviewFindingSummary {
  code: string;
  severity: "info" | "review" | "blocked";
  title: string;
  detail: string;
}

export interface EnterpriseAllocatorPostureSummary {
  sourceOfTruthReadiness: "ready" | "review" | "blocked";
  dualStackReadiness: "ready" | "review" | "blocked";
  vrfReadiness: "ready" | "review" | "blocked";
  brownfieldReadiness: "ready" | "review" | "blocked";
  dhcpReadiness: "ready" | "review" | "blocked";
  reservePolicyReadiness: "ready" | "review" | "blocked";
  approvalReadiness: "ready" | "review" | "blocked";
  ipv4ConfiguredSubnetCount: number;
  ipv6ConfiguredPrefixCount: number;
  ipv6ReviewFindingCount: number;
  vrfDomainCount: number;
  dhcpScopeCount: number;
  reservationPolicyCount: number;
  brownfieldEvidenceState: "configured" | "proposed" | "import-required" | "unsupported";
  durablePoolCount: number;
  durableAllocationCount: number;
  durableBrownfieldNetworkCount: number;
  allocationApprovalCount: number;
  allocationLedgerEntryCount: number;
  ipv6AllocationCount: number;
  vrfOverlapFindingCount: number;
  brownfieldConflictCount: number;
  dhcpFindingCount: number;
  reservePolicyFindingCount: number;
  staleAllocationCount: number;
  currentInputHash: string;
  allocationPlanRows: EnterpriseAllocatorPlanRowSummary[];
  reviewFindings: EnterpriseAllocatorReviewFindingSummary[];
  notes: string[];
  reviewQueue: string[];
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
    prefix?: number;
    networkAddress?: string;
    broadcastAddress?: string;
    dottedMask?: string;
    wildcardMask?: string;
    totalAddresses?: number;
    usableAddresses?: number;
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
    enterpriseAllocatorReadiness: "ready" | "review" | "blocked";
    ipv6ConfiguredPrefixCount: number;
    enterpriseAllocatorReviewQueueCount: number;
    planningInputNotReflectedCount: number;
    traceabilityCount: number;
    summarizationReviewCount: number;
    transitPlanCount: number;
    loopbackPlanCount: number;
    networkObjectCount: number;
    modeledDeviceCount: number;
    modeledInterfaceCount: number;
    modeledSecurityZoneCount: number;
    modeledRouteDomainCount: number;
    designGraphNodeCount: number;
    designGraphEdgeCount: number;
    designGraphIntegrityFindingCount: number;
    designGraphBlockingFindingCount: number;
    routeIntentCount: number;
    routingReachabilityFindingCount: number;
    routingBlockingFindingCount: number;
    segmentationExpectationCount: number;
    segmentationConflictCount: number;
    securityFlowRequirementCount: number;
    securityPolicyFindingCount: number;
    securityPolicyBlockingFindingCount: number;
    securityPolicyMissingNatCount: number;
    implementationPlanStepCount: number;
    implementationPlanBlockedStepCount: number;
    implementationPlanReviewStepCount: number;
    implementationPlanFindingCount: number;
    implementationPlanBlockingFindingCount: number;
    designReviewReadiness: DesignTruthReadiness;
    implementationExecutionReadiness: DesignTruthReadiness;
    readyForBackendAuthority: boolean;
    readyForLiveMappingSplit: boolean;
  };
  truthStateSummary: TruthStateLedger;
  /** Backward-compatible alias for older behavioral/build selftests and consumers. */
  truthStateLedger: TruthStateLedger;
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
  enterpriseAllocatorPosture: EnterpriseAllocatorPostureSummary;
  standardsAlignment: StandardsAlignmentSummary;
  planningInputCoverage: PlanningInputCoverageSummary;
  planningInputDiscipline: PlanningInputDisciplineSummary;
  phase1TraceabilityControl: Phase1PlanningTraceabilityControlSummary;
  phase2RequirementsMaterialization: Phase2RequirementsMaterializationControlSummary;
  phase3RequirementsClosure: Phase3RequirementsClosureControlSummary;
  phase4CidrAddressingTruth: Phase4CidrAddressingTruthControlSummary;
  phase5EnterpriseIpamTruth: Phase5EnterpriseIpamTruthControlSummary;
  phase6DesignCoreOrchestrator: Phase6DesignCoreOrchestratorControlSummary;
  phase7StandardsRulebookControl: Phase7StandardsAlignmentRulebookControlSummary;
  phase8ValidationReadiness: Phase8ValidationReadinessControlSummary;
  phase9NetworkObjectModel: Phase9NetworkObjectModelControlSummary;
  phase10DesignGraph: Phase10DesignGraphControlSummary;
  phase11RoutingSegmentation: Phase11RoutingSegmentationControlSummary;
  phase12SecurityPolicyFlow: Phase12SecurityPolicyFlowControlSummary;
  phase13ImplementationPlanning: Phase13ImplementationPlanningControlSummary;
  phase14ImplementationTemplates: Phase14ImplementationTemplateControlSummary;
  phase15ReportExportTruth: Phase15ReportExportTruthControlSummary;
  phase16DiagramTruth: Phase16DiagramTruthControlSummary;
  phase17PlatformBomFoundation: Phase17PlatformBomFoundationControlSummary;
  phase18DiscoveryCurrentState: Phase18DiscoveryCurrentStateControlSummary;
  phase19AiDraftHelper: Phase19AiDraftHelperControlSummary;
  phase20FinalProofPass: Phase20FinalProofPassControlSummary;
  requirementsCoverage: RequirementsCoverageSummary;
  requirementsImpactClosure: RequirementsImpactClosureSummary;
  requirementsScenarioProof: RequirementsScenarioProofSummary;
  currentStateBoundary: CurrentStateBoundarySummary;
  networkObjectModel: NetworkObjectModel;
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
  vendorNeutralImplementationTemplates: VendorNeutralImplementationTemplateModel;
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
