import assert from "node:assert/strict";
import { buildDesignCoreSnapshot } from "../services/designCore.service.js";

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

const richMultiZoneFixture = {
  id: "project-V1-rich",
  name: "V1 Engine Matrix Rich Fixture",
  basePrivateRange: "10.80.0.0/16",
  requirementsJson: JSON.stringify({
    planningFor: "Multi-site network refresh",
    primaryGoal: "Validate backend-only authoritative design-core behavior",
    guestWifi: true,
    remoteAccess: true,
    internetEgress: true,
    segmentation: "Guest, management, internal, and DMZ must be separated",
    usersPerSite: 120,
  }),
  discoveryJson: JSON.stringify({
    topologyBaseline: "Existing HQ and branch estate",
    addressingVlanBaseline: "Configured VLAN subnets with a central edge",
    firewallBaseline: "Policy intent is reviewed but not vendor translated",
  }),
  platformProfileJson: JSON.stringify({
    routingPosture: "Hub-and-spoke WAN with summarized site blocks",
    firewallPosture: "Default deny between trust zones with explicit egress",
    wanPosture: "HQ security edge with branch transit",
  }),
  sites: [
    {
      id: "site-hq",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.80.0.0/22",
      vlans: [
        {
          id: "vlan-hq-users",
          vlanId: 10,
          vlanName: "HQ Users",
          purpose: "User access",
          department: "Corporate",
          notes: null,
          subnetCidr: "10.80.0.0/25",
          gatewayIp: "10.80.0.1",
          estimatedHosts: 120,
          dhcpEnabled: true,
        },
        {
          id: "vlan-hq-mgmt",
          vlanId: 99,
          vlanName: "Infrastructure Management",
          purpose: "Management",
          department: "Network",
          notes: "Admin and SNMP management",
          subnetCidr: "10.81.0.0/26",
          gatewayIp: "10.80.1.1",
          estimatedHosts: 40,
          dhcpEnabled: false,
        },
        {
          id: "vlan-hq-dmz",
          vlanId: 50,
          vlanName: "DMZ Web Services",
          purpose: "Server services",
          department: "Applications",
          notes: "dmz public web tier",
          subnetCidr: "10.80.2.0/27",
          gatewayIp: "10.80.2.1",
          estimatedHosts: 20,
          dhcpEnabled: false,
        },
        {
          id: "vlan-hq-guest",
          vlanId: 30,
          vlanName: "Guest Wireless",
          purpose: "Guest WiFi",
          department: "Facilities",
          notes: null,
          subnetCidr: "10.80.3.0/25",
          gatewayIp: "10.80.3.1",
          estimatedHosts: 90,
          dhcpEnabled: true,
        },
      ],
    },
    {
      id: "site-branch",
      name: "Branch",
      siteCode: "BR",
      defaultAddressBlock: "10.80.8.0/23",
      vlans: [
        {
          id: "vlan-br-users",
          vlanId: 10,
          vlanName: "Branch Users",
          purpose: "User access",
          department: "Branch",
          notes: null,
          subnetCidr: "10.80.8.0/26",
          gatewayIp: "10.80.8.1",
          estimatedHosts: 45,
          dhcpEnabled: true,
        },
        {
          id: "vlan-br-guest",
          vlanId: 30,
          vlanName: "Branch Guest",
          purpose: "Guest WiFi",
          department: "Branch",
          notes: null,
          subnetCidr: "10.80.8.64/26",
          gatewayIp: "10.80.8.65",
          estimatedHosts: 30,
          dhcpEnabled: true,
        },
      ],
    },
  ],
} as const;

const hostileFixture = {
  ...richMultiZoneFixture,
  id: "project-V1-hostile",
  name: "V1 Engine Matrix Hostile Fixture",
  basePrivateRange: "10.81.0.0/24",
  sites: [
    {
      id: "site-hq",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.81.0.0/25",
      vlans: [
        {
          id: "vlan-noncanonical",
          vlanId: 10,
          vlanName: "Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.81.0.9/27",
          gatewayIp: "10.81.0.1",
          estimatedHosts: 50,
          dhcpEnabled: true,
        },
        {
          id: "vlan-gateway-network",
          vlanId: 20,
          vlanName: "Management",
          purpose: "Management",
          department: null,
          notes: null,
          subnetCidr: "10.81.0.64/27",
          gatewayIp: "10.81.0.64",
          estimatedHosts: 10,
          dhcpEnabled: false,
        },
      ],
    },
    {
      id: "site-overlap",
      name: "Overlap Branch",
      siteCode: "OB",
      defaultAddressBlock: "10.81.0.64/26",
      vlans: [
        {
          id: "vlan-outside",
          vlanId: 30,
          vlanName: "Guest",
          purpose: "Guest WiFi",
          department: null,
          notes: null,
          subnetCidr: "10.81.1.0/27",
          gatewayIp: "10.81.1.1",
          estimatedHosts: 20,
          dhcpEnabled: true,
        },
      ],
    },
  ],
} as const;

function snapshotFor(fixture: typeof richMultiZoneFixture | typeof hostileFixture): Snapshot {
  const snapshot = buildDesignCoreSnapshot(fixture as never);
  assert(snapshot);
  return snapshot;
}

function issueCodes(snapshot: Snapshot) {
  return new Set(snapshot.issues.map((issue) => issue.code));
}

