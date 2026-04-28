import assert from "node:assert/strict";
import { buildDesignCoreSnapshot } from "../services/designCore.service.js";
import { buildSecurityPolicyFlowModel } from "../services/designCore/designCore.securityPolicyFlow.js";

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

const richSecurityFixture = {
  id: "project-phase35-security-rich",
  name: "Phase 35 Security Rich Fixture",
  basePrivateRange: "10.95.0.0/16",
  requirementsJson: JSON.stringify({
    planningFor: "Security policy engine proof",
    primaryGoal: "Validate backend-only security policy matrix, rule ordering, NAT reviews, and logging evidence",
    guestWifi: true,
    remoteAccess: true,
    internetEgress: true,
    segmentation: "Guest, management, internal, DMZ, and WAN boundaries require explicit policy treatment",
  }),
  discoveryJson: JSON.stringify({
    firewallBaseline: "Brownfield policy cleanup required",
    topologyBaseline: "HQ firewall boundary with guest and DMZ zones",
  }),
  platformProfileJson: JSON.stringify({
    firewallPosture: "Default deny with explicit application allow rules",
    natPosture: "Interface overload for trusted egress; static publishing later",
  }),
  sites: [
    {
      id: "site-hq",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.95.0.0/22",
      vlans: [
        {
          id: "vlan-hq-users",
          vlanId: 10,
          vlanName: "HQ Users",
          purpose: "User access",
          department: "Corporate",
          notes: null,
          subnetCidr: "10.95.0.0/25",
          gatewayIp: "10.95.0.1",
          estimatedHosts: 100,
          dhcpEnabled: true,
        },
        {
          id: "vlan-hq-guest",
          vlanId: 30,
          vlanName: "Guest Wireless",
          purpose: "Guest WiFi",
          department: "Facilities",
          notes: null,
          subnetCidr: "10.95.1.0/25",
          gatewayIp: "10.95.1.1",
          estimatedHosts: 80,
          dhcpEnabled: true,
        },
        {
          id: "vlan-hq-dmz",
          vlanId: 50,
          vlanName: "DMZ Web",
          purpose: "DMZ web services",
          department: "Applications",
          notes: "dmz public web tier",
          subnetCidr: "10.95.2.0/27",
          gatewayIp: "10.95.2.1",
          estimatedHosts: 15,
          dhcpEnabled: false,
        },
        {
          id: "vlan-hq-mgmt",
          vlanId: 99,
          vlanName: "Network Management",
          purpose: "Management",
          department: "Network",
          notes: "ssh snmp https management",
          subnetCidr: "10.95.3.0/27",
          gatewayIp: "10.95.3.1",
          estimatedHosts: 20,
          dhcpEnabled: false,
        },
      ],
    },
  ],
} as const;

function snapshotFor(): Snapshot {
  const snapshot = buildDesignCoreSnapshot(richSecurityFixture as never);
  if (!snapshot) throw new Error("Phase 35 fixture did not produce a design-core snapshot.");
  return snapshot;
}

run("phase 35 builds a backend security policy matrix instead of frontend policy assumptions", () => {
  const snapshot = snapshotFor();
  const security = snapshot.networkObjectModel.securityPolicyFlow;
  assert.ok(security.policyMatrix.length >= snapshot.networkObjectModel.securityZones.length);
  assert.ok(security.summary.policyMatrixRowCount === security.policyMatrix.length);
  assert.ok(security.policyMatrix.every((row) => row.defaultPosture === "deny" || row.defaultPosture === "review" || row.defaultPosture === "allow"));
});

run("phase 35 detects implicit deny gaps for high-risk zone pairs", () => {
  const snapshot = snapshotFor();
  const security = snapshot.networkObjectModel.securityPolicyFlow;
  assert.ok(security.summary.implicitDenyGapCount >= 1);
  assert.ok(security.findings.some((finding) => finding.code === "SECURITY_IMPLICIT_DENY_NOT_MODELED"));
});

