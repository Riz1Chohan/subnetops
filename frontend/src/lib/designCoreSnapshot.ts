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

export type V1NetworkObjectType =
  | "network-device"
  | "network-interface"
  | "network-link"
  | "route-domain"
  | "security-zone"
  | "policy-rule"
  | "nat-rule"
  | "dhcp-pool"
  | "ip-reservation";

export type V1NetworkObjectImplementationReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED" | "DRAFT_ONLY" | "UNSUPPORTED";

export interface V1NetworkObjectProvenanceFields {
  objectType?: V1NetworkObjectType;
  objectRole?: string;
  sourceType?: DesignTruthSourceType;
  sourceRequirementIds?: string[];
  sourceObjectIds?: string[];
  sourceEngine?: string;
  confidence?: DesignTraceConfidence;
  proofStatus?: DesignProofStatus;
  implementationReadiness?: V1NetworkObjectImplementationReadiness;
  validationImpact?: string;
  frontendDisplayImpact?: string[];
  reportExportImpact?: string[];
  diagramImpact?: string[];
  reviewReason?: string;
}

export interface NetworkObjectProvenanceLabel extends DesignSourceTraceLabel {
  objectId: string;
  objectType: V1NetworkObjectType;
  objectRole: string;
  truthState: NetworkObjectTruthState;
  implementationReadiness: V1NetworkObjectImplementationReadiness;
  validationImpact: string;
  frontendDisplayImpact: string[];
  reportExportImpact: string[];
  diagramImpact: string[];
}

export type V1NetworkObjectReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface V1NetworkObjectLineageRow extends NetworkObjectProvenanceLabel {
  displayName: string;
  relatedObjectIds: string[];
  hasCompleteMetadata: boolean;
  missingMetadataFields: string[];
}

export interface V1RequirementObjectLineageRow {
  requirementId: string;
  sourceKey: string;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  expectedObjectTypes: V1NetworkObjectType[];
  actualObjectIds: string[];
  actualObjectTypes: V1NetworkObjectType[];
  missingObjectTypes: V1NetworkObjectType[];
  readinessImpact: V1NetworkObjectReadiness;
  notes: string[];
}

export interface V1NetworkObjectFinding {
  severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
  code: string;
  title: string;
  detail: string;
  affectedObjectIds: string[];
  readinessImpact: V1NetworkObjectReadiness;
  remediation: string;
}

export interface V1NetworkObjectModelControlSummary {
  contract: "V1_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT";
  role: "TRUTH_LABELLED_NETWORK_OBJECT_MODEL_NOT_FAKE_TOPOLOGY";
  overallReadiness: V1NetworkObjectReadiness;
  objectCount: number;
  metadataCompleteObjectCount: number;
  metadataGapObjectCount: number;
  fakeAuthorityRiskCount: number;
  requirementLineageRowCount: number;
  requirementLineageGapCount: number;
  implementationReadyObjectCount: number;
  implementationReviewObjectCount: number;
  implementationBlockedObjectCount: number;
  objectLineage: V1NetworkObjectLineageRow[];
  requirementObjectLineage: V1RequirementObjectLineageRow[];
  findings: V1NetworkObjectFinding[];
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

export type V1DesignGraphReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1DesignGraphDependencyState = "CONNECTED" | "ORPHANED" | "MISSING_GRAPH_NODE" | "MISSING_REQUIRED_EDGE" | "MISSING_CONSUMER" | "REVIEW_REQUIRED";

export interface V1DesignGraphObjectCoverageRow { objectId: string; displayName: string; objectType: V1NetworkObjectType; truthState: NetworkObjectTruthState; sourceRequirementIds: string[]; graphNodeIds: string[]; relationshipIds: string[]; relationshipTypes: string[]; dependencyState: V1DesignGraphDependencyState; consumerSurfaces: string[]; missingConsumerSurfaces: string[]; notes: string[]; }
export interface V1RequirementDependencyPath { requirementId: string; sourceKey: string; lifecycleStatus: RequirementPropagationLifecycleStatus; expectedObjectTypes: V1NetworkObjectType[]; actualObjectIds: string[]; actualGraphNodeIds: string[]; actualRelationshipIds: string[]; actualRelationshipTypes: string[]; expectedRelationshipTypes: string[]; missingGraphNodeIds: string[]; missingRelationshipTypes: string[]; frontendConsumers: string[]; reportExportConsumers: string[]; diagramConsumers: string[]; validationConsumers: string[]; missingConsumerSurfaces: string[]; readinessImpact: V1DesignGraphReadiness; notes: string[]; }
export interface V1DesignGraphFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedObjectIds: string[]; readinessImpact: V1DesignGraphReadiness; remediation: string; }
export interface V1DesignGraphControlSummary { contract: "V1_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT"; role: "REQUIREMENT_TO_OBJECT_TO_CONSUMER_DEPENDENCY_GRAPH"; overallReadiness: V1DesignGraphReadiness; graphNodeCount: number; graphEdgeCount: number; requiredEdgeCount: number; connectedObjectCount: number; orphanObjectCount: number; integrityFindingCount: number; blockingFindingCount: number; requirementPathCount: number; requirementPathReadyCount: number; requirementPathReviewCount: number; requirementPathBlockedCount: number; objectCoverageCount: number; objectCoverageReadyCount: number; objectCoverageGapCount: number; diagramOnlyObjectCount: number; unreferencedPolicyCount: number; routeWithoutNextHopCount: number; implementationStepWithoutSourceCount: number; requirementDependencyPaths: V1RequirementDependencyPath[]; objectCoverage: V1DesignGraphObjectCoverageRow[]; findings: V1DesignGraphFinding[]; notes: string[]; }

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
  V1MetadataCompleteCount: number;
  V1MetadataGapCount: number;
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

