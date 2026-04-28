import type { SegmentRole } from "../../lib/cidr.js";
import { buildBackendDesignGraph } from "./designCore.graph.js";
import { buildRoutingSegmentationModel } from "./designCore.routingSegmentation.js";
import { buildSecurityPolicyFlowModel } from "./designCore.securityPolicyFlow.js";
import { buildImplementationPlanModel } from "./designCore.implementationPlan.js";
import type {
  DesignCoreAddressRow,
  DhcpPool,
  IpReservation,
  NatRule,
  NetworkDevice,
  NetworkInterface,
  NetworkLink,
  NetworkObjectModel,
  NetworkObjectTruthState,
  PolicyRule,
  RouteDomain,
  SecurityZone,
  SiteSummarizationReview,
  TransitPlanRow,
  LoopbackPlanRow,
} from "../designCore.types.js";

type NetworkObjectProject = {
  id: string;
  name: string;
  sites: Array<{
    id: string;
    name: string;
    siteCode?: string | null;
    defaultAddressBlock?: string | null;
  }>;
};

type SecurityZoneRole = SecurityZone["zoneRole"];

const CORPORATE_ROUTE_DOMAIN_ID = "route-domain-corporate";
const WIDE_AREA_NETWORK_ZONE_ID = "security-zone-wide-area-network";

function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unnamed";
}

function siteDisplayCode(site: NetworkObjectProject["sites"][number]) {
  return site.siteCode?.trim() || normalizeIdentifierSegment(site.name).toUpperCase();
}

function siteGatewayDeviceId(siteId: string) {
  return `device-${siteId}-layer3-gateway`;
}

function securityBoundaryDeviceId(projectId: string) {
  return `device-${projectId}-security-boundary-firewall`;
}

function gatewayInterfaceId(addressRowId: string, vlanId: number) {
  return `interface-${addressRowId}-vlan-${vlanId}-gateway`;
}

function vlanGatewayLinkId(addressRowId: string, vlanId: number) {
  return `link-${addressRowId}-vlan-${vlanId}-gateway-binding`;
}

function securityZoneIdForRole(zoneRole: SecurityZoneRole) {
  return `security-zone-${zoneRole}`;
}

function securityZoneNameForRole(zoneRole: SecurityZoneRole) {
  switch (zoneRole) {
    case "guest":
      return "Guest Access";
    case "management":
      return "Management Plane";
    case "dmz":
      return "DMZ Services";
    case "voice":
      return "Voice Services";
    case "iot":
      return "IoT and Operational Technology";
    case "transit":
      return "WAN Transit";
    case "wan":
      return "Wide Area Network";
    case "internal":
      return "Corporate Internal";
    case "unknown":
    default:
      return "Unclassified Network";
  }
}

function isolationExpectationForRole(zoneRole: SecurityZoneRole): SecurityZone["isolationExpectation"] {
  switch (zoneRole) {
    case "guest":
    case "management":
    case "dmz":
    case "iot":
      return "isolated";
    case "voice":
    case "transit":
      return "restricted";
    case "wan":
      return "review";
    case "internal":
      return "restricted";
    case "unknown":
    default:
      return "review";
  }
}

function zoneRoleFromAddressRow(addressRow: DesignCoreAddressRow): SecurityZoneRole {
  const descriptiveText = `${addressRow.vlanName} ${addressRow.notes.join(" ")}`.toLowerCase();

  if (addressRow.role === "GUEST") return "guest";
  if (addressRow.role === "MANAGEMENT") return "management";
  if (addressRow.role === "VOICE") return "voice";
  if (addressRow.role === "IOT" || addressRow.role === "CAMERA") return "iot";
  if (addressRow.role === "WAN_TRANSIT") return "transit";
  if (addressRow.role === "SERVER" && descriptiveText.includes("dmz")) return "dmz";
  if (addressRow.role === "LOOPBACK") return "transit";
  if (addressRow.role === "OTHER") return "unknown";
  return "internal";
}

function interfaceRoleFromSegmentRole(segmentRole: SegmentRole): NetworkInterface["interfaceRole"] {
  if (segmentRole === "WAN_TRANSIT") return "wan-transit";
  if (segmentRole === "LOOPBACK") return "loopback";
  return "vlan-gateway";
}

