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
  linkType?: string;
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

export type RoutingNetworkObjectModel = {
  routeDomains: RouteDomain[];
  securityZones: SecurityZone[];
  devices: Array<{ id: string; name: string; siteId: string; deviceRole: "core-layer3-switch" | "branch-edge-router" | "security-firewall" | "routing-identity" | "unknown" }>;
  interfaces: NetworkInterface[];
  links: NetworkLink[];
  policyRules: PolicyRule[];
};

export type RoutingProject = {
  sites: Array<{ id: string; name: string; siteCode?: string | null }>;
};

export interface BuildRoutingSegmentationModelInput {
  project: RoutingProject;
  networkObjectModel: RoutingNetworkObjectModel;
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
}
