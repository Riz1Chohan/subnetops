import type { SegmentRole } from "./segmentRoles";

export type DesignCoreTruthState = "configured" | "inferred" | "proposed";
export type DesignCoreIssueSeverity = "ERROR" | "WARNING" | "INFO";

export interface DesignCoreIssue {
  severity: DesignCoreIssueSeverity;
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
  truthState: DesignCoreTruthState;
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
  truthState: DesignCoreTruthState;
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

export type NetworkObjectTruthState = "configured" | "inferred" | "proposed" | "discovered";


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

export interface NetworkDevice {
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

export interface NetworkInterface {
  id: string;
  name: string;
  deviceId: string;
  siteId: string;
  interfaceRole: "vlan-gateway" | "wan-transit" | "loopback" | "firewall-boundary" | "routed-uplink" | "unknown";
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

export interface NetworkLink {
  id: string;
  name: string;
  linkRole: "site-wan-transit" | "vlan-gateway-binding" | "firewall-boundary" | "route-domain-membership" | "planned";
  truthState: NetworkObjectTruthState;
  status: "modeled" | "planned" | "deferred";
  siteIds: string[];
  subnetCidr?: string;
  endpointA?: NetworkLinkEndpoint;
  endpointB?: NetworkLinkEndpoint;
  notes: string[];
}

export interface RouteDomain {
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

export interface SecurityZone {
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

export interface PolicyRule {
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

export interface NatRule {
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

export interface DhcpPool {
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

export interface IpReservation {
  id: string;
  ipAddress: string;
  subnetCidr: string;
  reservationRole: "gateway" | "loopback" | "transit-endpoint" | "management" | "review";
  ownerType: "interface" | "device" | "route-domain" | "security-zone" | "unknown";
  ownerId?: string;
  truthState: NetworkObjectTruthState;
  notes: string[];
}

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
export type BackendDesignTruthReadiness = "ready" | "review" | "blocked" | "unknown";
export interface BackendTruthFinding { title: string; detail: string; severity: "ERROR" | "WARNING" | "INFO"; source: "design-graph" | "routing" | "security" | "implementation" | "validation"; }
export interface BackendReportTruthVerificationSummary { checkType: string; totalCount: number; blockedCount: number; reviewCount: number; readyCount: number; }
export interface BackendReportTruthModel {
  overallReadiness: BackendDesignTruthReadiness;
  overallReadinessLabel: string;
  summary: { deviceCount: number; linkCount: number; routeDomainCount: number; securityZoneCount: number; routeIntentCount: number; securityFlowCount: number; implementationStepCount: number; blockedImplementationStepCount: number; blockedVerificationCheckCount: number; };
  readiness: { routing: BackendDesignTruthReadiness; security: BackendDesignTruthReadiness; nat: BackendDesignTruthReadiness; implementation: BackendDesignTruthReadiness; };
  blockedFindings: BackendTruthFinding[];
  reviewFindings: BackendTruthFinding[];
  implementationReviewQueue: ImplementationPlanStep[];
  verificationChecks: ImplementationPlanVerificationCheck[];
  verificationCoverage: BackendReportTruthVerificationSummary[];
  rollbackActions: ImplementationPlanRollbackAction[];
  limitations: string[];
}
export interface BackendDiagramTruthHotspot { title: string; detail: string; readiness: BackendDesignTruthReadiness; scopeLabel: string; }
export interface BackendDiagramTruthOverlaySummary { key: "addressing" | "routing" | "security" | "nat" | "implementation" | "verification" | "operational-safety"; label: string; readiness: BackendDesignTruthReadiness; detail: string; count: number; }
export interface BackendDiagramTruthNode { id: string; objectType: "site" | "network-device" | "network-interface" | "network-link" | "route-domain" | "security-zone"; label: string; readiness: BackendDesignTruthReadiness; notes: string[]; }
export interface BackendDiagramTruthEdge { id: string; relationship: string; sourceId: string; targetId: string; readiness: BackendDesignTruthReadiness; notes: string[]; }
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
  readiness: BackendDesignTruthReadiness;
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
  readiness: BackendDesignTruthReadiness;
  overlayKeys: BackendDiagramRenderOverlayKey[];
  relatedObjectIds: string[];
  notes: string[];
}
export interface BackendDiagramRenderGroup {
  id: string;
  groupType: "site" | "route-domain" | "security-zone" | "implementation-stage";
  label: string;
  readiness: BackendDesignTruthReadiness;
  nodeIds: string[];
  notes: string[];
}
export interface BackendDiagramRenderOverlay {
  key: BackendDiagramRenderOverlayKey;
  label: string;
  readiness: BackendDesignTruthReadiness;
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
    layoutMode: "backend-deterministic-grid" | "professional-topology-layout" | "professional-view-separated-layout" | "professional-scope-mode-layout" | "professional-usability-polish-layout";
  };
  nodes: BackendDiagramRenderNode[];
  edges: BackendDiagramRenderEdge[];
  groups: BackendDiagramRenderGroup[];
  overlays: BackendDiagramRenderOverlay[];
  emptyState?: { reason: string; requiredInputs: string[]; };
}
export interface BackendDiagramTruthModel {
  overallReadiness: BackendDesignTruthReadiness;
  hasModeledTopology: boolean;
  emptyStateReason?: string;
  topologySummary: { siteCount: number; deviceCount: number; interfaceCount: number; linkCount: number; routeDomainCount: number; securityZoneCount: number; };
  nodes: BackendDiagramTruthNode[];
  edges: BackendDiagramTruthEdge[];
  overlaySummaries: BackendDiagramTruthOverlaySummary[];
  hotspots: BackendDiagramTruthHotspot[];
  renderModel: BackendDiagramRenderModel;
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

export interface BackendTraceabilityItem extends DesignSourceTraceLabel {
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
  areas: Array<{
    id: string;
    title: string;
    status: "implemented" | "partial" | "missing";
    signals: string[];
    notes: string[];
  }>;
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


export interface DesignCoreSnapshot {
  projectId: string;
  projectName: string;
  generatedAt: string;
  authority?: {
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
    designReviewReadiness?: "ready" | "review" | "blocked";
    implementationExecutionReadiness?: "ready" | "review" | "blocked";
    readyForBackendAuthority: boolean;
    readyForLiveMappingSplit: boolean;
  };
  allocationPolicy?: {
    siteAllocationMode: "configured" | "mixed" | "backend-proposed";
    gatewayMode: "first-usable" | "last-usable" | "mixed" | "custom" | "not-applicable";
    transitMode: "/31-preferred" | "deferred";
    loopbackMode: "/32-per-site" | "deferred";
    notes: string[];
  };
  engineConfidence?: {
    state: "low" | "medium" | "high";
    score: number;
    drivers: string[];
    notes: string[];
  };
  allocatorDeterminism?: {
    state: "high" | "medium" | "low";
    evaluationOrder: string[];
    blockingConditions: string[];
    notes: string[];
  };
  enterpriseAllocatorPosture?: EnterpriseAllocatorPostureSummary;
  siteBlocks: DesignCoreSiteBlock[];
  addressingRows: DesignCoreAddressRow[];
  transitPlan?: Array<{ kind: "existing" | "proposed"; siteId: string; siteName: string; siteCode?: string | null; vlanId?: number; subnetCidr?: string; gatewayOrEndpoint?: string; notes: string[] }>;
  loopbackPlan?: Array<{ kind: "existing" | "proposed"; siteId: string; siteName: string; siteCode?: string | null; vlanId?: number; subnetCidr?: string; endpointIp?: string; notes: string[] }>;
  networkObjectModel?: NetworkObjectModel;
  reportTruth?: BackendReportTruthModel;
  diagramTruth?: BackendDiagramTruthModel;
  vendorNeutralImplementationTemplates?: VendorNeutralImplementationTemplateModel;
  proposedRows: DesignCoreProposalRow[];
  traceability?: BackendTraceabilityItem[];
  phase1TraceabilityControl?: Phase1PlanningTraceabilityControlSummary;
  requirementsCoverage?: RequirementsCoverageSummary;
  requirementsImpactClosure?: RequirementsImpactClosureSummary;
  requirementsScenarioProof?: RequirementsScenarioProofSummary;
  issues: DesignCoreIssue[];
}

export function designCoreAuthorityLabel(snapshot?: DesignCoreSnapshot | null) {
  if (!snapshot) return "Backend snapshot loading";
  if (snapshot.summary.readyForBackendAuthority) return "Backend design-core snapshot";
  return "Backend snapshot available with blockers";
}

export function designCoreAuthorityDetail(snapshot?: DesignCoreSnapshot | null) {
  if (!snapshot) return "Backend design-core snapshot is loading; the UI must not convert loading data into false zero evidence.";
  const generated = new Date(snapshot.authority?.generatedAt ?? snapshot.generatedAt).toLocaleString();
  const designReadiness = snapshot.summary.designReviewReadiness ?? (snapshot.summary.readyForBackendAuthority ? "review" : "blocked");
  const implementationReadiness = snapshot.summary.implementationExecutionReadiness ?? (snapshot.summary.implementationPlanBlockingFindingCount ? "blocked" : "review");
  const blockerCount = snapshot.issues.filter((issue) => issue.severity === "ERROR").length;
  const reviewNote = snapshot.authority?.requiresEngineerReview ? "engineer review required" : "review required";
  const objectSummary = snapshot.summary.networkObjectCount ? ` • ${snapshot.summary.networkObjectCount} network objects` : "";
  const graphSummary = snapshot.summary.designGraphNodeCount ? ` • ${snapshot.summary.designGraphNodeCount} graph nodes / ${snapshot.summary.designGraphEdgeCount} graph edges` : "";
  const graphBlockers = snapshot.summary.designGraphBlockingFindingCount ? ` • ${snapshot.summary.designGraphBlockingFindingCount} graph blocker${snapshot.summary.designGraphBlockingFindingCount === 1 ? "" : "s"}` : "";
  const routeSummary = snapshot.summary.routeIntentCount ? ` • ${snapshot.summary.routeIntentCount} route intents` : "";
  const transitSummary = snapshot.summary.transitPlanCount ? ` • ${snapshot.summary.transitPlanCount} transit rows` : "";
  const segmentationSummary = snapshot.summary.segmentationExpectationCount ? ` • ${snapshot.summary.segmentationExpectationCount} segmentation checks` : "";
  const implementationSummary = snapshot.summary.implementationPlanStepCount ? ` • ${snapshot.summary.implementationPlanStepCount} implementation steps` : "";
  return `${snapshot.summary.vlanCount} address rows • ${snapshot.summary.validSubnetCount} valid subnets${objectSummary}${graphSummary}${routeSummary}${transitSummary}${segmentationSummary}${implementationSummary} • design review ${designReadiness} • implementation execution ${implementationReadiness} • ${blockerCount} design blocker${blockerCount === 1 ? "" : "s"}${graphBlockers} • generated ${generated} • ${reviewNote}`;
}
