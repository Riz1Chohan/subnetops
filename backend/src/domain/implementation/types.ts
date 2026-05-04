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

export type ImplementationSourceState = 'user_provided' | 'system_calculated' | 'system_verified' | 'requires_review' | 'not_available';

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

export interface DesignGraph {
  summary?: Record<string, unknown>;
  nodes: DesignGraphNode[];
  edges: DesignGraphEdge[];
  integrityFindings: DesignGraphIntegrityFinding[];
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

export interface RoutingSegmentationReachabilityFinding {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  routeDomainId?: string;
  affectedObjectIds: string[];
  remediation: string;
}

export interface RoutingSegmentationModel {
  summary?: Record<string, unknown>;
  routeIntents: RouteIntent[];
  reachabilityFindings: RoutingSegmentationReachabilityFinding[];
  [key: string]: unknown;
}

export type V1SecurityPolicyState = "REQUIRED" | "RECOMMENDED" | "BLOCKED" | "MISSING" | "OVERBROAD" | "SHADOWED" | "REVIEW_REQUIRED" | "NOT_APPLICABLE";

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
  V1PolicyState?: V1SecurityPolicyState;
  consequenceSummary?: string;
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
  V1PolicyState?: V1SecurityPolicyState;
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

export interface SecurityPolicyFlowModel {
  summary?: Record<string, unknown>;
  natReviews: SecurityNatReview[];
  flowRequirements: SecurityFlowRequirement[];
  findings: SecurityPolicyFinding[];
  [key: string]: unknown;
}

export interface ImplementationNetworkObjectModel {
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  securityZones: SecurityZone[];
  policyRules: PolicyRule[];
  natRules: NatRule[];
  dhcpPools: DhcpPool[];
  designGraph: DesignGraph;
  routingSegmentation: RoutingSegmentationModel;
  securityPolicyFlow: SecurityPolicyFlowModel;
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