function addUnique<T>(values: T[], value: T) {
  if (!values.includes(value)) values.push(value);
}

function countObjectsByTruthState(objects: Array<{ truthState: NetworkObjectTruthState }>, truthState: NetworkObjectTruthState) {
  return objects.filter((object) => object.truthState === truthState).length;
}

function chooseHubSite(project: NetworkObjectProject) {
  const siteWithHeadquartersName = project.sites.find((site) => {
    const text = `${site.name} ${site.siteCode ?? ""}`.toLowerCase();
    return text.includes("hq") || text.includes("headquarter") || text.includes("head office");
  });

  return siteWithHeadquartersName ?? project.sites[0] ?? null;
}

function createInitialRouteDomain(project: NetworkObjectProject, siteSummaries: SiteSummarizationReview[]): RouteDomain {
  const blockedSummaryCount = siteSummaries.filter((summary) => summary.status === "missing").length;
  const reviewSummaryCount = siteSummaries.filter((summary) => summary.status === "review").length;
  const summarizationState: RouteDomain["summarizationState"] = blockedSummaryCount > 0
    ? "blocked"
    : reviewSummaryCount > 0
      ? "review"
      : "ready";

  return {
    id: CORPORATE_ROUTE_DOMAIN_ID,
    name: "Corporate Routing Domain",
    scope: "project",
    truthState: "inferred",
    siteIds: project.sites.map((site) => site.id),
    subnetCidrs: [],
    interfaceIds: [],
    linkIds: [],
    defaultRouteState: project.sites.length > 1 ? "required" : "review",
    summarizationState,
    notes: [
      "Phase 27 models a single corporate route domain from the current project data so VLAN gateways, transit links, and summaries have an explicit routing owner.",
      "Future phases can split this into VRFs or separate route domains when the product has first-class user input for routing isolation.",
    ],
  };
}

function createSiteGatewayDevice(
  site: NetworkObjectProject["sites"][number],
  projectSiteCount: number,
): NetworkDevice {
  const displayCode = siteDisplayCode(site);
  const isHeadquarters = `${site.name} ${site.siteCode ?? ""}`.toLowerCase().includes("hq");
  const deviceRole: NetworkDevice["deviceRole"] = projectSiteCount === 1 || isHeadquarters ? "core-layer3-switch" : "branch-edge-router";

  return {
    id: siteGatewayDeviceId(site.id),
    name: `${displayCode} Layer-3 Gateway`,
    siteId: site.id,
    siteName: site.name,
    siteCode: site.siteCode,
    deviceRole,
    truthState: "inferred",
    routeDomainIds: [CORPORATE_ROUTE_DOMAIN_ID],
    securityZoneIds: [],
    interfaceIds: [],
    notes: [
      "Inferred from VLAN gateway ownership. Confirm whether this is a router, firewall interface, or layer-3 switch before implementation.",
    ],
  };
}

function ensureSecurityZone(
  securityZonesById: Map<string, SecurityZone>,
  zoneRole: SecurityZoneRole,
  initialNote?: string,
) {
  const zoneId = zoneRole === "wan" ? WIDE_AREA_NETWORK_ZONE_ID : securityZoneIdForRole(zoneRole);
  const existingZone = securityZonesById.get(zoneId);

  if (existingZone) return existingZone;

  const createdZone: SecurityZone = {
    id: zoneId,
    name: securityZoneNameForRole(zoneRole),
    zoneRole,
    truthState: zoneRole === "wan" ? "proposed" : "inferred",
    siteIds: [],
    vlanIds: [],
    subnetCidrs: [],
    routeDomainId: CORPORATE_ROUTE_DOMAIN_ID,
    isolationExpectation: isolationExpectationForRole(zoneRole),
    notes: [
      initialNote ?? "Inferred from VLAN purpose, segment role, and subnet planning metadata.",
    ],
  };

  securityZonesById.set(zoneId, createdZone);
  return createdZone;
}