run("phase 35 detects rule order shadowing and broad allow risk", () => {
  const zoneGuest = {
    id: "zone-guest",
    name: "Guest",
    zoneRole: "guest",
    truthState: "proposed",
    siteIds: ["site-hq"],
    vlanIds: [30],
    subnetCidrs: ["10.95.1.0/25"],
    routeDomainId: "route-domain-corporate",
    isolationExpectation: "isolated",
    notes: [],
  } as const;
  const zoneInternal = {
    id: "zone-internal",
    name: "Internal",
    zoneRole: "internal",
    truthState: "proposed",
    siteIds: ["site-hq"],
    vlanIds: [10],
    subnetCidrs: ["10.95.0.0/25"],
    routeDomainId: "route-domain-corporate",
    isolationExpectation: "restricted",
    notes: [],
  } as const;
  const security = buildSecurityPolicyFlowModel({
    networkObjectModel: {
      securityZones: [zoneGuest, zoneInternal] as never,
      policyRules: [
        {
          id: "policy-allow-guest-any",
          name: "Bad Guest Any",
          sourceZoneId: "zone-guest",
          destinationZoneId: "zone-internal",
          action: "allow",
          services: ["any"],
          truthState: "proposed",
          rationale: "hostile test",
          notes: [],
        },
        {
          id: "policy-deny-guest-ssh",
          name: "Late Guest SSH Deny",
          sourceZoneId: "zone-guest",
          destinationZoneId: "zone-internal",
          action: "deny",
          services: ["ssh"],
          truthState: "proposed",
          rationale: "hostile test",
          notes: [],
        },
      ] as never,
      natRules: [],
    },
    routingSegmentation: { segmentationExpectations: [] } as never,
  });

  assert.ok(security.ruleOrderReviews.some((review) => review.ruleId === "policy-deny-guest-ssh" && review.shadowedByRuleIds.includes("policy-allow-guest-any")));
  assert.ok(security.findings.some((finding) => finding.code === "SECURITY_RULE_SHADOWED_BY_EARLIER_RULE"));
  assert.ok(security.findings.some((finding) => finding.code === "SECURITY_BROAD_PERMIT_TO_TRUSTED_ZONE"));
});

run("phase 35 reviews NAT coverage for NAT-required egress flows", () => {
  const snapshot = snapshotFor();
  const security = snapshot.networkObjectModel.securityPolicyFlow;
  assert.ok(security.natReviews.length >= 1);
  assert.ok(security.summary.natReviewCount === security.natReviews.length);
  assert.ok(security.flowRequirements.some((flow) => flow.natRequired));
  assert.ok(security.natReviews.some((review) => review.coveredFlowRequirementIds.length > 0 || review.state === "review"));
});


run("phase 35 treats required NAT as ready when zones translation and flow coverage are valid", () => {
  const zoneInternal = {
    id: "zone-internal",
    name: "Internal",
    zoneRole: "internal",
    truthState: "proposed",
    siteIds: ["site-hq"],
    vlanIds: [10],
    subnetCidrs: ["10.95.0.0/25"],
    routeDomainId: "route-domain-corporate",
    isolationExpectation: "restricted",
    notes: [],
  } as const;
  const zoneWan = {
    id: "zone-wan",
    name: "WAN",
    zoneRole: "wan",
    truthState: "proposed",
    siteIds: ["site-hq"],
    vlanIds: [],
    subnetCidrs: [],
    routeDomainId: "route-domain-corporate",
    isolationExpectation: "review",
    notes: [],
  } as const;
  const security = buildSecurityPolicyFlowModel({
    networkObjectModel: {
      securityZones: [zoneInternal, zoneWan] as never,
      policyRules: [
        {
          id: "policy-allow-internal-egress",
          name: "Internal Internet Egress",
          sourceZoneId: "zone-internal",
          destinationZoneId: "zone-wan",
          action: "allow",
          services: ["dns", "http", "https"],
          truthState: "proposed",
          rationale: "hostile NAT readiness regression test",
          notes: [],
        },
      ] as never,
      natRules: [
        {
          id: "nat-internal-egress-ready",
          name: "Internal Interface Overload NAT",
          sourceZoneId: "zone-internal",
          destinationZoneId: "zone-wan",
          sourceSubnetCidrs: ["10.95.0.0/25"],
          translatedAddressMode: "interface-overload",
          truthState: "proposed",
          status: "required",
          notes: [],
        },
      ] as never,
    },
    routingSegmentation: { segmentationExpectations: [] } as never,
  });

  const natReview = security.natReviews.find((review) => review.natRuleId === "nat-internal-egress-ready");
  assert.equal(natReview?.state, "ready");
  assert.ok(natReview?.coveredFlowRequirementIds.includes("security-flow-internal-to-wide-area-network-egress"));
  assert.equal(security.findings.some((finding) => finding.code === "SECURITY_NAT_REVIEW_BLOCKED" && finding.affectedObjectIds.includes("nat-internal-egress-ready")), false);
});

