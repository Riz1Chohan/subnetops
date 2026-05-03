import assert from "node:assert/strict";
import { buildDesignCoreSnapshot } from "../services/designCore.service.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

function issueCodes(snapshot: ReturnType<typeof buildDesignCoreSnapshot>) {
  return new Set((snapshot?.issues ?? []).map((issue) => issue.code));
}

function sortedIssueCodes(snapshot: ReturnType<typeof buildDesignCoreSnapshot>) {
  return Array.from(issueCodes(snapshot)).sort();
}

const cleanProjectFixture = {
  id: "project-clean",
  name: "Clean Deterministic Project",
  basePrivateRange: "10.40.0.0/20",
  requirementsJson: JSON.stringify({
    planningFor: "Multi-site refresh",
    primaryGoal: "Create deterministic addressing and standards review",
    guestWifi: true,
    remoteAccess: true,
    usersPerSite: 80,
  }),
  discoveryJson: JSON.stringify({
    topologyBaseline: "Brownfield branch network",
    addressingVlanBaseline: "Configured site blocks with VLAN-level subnets",
  }),
  platformProfileJson: JSON.stringify({
    routingPosture: "OSPF with site summaries",
    firewallPosture: "Default deny between trust zones",
    wanPosture: "Hub-and-spoke WAN",
  }),
  sites: [
    {
      id: "site-hq",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.40.0.0/22",
      vlans: [
        {
          id: "vlan-hq-users",
          vlanId: 10,
          vlanName: "Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.40.0.0/25",
          gatewayIp: "10.40.0.1",
          estimatedHosts: 80,
          dhcpEnabled: true,
        },
        {
          id: "vlan-hq-servers",
          vlanId: 20,
          vlanName: "Servers",
          purpose: "Server services",
          department: null,
          notes: null,
          subnetCidr: "10.41.0.0/26",
          gatewayIp: "10.40.1.1",
          estimatedHosts: 30,
          dhcpEnabled: false,
        },
      ],
    },
    {
      id: "site-branch",
      name: "Branch",
      siteCode: "BR",
      defaultAddressBlock: "10.40.4.0/23",
      vlans: [
        {
          id: "vlan-br-users",
          vlanId: 10,
          vlanName: "Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.40.4.0/26",
          gatewayIp: "10.40.4.1",
          estimatedHosts: 40,
          dhcpEnabled: true,
        },
      ],
    },
  ],
} as const;

const dirtyProjectFixture = {
  ...cleanProjectFixture,
  id: "project-dirty",
  name: "Dirty Behavioral Matrix Project",
  sites: [
    {
      id: "site-hq",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.50.0.0/24",
      vlans: [
        {
          id: "vlan-noncanonical",
          vlanId: 10,
          vlanName: "Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.50.0.9/26",
          gatewayIp: "10.50.0.1",
          estimatedHosts: 40,
          dhcpEnabled: true,
        },
        {
          id: "vlan-undersized",
          vlanId: 20,
          vlanName: "Servers",
          purpose: "Server services",
          department: null,
          notes: null,
          subnetCidr: "10.50.0.64/28",
          gatewayIp: "10.50.0.65",
          estimatedHosts: 30,
          dhcpEnabled: false,
        },
        {
          id: "vlan-bad-gateway",
          vlanId: 30,
          vlanName: "Management",
          purpose: "Management",
          department: null,
          notes: null,
          subnetCidr: "10.50.0.128/27",
          gatewayIp: "10.50.0.128",
          estimatedHosts: 10,
          dhcpEnabled: false,
        },
      ],
    },
    {
      id: "site-overlap",
      name: "Overlap Branch",
      siteCode: "OB",
      defaultAddressBlock: "10.50.0.128/25",
      vlans: [
        {
          id: "vlan-outside-site",
          vlanId: 40,
          vlanName: "Guest",
          purpose: "Guest WiFi",
          department: null,
          notes: null,
          subnetCidr: "10.51.0.0/27",
          gatewayIp: "10.50.1.1",
          estimatedHosts: 20,
          dhcpEnabled: true,
        },
      ],
    },
  ],
} as const;