function createSecurityBoundaryDevice(project: NetworkObjectProject): NetworkDevice | null {
  const hubSite = chooseHubSite(project);
  if (!hubSite) return null;

  return {
    id: securityBoundaryDeviceId(project.id),
    name: `${siteDisplayCode(hubSite)} Security Boundary Firewall`,
    siteId: hubSite.id,
    siteName: hubSite.name,
    siteCode: hubSite.siteCode,
    deviceRole: "security-firewall",
    truthState: "proposed",
    routeDomainIds: [CORPORATE_ROUTE_DOMAIN_ID],
    securityZoneIds: [WIDE_AREA_NETWORK_ZONE_ID],
    interfaceIds: [],
    notes: [
      "Proposed enforcement point for inter-zone policy and internet NAT intent. This is a design object, not a discovered physical firewall.",
    ],
  };
}

function buildPolicyRules(securityZones: SecurityZone[]): PolicyRule[] {
  const policyRules: PolicyRule[] = [];
  const zoneIds = new Set(securityZones.map((zone) => zone.id));
  const internalZoneId = securityZoneIdForRole("internal");
  const guestZoneId = securityZoneIdForRole("guest");
  const managementZoneId = securityZoneIdForRole("management");
  const dmzZoneId = securityZoneIdForRole("dmz");

  if (zoneIds.has(guestZoneId) && zoneIds.has(internalZoneId)) {
    policyRules.push({
      id: "policy-deny-guest-to-internal",
      name: "Deny Guest Access to Corporate Internal Networks",
      sourceZoneId: guestZoneId,
      destinationZoneId: internalZoneId,
      action: "deny",
      services: ["any"],
      truthState: "proposed",
      rationale: "Guest networks should not reach trusted user, server, or management networks.",
      notes: ["Phase 27 records the intended policy relationship; rule ordering and firewall vendor syntax remain future implementation work."],
    });
  }

  if (zoneIds.has(guestZoneId) && zoneIds.has(WIDE_AREA_NETWORK_ZONE_ID)) {
    policyRules.push({
      id: "policy-allow-guest-to-internet",
      name: "Allow Guest Internet Access",
      sourceZoneId: guestZoneId,
      destinationZoneId: WIDE_AREA_NETWORK_ZONE_ID,
      action: "allow",
      services: ["dns", "http", "https"],
      truthState: "proposed",
      rationale: "Guest networks normally require internet-only access through NAT.",
      notes: ["Confirm content filtering, DNS enforcement, and captive portal requirements before implementation."],
    });
  }

  if (zoneIds.has(managementZoneId)) {
    policyRules.push({
      id: "policy-allow-management-to-network-devices",
      name: "Allow Management Plane to Network Devices",
      sourceZoneId: managementZoneId,
      destinationZoneId: managementZoneId,
      action: "allow",
      services: ["ssh", "https", "snmp", "icmp"],
      truthState: "proposed",
      rationale: "Management networks need controlled access to device administration services.",
      notes: ["Restrict source hosts and add logging before treating this as implementable firewall policy."],
    });
  }

  if (zoneIds.has(dmzZoneId) && zoneIds.has(internalZoneId)) {
    policyRules.push({
      id: "policy-review-dmz-to-internal",
      name: "Review DMZ to Internal Access",
      sourceZoneId: dmzZoneId,
      destinationZoneId: internalZoneId,
      action: "review",
      services: ["application-specific"],
      truthState: "proposed",
      rationale: "DMZ systems should not have broad access into internal networks.",
      notes: ["Replace this review rule with explicit application flows in the security policy engine phase."],
    });
  }

  return policyRules;
}

function buildNatRules(securityZones: SecurityZone[]): NatRule[] {
  const zoneIds = new Set(securityZones.map((zone) => zone.id));
  if (!zoneIds.has(WIDE_AREA_NETWORK_ZONE_ID)) return [];

  return securityZones
    .filter((zone) => zone.id !== WIDE_AREA_NETWORK_ZONE_ID && zone.subnetCidrs.length > 0)
    .filter((zone) => ["internal", "guest", "management", "voice", "iot"].includes(zone.zoneRole))
    .map<NatRule>((zone) => ({
      id: `nat-${normalizeIdentifierSegment(zone.name)}-to-wide-area-network`,
      name: `${zone.name} Internet NAT Review`,
      sourceZoneId: zone.id,
      destinationZoneId: WIDE_AREA_NETWORK_ZONE_ID,
      sourceSubnetCidrs: [...zone.subnetCidrs],
      translatedAddressMode: "interface-overload",
      truthState: "proposed",
      status: "review",
      notes: [
        "NAT intent is modeled so reports and future firewall policy generation know where internet translation is expected.",
        "Confirm public egress interface, NAT exemption, and logging requirements before implementation.",
      ],
    }));
}

