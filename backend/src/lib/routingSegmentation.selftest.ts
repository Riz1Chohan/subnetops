import assert from "node:assert/strict";
import { buildV1RoutingSegmentationControl } from "../services/designCore/designCore.routingSegmentationControl.js";
import type { NetworkObjectModel, V1DesignGraphControlSummary } from "../services/designCore.types.js";

const routingSegmentation = {
  summary: { routeIntentCount: 4, routeTableCount: 1, connectedRouteCount: 2, defaultRouteCount: 1, staticRouteCount: 1, summaryRouteCount: 0, missingRouteCount: 0, segmentationExpectationCount: 1, satisfiedSegmentationExpectationCount: 1, missingPolicyCount: 0, conflictingPolicyCount: 0, reachabilityFindingCount: 0, blockingFindingCount: 0, routeEntryCount: 4, routeConflictCount: 0, siteReachabilityCheckCount: 1, missingForwardPathCount: 0, missingReturnPathCount: 0, nextHopReviewCount: 0, routingReadiness: "ready", segmentationReadiness: "ready", notes: [] },
  routeTables: [{ routeDomainId: "rd-default", routeDomainName: "Default", connectedRouteCount: 2, defaultRouteCount: 1, staticRouteCount: 1, summaryRouteCount: 0, missingRouteCount: 0, routeEntryCount: 4, conflictCount: 0, reachabilityCheckCount: 1, routeIntents: [], routeEntries: [], conflictReviews: [], reachabilityChecks: [], notes: [] }],
  routeIntents: [
    { id: "route-hq-connected", name: "HQ connected", routeDomainId: "rd-default", routeDomainName: "Default", siteId: "site-hq", routeKind: "connected", destinationCidr: "10.10.0.0/24", nextHopType: "connected-interface", nextHopObjectId: "if-hq", administrativeState: "present", truthState: "proposed", routePurpose: "connected", evidence: ["HQ interface owns subnet"], notes: [] },
    { id: "route-branch-connected", name: "Branch connected", routeDomainId: "rd-default", routeDomainName: "Default", siteId: "site-branch", routeKind: "connected", destinationCidr: "10.20.0.0/24", nextHopType: "connected-interface", nextHopObjectId: "if-branch", administrativeState: "present", truthState: "proposed", routePurpose: "connected", evidence: ["Branch interface owns subnet"], notes: [] },
    { id: "route-hq-to-branch", name: "HQ to Branch", routeDomainId: "rd-default", routeDomainName: "Default", siteId: "site-hq", routeKind: "static", destinationCidr: "10.20.0.0/24", nextHopType: "transit-link", nextHopObjectId: "link-wan", administrativeState: "proposed", truthState: "proposed", routePurpose: "inter-site", evidence: ["WAN link exists"], notes: [] },
    { id: "route-hq-default", name: "HQ default", routeDomainId: "rd-default", routeDomainName: "Default", siteId: "site-hq", routeKind: "default", destinationCidr: "0.0.0.0/0", nextHopType: "security-boundary", nextHopObjectId: "fw-hq", administrativeState: "proposed", truthState: "proposed", routePurpose: "egress", evidence: ["Firewall edge exists"], notes: [] },
  ],
  routeEntries: [],
  routeConflictReviews: [],
  siteReachabilityChecks: [{ id: "reach-hq-branch", routeDomainId: "rd-default", routeDomainName: "Default", sourceSiteId: "site-hq", sourceSiteName: "HQ", destinationSiteId: "site-branch", destinationSiteName: "Branch", destinationSummaryCidr: "10.20.0.0/24", forwardState: "reachable", returnState: "reachable", overallState: "satisfied", forwardRouteIntentIds: ["route-hq-to-branch"], returnRouteIntentIds: ["route-hq-connected"], notes: [] }],
  segmentationExpectations: [{ id: "guest-deny", name: "Guest must not reach corporate internal networks", sourceZoneId: "zone-guest", sourceZoneName: "Guest", destinationZoneId: "zone-internal", destinationZoneName: "Internal", expectedAction: "deny", observedPolicyAction: "deny", services: ["any"], state: "satisfied", severityIfMissing: "ERROR", rationale: "guest isolation", notes: [] }],
  reachabilityFindings: [],
};
const networkObjectModel = {
  summary: {},
  routeDomains: [{ id: "rd-default", name: "Default", scope: "project", truthState: "proposed", siteIds: ["site-hq", "site-branch"], subnetCidrs: ["10.10.0.0/24", "10.20.0.0/24"], interfaceIds: ["if-hq", "if-branch"], linkIds: ["link-wan"], defaultRouteState: "required", summarizationState: "ready", notes: [] }],
  securityZones: [{ id: "zone-guest", name: "Guest", zoneRole: "guest", truthState: "proposed", siteIds: ["site-hq"], vlanIds: [30], subnetCidrs: ["10.10.30.0/24"], routeDomainId: "rd-default", isolationExpectation: "isolated", notes: [] }, { id: "zone-internal", name: "Internal", zoneRole: "internal", truthState: "proposed", siteIds: ["site-hq"], vlanIds: [10], subnetCidrs: ["10.10.10.0/24"], routeDomainId: "rd-default", isolationExpectation: "restricted", notes: [] }],
  devices: [{ id: "fw-hq", name: "HQ Firewall", siteId: "site-hq", siteName: "HQ", deviceRole: "security-firewall", truthState: "proposed", routeDomainIds: ["rd-default"], securityZoneIds: [], interfaceIds: [], notes: [] }],
  interfaces: [], links: [{ id: "link-wan", name: "WAN", linkRole: "site-wan-transit", truthState: "proposed", status: "planned", siteIds: ["site-hq", "site-branch"], notes: [] }], policyRules: [], natRules: [], dhcpPools: [], ipReservations: [],
  designGraph: { summary: {}, nodes: [], edges: [], integrityFindings: [] }, routingSegmentation, securityPolicyFlow: { summary: {}, serviceObjects: [], serviceGroups: [], flowRequirements: [], policyMatrix: [], natReviews: [], loggingReviews: [], shadowingReviews: [], findings: [] }, implementationPlan: { summary: {}, stages: [], steps: [], dependencyGraph: { nodes: [], edges: [], findings: [] }, verificationChecks: [], rollbackActions: [], findings: [] }, integrityNotes: [],
} as unknown as NetworkObjectModel;
const V1 = { objectCoverage: [{ objectId: "rd-default", objectType: "route-domain", dependencyState: "CONNECTED" }] } as unknown as V1DesignGraphControlSummary;
const result = buildV1RoutingSegmentationControl({ project: { sites: [{ id: "site-hq", name: "HQ" }, { id: "site-branch", name: "Branch" }], requirementsJson: { siteCount: 2, dualIsp: true, cloudConnected: true, guestWifi: true, guestPolicy: "internet-only isolated guest access" } }, networkObjectModel, V1DesignGraph: V1 });
assert.equal(result.contract, "V1_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT");
assert.equal(result.role, "ROUTING_INTENT_REVIEW_NOT_PACKET_SIMULATION");
assert.ok(result.protocolIntents.some((row) => row.category === "bgp" && row.controlState === "ROUTING_SIMULATION_UNAVAILABLE"));
assert.ok(result.protocolIntents.some((row) => row.category === "cloud-route-table" && row.readinessImpact === "REVIEW_REQUIRED"));
assert.ok(result.requirementRoutingMatrix.some((row) => row.requirementKey === "dualIsp" && row.active));
assert.ok(result.findings.some((finding) => finding.code === "V1_ROUTING_SIMULATION_UNAVAILABLE"));
console.log("[V1] Routing segmentation protocol-aware planning selftest passed");