run("phase 35 does not let allow-only rules satisfy default-deny boundaries", () => {
  const zoneGuest = {
    id: "zone-guest",
    name: "Guest",
    zoneRole: "guest",
    truthState: "proposed",
    siteIds: ["site-hq"],
    vlanIds: [30],
    subnetCidrs: ["10.95.1.0/25"],
    routeDomainId: "route-domain-corporate",
    isolationExpectation: "isolated",
    notes: [],
  } as const;
  const zoneInternal = {
    id: "zone-internal",
    name: "Internal",
    zoneRole: "internal",
    truthState: "proposed",
    siteIds: ["site-hq"],
    vlanIds: [10],
    subnetCidrs: ["10.95.0.0/25"],
    routeDomainId: "route-domain-corporate",
    isolationExpectation: "restricted",
    notes: [],
  } as const;
  const security = buildSecurityPolicyFlowModel({
    networkObjectModel: {
      securityZones: [zoneGuest, zoneInternal] as never,
      policyRules: [
        {
          id: "policy-allow-guest-ssh-without-deny",
          name: "Bad Guest SSH Allow Without Deny",
          sourceZoneId: "zone-guest",
          destinationZoneId: "zone-internal",
          action: "allow",
          services: ["ssh"],
          truthState: "proposed",
          rationale: "hostile implicit deny regression test",
          notes: [],
        },
      ] as never,
      natRules: [],
    },
    routingSegmentation: { segmentationExpectations: [] } as never,
  });

  assert.ok(security.findings.some((finding) => finding.code === "SECURITY_IMPLICIT_DENY_NOT_MODELED" && finding.affectedObjectIds.includes("policy-allow-guest-ssh-without-deny")));
  assert.ok(security.findings.some((finding) => finding.code === "SECURITY_DEFAULT_DENY_WEAKENED_BY_ALLOW" && finding.affectedObjectIds.includes("policy-allow-guest-ssh-without-deny")));
});

run("phase 35 exposes service groups logging requirements and observed first-match rule evidence", () => {
  const snapshot = snapshotFor();
  const security = snapshot.networkObjectModel.securityPolicyFlow;
  assert.ok(security.serviceGroups.length >= 1);
  assert.ok(security.serviceObjects.every((service) => Array.isArray(service.serviceGroupIds)));
  assert.ok(security.flowRequirements.some((flow) => flow.loggingRequired));
  assert.ok(security.flowRequirements.some((flow) => flow.observedPolicyRuleId || flow.matchedPolicyRuleIds.length === 0));
});

run("phase 35 keeps security outputs vendor-neutral without command generation", () => {
  const snapshot = snapshotFor();
  const security = snapshot.networkObjectModel.securityPolicyFlow;
  const allNotes = [
    ...security.summary.notes,
    ...security.serviceObjects.flatMap((service) => service.notes),
    ...security.ruleOrderReviews.flatMap((review) => review.notes),
    ...security.natReviews.flatMap((review) => review.notes),
  ].join("\n").toLowerCase();

  assert.ok(allNotes.includes("vendor-neutral"));
  assert.equal(allNotes.includes("set security policies"), false);
  assert.equal(allNotes.includes("access-list"), false);
});