run("V1 confirms backend authority metadata and no frontend design fallback contract", () => {
  const snapshot = snapshotFor(richMultiZoneFixture);
  assert.equal(snapshot.authority.source, "backend-design-core");
  assert.equal(snapshot.authority.mode, "authoritative");
  assert.equal(snapshot.authority.requiresEngineerReview, true);
  assert.equal(snapshot.summary.siteCount, 2);
  assert.equal(snapshot.currentStateBoundary.liveMappingReady, true);
});

run("V1 verifies backend object model coverage across devices interfaces zones policies NAT DHCP and reservations", () => {
  const snapshot = snapshotFor(richMultiZoneFixture);
  const model = snapshot.networkObjectModel;
  assert.equal(model.summary.deviceCount >= snapshot.summary.siteCount, true);
  assert.equal(model.summary.interfaceCount >= snapshot.addressingRows.length, true);
  assert.equal(model.summary.securityZoneCount >= 4, true);
  assert.equal(model.summary.policyRuleCount >= 2, true);
  assert.equal(model.summary.natRuleCount >= 2, true);
  assert.equal(model.summary.dhcpPoolCount >= 2, true);
  assert.equal(model.summary.ipReservationCount >= snapshot.addressingRows.length, true);
  assert.equal(model.summary.designGraphNodeCount, model.designGraph.summary.nodeCount);
  assert.equal(model.summary.designGraphEdgeCount, model.designGraph.summary.edgeCount);
});

run("V1 verifies routing matrix produces connected default summary and branch reachability intent", () => {
  const snapshot = snapshotFor(richMultiZoneFixture);
  const routing = snapshot.networkObjectModel.routingSegmentation;
  const routeKinds = new Set(routing.routeIntents.map((route) => route.routeKind));
  assert.equal(routeKinds.has("connected"), true);
  assert.equal(routeKinds.has("default"), true);
  assert.equal(routeKinds.has("summary"), true);
  assert.equal(routeKinds.has("static"), true);
  assert.equal(routing.summary.routeIntentCount, routing.routeIntents.length);
  assert.equal(routing.routeTables.length >= 1, true);
  assert.equal(routing.routeTables.every((table) => table.routeIntents.length > 0), true);
});

run("V1 verifies security-flow matrix exposes zone-to-zone policy and NAT consequences", () => {
  const snapshot = snapshotFor(richMultiZoneFixture);
  const model = snapshot.networkObjectModel;
  const zoneRoles = new Set(model.securityZones.map((zone) => zone.zoneRole));
  assert.equal(zoneRoles.has("internal"), true);
  assert.equal(zoneRoles.has("guest"), true);
  assert.equal(zoneRoles.has("management"), true);
  assert.equal(zoneRoles.has("dmz"), true);
  assert.equal(zoneRoles.has("wan"), true);

  const policyIds = new Set(model.policyRules.map((rule) => rule.id));
  assert.equal(policyIds.has("policy-deny-guest-to-internal"), true);
  assert.equal(policyIds.has("policy-allow-guest-to-internet"), true);

  const security = model.securityPolicyFlow;
  assert.equal(security.summary.flowRequirementCount, security.flowRequirements.length);
  assert.equal(security.flowRequirements.some((flow) => flow.natRequired), true);
  assert.equal(security.serviceObjects.some((service) => service.name === "https"), true);
  assert.equal(security.findings.every((finding) => finding.remediation.length > 0), true);
});

run("V1 verifies implementation matrix stages steps verification rollback and blockers are backend generated", () => {
  const snapshot = snapshotFor(richMultiZoneFixture);
  const plan = snapshot.networkObjectModel.implementationPlan;
  const stageTypes = new Set(plan.stages.map((stage) => stage.stageType));
  assert.equal(stageTypes.has("preparation"), true);
  assert.equal(stageTypes.has("addressing-and-vlans"), true);
  assert.equal(stageTypes.has("routing"), true);
  assert.equal(stageTypes.has("security"), true);
  assert.equal(stageTypes.has("verification"), true);
  assert.equal(stageTypes.has("rollback"), true);
  assert.equal(plan.summary.stepCount, plan.steps.length);
  assert.equal(plan.summary.verificationCheckCount, plan.verificationChecks.length);
  assert.equal(plan.summary.rollbackActionCount, plan.rollbackActions.length);
  assert.equal(plan.steps.every((step) => step.sourceEvidence.length > 0 && step.expectedOutcome.length > 0), true);
});

run("V1 hostile matrix keeps defects blocked instead of silently converting them into usable design truth", () => {
  const snapshot = snapshotFor(hostileFixture);
  const codes = issueCodes(snapshot);
  assert.equal(codes.has("SUBNET_CANONICAL_FORM"), true);
  assert.equal(codes.has("SUBNET_UNDERSIZED"), true);
  assert.equal(codes.has("GATEWAY_UNUSABLE"), true);
  assert.equal(codes.has("SITE_BLOCK_OVERLAP"), true);
  assert.equal(codes.has("SUBNET_OUTSIDE_SITE_BLOCK"), true);
  assert.equal(snapshot.summary.readyForBackendAuthority, false);
  assert.equal(snapshot.networkObjectModel.implementationPlan.summary.implementationReadiness === "blocked" || snapshot.networkObjectModel.implementationPlan.summary.blockedStepCount > 0, true);
});

console.log("\nV1 backend engine authority matrix self-test complete.");
