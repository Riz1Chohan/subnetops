import assert from "node:assert/strict";
import { buildDesignCoreSnapshot } from "../services/designCore.service.js";
import { buildRoutingSegmentationModel } from "../services/designCore/designCore.routingSegmentation.js";

type Snapshot = NonNullable<ReturnType<typeof buildDesignCoreSnapshot>>;

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

const multiSiteFixture = {
  id: "project-phase34-routing-rich",
  name: "Phase 34 Routing Rich Fixture",
  basePrivateRange: "10.90.0.0/16",
  requirementsJson: JSON.stringify({
    planningFor: "Multi-site backend routing proof",
    primaryGoal: "Validate neutral route tables, next-hop checks, and bidirectional reachability",
    guestWifi: true,
    internetEgress: true,
  }),
  discoveryJson: JSON.stringify({ topologyBaseline: "HQ and Branch", routingBaseline: "Summarized site blocks" }),
  platformProfileJson: JSON.stringify({ routingPosture: "Hub-and-spoke WAN" }),
  sites: [
    {
      id: "site-hq",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.90.0.0/22",
      vlans: [
        {
          id: "vlan-hq-users",
          vlanId: 10,
          vlanName: "HQ Users",
          purpose: "User access",
          department: "Corporate",
          notes: null,
          subnetCidr: "10.90.0.0/25",
          gatewayIp: "10.90.0.1",
          estimatedHosts: 100,
          dhcpEnabled: true,
        },
        {
          id: "vlan-hq-mgmt",
          vlanId: 99,
          vlanName: "Infrastructure Management",
          purpose: "Management",
          department: "Network",
          notes: null,
          subnetCidr: "10.90.1.0/26",
          gatewayIp: "10.90.1.1",
          estimatedHosts: 20,
          dhcpEnabled: false,
        },
      ],
    },
    {
      id: "site-branch",
      name: "Branch",
      siteCode: "BR",
      defaultAddressBlock: "10.90.8.0/23",
      vlans: [
        {
          id: "vlan-br-users",
          vlanId: 10,
          vlanName: "Branch Users",
          purpose: "User access",
          department: "Branch",
          notes: null,
          subnetCidr: "10.90.8.0/26",
          gatewayIp: "10.90.8.1",
          estimatedHosts: 40,
          dhcpEnabled: true,
        },
      ],
    },
  ],
} as const;

const noTransitFixture = {
  ...multiSiteFixture,
  id: "project-phase34-no-transit",
  name: "Phase 34 No Transit Fixture",
  basePrivateRange: null,
  sites: [
    {
      id: "site-hq",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.91.0.0/24",
      vlans: [
        {
          id: "vlan-hq-users",
          vlanId: 10,
          vlanName: "HQ Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.91.0.0/26",
          gatewayIp: "10.91.0.1",
          estimatedHosts: 30,
          dhcpEnabled: true,
        },
      ],
    },
    {
      id: "site-branch",
      name: "Branch",
      siteCode: "BR",
      defaultAddressBlock: "10.91.1.0/24",
      vlans: [
        {
          id: "vlan-br-users",
          vlanId: 10,
          vlanName: "Branch Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.91.1.0/26",
          gatewayIp: "10.91.1.1",
          estimatedHosts: 30,
          dhcpEnabled: true,
        },
      ],
    },
  ],
} as const;

function snapshotFor(fixture: typeof multiSiteFixture | typeof noTransitFixture): Snapshot {
  const snapshot = buildDesignCoreSnapshot(fixture as never);
  assert(snapshot);
  return snapshot;
}

run("phase 34 generates backend route table entries with neutral administrative distance and longest-prefix metadata", () => {
  const snapshot = snapshotFor(multiSiteFixture);
  const routing = snapshot.networkObjectModel.routingSegmentation;
  assert.equal(routing.summary.routeEntryCount, routing.routeEntries.length);
  assert.equal(routing.routeEntries.length, routing.routeIntents.length);
  assert.equal(routing.routeTables.every((table) => table.routeEntryCount === table.routeEntries.length), true);
  assert.equal(routing.routeEntries.some((entry) => entry.administrativeDistance === 0 && entry.pathScope === "local"), true);
  assert.equal(routing.routeEntries.some((entry) => entry.routeKind === "static" && entry.pathScope === "inter-site"), true);
  assert.equal(routing.routeEntries.every((entry) => typeof entry.destinationPrefix === "number"), true);
});

run("phase 34 validates static and default route next-hop objects against backend network objects", () => {
  const snapshot = snapshotFor(multiSiteFixture);
  const routing = snapshot.networkObjectModel.routingSegmentation;
  const nextHopCodes = new Set(routing.routeConflictReviews.map((review) => review.code));
  assert.equal(nextHopCodes.has("ROUTING_NEXT_HOP_OBJECT_MISSING"), false);
  assert.equal(routing.summary.nextHopReviewCount, 0);
  assert.equal(routing.routeIntents.some((route) => route.routeKind === "static" && route.nextHopType === "transit-link" && Boolean(route.nextHopObjectId)), true);
});

