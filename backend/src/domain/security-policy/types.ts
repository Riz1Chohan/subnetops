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

export interface RoutingSegmentationModel {
  summary: { segmentationExpectationCount: number; missingPolicyCount: number; conflictingPolicyCount: number; segmentationReadiness: "ready" | "review" | "blocked"; [key: string]: unknown };
  segmentationExpectations: SegmentationFlowExpectation[];
  [key: string]: unknown;
}

export type V1SecurityPolicyReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1SecurityPolicyState = "REQUIRED" | "RECOMMENDED" | "BLOCKED" | "MISSING" | "OVERBROAD" | "SHADOWED" | "REVIEW_REQUIRED" | "NOT_APPLICABLE";

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
  V1PolicyState?: V1SecurityPolicyState;
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
  V1PolicyState?: V1SecurityPolicyState;
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
  V1PolicyState?: V1SecurityPolicyState;
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

export type SecurityPolicyNetworkObjectModel = {
  securityZones: SecurityZone[];
  policyRules: PolicyRule[];
  natRules: NatRule[];
};

export interface BuildSecurityPolicyFlowModelInput {
  networkObjectModel: SecurityPolicyNetworkObjectModel;
  routingSegmentation: RoutingSegmentationModel;
  requirementsJson?: string | null;
}