export interface NetworkDevice extends V1NetworkObjectProvenanceFields {
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

export interface NetworkInterface extends V1NetworkObjectProvenanceFields {
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

export interface NetworkLink extends V1NetworkObjectProvenanceFields {
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

export interface RouteDomain extends V1NetworkObjectProvenanceFields {
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

export interface SecurityZone extends V1NetworkObjectProvenanceFields {
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

export interface PolicyRule extends V1NetworkObjectProvenanceFields {
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

export interface NatRule extends V1NetworkObjectProvenanceFields {
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

export interface DhcpPool extends V1NetworkObjectProvenanceFields {
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

export interface IpReservation extends V1NetworkObjectProvenanceFields {
  id: string;
  ipAddress: string;
  subnetCidr: string;
  reservationRole: "gateway" | "loopback" | "transit-endpoint" | "management" | "review";
  ownerType: "interface" | "device" | "route-domain" | "security-zone" | "unknown";
  ownerId?: string;
  truthState: NetworkObjectTruthState;
  notes: string[];
}

export type V1SecurityPolicyReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1SecurityPolicyState = "REQUIRED" | "RECOMMENDED" | "BLOCKED" | "MISSING" | "OVERBROAD" | "SHADOWED" | "REVIEW_REQUIRED" | "NOT_APPLICABLE";
export type V1SecurityControlCategory = "zone-matrix" | "business-service" | "default-deny" | "guest-isolation" | "management-plane" | "dmz-exposure" | "remote-access" | "cloud-hybrid" | "nat" | "logging" | "broad-permit" | "shadowing" | "policy-consequence" | "voice" | "iot-printer-camera";
export interface V1RequirementSecurityMatrixRow { requirementKey: string; requirementLabel: string; active: boolean; expectedSecurityCategories: V1SecurityControlCategory[]; actualFlowRequirementIds: string[]; actualPolicyMatrixRowIds: string[]; missingSecurityCategories: V1SecurityControlCategory[]; readinessImpact: V1SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1ZonePolicyReviewRow { id: string; sourceZoneId: string; sourceZoneName: string; sourceZoneRole: SecurityZone["zoneRole"]; destinationZoneId: string; destinationZoneName: string; destinationZoneRole: SecurityZone["zoneRole"]; defaultPosture: SecurityPolicyMatrixRow["defaultPosture"]; explicitPolicyRuleIds: string[]; requiredFlowIds: string[]; natRequiredFlowIds: string[]; V1PolicyState: V1SecurityPolicyState; readinessImpact: V1SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1FlowConsequenceRow { id: string; flowRequirementId: string; name: string; sourceZoneName: string; destinationZoneName: string; expectedAction: SecurityFlowRequirement["expectedAction"]; observedPolicyAction?: SecurityFlowRequirement["observedPolicyAction"]; serviceNames: string[]; natRequired: boolean; loggingRequired: boolean; matchedPolicyRuleIds: string[]; matchedNatRuleIds: string[]; requirementKeys: string[]; V1PolicyState: V1SecurityPolicyState; readinessImpact: V1SecurityPolicyReadiness; consequenceSummary: string; reviewReason?: string; notes: string[]; }
export interface V1NatReviewRow { id: string; natReviewId: string; natRuleId: string; natRuleName: string; sourceZoneName: string; destinationZoneName?: string; status: SecurityNatReview["status"]; coveredFlowRequirementIds: string[]; missingFlowRequirementIds: string[]; V1PolicyState: V1SecurityPolicyState; readinessImpact: V1SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1LoggingReviewRow { id: string; flowRequirementId: string; flowName: string; required: boolean; matchedPolicyRuleIds: string[]; V1PolicyState: V1SecurityPolicyState; readinessImpact: V1SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1ShadowingReviewRow { id: string; ruleId: string; ruleName: string; sequence: number; action: PolicyRule["action"]; broadMatch: boolean; shadowsRuleIds: string[]; shadowedByRuleIds: string[]; V1PolicyState: V1SecurityPolicyState; readinessImpact: V1SecurityPolicyReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1SecurityPolicyFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedObjectIds: string[]; readinessImpact: V1SecurityPolicyReadiness; remediation: string; }
export interface V1SecurityPolicyFlowControlSummary { contract: "V1_SECURITY_POLICY_FLOW_CONTRACT"; role: "ZONE_SERVICE_NAT_LOGGING_POLICY_REVIEW_NOT_FIREWALL_CONFIG"; overallReadiness: V1SecurityPolicyReadiness; serviceObjectCount: number; serviceGroupCount: number; zonePolicyReviewCount: number; flowConsequenceCount: number; requirementSecurityMatrixCount: number; activeRequirementSecurityGapCount: number; requiredFlowCount: number; missingFlowCount: number; blockedFlowCount: number; overbroadPolicyCount: number; shadowedRuleCount: number; loggingReviewCount: number; loggingGapCount: number; natReviewCount: number; missingNatCount: number; reviewRequiredCount: number; findingCount: number; blockingFindingCount: number; reviewFindingCount: number; policyReadiness: "ready" | "review" | "blocked"; natReadiness: "ready" | "review" | "blocked"; requirementSecurityMatrix: V1RequirementSecurityMatrixRow[]; zonePolicyReviews: V1ZonePolicyReviewRow[]; flowConsequences: V1FlowConsequenceRow[]; natReviews: V1NatReviewRow[]; loggingReviews: V1LoggingReviewRow[]; shadowingReviews: V1ShadowingReviewRow[]; findings: V1SecurityPolicyFinding[]; notes: string[]; }

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


export type V1RoutingSegmentationReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1RoutingControlState = "ROUTING_INTENT" | "ROUTING_REVIEW" | "ROUTING_BLOCKER" | "ROUTING_SIMULATION_UNAVAILABLE";
export type V1ProtocolIntentCategory = "connected" | "static" | "summary" | "default" | "ospf" | "bgp" | "route-leaking" | "ecmp" | "redistribution" | "cloud-route-table" | "wan-posture" | "wan-failover" | "asymmetric-routing" | "segmentation-reachability";
export interface V1ProtocolIntentRow { id: string; category: V1ProtocolIntentCategory; name: string; routeDomainId?: string; routeDomainName?: string; siteId?: string; sourceRouteIntentIds: string[]; sourceObjectIds: string[]; requirementKeys: string[]; controlState: V1RoutingControlState; readinessImpact: V1RoutingSegmentationReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1RequirementRoutingMatrixRow { requirementKey: string; requirementLabel: string; active: boolean; expectedProtocolCategories: V1ProtocolIntentCategory[]; actualProtocolIntentIds: string[]; missingProtocolCategories: V1ProtocolIntentCategory[]; readinessImpact: V1RoutingSegmentationReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1RouteDomainReviewRow { routeDomainId: string; routeDomainName: string; vrfName?: string; subnetCount: number; connectedRouteCount: number; staticRouteCount: number; summaryRouteCount: number; defaultRouteCount: number; routeConflictCount: number; segmentationExpectationCount: number; readinessImpact: V1RoutingSegmentationReadiness; notes: string[]; }
export interface V1RoutingFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedObjectIds: string[]; readinessImpact: V1RoutingSegmentationReadiness; remediation: string; }
export interface V1RoutingSegmentationControlSummary { contract: "V1_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT"; role: "ROUTING_INTENT_REVIEW_NOT_PACKET_SIMULATION"; overallReadiness: V1RoutingSegmentationReadiness; routeDomainCount: number; routeIntentCount: number; protocolIntentCount: number; connectedRouteIntentCount: number; staticRouteIntentCount: number; summaryRouteIntentCount: number; defaultRouteIntentCount: number; ospfReviewCount: number; bgpReviewCount: number; routeLeakingReviewCount: number; ecmpReviewCount: number; redistributionReviewCount: number; cloudRouteTableReviewCount: number; wanPostureReviewCount: number; segmentationReachabilityReviewCount: number; asymmetricRoutingReviewCount: number; requirementRoutingMatrixCount: number; activeRequirementRoutingGapCount: number; blockedProtocolIntentCount: number; reviewProtocolIntentCount: number; simulationUnavailableCount: number; findingCount: number; blockingFindingCount: number; reviewFindingCount: number; routingReadiness: "ready" | "review" | "blocked"; segmentationReadiness: "ready" | "review" | "blocked"; routeDomainReviews: V1RouteDomainReviewRow[]; protocolIntents: V1ProtocolIntentRow[]; requirementRoutingMatrix: V1RequirementRoutingMatrixRow[]; siteReachabilityChecks: SiteToSiteReachabilityCheck[]; findings: V1RoutingFinding[]; notes: string[]; }

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





export type V1ImplementationReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1ImplementationState = "READY" | "REVIEW_REQUIRED" | "BLOCKED" | "DRAFT_ONLY" | "UNSUPPORTED";
export interface V1ImplementationStageGateRow { stageId: string; stageName: string; stageType: ImplementationPlanStageType; sequence: number; stepIds: string[]; readyStepIds: string[]; reviewStepIds: string[]; blockedStepIds: string[]; exitCriteria: string[]; readinessImpact: V1ImplementationReadiness; blockers: string[]; evidence: string[]; notes: string[]; }
export interface V1ImplementationStepGateRow { stepId: string; title: string; stageId: string; category: ImplementationPlanStepCategory; targetObjectType: ImplementationPlanTargetObjectType; targetObjectId?: string; sourceObjectIds: string[]; sourceRequirementIds: string[]; sourceTruthState?: NetworkObjectTruthState; preconditions: string[]; operatorAction: string; verificationEvidence: string[]; rollbackStep: string; riskLevel: ImplementationPlanStep["riskLevel"]; dependencyStepIds: string[]; blockingDependencyIds: string[]; readinessState: V1ImplementationState; readinessImpact: V1ImplementationReadiness; evidence: string[]; reviewReason?: string; notes: string[]; }
export interface V1ImplementationDependencyGateRow { dependencyId: string; sourceStepId?: string; targetStepId?: string; sourceObjectId?: string; targetObjectId?: string; relationship: ImplementationDependencyGraphEdge["relationship"]; required: boolean; readinessImpact: V1ImplementationReadiness; evidence: string[]; notes: string[]; }
export interface V1ImplementationFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedStepIds: string[]; readinessImpact: V1ImplementationReadiness; remediation: string; }
export interface V1ImplementationPlanningControlSummary { contract: "V1_IMPLEMENTATION_PLANNING_CONTRACT"; role: "VERIFIED_SOURCE_OBJECT_GATED_IMPLEMENTATION_PLAN_NOT_VENDOR_CONFIG"; overallReadiness: V1ImplementationReadiness; stageGateCount: number; stepGateCount: number; readyStepGateCount: number; reviewStepGateCount: number; blockedStepGateCount: number; highRiskStepCount: number; highRiskStepWithSafetyGateCount: number; dependencyGateCount: number; graphBackedDependencyCount: number; verificationEvidenceGateCount: number; rollbackGateCount: number; requirementLineageGapCount: number; sourceObjectGapCount: number; blockedFindingCount: number; reviewFindingCount: number; findingCount: number; implementationReadiness: ImplementationPlanSummary["implementationReadiness"]; stageGates: V1ImplementationStageGateRow[]; stepGates: V1ImplementationStepGateRow[]; dependencyGates: V1ImplementationDependencyGateRow[]; findings: V1ImplementationFinding[]; notes: string[]; }

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


export type V1ImplementationTemplateDomain =
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
export type V1ImplementationTemplateReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export interface V1ImplementationTemplateDomainRow { domain: V1ImplementationTemplateDomain; templateCount: number; readyTemplateCount: number; reviewTemplateCount: number; blockedTemplateCount: number; readinessImpact: V1ImplementationTemplateReadiness; templateIds: string[]; evidence: string[]; }
export interface V1ImplementationTemplateGateRow { templateId: string; stepId: string; title: string; domain: V1ImplementationTemplateDomain; targetObjectType: ImplementationPlanTargetObjectType; targetObjectId?: string; readinessImpact: V1ImplementationTemplateReadiness; sourceObjectIds: string[]; sourceRequirementIds: string[]; variableIds: string[]; requiredVariableCount: number; missingDataBlockers: string[]; vendorNeutralActions: string[]; evidenceRequired: string[]; rollbackRequirement: string; commandGenerationAllowed: false; commandGenerationDisabledReason: string; linkedVerificationCheckIds: string[]; linkedRollbackActionIds: string[]; dependencyStepIds: string[]; proofBoundary: string[]; notes: string[]; }
export interface V1ImplementationTemplateFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedTemplateIds: string[]; readinessImpact: V1ImplementationTemplateReadiness; remediation: string; }
export interface V1ImplementationTemplateControlSummary { contract: "V1_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT"; role: "VENDOR_NEUTRAL_TEMPLATES_NO_PLATFORM_COMMANDS_SOURCE_OBJECT_GATED"; overallReadiness: V1ImplementationTemplateReadiness; commandGenerationAllowed: false; vendorSpecificCommandCount: 0; templateCount: number; domainCount: number; readyTemplateCount: number; reviewTemplateCount: number; blockedTemplateCount: number; sourceObjectGapCount: number; requirementLineageGapCount: number; variableGapCount: number; evidenceGapCount: number; rollbackGapCount: number; commandLeakCount: number; findingCount: number; blockedFindingCount: number; reviewFindingCount: number; domainRows: V1ImplementationTemplateDomainRow[]; templateGates: V1ImplementationTemplateGateRow[]; findings: V1ImplementationTemplateFinding[]; proofBoundary: string[]; notes: string[]; }


export type V1ReportExportTruthReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1ReportTruthLabel = "USER_PROVIDED" | "REQUIREMENT_MATERIALIZED" | "BACKEND_COMPUTED" | "ENGINE2_DURABLE" | "INFERRED" | "ESTIMATED" | "REVIEW_REQUIRED" | "BLOCKED" | "UNSUPPORTED";
export interface V1ReportSectionGateRow { sectionKey: string; title: string; required: boolean; readinessImpact: V1ReportExportTruthReadiness; reportSection: string; frontendLocation: string; truthLabels: V1ReportTruthLabel[]; evidence: string[]; blockers: string[]; }
export interface V1ReportTraceabilityMatrixRow { requirementKey: string; requirementLabel: string; designConsequence: string; enginesAffected: string[]; frontendLocation: string; reportSection: string; diagramImpact: string; readinessStatus: V1ReportExportTruthReadiness; missingConsumers: string[]; sourceObjectIds: string[]; }
export interface V1ReportTruthLabelRow { truthLabel: V1ReportTruthLabel; count: number; reportUsage: string; readinessImpact: V1ReportExportTruthReadiness; evidence: string[]; }
export interface V1ReportExportTruthFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedSectionKeys: string[]; readinessImpact: V1ReportExportTruthReadiness; remediation: string; }
export interface V1ReportExportTruthControlSummary { contract: "V1_REPORT_EXPORT_TRUTH_CONTRACT"; role: "REPORT_EXPORT_BACKEND_TRUTH_REQUIREMENT_TRACEABILITY_DELIVERABLE_GATE"; overallReadiness: V1ReportExportTruthReadiness; requiredSectionCount: number; readySectionCount: number; reviewSectionCount: number; blockedSectionCount: number; traceabilityRowCount: number; missingTraceabilityConsumerCount: number; truthLabelRowCount: number; blockedTruthLabelCount: number; pdfDocxCsvCovered: boolean; findingCount: number; blockedFindingCount: number; reviewFindingCount: number; sectionGates: V1ReportSectionGateRow[]; traceabilityMatrix: V1ReportTraceabilityMatrixRow[]; truthLabelRows: V1ReportTruthLabelRow[]; findings: V1ReportExportTruthFinding[]; proofBoundary: string[]; notes: string[]; }

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
    layoutMode: "backend-deterministic-grid" | "professional-topology-layout" | "professional-view-separated-layout" | "professional-scope-mode-layout" | "professional-usability-polish-layout" | "V1-backend-truth-layout-contract";
    contractId?: "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT";
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

export type V1DiagramTruthReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1DiagramModeKey = "physical" | "logical" | "wan-cloud" | "security" | "per-site" | "implementation";
export interface V1DiagramModeContractRow { contract: "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT"; mode: V1DiagramModeKey; purpose: string; allowedRenderLayers: BackendDiagramRenderLayer[]; requiredBackendEvidence: string[]; forbiddenFrontendBehavior: string[]; status: "AVAILABLE" | "REVIEW_REQUIRED" | "BLOCKED"; readinessImpact: V1DiagramTruthReadiness; evidenceCount: number; notes: string[]; }
export interface V1DiagramRenderCoverageRow { rowType: "node" | "edge"; renderId: string; backendObjectId: string; objectType?: DesignGraphNodeObjectType; relationship?: string; truthState?: NetworkObjectTruthState; readiness: BackendDesignTruthReadiness; hasBackendIdentity: boolean; hasTruthState: boolean; hasReadiness: boolean; sourceEngine: string; relatedFindingIds: string[]; modeImpacts: V1DiagramModeKey[]; }
export interface V1DiagramTruthFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedRenderIds: string[]; readinessImpact: V1DiagramTruthReadiness; remediation: string; }
export interface V1DiagramTruthControlSummary { contract: "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT"; role: "BACKEND_ONLY_DIAGRAM_RENDERER_NO_PRETTY_GARBAGE"; overallReadiness: V1DiagramTruthReadiness; backendAuthored: boolean; renderNodeCount: number; renderEdgeCount: number; modeContractCount: number; blockedModeCount: number; reviewModeCount: number; nodesWithoutBackendObjectId: number; edgesWithoutRelatedObjects: number; inferredOrReviewVisibleCount: number; findingCount: number; blockedFindingCount: number; reviewFindingCount: number; modeContracts: V1DiagramModeContractRow[]; renderCoverage: V1DiagramRenderCoverageRow[]; findings: V1DiagramTruthFinding[]; proofBoundary: string[]; notes: string[]; }


export type V1PlatformBomReadiness = "ADVISORY_READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1PlatformBomConfidence = "estimated" | "review" | "placeholder";
export interface V1PlatformBomRow { contract: "V1_PLATFORM_BOM_FOUNDATION_CONTRACT"; category: string; item: string; quantity: number | string; unit: string; scope: string; calculationBasis: string; sourceRequirementIds: string[]; sourceObjectIds: string[]; confidence: V1PlatformBomConfidence; readinessImpact: V1PlatformBomReadiness; manualReviewNote: string; notes: string[]; }
export interface V1PlatformBomRequirementDriver { contract: "V1_PLATFORM_BOM_FOUNDATION_CONTRACT"; requirementId: string; value: string; affectedRows: string[]; evidence: string; readinessImpact: V1PlatformBomReadiness; }
export interface V1PlatformBomFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedRows: string[]; readinessImpact: V1PlatformBomReadiness; remediation: string; }
export interface V1PlatformBomFoundationControlSummary { contract: "V1_PLATFORM_BOM_FOUNDATION_CONTRACT"; role: "BACKEND_CONTROLLED_ADVISORY_BOM_NO_FAKE_SKUS"; sourceOfTruthLevel: "backend-computed-advisory-estimate"; procurementAuthority: "ADVISORY_ONLY_NOT_FINAL_SKU"; overallReadiness: V1PlatformBomReadiness; siteCount: number; usersPerSite: number; totalEstimatedUsers: number; growthMarginPercent: number; localPortDemandPerSite: number; poeDemandPerSite: number; modeledDeviceCount: number; modeledInterfaceCount: number; rowCount: number; estimatedRowCount: number; reviewRowCount: number; placeholderRowCount: number; requirementDriverCount: number; rows: V1PlatformBomRow[]; requirementDrivers: V1PlatformBomRequirementDriver[]; assumptions: string[]; licensingPlaceholders: string[]; reviewItems: string[]; findings: V1PlatformBomFinding[]; totals: { lineItems: number; hardwareCategories: number; reviewItems: number; placeholderItems: number; }; proofBoundary: string[]; notes: string[]; }


export type V1DiscoveryReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED" | "NOT_READY";
export type V1DiscoveryState = "NOT_PROVIDED" | "MANUALLY_ENTERED" | "IMPORTED" | "VALIDATED" | "CONFLICTING" | "REVIEW_REQUIRED";
export interface V1DiscoveryAreaRow { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT"; areaKey: string; area: string; state: V1DiscoveryState; sourceType: string; requiredFor: string[]; evidenceCount: number; sourceRequirementIds: string[]; sourceObjectIds: string[]; readinessImpact: V1DiscoveryReadiness; reviewReason: string; notes: string[]; }
export interface V1DiscoveryImportTargetRow { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT"; targetKey: string; target: string; state: V1DiscoveryState; sourceExamples: string[]; requiredFor: string[]; sourceRequirementIds: string[]; readinessImpact: V1DiscoveryReadiness; reconciliationNeed: string; notes: string[]; }
export interface V1DiscoveryTask { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT"; taskId: string; requirementId: string; title: string; detail: string; linkedTargets: string[]; priority: "HIGH" | "MEDIUM" | "LOW"; state: "OPEN" | "REVIEW_READY" | "COMPLETE"; readinessImpact: V1DiscoveryReadiness; blockers: string[]; }
export interface V1DiscoveryRequirementDriver { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT"; requirementId: string; value: string; affectedAreas: string[]; affectedImportTargets: string[]; generatedTaskIds: string[]; evidence: string; readinessImpact: V1DiscoveryReadiness; }
export interface V1DiscoveryFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedAreas: string[]; affectedImportTargets: string[]; readinessImpact: V1DiscoveryReadiness; remediation: string; }
export interface V1DiscoveryCurrentStateControlSummary { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT"; role: "MANUAL_DISCOVERY_BOUNDARY_NO_LIVE_DISCOVERY_CLAIMS"; sourceOfTruthLevel: "manual-discovery-boundary"; currentStateAuthority: "MANUAL_OR_IMPORTED_EVIDENCE_ONLY_NOT_LIVE_DISCOVERY"; overallReadiness: V1DiscoveryReadiness; brownfieldMode: string; importReadiness: string; siteCount: number; savedSiteCount: number; modeledDeviceCount: number; modeledInterfaceCount: number; configuredObjectCount: number; discoveredObjectCount: number; persistedIpamObjectCount: number; areaRowCount: number; importTargetCount: number; taskCount: number; openTaskCount: number; requirementDriverCount: number; manuallyEnteredEvidenceCount: number; importedEvidenceCount: number; validatedEvidenceCount: number; conflictingEvidenceCount: number; reviewRequiredCount: number; stateCounts: Record<V1DiscoveryState, number>; areaRows: V1DiscoveryAreaRow[]; importTargets: V1DiscoveryImportTargetRow[]; tasks: V1DiscoveryTask[]; requirementDrivers: V1DiscoveryRequirementDriver[]; findings: V1DiscoveryFinding[]; proofBoundary: string[]; notes: string[]; }


export type V1AiDraftReadiness = "SAFE_DRAFT_ONLY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1AiDraftState = "NO_AI_DRAFT" | "AI_DRAFT" | "REVIEW_REQUIRED" | "CONVERTED_TO_STRUCTURED_INPUT" | "VALIDATED_AFTER_REVIEW" | "BLOCKED";
export type V1AiGateState = "ENFORCED" | "REVIEW_REQUIRED" | "MISSING";
export interface V1AiDraftGateRow { contract: "V1_AI_DRAFT_HELPER_CONTRACT"; gateKey: string; gate: string; required: true; state: V1AiGateState; evidence: string[]; blocksAuthority: boolean; consumerImpact: string; }
export interface V1AiDraftObjectRow { contract: "V1_AI_DRAFT_HELPER_CONTRACT"; objectId: string; objectType: "project" | "requirement-profile" | "site" | "vlan" | "validation-explanation" | "note"; objectLabel: string; state: V1AiDraftState; sourceType: "AI_DRAFT"; proofStatus: "DRAFT_ONLY" | "REVIEW_REQUIRED"; downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED"; sourceRequirementIds: string[]; reviewRequired: boolean; materializationPath: string[]; notes: string[]; }
export interface V1AiDraftFinding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedObjects: string[]; readinessImpact: V1AiDraftReadiness; remediation: string; }
export interface V1AiDraftHelperControlSummary { contract: "V1_AI_DRAFT_HELPER_CONTRACT"; role: "AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY"; sourceOfTruthLevel: "ai-draft-only-review-gated"; aiAuthority: "DRAFT_ONLY_NOT_AUTHORITATIVE"; overallReadiness: V1AiDraftReadiness; draftApplyPolicy: "SELECTIVE_REVIEW_REQUIRED_BEFORE_STRUCTURED_SAVE"; aiDerivedObjectCount: number; reviewRequiredObjectCount: number; gateCount: number; enforcedGateCount: number; missingGateCount: number; hasAiDraftMetadata: boolean; hasAiAppliedObjects: boolean; providerMode: "local" | "openai" | "unknown" | "not-used"; gateRows: V1AiDraftGateRow[]; draftObjectRows: V1AiDraftObjectRow[]; findings: V1AiDraftFinding[]; proofBoundary: string[]; notes: string[]; }

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



export type V1IpamReadinessImpact = "PASSED" | "WARNING" | "REVIEW_REQUIRED" | "BLOCKING" | "NOT_APPLICABLE";
export type V1IpamReconciliationState =
  | "ENGINE1_PROPOSAL_ONLY"
  | "ENGINE2_DURABLE_CANDIDATE"
  | "ENGINE2_APPROVED_ALLOCATION"
  | "ENGINE2_APPROVED_WITH_REVIEW_NOTES"
  | "ENGINE2_CONFLICT_REVIEW_BLOCKER"
  | "ENGINE2_STALE_ALLOCATION_REVIEW"
  | "ENGINE2_POOL_BLOCKED"
  | "ENGINE2_DHCP_CONFLICT_REVIEW"
  | "ENGINE2_RESERVATION_CONFLICT_REVIEW";

export interface V1EngineRelationshipSummary {
  engine1Role: string;
  engine2Role: string;
  designCoreRole: string;
}

export interface V1EnterpriseIpamReconciliationRow {
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
  reconciliationState: V1IpamReconciliationState;
  readinessImpact: V1IpamReadinessImpact;
  approvedHashMatches: boolean;
  currentInputHash: string;
  dhcpScopeIds: string[];
  reservationIds: string[];
  blockers: string[];
  reviewReasons: string[];
  evidence: string[];
}

export interface V1EnterpriseIpamRequirementMatrixRow {
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
  readinessImpact: V1IpamReadinessImpact;
  notes: string[];
}

export interface V1EnterpriseIpamConflictRow {
  id: string;
  code: string;
  severity: "info" | "review" | "blocked";
  title: string;
  detail: string;
  readinessImpact: V1IpamReadinessImpact;
}

export interface V1EnterpriseIpamTruthControlSummary {
  contractVersion: "V1_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW";
  engineRelationship: V1EngineRelationshipSummary;
  routeDomainCount: number;
  durablePoolCount: number;
  durableAllocationCount: number;
  dhcpScopeCount: number;
  reservationCount: number;
  brownfieldNetworkCount: number;
  approvalCount: number;
  ledgerEntryCount: number;
  currentInputHash: string;
  overallReadiness: V1IpamReadinessImpact;
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
  reconciliationRows: V1EnterpriseIpamReconciliationRow[];
  requirementIpamMatrix: V1EnterpriseIpamRequirementMatrixRow[];
  conflictRows: V1EnterpriseIpamConflictRow[];
  notes: string[];
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

export interface V1PlanningTraceabilityControlSummary {
  contractVersion: "V1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY";
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

export interface V1RequirementsMaterializationControlSummary {
  contractVersion: "V1_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT";
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




export type V1ReadinessImpact = "PASSED" | "WARNING" | "REVIEW_REQUIRED" | "BLOCKING" | "UNSUPPORTED" | "NOT_APPLICABLE";
export type V1ScenarioClosureStatus = "passed" | "review-required" | "blocked" | "not-applicable";

export interface V1RequirementConsumerCoverage {
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

export interface V1RequirementClosureMatrixRow {
  requirementId: string;
  key: string;
  label: string;
  category: string;
  sourceValue: string;
  active: boolean;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  readinessImpact: V1ReadinessImpact;
  expectedAffectedEngines: string[];
  actualAffectedEngines: string[];
  missingConsumers: string[];
  consumerCoverage: V1RequirementConsumerCoverage;
  evidence: string[];
  reviewReason?: string;
}

export interface V1GoldenScenarioClosure {
  id: string;
  label: string;
  relevant: boolean;
  requiredRequirementKeys: string[];
  lifecycleStatus: V1ScenarioClosureStatus;
  missingRequirementKeys: string[];
  blockingRequirementKeys: string[];
  reviewRequirementKeys: string[];
  evidence: string[];
}

export interface V1RequirementsClosureControlSummary {
  contractVersion: "V1_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF";
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
  closureMatrix: V1RequirementClosureMatrixRow[];
  goldenScenarioClosures: V1GoldenScenarioClosure[];
  notes: string[];
}



export type V1CidrProofStatus = "passed" | "warning" | "blocked";

export interface V1CidrEdgeCaseProof {
  id: string;
  label: string;
  status: V1CidrProofStatus;
  evidence: string[];
  selftest: string;
}

export interface V1RequirementAddressingMatrixRow {
  requirementKey: string;
  sourceValue: string;
  active: boolean;
  expectedAddressingImpact: string;
  affectedRoles: SegmentRole[];
  materializedAddressingEvidence: string[];
  missingAddressingEvidence: string[];
  readinessImpact: V1ReadinessImpact;
  notes: string[];
}

export interface V1AddressingTruthRow {
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
  readinessImpact: V1ReadinessImpact;
  blockers: string[];
  evidence: string[];
}

export interface V1CidrAddressingTruthControlSummary {
  contractVersion: "V1_ENGINE1_CIDR_ADDRESSING_TRUTH";
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
  edgeCaseProofs: V1CidrEdgeCaseProof[];
  requirementAddressingMatrix: V1RequirementAddressingMatrixRow[];
  addressingTruthRows: V1AddressingTruthRow[];
  notes: string[];
}



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
  contractVersion: "V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT";
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

export type V1StandardsSeverity = "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO";
export type V1StandardsEnforcementState = "PASS" | "WARN" | "BLOCK" | "REVIEW_REQUIRED" | "NOT_APPLICABLE";
export type V1StandardsReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface V1StandardsRuleRow {
  ruleId: string;
  title: string;
  authority: "formal-standard" | "best-practice";
  strength: "required" | "recommended" | "conditional" | "review-required";
  applicabilityState: "APPLICABLE" | "NOT_APPLICABLE" | "REVIEW_REQUIRED" | "UNSUPPORTED";
  applicabilityCondition: string;
  severity: V1StandardsSeverity;
  enforcementState: V1StandardsEnforcementState;
  affectedEngines: string[];
  affectedObjectIds: string[];
  remediationGuidance: string;
  requirementRelationships: string[];
  exceptionPolicy: string;
  evidence: string[];
  notes: string[];
}

export interface V1StandardsRequirementActivation {
  requirementKey: string;
  requirementValue: string;
  lifecycleStatus: string;
  activatedRuleIds: string[];
  blockingRuleIds: string[];
  reviewRuleIds: string[];
  readinessImpact: "PASSED" | "REVIEW_REQUIRED" | "BLOCKING" | "NOT_APPLICABLE";
  evidence: string[];
}

export interface V1StandardsFinding {
  id: string;
  severity: V1StandardsSeverity;
  code: "STANDARDS_RULE_BLOCKER" | "STANDARDS_RULE_REVIEW_REQUIRED" | "STANDARDS_RULE_WARNING";
  ruleId: string;
  title: string;
  detail: string;
  affectedEngine: string;
  affectedObjectIds: string[];
  remediationGuidance: string;
  readinessImpact: V1StandardsSeverity;
}

export interface V1StandardsAlignmentRulebookControlSummary {
  contractVersion: "V1_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT";
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
  overallReadiness: V1StandardsReadiness;
  ruleRows: V1StandardsRuleRow[];
  requirementActivations: V1StandardsRequirementActivation[];
  findings: V1StandardsFinding[];
  notes: string[];
}

export type V1ValidationReadinessCategory = "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";

export type V1ValidationRuleCode =
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

export interface V1ValidationFinding {
  id: string;
  category: V1ValidationReadinessCategory;
  ruleCode: V1ValidationRuleCode;
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

export interface V1ValidationCoverageRow {
  domain: string;
  sourceSnapshotPath: string;
  blockerCount: number;
  reviewRequiredCount: number;
  warningCount: number;
  infoCount: number;
  passedCount: number;
  readiness: V1ValidationReadinessCategory;
  evidence: string[];
}

export interface V1ValidationRequirementGateRow {
  requirementId: string;
  requirementKey: string;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  expectedAffectedEngines: string[];
  missingConsumers: string[];
  validationRuleCodes: string[];
  readinessImpact: V1ValidationReadinessCategory;
  evidence: string[];
}

export interface V1ValidationReadinessControlSummary {
  contractVersion: "V1_VALIDATION_READINESS_AUTHORITY_CONTRACT";
  validationRole: "STRICT_READINESS_AUTHORITY_NOT_ADVISORY_SUMMARY";
  validationCategories: V1ValidationReadinessCategory[];
  overallReadiness: V1ValidationReadinessCategory;
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
  coverageRows: V1ValidationCoverageRow[];
  requirementGateRows: V1ValidationRequirementGateRow[];
  findings: V1ValidationFinding[];
  notes: string[];
}


export type V1ProofReadiness = "PROOF_READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1ReleaseGateState = "PASSED" | "REVIEW_REQUIRED" | "BLOCKED";
export interface V1EngineProofRow { contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT"; stage: number; engineKey: string; expectedContract: string; status: "PROVEN" | "REVIEW_REQUIRED" | "BLOCKED" | "MISSING" | "CONTRACT_GAP"; readinessImpact: V1ProofReadiness; proofFocus: string; evidence: string[]; blockers: string[]; }
export interface V1ScenarioProofRow { contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT"; scenarioKey: string; scenarioName: string; requirementsCovered: string[]; expectedProofChain: string[]; expectedEngineStages: number[]; actualEvidence: string[]; missingEvidence: string[]; readinessImpact: V1ProofReadiness; notes: string[]; }
export interface V1ReleaseGateRow { contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT"; gateKey: string; gate: string; required: true; state: V1ReleaseGateState; evidence: string[]; remediation: string; }
export interface V1Finding { severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED"; code: string; title: string; detail: string; affectedItems: string[]; readinessImpact: V1ProofReadiness; remediation: string; }
export interface V1FinalProofPassControlSummary { contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT"; role: "FINAL_CROSS_ENGINE_REQUIREMENT_TO_RELEASE_PROOF_GATE"; releaseTarget: "A_MINUS_A_PLANNING_PLATFORM_NOT_A_PLUS"; sourceOfTruthLevel: "final-cross-engine-proof-gate"; overallReadiness: V1ProofReadiness; scenarioCount: number; scenarioProofReadyCount: number; scenarioReviewCount: number; scenarioBlockedCount: number; engineProofCount: number; engineProofReadyCount: number; engineProofReviewCount: number; engineProofBlockedCount: number; gateCount: number; passedGateCount: number; reviewGateCount: number; blockedGateCount: number; scenarioRows: V1ScenarioProofRow[]; engineProofRows: V1EngineProofRow[]; releaseGates: V1ReleaseGateRow[]; findings: V1Finding[]; proofBoundary: string[]; notes: string[]; }

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
  V1TraceabilityControl?: V1PlanningTraceabilityControlSummary;
  V1RequirementsMaterialization?: V1RequirementsMaterializationControlSummary;
  V1RequirementsClosure?: V1RequirementsClosureControlSummary;
  V1CidrAddressingTruth?: V1CidrAddressingTruthControlSummary;
  V1EnterpriseIpamTruth?: V1EnterpriseIpamTruthControlSummary;
  V1DesignCoreOrchestrator?: V1DesignCoreOrchestratorControlSummary;
  V1StandardsRulebookControl?: V1StandardsAlignmentRulebookControlSummary;
  V1ValidationReadiness?: V1ValidationReadinessControlSummary;
  V1NetworkObjectModel?: V1NetworkObjectModelControlSummary;
  V1DesignGraph?: V1DesignGraphControlSummary;
  V1RoutingSegmentation?: V1RoutingSegmentationControlSummary;
  V1SecurityPolicyFlow?: V1SecurityPolicyFlowControlSummary;
  V1ImplementationPlanning?: V1ImplementationPlanningControlSummary;
  V1ImplementationTemplates?: V1ImplementationTemplateControlSummary;
  V1ReportExportTruth?: V1ReportExportTruthControlSummary;
  V1DiagramTruth?: V1DiagramTruthControlSummary;
  V1PlatformBomFoundation?: V1PlatformBomFoundationControlSummary;
  V1DiscoveryCurrentState?: V1DiscoveryCurrentStateControlSummary;
  V1AiDraftHelper?: V1AiDraftHelperControlSummary;
  V1FinalProofPass?: V1FinalProofPassControlSummary;
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