function buildObjectModelSummary(model: Omit<NetworkObjectModel, "summary">): NetworkObjectModel["summary"] {
  const allTruthStateObjects = [
    ...model.devices,
    ...model.interfaces,
    ...model.links,
    ...model.routeDomains,
    ...model.securityZones,
    ...model.policyRules,
    ...model.natRules,
    ...model.dhcpPools,
    ...model.ipReservations,
  ];

  const orphanedAddressRowCount = model.integrityNotes.filter((note) => note.includes("orphaned address row")).length;

  return {
    deviceCount: model.devices.length,
    interfaceCount: model.interfaces.length,
    linkCount: model.links.length,
    routeDomainCount: model.routeDomains.length,
    securityZoneCount: model.securityZones.length,
    policyRuleCount: model.policyRules.length,
    natRuleCount: model.natRules.length,
    dhcpPoolCount: model.dhcpPools.length,
    ipReservationCount: model.ipReservations.length,
    configuredObjectCount: countObjectsByTruthState(allTruthStateObjects, "configured"),
    inferredObjectCount: countObjectsByTruthState(allTruthStateObjects, "inferred"),
    proposedObjectCount: countObjectsByTruthState(allTruthStateObjects, "proposed"),
    discoveredObjectCount: countObjectsByTruthState(allTruthStateObjects, "discovered"),
    orphanedAddressRowCount,
    designGraphNodeCount: model.designGraph.summary.nodeCount,
    designGraphEdgeCount: model.designGraph.summary.edgeCount,
    designGraphIntegrityFindingCount: model.designGraph.summary.integrityFindingCount,
    designGraphBlockingFindingCount: model.designGraph.summary.blockingFindingCount,
    routeIntentCount: model.routingSegmentation.summary.routeIntentCount,
    reachabilityFindingCount: model.routingSegmentation.summary.reachabilityFindingCount,
    segmentationExpectationCount: model.routingSegmentation.summary.segmentationExpectationCount,
    segmentationConflictCount: model.routingSegmentation.summary.conflictingPolicyCount,
    securityServiceObjectCount: model.securityPolicyFlow.summary.serviceObjectCount,
    securityFlowRequirementCount: model.securityPolicyFlow.summary.flowRequirementCount,
    securityPolicyFindingCount: model.securityPolicyFlow.summary.findingCount,
    securityPolicyBlockingFindingCount: model.securityPolicyFlow.summary.blockingFindingCount,
    securityPolicyMissingNatCount: model.securityPolicyFlow.summary.missingNatCount,
    implementationPlanStepCount: model.implementationPlan.summary.stepCount,
    implementationPlanBlockedStepCount: model.implementationPlan.summary.blockedStepCount,
    implementationPlanReviewStepCount: model.implementationPlan.summary.reviewStepCount,
    implementationPlanFindingCount: model.implementationPlan.summary.findingCount,
    implementationPlanBlockingFindingCount: model.implementationPlan.summary.blockingFindingCount,
    notes: [
      "Phase 30 object model makes devices, interfaces, links, route domains, zones, policies, NAT intent, DHCP pools, IP reservations, security flow requirements, and implementation-neutral steps explicit backend design objects.",
      "Configured, inferred, proposed, and discovered truth states are counted separately to prevent proposals from being mistaken for as-built network truth.",
    ],
  };
}