run("phase 34 builds a bidirectional site-to-site reachability matrix", () => {
  const snapshot = snapshotFor(multiSiteFixture);
  const routing = snapshot.networkObjectModel.routingSegmentation;
  assert.equal(routing.summary.siteReachabilityCheckCount, routing.siteReachabilityChecks.length);
  assert.equal(routing.siteReachabilityChecks.length >= 2, true);
  assert.equal(routing.siteReachabilityChecks.some((check) => check.sourceSiteId === "site-hq" && check.destinationSiteId === "site-branch" && check.overallState === "satisfied"), true);
  assert.equal(routing.siteReachabilityChecks.every((check) => check.forwardRouteIntentIds.length > 0 && check.returnRouteIntentIds.length > 0), true);
});

run("phase 34 detects route duplicates overlaps and missing next-hop objects in direct backend routing model input", () => {
  const routing = buildRoutingSegmentationModel({
    project: {
      sites: [
        { id: "site-hq", name: "HQ", siteCode: "HQ" },
        { id: "site-branch", name: "Branch", siteCode: "BR" },
      ],
    },
    networkObjectModel: {
      routeDomains: [
        {
          id: "route-domain-corporate",
          name: "Corporate Routing Domain",
          scope: "project",
          truthState: "inferred",
          siteIds: ["site-hq", "site-branch"],
          subnetCidrs: ["10.92.0.0/24", "10.92.1.0/24"],
          interfaceIds: ["interface-hq-users", "interface-br-users"],
          linkIds: [],
          defaultRouteState: "required",
          summarizationState: "review",
          notes: [],
        },
      ],
      securityZones: [
        { id: "security-zone-internal", name: "Internal", zoneRole: "internal", truthState: "inferred", siteIds: ["site-hq", "site-branch"], vlanIds: [10], subnetCidrs: ["10.92.0.0/24", "10.92.1.0/24"], routeDomainId: "route-domain-corporate", isolationExpectation: "restricted", notes: [] },
        { id: "security-zone-wide-area-network", name: "WAN", zoneRole: "wan", truthState: "proposed", siteIds: [], vlanIds: [], subnetCidrs: [], routeDomainId: "route-domain-corporate", isolationExpectation: "review", notes: [] },
      ],
      devices: [
        { id: "device-site-hq-layer3-gateway", name: "HQ Layer-3 Gateway", siteId: "site-hq", deviceRole: "core-layer3-switch" },
        { id: "device-site-branch-layer3-gateway", name: "Branch Layer-3 Gateway", siteId: "site-branch", deviceRole: "branch-edge-router" },
        { id: "device-firewall", name: "Security Boundary", siteId: "site-hq", deviceRole: "security-firewall" },
      ],
      interfaces: [
        { id: "interface-hq-users", name: "Vlan10", deviceId: "device-site-hq-layer3-gateway", siteId: "site-hq", interfaceRole: "vlan-gateway", truthState: "configured", subnetCidr: "10.92.0.0/24", routeDomainId: "route-domain-corporate", notes: [] },
        { id: "interface-br-users", name: "Vlan10", deviceId: "device-site-branch-layer3-gateway", siteId: "site-branch", interfaceRole: "vlan-gateway", truthState: "configured", subnetCidr: "10.92.1.0/24", routeDomainId: "route-domain-corporate", notes: [] },
      ],
      links: [],
      policyRules: [],
    },
    siteSummaries: [
      { siteId: "site-hq", siteName: "HQ", siteCode: "HQ", currentSiteBlock: "10.92.0.0/24", minimumRequiredSummary: "10.92.0.0/24", status: "good", coveredSubnetCount: 1, notes: [] },
      { siteId: "site-branch", siteName: "Branch", siteCode: "BR", currentSiteBlock: "10.92.1.0/24", minimumRequiredSummary: "10.92.1.0/24", status: "good", coveredSubnetCount: 1, notes: [] },
      { siteId: "site-branch", siteName: "Branch", siteCode: "BR", currentSiteBlock: "10.92.1.0/24", minimumRequiredSummary: "10.92.1.0/24", status: "good", coveredSubnetCount: 1, notes: ["Intentional duplicate for matrix proof."] },
    ],
    transitPlan: [{ kind: "proposed", siteId: "site-branch", siteName: "Branch", siteCode: "BR", subnetCidr: "10.92.255.0/31", gatewayOrEndpoint: "10.92.255.0", notes: [] }],
  });
  const reviewCodes = new Set(routing.routeConflictReviews.map((review) => review.code));
  assert.equal(reviewCodes.has("ROUTING_NEXT_HOP_OBJECT_MISSING"), true);
  assert.equal(reviewCodes.has("ROUTING_DUPLICATE_DESTINATION_INTENT"), true);
  assert.equal(routing.routeConflictReviews.some((review) => review.code === "ROUTING_OVERLAPPING_DESTINATION_REVIEW"), true);
});

run("phase 34 blocks multi-site reachability claims when transit and return paths are not modeled", () => {
  const snapshot = snapshotFor(noTransitFixture);
  const routing = snapshot.networkObjectModel.routingSegmentation;
  const findingCodes = new Set(routing.reachabilityFindings.map((finding) => finding.code));
  assert.equal(findingCodes.has("ROUTING_BRANCH_WITHOUT_TRANSIT_PATH"), true);
  assert.equal(findingCodes.has("ROUTING_SITE_TO_SITE_FORWARD_PATH_MISSING") || findingCodes.has("ROUTING_SITE_TO_SITE_RETURN_PATH_MISSING"), true);
  assert.equal(routing.summary.routingReadiness, "blocked");
  assert.equal(routing.summary.missingForwardPathCount + routing.summary.missingReturnPathCount > 0, true);
});

console.log("\nPhase 34 backend routing engine self-test complete.");
