import { materializeRequirementsForProject } from "./requirementsMaterialization.service.js";
import { buildDesignCoreSnapshot } from "./designCore.service.js";

type RequirementMap = Record<string, string | number | boolean>;

type GoldenScenario = {
  id: string;
  name: string;
  requirements: RequirementMap;
  expectedSitesAtLeast: number;
  expectedVlansAtLeast: number;
  expectedSegmentNames: string[];
  expectedSecurityFlowsAtLeast: number;
  expectedRouteIntentsAtLeast: number;
  expectedScenarioSignalsAtLeast: number;
  expectedScenarioPassesAtLeast: number;
};

type InMemorySite = {
  id: string;
  projectId: string;
  name: string;
  location?: string | null;
  siteCode?: string | null;
  notes?: string | null;
  defaultAddressBlock?: string | null;
  createdAt: Date;
  updatedAt: Date;
  vlans: InMemoryVlan[];
};

type InMemoryVlan = {
  id: string;
  siteId: string;
  vlanId: number;
  vlanName: string;
  purpose?: string | null;
  segmentRole?: string | null;
  subnetCidr: string;
  gatewayIp: string;
  dhcpEnabled: boolean;
  estimatedHosts?: number | null;
  department?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stableDate() {
  return new Date("2026-04-29T00:00:00.000Z");
}

function withDefaults(requirements: RequirementMap): RequirementMap {
  return {
    planningFor: "business network planning",
    projectPhase: "new network build",
    environmentType: "hybrid",
    complianceProfile: "general business controls",
    siteCount: 1,
    usersPerSite: 25,
    internetModel: "internet at each site",
    serverPlacement: "mixed local and centralized services",
    primaryGoal: "security and segmentation",
    guestWifi: false,
    voice: false,
    management: true,
    printers: false,
    iot: false,
    cameras: false,
    wireless: true,
    remoteAccess: false,
    dualIsp: false,
    cloudConnected: false,
    guestPolicy: "not required",
    voiceQos: "not applicable",
    managementAccess: "admin workstations only",
    wirelessModel: "staff SSID only",
    remoteAccessMethod: "not required",
    cloudProvider: "not selected",
    cloudConnectivity: "not required",
    resilienceTarget: "single ISP acceptable",
    securityPosture: "segmented business network",
    trustBoundaryModel: "users, management, services, guest/shared-device separation as selected",
    adminBoundary: "privileged admin access only",
    identityModel: "centralized identity",
    cloudIdentityBoundary: "not applicable",
    cloudTrafficBoundary: "not applicable",
    cloudHostingModel: "not applicable",
    cloudNetworkModel: "not applicable",
    cloudRoutingModel: "not applicable",
    addressHierarchyModel: "hierarchical per-site private addressing",
    siteBlockStrategy: "site /16 parent blocks",
    gatewayConvention: "first usable address as default gateway",
    growthBufferModel: "30 percent growth buffer",
    reservedRangePolicy: "reserve infrastructure and gateway ranges",
    managementIpPolicy: "dedicated management addresses",
    siteIdentityCapture: "generated placeholder site identities",
    namingStandard: "site-role-number naming standard",
    deviceNamingConvention: "SITE-ROLE-NN",
    namingTokenPreference: "short site codes",
    namingHierarchy: "site then role then sequence",
    customNamingPattern: "SITE-ROLE-NN",
    monitoringModel: "basic monitoring",
    loggingModel: "centralized logs",
    backupPolicy: "configuration backup required",
    operationsOwnerModel: "internal IT operations",
    siteLayoutModel: "single building office",
    physicalScope: "logical planning only",
    printerCount: 0,
    phoneCount: 0,
    apCount: 2,
    cameraCount: 0,
    serverCount: 2,
    iotDeviceCount: 0,
    wiredWirelessMix: "mixed wired and wireless users",
    siteRoleModel: "head office plus branches when multi-site",
    buildingCount: 1,
    floorCount: 1,
    closetModel: "one network closet per site",
    edgeFootprint: "firewall/router edge per site",
    applicationProfile: "SaaS and internal applications",
    criticalServicesModel: "DNS, DHCP, identity, monitoring",
    interSiteTrafficModel: "limited inter-site traffic",
    bandwidthProfile: "standard business bandwidth",
    latencySensitivity: "normal",
    qosModel: "best effort unless voice selected",
    outageTolerance: "business-hours recovery acceptable",
    growthHorizon: "three year growth horizon",
    budgetModel: "balanced cost and reliability",
    vendorPreference: "vendor-neutral",
    implementationTimeline: "phased implementation",
    rolloutModel: "site-by-site rollout",
    downtimeConstraint: "maintenance window required",
    teamCapability: "small internal IT team",
    outputPackage: "design report, addressing plan, and diagram",
    primaryAudience: "network engineer and project stakeholders",
    customRequirementsNotes: "Generated by Phase 75 golden scenario selftest.",
    ...requirements,
  };
}

function createInMemoryTx(project: { id: string; name: string; basePrivateRange: string; requirementsJson: string }) {
  const sites: InMemorySite[] = [];
  const vlans: InMemoryVlan[] = [];
  const changeLogs: Array<{ projectId: string; actorLabel?: string; message: string }> = [];
  let siteCounter = 1;
  let vlanCounter = 1;

  const syncSiteVlans = (site: InMemorySite) => ({
    ...site,
    vlans: vlans.filter((vlan) => vlan.siteId === site.id).sort((left, right) => left.vlanId - right.vlanId),
  });

  const tx = {
    project: {
      async findUnique() {
        return project;
      },
    },
    site: {
      async findMany() {
        return sites.map(syncSiteVlans).sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
      },
      async create(args: any) {
        const now = stableDate();
        const created: InMemorySite = {
          id: `site-${siteCounter++}`,
          projectId: args.data.projectId,
          name: args.data.name,
          location: args.data.location ?? null,
          siteCode: args.data.siteCode ?? null,
          notes: args.data.notes ?? null,
          defaultAddressBlock: args.data.defaultAddressBlock ?? null,
          createdAt: now,
          updatedAt: now,
          vlans: [],
        };
        sites.push(created);
        return syncSiteVlans(created);
      },
      async update(args: any) {
        const site = sites.find((item) => item.id === args.where.id);
        assert(site, `Missing site ${args.where.id}`);
        Object.assign(site, args.data, { updatedAt: stableDate() });
        return syncSiteVlans(site);
      },
    },
    vlan: {
      async findMany(args: any) {
        return vlans.filter((vlan) => vlan.siteId === args.where.siteId).sort((left, right) => left.vlanId - right.vlanId);
      },
      async create(args: any) {
        const now = stableDate();
        const created: InMemoryVlan = {
          id: `vlan-${vlanCounter++}`,
          siteId: args.data.siteId,
          vlanId: args.data.vlanId,
          vlanName: args.data.vlanName,
          purpose: args.data.purpose ?? null,
          segmentRole: args.data.segmentRole ?? null,
          subnetCidr: args.data.subnetCidr,
          gatewayIp: args.data.gatewayIp,
          dhcpEnabled: Boolean(args.data.dhcpEnabled),
          estimatedHosts: args.data.estimatedHosts ?? null,
          department: args.data.department ?? null,
          notes: args.data.notes ?? null,
          createdAt: now,
          updatedAt: now,
        };
        vlans.push(created);
        return created;
      },
      async update(args: any) {
        const vlan = vlans.find((item) => item.id === args.where.id);
        assert(vlan, `Missing VLAN ${args.where.id}`);
        Object.assign(vlan, args.data, { updatedAt: stableDate() });
        return vlan;
      },
    },
    changeLog: {
      async create(args: any) {
        changeLogs.push(args.data);
        return { id: `change-${changeLogs.length}`, ...args.data };
      },
    },
  };

  return {
    tx,
    toDesignProject() {
      return {
        id: project.id,
        userId: "user-golden-selftest",
        organizationId: null,
        name: project.name,
        description: "Phase 75 golden scenario runtime selftest project.",
        organizationName: "Golden Scenario Test Org",
        environmentType: "hybrid",
        basePrivateRange: project.basePrivateRange,
        logoUrl: null,
        reportHeader: null,
        reportFooter: null,
        approvalStatus: "DRAFT",
        reviewerNotes: null,
        requirementsJson: project.requirementsJson,
        discoveryJson: null,
        platformProfileJson: null,
        createdAt: stableDate(),
        updatedAt: stableDate(),
        sites: sites.map(syncSiteVlans),
        routeDomains: [],
        ipPools: [],
        ipAllocations: [],
        dhcpScopes: [],
        ipReservations: [],
        brownfieldImports: [],
        brownfieldNetworks: [],
        allocationApprovals: [],
        allocationLedger: [],
      };
    },
    get sites() {
      return sites.map(syncSiteVlans);
    },
    get vlans() {
      return [...vlans];
    },
  };
}

const scenarios: GoldenScenario[] = [
  {
    id: "single-site-small-office",
    name: "single-site small office",
    requirements: withDefaults({
      siteCount: 1,
      usersPerSite: 20,
      planningFor: "single-site office network planning",
      environmentType: "on-premises",
      guestWifi: false,
      wireless: true,
      management: true,
      serverPlacement: "small local services closet",
      apCount: 2,
      serverCount: 2,
    }),
    expectedSitesAtLeast: 1,
    expectedVlansAtLeast: 5,
    expectedSegmentNames: ["USERS", "STAFF-WIFI", "MANAGEMENT", "SERVICES", "OPERATIONS"],
    expectedSecurityFlowsAtLeast: 1,
    expectedRouteIntentsAtLeast: 0,
    expectedScenarioSignalsAtLeast: 4,
    expectedScenarioPassesAtLeast: 2,
  },
  {
    id: "ten-site-multi-site-business",
    name: "10-site multi-site business",
    requirements: withDefaults({
      planningFor: "multi-site business network planning",
      projectPhase: "new network build",
      environmentType: "hybrid",
      complianceProfile: "healthcare-oriented",
      siteCount: 10,
      usersPerSite: 50,
      internetModel: "internet at each site with reviewed WAN/cloud reachability",
      serverPlacement: "mixed local and centralized services",
      primaryGoal: "security and segmentation",
      guestWifi: true,
      voice: false,
      management: true,
      printers: true,
      iot: false,
      cameras: true,
      wireless: true,
      remoteAccess: true,
      dualIsp: false,
      cloudConnected: true,
      guestPolicy: "internet-only isolated guest access",
      managementAccess: "management reachable only from trusted admin networks",
      wirelessModel: "staff and guest SSIDs mapped to separate trust domains",
      remoteAccessMethod: "SSL VPN or modern remote access gateway",
      cloudProvider: "Microsoft Azure",
      cloudConnectivity: "site-to-cloud VPN",
      cloudIdentityBoundary: "central identity with cloud boundary review",
      cloudTrafficBoundary: "inspect traffic between internal and cloud edge",
      cloudHostingModel: "hybrid application hosting",
      cloudNetworkModel: "hub-and-spoke cloud network",
      cloudRoutingModel: "static or dynamic routing review between sites and cloud",
      securityPosture: "segmented healthcare-oriented network",
      trustBoundaryModel: "guest, management, remote access, services, specialty devices, users",
      printerCount: 8,
      cameraCount: 12,
      apCount: 6,
      serverCount: 8,
      wiredWirelessMix: "mixed wired and wireless users",
      interSiteTrafficModel: "branch-to-HQ and site-to-cloud traffic",
      monitoringModel: "centralized NMS monitoring",
      loggingModel: "centralized security and infrastructure logs",
      backupPolicy: "configuration and critical service backup required",
    }),
    expectedSitesAtLeast: 10,
    expectedVlansAtLeast: 100,
    expectedSegmentNames: ["USERS", "SERVICES", "GUEST", "STAFF-WIFI", "PRINTERS", "CAMERAS", "MANAGEMENT", "REMOTE-ACCESS", "CLOUD-EDGE", "WAN-TRANSIT", "OPERATIONS"],
    expectedSecurityFlowsAtLeast: 6,
    expectedRouteIntentsAtLeast: 1,
    expectedScenarioSignalsAtLeast: 9,
    expectedScenarioPassesAtLeast: 4,
  },
  {
    id: "security-segmentation-heavy",
    name: "security/segmentation-heavy design",
    requirements: withDefaults({
      siteCount: 3,
      usersPerSite: 80,
      primaryGoal: "security and segmentation",
      securityPosture: "zero-trust leaning segmented posture",
      trustBoundaryModel: "default deny between unlike trust boundaries",
      guestWifi: true,
      management: true,
      remoteAccess: true,
      printers: true,
      iot: true,
      cameras: true,
      wireless: true,
      printerCount: 10,
      iotDeviceCount: 30,
      cameraCount: 20,
      managementAccess: "jump-host/admin subnet only",
      guestPolicy: "internet-only no internal access",
    }),
    expectedSitesAtLeast: 3,
    expectedVlansAtLeast: 27,
    expectedSegmentNames: ["USERS", "GUEST", "MANAGEMENT", "REMOTE-ACCESS", "PRINTERS", "IOT", "CAMERAS"],
    expectedSecurityFlowsAtLeast: 7,
    expectedRouteIntentsAtLeast: 1,
    expectedScenarioSignalsAtLeast: 8,
    expectedScenarioPassesAtLeast: 4,
  },
  {
    id: "guest-wireless",
    name: "guest and wireless design",
    requirements: withDefaults({
      siteCount: 2,
      usersPerSite: 60,
      guestWifi: true,
      wireless: true,
      wirelessModel: "separate staff and guest SSIDs",
      guestPolicy: "guest internet-only with no internal access",
      apCount: 8,
      wiredWirelessMix: "mostly wireless with wired infrastructure",
    }),
    expectedSitesAtLeast: 2,
    expectedVlansAtLeast: 12,
    expectedSegmentNames: ["USERS", "GUEST", "STAFF-WIFI", "MANAGEMENT"],
    expectedSecurityFlowsAtLeast: 3,
    expectedRouteIntentsAtLeast: 1,
    expectedScenarioSignalsAtLeast: 5,
    expectedScenarioPassesAtLeast: 3,
  },
  {
    id: "remote-cloud-hybrid",
    name: "remote access plus cloud/hybrid design",
    requirements: withDefaults({
      siteCount: 4,
      usersPerSite: 45,
      environmentType: "hybrid",
      cloudConnected: true,
      remoteAccess: true,
      cloudProvider: "Microsoft Azure",
      cloudConnectivity: "site-to-cloud VPN",
      cloudNetworkModel: "hub and spoke cloud VNet",
      cloudRoutingModel: "reviewed internal-to-cloud routing",
      cloudTrafficBoundary: "cloud edge inspection boundary",
      remoteAccessMethod: "SSL VPN",
      identityModel: "cloud synchronized identity with MFA",
      interSiteTrafficModel: "HQ, branches, remote users, and cloud apps",
    }),
    expectedSitesAtLeast: 4,
    expectedVlansAtLeast: 28,
    expectedSegmentNames: ["USERS", "MANAGEMENT", "REMOTE-ACCESS", "CLOUD-EDGE", "WAN-TRANSIT"],
    expectedSecurityFlowsAtLeast: 4,
    expectedRouteIntentsAtLeast: 1,
    expectedScenarioSignalsAtLeast: 7,
    expectedScenarioPassesAtLeast: 3,
  },
  {
    id: "voice-printer-iot-camera",
    name: "voice/printer/IoT/camera-heavy design",
    requirements: withDefaults({
      siteCount: 2,
      usersPerSite: 75,
      voice: true,
      printers: true,
      iot: true,
      cameras: true,
      phoneCount: 70,
      printerCount: 20,
      iotDeviceCount: 40,
      cameraCount: 25,
      voiceQos: "QoS and call-control review required",
      qosModel: "voice priority queuing and DSCP preservation",
      latencySensitivity: "high for voice",
      trustBoundaryModel: "shared devices isolated from users by default",
    }),
    expectedSitesAtLeast: 2,
    expectedVlansAtLeast: 18,
    expectedSegmentNames: ["USERS", "VOICE", "PRINTERS", "IOT", "CAMERAS", "MANAGEMENT"],
    expectedSecurityFlowsAtLeast: 4,
    expectedRouteIntentsAtLeast: 1,
    expectedScenarioSignalsAtLeast: 6,
    expectedScenarioPassesAtLeast: 3,
  },
  {
    id: "dual-isp-resilience",
    name: "dual ISP and resilience design",
    requirements: withDefaults({
      siteCount: 3,
      usersPerSite: 50,
      dualIsp: true,
      resilienceTarget: "dual ISP with failover review",
      outageTolerance: "minimal outage tolerated for core sites",
      internetModel: "dual ISP at core sites with branch fallback review",
      interSiteTrafficModel: "branch-to-HQ and branch-to-cloud",
      bandwidthProfile: "high bandwidth at HQ and medium branches",
    }),
    expectedSitesAtLeast: 3,
    expectedVlansAtLeast: 18,
    expectedSegmentNames: ["USERS", "MANAGEMENT", "WAN-TRANSIT"],
    expectedSecurityFlowsAtLeast: 2,
    expectedRouteIntentsAtLeast: 1,
    expectedScenarioSignalsAtLeast: 5,
    expectedScenarioPassesAtLeast: 2,
  },
  {
    id: "brownfield-existing-upgrade",
    name: "brownfield/existing upgrade scenario",
    requirements: withDefaults({
      planningFor: "existing network upgrade planning",
      projectPhase: "brownfield upgrade",
      siteCount: 2,
      usersPerSite: 40,
      environmentType: "hybrid",
      cloudConnected: true,
      management: true,
      remoteAccess: true,
      guestWifi: true,
      primaryGoal: "modernize existing network while preserving security boundaries",
      customRequirementsNotes: "Existing subnets and live device inventory still need import before implementation.",
      rolloutModel: "phased migration by site",
      downtimeConstraint: "low downtime migration windows",
    }),
    expectedSitesAtLeast: 2,
    expectedVlansAtLeast: 14,
    expectedSegmentNames: ["USERS", "GUEST", "MANAGEMENT", "REMOTE-ACCESS", "CLOUD-EDGE"],
    expectedSecurityFlowsAtLeast: 4,
    expectedRouteIntentsAtLeast: 1,
    expectedScenarioSignalsAtLeast: 7,
    expectedScenarioPassesAtLeast: 3,
  },
];

async function runScenario(scenario: GoldenScenario) {
  const project = {
    id: `project-${scenario.id}`,
    name: scenario.name,
    basePrivateRange: "10.60.0.0/12",
    requirementsJson: JSON.stringify(scenario.requirements),
  };
  const db = createInMemoryTx(project);
  const summary = await materializeRequirementsForProject(db.tx as any, project.id, "phase75-golden-scenario-selftest");
  assert(summary, `${scenario.id}: materializer returned no summary`);
  assert(summary.consumedFields.length >= 20, `${scenario.id}: consumed too few requirement fields (${summary.consumedFields.length})`);
  assert(summary.impactInventoryCount >= 83, `${scenario.id}: impact inventory did not cover all 83 fields`);
  assert(db.sites.length >= scenario.expectedSitesAtLeast, `${scenario.id}: expected at least ${scenario.expectedSitesAtLeast} site(s), got ${db.sites.length}`);
  assert(db.vlans.length >= scenario.expectedVlansAtLeast, `${scenario.id}: expected at least ${scenario.expectedVlansAtLeast} VLAN(s), got ${db.vlans.length}`);

  const vlanNames = new Set(db.vlans.map((vlan) => vlan.vlanName));
  for (const expectedName of scenario.expectedSegmentNames) {
    assert(vlanNames.has(expectedName), `${scenario.id}: missing expected segment ${expectedName}`);
  }

  const missingCidr = db.vlans.find((vlan) => !vlan.subnetCidr || !vlan.gatewayIp);
  assert(!missingCidr, `${scenario.id}: VLAN ${missingCidr?.vlanName} is missing CIDR/gateway output`);

  const snapshot = buildDesignCoreSnapshot(db.toDesignProject() as any);
  assert(snapshot, `${scenario.id}: design-core snapshot was not produced`);
  assert(snapshot.summary.siteCount >= scenario.expectedSitesAtLeast, `${scenario.id}: snapshot site count was too low`);
  assert(snapshot.summary.vlanCount >= scenario.expectedVlansAtLeast, `${scenario.id}: snapshot VLAN/addressing count was too low`);
  assert(snapshot.addressingRows.length >= scenario.expectedVlansAtLeast, `${scenario.id}: addressing rows did not follow materialized VLANs`);
  assert(snapshot.networkObjectModel.summary.deviceCount > 0, `${scenario.id}: design-core created no topology devices`);
  assert(snapshot.networkObjectModel.summary.interfaceCount > 0, `${scenario.id}: design-core created no gateway interfaces`);
  assert(snapshot.networkObjectModel.summary.linkCount > 0, `${scenario.id}: design-core created no links`);
  assert(snapshot.networkObjectModel.securityPolicyFlow.summary.flowRequirementCount >= scenario.expectedSecurityFlowsAtLeast, `${scenario.id}: security-flow count too low`);
  assert(snapshot.networkObjectModel.routingSegmentation.summary.routeIntentCount >= scenario.expectedRouteIntentsAtLeast, `${scenario.id}: route-intent count too low`);
  assert(snapshot.requirementsScenarioProof.expectedSignalCount >= scenario.expectedScenarioSignalsAtLeast, `${scenario.id}: scenario proof signal count too low`);
  assert(snapshot.requirementsScenarioProof.passedSignalCount >= scenario.expectedScenarioPassesAtLeast, `${scenario.id}: scenario proof passed ${snapshot.requirementsScenarioProof.passedSignalCount}/${snapshot.requirementsScenarioProof.expectedSignalCount}, expected at least ${scenario.expectedScenarioPassesAtLeast}`);
  assert(snapshot.requirementsScenarioProof.passedSignalCount > 0, `${scenario.id}: scenario proof regressed to 0 passed signals`);
  assert(snapshot.phase3RequirementsClosure.contractVersion === "PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF", `${scenario.id}: Phase 3 closure contract missing`);
  assert(snapshot.phase3RequirementsClosure.activeRequirementCount > 0, `${scenario.id}: Phase 3 closure found no active requirements`);
  assert(snapshot.phase3RequirementsClosure.closureMatrix.length >= snapshot.phase2RequirementsMaterialization.totalPolicyCount, `${scenario.id}: Phase 3 closure matrix did not cover Phase 2 policy rows`);
  assert(snapshot.phase3RequirementsClosure.goldenScenarioClosures.some((item) => item.relevant), `${scenario.id}: Phase 3 did not mark any golden scenario relevant`);

  return {
    id: scenario.id,
    sites: db.sites.length,
    vlans: db.vlans.length,
    addressRows: snapshot.addressingRows.length,
    devices: snapshot.networkObjectModel.summary.deviceCount,
    links: snapshot.networkObjectModel.summary.linkCount,
    securityFlows: snapshot.networkObjectModel.securityPolicyFlow.summary.flowRequirementCount,
    routeIntents: snapshot.networkObjectModel.routingSegmentation.summary.routeIntentCount,
    scenarioProof: `${snapshot.requirementsScenarioProof.passedSignalCount}/${snapshot.requirementsScenarioProof.expectedSignalCount}`,
    scenarioStatus: snapshot.requirementsScenarioProof.status,
    phase3Closure: `${snapshot.phase3RequirementsClosure.fullPropagatedCount}/${snapshot.phase3RequirementsClosure.activeRequirementCount}`,
    phase3Blocked: snapshot.phase3RequirementsClosure.blockedCount,
  };
}

async function main() {
  const results = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(scenario));
  }

  console.log("Phase 75 requirements golden scenario runtime selftest passed.");
  console.table(results);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