const missingSiteBlockFixture = {
  ...cleanProjectFixture,
  id: "project-proposals",
  name: "Proposal Behavioral Matrix Project",
  basePrivateRange: "10.60.0.0/20",
  sites: [
    {
      id: "site-alpha",
      name: "Alpha",
      siteCode: "AL",
      defaultAddressBlock: null,
      vlans: [
        {
          id: "vlan-alpha-users",
          vlanId: 10,
          vlanName: "Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.60.0.0/26",
          gatewayIp: "10.60.0.1",
          estimatedHosts: 40,
          dhcpEnabled: true,
        },
      ],
    },
    {
      id: "site-beta",
      name: "Beta",
      siteCode: "BE",
      defaultAddressBlock: null,
      vlans: [
        {
          id: "vlan-beta-users",
          vlanId: 10,
          vlanName: "Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.61.0.0/26",
          gatewayIp: "10.60.1.1",
          estimatedHosts: 40,
          dhcpEnabled: true,
        },
      ],
    },
  ],
} as const;

run("backend design-core snapshot stays deterministic for stable engineering outputs", () => {
  const first = buildDesignCoreSnapshot(cleanProjectFixture as never);
  const second = buildDesignCoreSnapshot(cleanProjectFixture as never);

  assert(first && second);
  assert.deepEqual(first.addressingRows.map((row) => row.canonicalSubnetCidr), second.addressingRows.map((row) => row.canonicalSubnetCidr));
  assert.deepEqual(first.allocatorDeterminism.evaluationOrder, second.allocatorDeterminism.evaluationOrder);
  assert.deepEqual(sortedIssueCodes(first), sortedIssueCodes(second));
});

run("backend design-core detects noncanonical, undersized, unusable gateway, overlap, and outside-site defects", () => {
  const snapshot = buildDesignCoreSnapshot(dirtyProjectFixture as never);
  assert(snapshot);
  const codes = issueCodes(snapshot);

  assert.equal(codes.has("SUBNET_CANONICAL_FORM"), true);
  assert.equal(codes.has("SUBNET_UNDERSIZED"), true);
  assert.equal(codes.has("GATEWAY_UNUSABLE"), true);
  assert.equal(codes.has("SITE_BLOCK_OVERLAP"), true);
  assert.equal(codes.has("SUBNET_OUTSIDE_SITE_BLOCK"), true);
  assert.equal(snapshot.summary.readyForBackendAuthority, false);
});

run("backend design-core proposes distinct site blocks when saved site blocks are missing", () => {
  const snapshot = buildDesignCoreSnapshot(missingSiteBlockFixture as never);
  assert(snapshot);

  const proposed = snapshot.siteBlocks.map((site) => site.proposedCidr).filter((cidr): cidr is string => Boolean(cidr));
  assert.equal(proposed.length, 2);
  assert.equal(new Set(proposed).size, proposed.length);
  assert.equal(snapshot.summary.proposedSiteBlockCount >= 2, true);
  assert.equal(snapshot.currentStateBoundary.proposedStateReady, true);
});

run("backend design-core keeps proposals explicitly separate from configured truth", () => {
  const snapshot = buildDesignCoreSnapshot(missingSiteBlockFixture as never);
  assert(snapshot);

  const configuredRows = snapshot.addressingRows.filter((row) => row.truthState === "configured");
  assert.equal(configuredRows.length, 2);
  assert.equal(snapshot.truthStateLedger.configuredCount >= configuredRows.length, true);
  assert.equal(snapshot.truthStateLedger.proposedCount >= snapshot.summary.proposedSiteBlockCount, true);
  assert.equal(snapshot.currentStateBoundary.liveMappingReady, true);
});

console.log("\nBehavioral matrix self-test complete.");