export function buildNetworkObjectModel(params: {
  project: NetworkObjectProject;
  addressingRows: DesignCoreAddressRow[];
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
  loopbackPlan: LoopbackPlanRow[];
}): NetworkObjectModel {
  const { project, addressingRows, siteSummaries, transitPlan, loopbackPlan } = params;
  const routeDomain = createInitialRouteDomain(project, siteSummaries);
  const devicesById = new Map<string, NetworkDevice>();
  const interfaces: NetworkInterface[] = [];
  const links: NetworkLink[] = [];
  const securityZonesById = new Map<string, SecurityZone>();
  const dhcpPools: DhcpPool[] = [];
  const ipReservations: IpReservation[] = [];
  const integrityNotes: string[] = [];

  for (const site of project.sites) {
    devicesById.set(siteGatewayDeviceId(site.id), createSiteGatewayDevice(site, project.sites.length));
  }

  const wideAreaNetworkZone = ensureSecurityZone(
    securityZonesById,
    "wan",
    "Proposed external/WAN zone used for internet policy and NAT intent. Confirm the actual carrier, firewall, or edge device during implementation.",
  );

  for (const addressRow of addressingRows) {
    const siteGateway = devicesById.get(siteGatewayDeviceId(addressRow.siteId));
    const subnetCidr = addressRow.canonicalSubnetCidr ?? addressRow.proposedSubnetCidr;
    const gatewayIp = addressRow.effectiveGatewayIp ?? addressRow.proposedGatewayIp;
    const zoneRole = zoneRoleFromAddressRow(addressRow);
    const securityZone = ensureSecurityZone(securityZonesById, zoneRole);
    const interfaceId = gatewayInterfaceId(addressRow.id, addressRow.vlanId);
    const linkId = vlanGatewayLinkId(addressRow.id, addressRow.vlanId);

    addUnique(securityZone.siteIds, addressRow.siteId);
    addUnique(securityZone.vlanIds, addressRow.vlanId);
    if (subnetCidr) addUnique(securityZone.subnetCidrs, subnetCidr);
    if (subnetCidr) addUnique(routeDomain.subnetCidrs, subnetCidr);

    if (!siteGateway) {
      integrityNotes.push(`orphaned address row ${addressRow.id}: no site gateway device was available for ${addressRow.siteName}.`);
      continue;
    }

    addUnique(siteGateway.securityZoneIds, securityZone.id);

    const networkInterface: NetworkInterface = {
      id: interfaceId,
      name: `Vlan${addressRow.vlanId}`,
      deviceId: siteGateway.id,
      siteId: addressRow.siteId,
      interfaceRole: interfaceRoleFromSegmentRole(addressRow.role),
      truthState: addressRow.gatewayState === "valid" ? "configured" : "inferred",
      vlanId: addressRow.vlanId,
      subnetCidr,
      ipAddress: gatewayIp,
      routeDomainId: CORPORATE_ROUTE_DOMAIN_ID,
      securityZoneId: securityZone.id,
      linkId,
      notes: [
        `Gateway interface modeled from ${addressRow.siteName} VLAN ${addressRow.vlanId} (${addressRow.vlanName}).`,
        addressRow.gatewayState === "valid"
          ? "Gateway IP is configured and valid for the modeled subnet."
          : "Gateway requires review because the saved value was invalid, missing, or replaced by a proposal.",
      ],
    };

    interfaces.push(networkInterface);
    addUnique(siteGateway.interfaceIds, interfaceId);
    addUnique(routeDomain.interfaceIds, interfaceId);

    links.push({
      id: linkId,
      name: `${addressRow.siteName} VLAN ${addressRow.vlanId} Gateway Binding`,
      linkRole: "vlan-gateway-binding",
      truthState: "inferred",
      status: "modeled",
      siteIds: [addressRow.siteId],
      subnetCidr,
      endpointA: {
        deviceId: siteGateway.id,
        interfaceId,
        siteId: addressRow.siteId,
        label: `${siteGateway.name} ${networkInterface.name}`,
      },
      notes: [
        "Logical binding between the VLAN/subnet and the layer-3 gateway interface. Physical switchport placement is intentionally deferred until device/interface inventory exists.",
      ],
    });
    addUnique(routeDomain.linkIds, linkId);

    if (gatewayIp && subnetCidr) {
      ipReservations.push({
        id: `reservation-${addressRow.id}-gateway`,
        ipAddress: gatewayIp,
        subnetCidr,
        reservationRole: addressRow.role === "MANAGEMENT" ? "management" : "gateway",
        ownerType: "interface",
        ownerId: interfaceId,
        truthState: addressRow.gatewayState === "valid" ? "configured" : "inferred",
        notes: [`Reserved as the gateway address for ${addressRow.siteName} VLAN ${addressRow.vlanId}.`],
      });
    }

    if (addressRow.dhcpEnabled && subnetCidr) {
      dhcpPools.push({
        id: `dhcp-pool-${addressRow.id}`,
        name: `${addressRow.siteName} VLAN ${addressRow.vlanId} DHCP Pool`,
        siteId: addressRow.siteId,
        vlanId: addressRow.vlanId,
        subnetCidr,
        gatewayIp,
        truthState: "inferred",
        allocationState: addressRow.canonicalSubnetCidr ? "configured" : "proposed",
        notes: [
          "DHCP pool modeled from the VLAN DHCP flag. Exclusion ranges, lease duration, DNS, and relay information still require implementation-phase input.",
        ],
      });
    }
  }

  for (const transitRow of transitPlan) {
    const siteGateway = devicesById.get(siteGatewayDeviceId(transitRow.siteId));
    const interfaceId = `interface-${transitRow.siteId}-wan-transit-${normalizeIdentifierSegment(transitRow.subnetCidr ?? "pending")}`;
    const linkId = `link-${transitRow.siteId}-wan-transit-${normalizeIdentifierSegment(transitRow.subnetCidr ?? "pending")}`;

    if (!siteGateway) {
      integrityNotes.push(`orphaned transit plan for ${transitRow.siteName}: no site gateway device was available.`);
      continue;
    }

    interfaces.push({
      id: interfaceId,
      name: `WAN Transit ${transitRow.subnetCidr ?? "Pending"}`,
      deviceId: siteGateway.id,
      siteId: transitRow.siteId,
      interfaceRole: "wan-transit",
      truthState: transitRow.kind === "existing" ? "configured" : "proposed",
      subnetCidr: transitRow.subnetCidr,
      ipAddress: transitRow.gatewayOrEndpoint,
      routeDomainId: CORPORATE_ROUTE_DOMAIN_ID,
      securityZoneId: securityZoneIdForRole("transit"),
      linkId,
      notes: [
        "Transit interface modeled from the backend transit plan.",
        ...transitRow.notes,
      ],
    });
    addUnique(siteGateway.interfaceIds, interfaceId);
    addUnique(routeDomain.interfaceIds, interfaceId);
    if (transitRow.subnetCidr) addUnique(routeDomain.subnetCidrs, transitRow.subnetCidr);

    const transitZone = ensureSecurityZone(securityZonesById, "transit");
    addUnique(transitZone.siteIds, transitRow.siteId);
    if (transitRow.vlanId) addUnique(transitZone.vlanIds, transitRow.vlanId);
    if (transitRow.subnetCidr) addUnique(transitZone.subnetCidrs, transitRow.subnetCidr);

    links.push({
      id: linkId,
      name: `${transitRow.siteName} WAN Transit`,
      linkRole: "site-wan-transit",
      truthState: transitRow.kind === "existing" ? "configured" : "proposed",
      status: transitRow.kind === "existing" ? "modeled" : "planned",
      siteIds: [transitRow.siteId],
      subnetCidr: transitRow.subnetCidr,
      endpointA: {
        deviceId: siteGateway.id,
        interfaceId,
        siteId: transitRow.siteId,
        label: `${siteGateway.name} WAN transit`,
      },
      notes: [
        "WAN transit modeled as a logical routed link. Phase 27 should add the opposite endpoint when provider, firewall, or hub device details are known.",
      ],
    });
    addUnique(routeDomain.linkIds, linkId);

    if (transitRow.gatewayOrEndpoint && transitRow.subnetCidr) {
      ipReservations.push({
        id: `reservation-${transitRow.siteId}-wan-transit-${normalizeIdentifierSegment(transitRow.gatewayOrEndpoint)}`,
        ipAddress: transitRow.gatewayOrEndpoint,
        subnetCidr: transitRow.subnetCidr,
        reservationRole: "transit-endpoint",
        ownerType: "interface",
        ownerId: interfaceId,
        truthState: transitRow.kind === "existing" ? "configured" : "proposed",
        notes: [`Reserved as a WAN transit endpoint for ${transitRow.siteName}.`],
      });
    }
  }

  for (const loopbackRow of loopbackPlan) {
    const siteGateway = devicesById.get(siteGatewayDeviceId(loopbackRow.siteId));
    if (!siteGateway || !loopbackRow.subnetCidr || !loopbackRow.endpointIp) continue;

    const interfaceId = `interface-${loopbackRow.siteId}-loopback-${normalizeIdentifierSegment(loopbackRow.endpointIp)}`;
    interfaces.push({
      id: interfaceId,
      name: "Loopback0",
      deviceId: siteGateway.id,
      siteId: loopbackRow.siteId,
      interfaceRole: "loopback",
      truthState: loopbackRow.kind === "existing" ? "configured" : "proposed",
      subnetCidr: loopbackRow.subnetCidr,
      ipAddress: loopbackRow.endpointIp,
      routeDomainId: CORPORATE_ROUTE_DOMAIN_ID,
      securityZoneId: securityZoneIdForRole("transit"),
      notes: [
        "Loopback modeled as a routing identity and stable management reference.",
        ...loopbackRow.notes,
      ],
    });
    addUnique(siteGateway.interfaceIds, interfaceId);
    addUnique(routeDomain.interfaceIds, interfaceId);
    addUnique(routeDomain.subnetCidrs, loopbackRow.subnetCidr);

    ipReservations.push({
      id: `reservation-${loopbackRow.siteId}-loopback-${normalizeIdentifierSegment(loopbackRow.endpointIp)}`,
      ipAddress: loopbackRow.endpointIp,
      subnetCidr: loopbackRow.subnetCidr,
      reservationRole: "loopback",
      ownerType: "interface",
      ownerId: interfaceId,
      truthState: loopbackRow.kind === "existing" ? "configured" : "proposed",
      notes: [`Reserved as Loopback0 for ${loopbackRow.siteName}.`],
    });
  }

  const securityBoundaryDevice = createSecurityBoundaryDevice(project);
  if (securityBoundaryDevice) {
    devicesById.set(securityBoundaryDevice.id, securityBoundaryDevice);
  }

  for (const device of devicesById.values()) {
    if (securityBoundaryDevice && device.id === securityBoundaryDevice.id) continue;
    addUnique(device.securityZoneIds, wideAreaNetworkZone.id);
  }

  const securityZones = Array.from(securityZonesById.values()).sort((left, right) => left.name.localeCompare(right.name));
  const devices = Array.from(devicesById.values()).sort((left, right) => left.name.localeCompare(right.name));
  const policyRules = buildPolicyRules(securityZones);
  const natRules = buildNatRules(securityZones);

  const modelWithoutSummaryOrGraph: Omit<NetworkObjectModel, "summary" | "designGraph" | "routingSegmentation" | "securityPolicyFlow" | "implementationPlan"> = {
    routeDomains: [routeDomain],
    securityZones,
    devices,
    interfaces: interfaces.sort((left, right) => left.id.localeCompare(right.id)),
    links: links.sort((left, right) => left.id.localeCompare(right.id)),
    policyRules,
    natRules,
    dhcpPools: dhcpPools.sort((left, right) => left.id.localeCompare(right.id)),
    ipReservations: ipReservations.sort((left, right) => left.id.localeCompare(right.id)),
    integrityNotes: [
      ...integrityNotes,
      "This object model is backend-generated from current planning inputs, Phase 28 routing/segmentation relationships, and Phase 29 security flow requirements.",
    ],
  };

  const routingSegmentation = buildRoutingSegmentationModel({
    project,
    networkObjectModel: modelWithoutSummaryOrGraph,
    siteSummaries,
    transitPlan,
  });

  const securityPolicyFlow = buildSecurityPolicyFlowModel({
    networkObjectModel: modelWithoutSummaryOrGraph,
    routingSegmentation,
  });

  const temporaryDesignGraph = buildBackendDesignGraph({
    project,
    addressingRows,
    networkObjectModel: modelWithoutSummaryOrGraph,
    routingSegmentation,
    securityPolicyFlow,
  });

  const implementationPlan = buildImplementationPlanModel({
    networkObjectModel: {
      ...modelWithoutSummaryOrGraph,
      designGraph: temporaryDesignGraph,
      routingSegmentation,
      securityPolicyFlow,
    },
  });

  const designGraph = buildBackendDesignGraph({
    project,
    addressingRows,
    networkObjectModel: modelWithoutSummaryOrGraph,
    routingSegmentation,
    securityPolicyFlow,
    implementationPlan,
  });

  const modelWithGraph: Omit<NetworkObjectModel, "summary"> = {
    ...modelWithoutSummaryOrGraph,
    designGraph,
    routingSegmentation,
    securityPolicyFlow,
    implementationPlan,
  };

  return {
    summary: buildObjectModelSummary(modelWithGraph),
    ...modelWithGraph,
  };
}
