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
  Phase9NetworkObjectImplementationReadiness,
  Phase9NetworkObjectType,
  DesignTruthSourceType,
  DesignTraceConfidence,
  DesignProofStatus,
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
  requirementsJson?: string | null;
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

type RequirementInputMap = Record<string, unknown>;

function parseRequirementsJson(requirementsJson?: string | null): RequirementInputMap {
  if (!requirementsJson) return {};
  try {
    const parsed = JSON.parse(requirementsJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as RequirementInputMap;
  } catch {
    return {};
  }
}

function requirementText(requirements: RequirementInputMap, key: string) {
  const value = requirements[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function requirementBool(requirements: RequirementInputMap, key: string) {
  const value = requirements[key];
  return value === true || String(value ?? "").toLowerCase() === "true";
}

function requirementNumber(requirements: RequirementInputMap, key: string) {
  const raw = requirements[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function requirementMentions(requirements: RequirementInputMap, key: string, patterns: string[]) {
  const text = requirementText(requirements, key).toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

function requirementEnabled(requirements: RequirementInputMap, key: string, patterns: string[] = []) {
  return requirementBool(requirements, key) || requirementMentions(requirements, key, patterns);
}

function requirementCountPositive(requirements: RequirementInputMap, key: string) {
  return requirementNumber(requirements, key) > 0;
}

function hasRequirementText(requirements: RequirementInputMap, key: string) {
  const text = requirementText(requirements, key).toLowerCase();
  return Boolean(text) && !text.includes("not applicable") && !text.includes("not required");
}

function phase72RequirementSummary(requirements: RequirementInputMap) {
  return [
    `Planning requirement consequence model: ${requirementText(requirements, "planningFor") || "unspecified"}`,
    `Internet/WAN model: ${requirementText(requirements, "internetModel") || "unspecified"}`,
    `Security posture: ${requirementText(requirements, "securityPosture") || "unspecified"}`,
    `Trust boundary model: ${requirementText(requirements, "trustBoundaryModel") || "unspecified"}`,
    `Remote access method: ${requirementText(requirements, "remoteAccessMethod") || "unspecified"}`,
    `Cloud provider/connectivity: ${requirementText(requirements, "cloudProvider") || "unspecified"}; ${requirementText(requirements, "cloudConnectivity") || "unspecified"}`,
    `Inter-site traffic/resilience: ${requirementText(requirements, "interSiteTrafficModel") || "unspecified"}; ${requirementText(requirements, "resilienceTarget") || "unspecified"}`,
  ];
}

function cloudOrHybridRequired(requirements: RequirementInputMap) {
  return requirementEnabled(requirements, "cloudConnected")
    || requirementMentions(requirements, "environmentType", ["cloud", "hybrid"])
    || hasRequirementText(requirements, "cloudProvider")
    || hasRequirementText(requirements, "cloudConnectivity")
    || hasRequirementText(requirements, "cloudNetworkModel")
    || hasRequirementText(requirements, "cloudRoutingModel")
    || hasRequirementText(requirements, "cloudTrafficBoundary");
}

function multiSiteOrWanRequired(project: NetworkObjectProject, requirements: RequirementInputMap) {
  return project.sites.length > 1
    || requirementNumber(requirements, "siteCount") > 1
    || requirementEnabled(requirements, "dualIsp")
    || hasRequirementText(requirements, "interSiteTrafficModel")
    || hasRequirementText(requirements, "resilienceTarget")
    || requirementMentions(requirements, "internetModel", ["wan", "central", "hub", "site"]);
}

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
  if (addressRow.role === "IOT" || addressRow.role === "CAMERA" || addressRow.role === "PRINTER") return "iot";
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

function addPolicyRule(policyRules: PolicyRule[], rule: PolicyRule) {
  if (policyRules.some((existing) => existing.id === rule.id)) return;
  policyRules.push(rule);
}

function addPhase84DefaultDenyPolicyGuardrail(
  policyRules: PolicyRule[],
  zoneIds: Set<string>,
  sourceZoneId: string,
  destinationZoneId: string,
  id: string,
  name: string,
  rationale: string,
) {
  if (!zoneIds.has(sourceZoneId) || !zoneIds.has(destinationZoneId)) return;
  addPolicyRule(policyRules, {
    id,
    name,
    sourceZoneId,
    destinationZoneId,
    action: "deny",
    services: ["any"],
    truthState: "proposed",
    rationale,
    notes: [
      "Phase 84 explicit default-deny guardrail. This is design-review policy evidence, not a vendor-specific firewall command.",
      "Implementation execution still requires real interface mapping, management IPs, backup evidence, logging scope, and change-window approval.",
    ],
  });
}

function buildPolicyRules(securityZones: SecurityZone[], requirements: RequirementInputMap): PolicyRule[] {
  const policyRules: PolicyRule[] = [];
  const zoneIds = new Set(securityZones.map((zone) => zone.id));
  const internalZoneId = securityZoneIdForRole("internal");
  const guestZoneId = securityZoneIdForRole("guest");
  const managementZoneId = securityZoneIdForRole("management");
  const dmzZoneId = securityZoneIdForRole("dmz");
  const voiceZoneId = securityZoneIdForRole("voice");
  const iotZoneId = securityZoneIdForRole("iot");
  const transitZoneId = securityZoneIdForRole("transit");

  if (zoneIds.has(guestZoneId) && zoneIds.has(internalZoneId)) {
    addPolicyRule(policyRules, {
      id: "policy-deny-guest-to-internal",
      name: "Deny Guest Access to Corporate Internal Networks",
      sourceZoneId: guestZoneId,
      destinationZoneId: internalZoneId,
      action: "deny",
      services: ["any"],
      truthState: "proposed",
      rationale: "Guest networks should not reach trusted user, server, or management networks.",
      notes: [
        "Phase 72 keeps guest isolation as a concrete requirement-driven policy consequence, not just a VLAN label.",
        `Requirement keys: guestWifi, guestPolicy, trustBoundaryModel, securityPosture. Guest policy: ${requirementText(requirements, "guestPolicy") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(guestZoneId) && zoneIds.has(WIDE_AREA_NETWORK_ZONE_ID)) {
    addPolicyRule(policyRules, {
      id: "policy-allow-guest-to-internet",
      name: "Allow Guest Internet Access",
      sourceZoneId: guestZoneId,
      destinationZoneId: WIDE_AREA_NETWORK_ZONE_ID,
      action: "allow",
      services: ["dns", "http", "https"],
      truthState: "proposed",
      rationale: "Guest networks normally require internet-only access through NAT.",
      notes: [
        "Confirm content filtering, DNS enforcement, captive portal, and logging requirements before implementation.",
        `Requirement keys: guestWifi, guestPolicy, internetModel. Internet model: ${requirementText(requirements, "internetModel") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(managementZoneId)) {
    addPolicyRule(policyRules, {
      id: "policy-allow-management-to-network-devices",
      name: "Allow Management Plane to Network Devices",
      sourceZoneId: managementZoneId,
      destinationZoneId: managementZoneId,
      action: "allow",
      services: ["ssh", "https", "snmp", "icmp"],
      truthState: "proposed",
      rationale: "Management networks need controlled access to device administration services.",
      notes: [
        "Restrict source hosts and add logging before treating this as implementable firewall policy.",
        `Requirement keys: management, managementAccess, managementIpPolicy, adminBoundary. Management access: ${requirementText(requirements, "managementAccess") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(internalZoneId) && zoneIds.has(managementZoneId) && (requirementEnabled(requirements, "management") || hasRequirementText(requirements, "managementAccess") || hasRequirementText(requirements, "adminBoundary"))) {
    addPolicyRule(policyRules, {
      id: "policy-review-admin-to-management-plane",
      name: "Review Admin Access to Management Plane",
      sourceZoneId: internalZoneId,
      destinationZoneId: managementZoneId,
      action: "review",
      services: ["ssh", "https", "snmp", "icmp"],
      truthState: "proposed",
      rationale: "The management requirement must become an explicit admin-plane access decision rather than broad user-to-device reachability.",
      notes: [
        "Phase 72 requires the implementation owner to narrow admin sources to jump hosts, admin workstations, or identity-aware management paths.",
        `Requirement keys: management, managementAccess, managementIpPolicy, adminBoundary, identityModel. Identity model: ${requirementText(requirements, "identityModel") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(managementZoneId) && zoneIds.has(internalZoneId) && (hasRequirementText(requirements, "monitoringModel") || hasRequirementText(requirements, "loggingModel") || hasRequirementText(requirements, "backupPolicy") || hasRequirementText(requirements, "operationsOwnerModel") || requirementEnabled(requirements, "management"))) {
    addPolicyRule(policyRules, {
      id: "policy-review-operations-plane-to-internal",
      name: "Review Operations Plane Access to Internal Networks",
      sourceZoneId: managementZoneId,
      destinationZoneId: internalZoneId,
      action: "review",
      services: ["snmp", "ssh", "https", "icmp"],
      truthState: "proposed",
      rationale: "Monitoring, logging, backup, and compliance requirements need controlled operations-plane reachability and evidence collection.",
      notes: [
        "Phase 72 turns operations selections into policy review evidence instead of report-only text.",
        `Requirement keys: monitoringModel, loggingModel, backupPolicy, operationsOwnerModel, complianceProfile. Monitoring/logging: ${requirementText(requirements, "monitoringModel") || "unspecified"}; ${requirementText(requirements, "loggingModel") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(dmzZoneId) && zoneIds.has(internalZoneId)) {
    addPolicyRule(policyRules, {
      id: "policy-deny-dmz-to-internal",
      name: "Deny DMZ to Corporate Internal by Default",
      sourceZoneId: dmzZoneId,
      destinationZoneId: internalZoneId,
      action: "deny",
      services: ["any"],
      truthState: "proposed",
      rationale: "DMZ systems should not have broad access into internal networks; application-specific exceptions must be separately reviewed.",
      notes: ["Phase 84 explicit default-deny guardrail. Application exceptions belong in separate allow/review rules with exact services and owners."],
    });
  }

  if (zoneIds.has(WIDE_AREA_NETWORK_ZONE_ID) && zoneIds.has(dmzZoneId) && requirementEnabled(requirements, "remoteAccess")) {
    addPolicyRule(policyRules, {
      id: "policy-review-wan-to-remote-access-edge",
      name: "Review WAN to Remote Access Edge Publishing",
      sourceZoneId: WIDE_AREA_NETWORK_ZONE_ID,
      destinationZoneId: dmzZoneId,
      action: "review",
      services: ["https", "ssl-vpn", "ipsec"],
      truthState: "proposed",
      rationale: "Remote access must be published as a reviewed edge service, not as broad WAN trust.",
      notes: [
        "Phase 72 turns remote-access selection into an explicit edge-publishing consequence.",
        `Requirement keys: remoteAccess, remoteAccessMethod, identityModel, securityPosture. Remote access method: ${requirementText(requirements, "remoteAccessMethod") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(transitZoneId) && zoneIds.has(internalZoneId) && cloudOrHybridRequired(requirements)) {
    addPolicyRule(policyRules, {
      id: "policy-review-internal-to-cloud-edge",
      name: "Review Internal Reachability to Cloud Edge",
      sourceZoneId: internalZoneId,
      destinationZoneId: transitZoneId,
      action: "review",
      services: ["application-specific", "dns", "https"],
      truthState: "proposed",
      rationale: "Cloud/hybrid requirements must create an explicit cloud boundary and route/security review path.",
      notes: [
        "Phase 72 makes cloud provider, connectivity, routing, and traffic-boundary selections visible in policy evidence.",
        `Requirement keys: cloudConnected, environmentType, cloudProvider, cloudConnectivity, cloudNetworkModel, cloudRoutingModel, cloudTrafficBoundary. Cloud model: ${requirementText(requirements, "cloudProvider") || "unspecified"}; ${requirementText(requirements, "cloudConnectivity") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(voiceZoneId) && (zoneIds.has(internalZoneId) || zoneIds.has(WIDE_AREA_NETWORK_ZONE_ID)) && (requirementEnabled(requirements, "voice") || requirementCountPositive(requirements, "phoneCount"))) {
    addPolicyRule(policyRules, {
      id: "policy-review-voice-services-qos",
      name: "Review Voice Services and QoS Reachability",
      sourceZoneId: voiceZoneId,
      destinationZoneId: zoneIds.has(internalZoneId) ? internalZoneId : WIDE_AREA_NETWORK_ZONE_ID,
      action: "review",
      services: ["sip", "rtp", "dns"],
      truthState: "proposed",
      rationale: "Voice requirements affect call-control, QoS, and security policy; they cannot remain only VLAN evidence.",
      notes: [
        "Phase 72 surfaces call-control and QoS as implementation review evidence.",
        `Requirement keys: voice, phoneCount, voiceQos, qosModel, latencySensitivity. QoS: ${requirementText(requirements, "qosModel") || "unspecified"}.`,
      ],
    });
  }

  if (zoneIds.has(iotZoneId) && zoneIds.has(internalZoneId) && (requirementEnabled(requirements, "iot") || requirementCountPositive(requirements, "iotDeviceCount") || requirementEnabled(requirements, "cameras") || requirementCountPositive(requirements, "cameraCount") || requirementEnabled(requirements, "printers") || requirementCountPositive(requirements, "printerCount"))) {
    addPolicyRule(policyRules, {
      id: "policy-deny-shared-devices-to-internal",
      name: "Deny Shared Device Networks to Corporate Internal",
      sourceZoneId: iotZoneId,
      destinationZoneId: internalZoneId,
      action: "deny",
      services: ["any"],
      truthState: "proposed",
      rationale: "Printer, camera, and IoT networks should not inherit broad internal access.",
      notes: [
        "Phase 72 turns shared-device selections into default-deny east-west policy posture.",
        "Requirement keys: printers, printerCount, iot, iotDeviceCount, cameras, cameraCount, trustBoundaryModel, securityPosture.",
      ],
    });
    addPolicyRule(policyRules, {
      id: "policy-review-internal-to-shared-devices",
      name: "Review Trusted Access to Shared Device Networks",
      sourceZoneId: internalZoneId,
      destinationZoneId: iotZoneId,
      action: "review",
      services: ["application-specific", "icmp"],
      truthState: "proposed",
      rationale: "Users and services may need scoped access to printers, camera systems, or IoT controllers, but not broad east-west access.",
      notes: ["Replace this review rule with exact print, camera-management, or IoT-controller services before implementation."],
    });
  }


  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, internalZoneId, managementZoneId, "policy-deny-general-internal-users-to-management", "Deny General Internal Users to Management Plane", "Normal corporate user networks must not broadly administer device management services; approved admin or operations sources require separate scoped review rules.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, guestZoneId, dmzZoneId, "policy-deny-guest-to-dmz", "Deny Guest to DMZ Services", "Guest networks must stay internet-only and must not reach public-service or remote-access DMZ segments.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, WIDE_AREA_NETWORK_ZONE_ID, dmzZoneId, "policy-deny-general-wan-to-dmz", "Deny General WAN to DMZ by Default", "General inbound WAN traffic is denied by default; approved published services and remote-access edges remain separate review rules.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, guestZoneId, managementZoneId, "policy-deny-guest-to-management", "Deny Guest to Management Plane", "Guest networks must never reach device administration or management-plane services.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, guestZoneId, iotZoneId, "policy-deny-guest-to-iot", "Deny Guest to IoT and Shared Device Networks", "Guest networks should be internet-only and isolated from shared device segments.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, guestZoneId, transitZoneId, "policy-deny-guest-to-wan-transit", "Deny Guest to WAN Transit", "Guest access should not reach WAN/cloud transit segments directly; internet egress must use the reviewed WAN edge policy.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, WIDE_AREA_NETWORK_ZONE_ID, internalZoneId, "policy-deny-wan-to-corporate-internal", "Deny WAN to Corporate Internal", "Untrusted WAN or internet sources must not reach corporate internal networks by default.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, WIDE_AREA_NETWORK_ZONE_ID, managementZoneId, "policy-deny-wan-to-management", "Deny WAN to Management Plane", "External sources must not reach the management plane unless a separate, reviewed remote-admin architecture exists.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, WIDE_AREA_NETWORK_ZONE_ID, guestZoneId, "policy-deny-wan-to-guest", "Deny WAN to Guest Networks", "Guest networks are consumer-side egress segments, not inbound destinations from WAN or internet sources.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, WIDE_AREA_NETWORK_ZONE_ID, iotZoneId, "policy-deny-wan-to-iot", "Deny WAN to IoT and Shared Device Networks", "Shared device networks must not be exposed to untrusted WAN sources.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, WIDE_AREA_NETWORK_ZONE_ID, transitZoneId, "policy-deny-wan-to-wan-transit", "Deny WAN to WAN Transit Internals", "WAN/transit infrastructure should not accept broad inbound traffic from the untrusted WAN zone.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, dmzZoneId, managementZoneId, "policy-deny-dmz-to-management", "Deny DMZ to Management Plane", "Compromised DMZ workloads must not pivot into management-plane services.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, iotZoneId, managementZoneId, "policy-deny-iot-to-management", "Deny IoT to Management Plane", "Printers, cameras, and IoT devices must not reach network-device administration surfaces.");
  addPhase84DefaultDenyPolicyGuardrail(policyRules, zoneIds, transitZoneId, managementZoneId, "policy-deny-wan-transit-to-management", "Deny WAN Transit to Management Plane", "Transit/cloud-edge segments must not inherit management-plane access by default.");

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

function ensureRequirementDrivenZones(
  project: NetworkObjectProject,
  requirements: RequirementInputMap,
  securityZonesById: Map<string, SecurityZone>,
) {
  const addRequirementZone = (zoneRole: SecurityZoneRole, requirementKeys: string[], reason: string) => {
    const zone = ensureSecurityZone(securityZonesById, zoneRole, reason);
    zone.truthState = zone.subnetCidrs.length > 0 ? zone.truthState : "proposed";
    for (const site of project.sites) addUnique(zone.siteIds, site.id);
    for (const note of [
      reason,
      `Phase 72 requirement-driven zone evidence from: ${requirementKeys.join(", ")}.`,
    ]) {
      addUnique(zone.notes, note);
    }
  };

  if (project.sites.length > 0 || requirementNumber(requirements, "usersPerSite") > 0) {
    addRequirementZone("internal", ["usersPerSite", "primaryGoal", "securityPosture"], "Corporate internal zone required by user population and design objective requirements.");
  }
  if (requirementEnabled(requirements, "guestWifi") || hasRequirementText(requirements, "guestPolicy")) {
    addRequirementZone("guest", ["guestWifi", "guestPolicy", "wirelessModel"], "Guest zone required by guest Wi-Fi and guest access policy requirements.");
  }
  if (requirementEnabled(requirements, "management") || hasRequirementText(requirements, "managementAccess") || hasRequirementText(requirements, "managementIpPolicy") || hasRequirementText(requirements, "adminBoundary")) {
    addRequirementZone("management", ["management", "managementAccess", "managementIpPolicy", "adminBoundary"], "Management zone required by management-plane and privileged-admin requirements.");
  }
  if (requirementEnabled(requirements, "remoteAccess") || hasRequirementText(requirements, "remoteAccessMethod")) {
    addRequirementZone("dmz", ["remoteAccess", "remoteAccessMethod", "identityModel"], "Remote-access edge/DMZ zone required by VPN and identity-boundary requirements.");
  }
  if (cloudOrHybridRequired(requirements) || multiSiteOrWanRequired(project, requirements)) {
    addRequirementZone("transit", ["cloudConnected", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel", "internetModel", "interSiteTrafficModel", "dualIsp", "resilienceTarget"], "Cloud/WAN transit zone required by cloud, inter-site, WAN, or resilience requirements.");
  }
  if (requirementEnabled(requirements, "voice") || requirementCountPositive(requirements, "phoneCount")) {
    addRequirementZone("voice", ["voice", "phoneCount", "voiceQos", "qosModel", "latencySensitivity"], "Voice zone required by voice and QoS requirements.");
  }
  if (requirementEnabled(requirements, "iot") || requirementCountPositive(requirements, "iotDeviceCount") || requirementEnabled(requirements, "cameras") || requirementCountPositive(requirements, "cameraCount") || requirementEnabled(requirements, "printers") || requirementCountPositive(requirements, "printerCount")) {
    addRequirementZone("iot", ["printers", "printerCount", "iot", "iotDeviceCount", "cameras", "cameraCount"], "Shared-device/IoT zone required by printer, camera, or IoT requirements.");
  }
}


function activeRequirementIds(requirements: RequirementInputMap) {
  return Object.entries(requirements)
    .filter(([, value]) => value === true || (typeof value === "number" && value > 0) || (typeof value === "string" && value.trim().length > 0))
    .map(([key]) => `requirements:${key}`);
}
function requirementIdsForKeys(requirements: RequirementInputMap, keys: string[]) {
  const ids = keys.filter((key) => {
    const value = requirements[key];
    return value === true || (typeof value === "number" && value > 0) || (typeof value === "string" && value.trim().length > 0);
  }).map((key) => `requirements:${key}`);
  return ids.length ? ids : activeRequirementIds(requirements).slice(0, 8);
}
function requirementIdsForZoneRole(requirements: RequirementInputMap, zoneRole: SecurityZoneRole) {
  switch (zoneRole) {
    case "guest": return requirementIdsForKeys(requirements, ["guestWifi", "guestPolicy", "wirelessModel", "trustBoundaryModel", "securityPosture"]);
    case "management": return requirementIdsForKeys(requirements, ["management", "managementAccess", "managementIpPolicy", "adminBoundary", "identityModel"]);
    case "dmz": return requirementIdsForKeys(requirements, ["remoteAccess", "remoteAccessMethod", "identityModel", "securityPosture"]);
    case "voice": return requirementIdsForKeys(requirements, ["voice", "phoneCount", "voiceQos", "qosModel", "latencySensitivity"]);
    case "iot": return requirementIdsForKeys(requirements, ["iot", "iotDeviceCount", "cameras", "cameraCount", "printers", "printerCount"]);
    case "transit": return requirementIdsForKeys(requirements, ["cloudConnected", "cloudProvider", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel", "interSiteTrafficModel", "dualIsp", "resilienceTarget"]);
    case "wan": return requirementIdsForKeys(requirements, ["internetModel", "dualIsp", "resilienceTarget", "remoteAccess"]);
    default: return requirementIdsForKeys(requirements, ["usersPerSite", "primaryGoal", "securityPosture", "planningFor"]);
  }
}
function requirementIdsForSegmentRole(requirements: RequirementInputMap, role?: SegmentRole) {
  if (role === "GUEST") return requirementIdsForZoneRole(requirements, "guest");
  if (role === "MANAGEMENT") return requirementIdsForZoneRole(requirements, "management");
  if (role === "VOICE") return requirementIdsForZoneRole(requirements, "voice");
  if (role === "IOT" || role === "CAMERA" || role === "PRINTER") return requirementIdsForZoneRole(requirements, "iot");
  if (role === "WAN_TRANSIT" || role === "LOOPBACK") return requirementIdsForZoneRole(requirements, "transit");
  return requirementIdsForZoneRole(requirements, "internal");
}
function uniqueStrings(values: Array<string | undefined | null>) { return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))); }
function sourceTypeFromTruthState(truthState: NetworkObjectTruthState): DesignTruthSourceType { if (truthState === "configured") return "USER_PROVIDED"; if (["planned","materialized","proposed"].includes(truthState)) return "REQUIREMENT_MATERIALIZED"; if (["durable","approved"].includes(truthState)) return "ENGINE2_DURABLE"; if (["imported","discovered"].includes(truthState)) return "IMPORTED"; if (["review-required","blocked"].includes(truthState)) return "REVIEW_REQUIRED"; return "INFERRED"; }
function confidenceFromTruthState(truthState: NetworkObjectTruthState): DesignTraceConfidence { if (["configured","durable","approved"].includes(truthState)) return "high"; if (["planned","materialized","proposed"].includes(truthState)) return "medium"; if (["review-required","blocked"].includes(truthState)) return "low"; return "advisory"; }
function proofStatusFromTruthState(truthState: NetworkObjectTruthState): DesignProofStatus { if (["configured","durable","approved"].includes(truthState)) return "PROVEN"; if (["planned","materialized","proposed"].includes(truthState)) return "PARTIAL"; if (["review-required","blocked"].includes(truthState)) return "REVIEW_REQUIRED"; return "DRAFT_ONLY"; }
function implementationReadinessFromTruthState(truthState: NetworkObjectTruthState): Phase9NetworkObjectImplementationReadiness { if (["configured","durable","approved"].includes(truthState)) return "READY"; if (truthState === "blocked") return "BLOCKED"; if (["review-required","inferred","discovered","imported"].includes(truthState)) return "REVIEW_REQUIRED"; return "DRAFT_ONLY"; }
function validationImpactFromTruthState(truthState: NetworkObjectTruthState) { return truthState === "blocked" ? "BLOCKING: object cannot support implementation until reviewed." : ["configured","durable","approved"].includes(truthState) ? "PASSED: object has sufficient authority for planning-level consumption." : "REVIEW_REQUIRED: object must not be treated as as-built implementation authority."; }
type Phase9AnnotatableObject = { id: string; name?: string; truthState: NetworkObjectTruthState; notes: string[]; sourceRequirementIds?: string[]; sourceObjectIds?: string[]; objectType?: Phase9NetworkObjectType; objectRole?: string; sourceType?: DesignTruthSourceType; sourceEngine?: string; confidence?: DesignTraceConfidence; proofStatus?: DesignProofStatus; implementationReadiness?: Phase9NetworkObjectImplementationReadiness; validationImpact?: string; frontendDisplayImpact?: string[]; reportExportImpact?: string[]; diagramImpact?: string[]; reviewReason?: string; };
function annotateObject(params: { object: Phase9AnnotatableObject; objectType: Phase9NetworkObjectType; objectRole: string; requirements: RequirementInputMap; sourceRequirementIds?: string[]; sourceObjectIds?: string[]; reviewReason?: string; }) {
  const { object, objectType, objectRole, requirements } = params;
  const sourceRequirementIds = uniqueStrings(params.sourceRequirementIds ?? []);
  object.objectType = objectType; object.objectRole = objectRole;
  object.sourceRequirementIds = sourceRequirementIds.length ? sourceRequirementIds : activeRequirementIds(requirements).slice(0, 8);
  object.sourceObjectIds = uniqueStrings([...(params.sourceObjectIds ?? []), object.id]);
  object.sourceEngine = "designCore.networkObjectModel.phase9";
  object.sourceType = sourceTypeFromTruthState(object.truthState);
  object.confidence = confidenceFromTruthState(object.truthState);
  object.proofStatus = proofStatusFromTruthState(object.truthState);
  object.implementationReadiness = implementationReadinessFromTruthState(object.truthState);
  object.validationImpact = validationImpactFromTruthState(object.truthState);
  object.frontendDisplayImpact = ["ProjectOverviewPage.phase9NetworkObjectModel", "networkObjectModel tables"];
  object.reportExportImpact = ["Phase 9 Network Object Model Truth", "network object lineage export rows"];
  object.diagramImpact = ["diagram truth may render only object-backed nodes/edges and must display inferred/review truth state labels"];
  object.reviewReason = params.reviewReason ?? (["configured","durable","approved"].includes(object.truthState) ? undefined : "Object is planning/model evidence only until backed by explicit inventory, IPAM approval, or implementation confirmation.");
  addUnique(object.notes, `Phase 9 object truth label: ${objectType}/${objectRole}; source=${object.sourceType}; readiness=${object.implementationReadiness}; requirements=${object.sourceRequirementIds.join(", ") || "none"}.`);
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
    plannedObjectCount: countObjectsByTruthState(allTruthStateObjects, "planned"),
    materializedObjectCount: countObjectsByTruthState(allTruthStateObjects, "materialized"),
    durableObjectCount: countObjectsByTruthState(allTruthStateObjects, "durable"),
    importedObjectCount: countObjectsByTruthState(allTruthStateObjects, "imported"),
    approvedObjectCount: countObjectsByTruthState(allTruthStateObjects, "approved"),
    reviewRequiredObjectCount: countObjectsByTruthState(allTruthStateObjects, "review-required"),
    blockedObjectCount: countObjectsByTruthState(allTruthStateObjects, "blocked"),
    phase9MetadataCompleteCount: allTruthStateObjects.filter((object) => Boolean(object.objectType && object.objectRole && object.sourceType && object.sourceEngine && object.confidence && object.proofStatus && object.implementationReadiness && object.validationImpact)).length,
    phase9MetadataGapCount: allTruthStateObjects.filter((object) => !Boolean(object.objectType && object.objectRole && object.sourceType && object.sourceEngine && object.confidence && object.proofStatus && object.implementationReadiness && object.validationImpact)).length,
    implementationReadyObjectCount: allTruthStateObjects.filter((object) => object.implementationReadiness === "READY").length,
    implementationReviewObjectCount: allTruthStateObjects.filter((object) => object.implementationReadiness === "REVIEW_REQUIRED" || object.implementationReadiness === "DRAFT_ONLY").length,
    implementationBlockedObjectCount: allTruthStateObjects.filter((object) => object.implementationReadiness === "BLOCKED").length,
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
      "Configured, inferred, proposed, discovered, planned, materialized, durable, imported, approved, review-required, and blocked truth states are counted separately to prevent proposals from being mistaken for as-built network truth.",
      "Phase 9 adds object-level provenance/readiness metadata so every network object can be traced to requirements or an explicit review reason.",
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
  const requirements = parseRequirementsJson(project.requirementsJson);
  const routeDomain = createInitialRouteDomain(project, siteSummaries);
  routeDomain.notes.push(...phase72RequirementSummary(requirements));
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
  wideAreaNetworkZone.notes.push(...phase72RequirementSummary(requirements));

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

  ensureRequirementDrivenZones(project, requirements, securityZonesById);

  const securityZones = Array.from(securityZonesById.values()).sort((left, right) => left.name.localeCompare(right.name));
  const devices = Array.from(devicesById.values()).sort((left, right) => left.name.localeCompare(right.name));
  const policyRules = buildPolicyRules(securityZones, requirements);
  const natRules = buildNatRules(securityZones);


  annotateObject({ object: routeDomain, objectType: "route-domain", objectRole: routeDomain.scope, requirements, sourceRequirementIds: requirementIdsForKeys(requirements, ["siteCount", "interSiteTrafficModel", "cloudRoutingModel", "dualIsp", "resilienceTarget"]), sourceObjectIds: routeDomain.siteIds });
  for (const zone of securityZones) annotateObject({ object: zone, objectType: "security-zone", objectRole: zone.zoneRole, requirements, sourceRequirementIds: requirementIdsForZoneRole(requirements, zone.zoneRole), sourceObjectIds: [...zone.subnetCidrs, ...zone.siteIds] });
  for (const device of devices) annotateObject({ object: device, objectType: "network-device", objectRole: device.deviceRole, requirements, sourceRequirementIds: requirementIdsForKeys(requirements, ["siteCount", "usersPerSite", "internetModel", "dualIsp", "securityPosture"]), sourceObjectIds: [device.siteId, ...device.interfaceIds, ...device.securityZoneIds] });
  for (const networkInterface of interfaces) { const row = addressingRows.find((item) => networkInterface.id.includes(item.id)); annotateObject({ object: networkInterface, objectType: "network-interface", objectRole: networkInterface.interfaceRole, requirements, sourceRequirementIds: requirementIdsForSegmentRole(requirements, row?.role), sourceObjectIds: uniqueStrings([row?.id, networkInterface.deviceId, networkInterface.routeDomainId, networkInterface.securityZoneId, networkInterface.linkId, networkInterface.subnetCidr]) }); }
  for (const link of links) { const row = addressingRows.find((item) => link.id.includes(item.id)); annotateObject({ object: link, objectType: "network-link", objectRole: link.linkRole, requirements, sourceRequirementIds: requirementIdsForSegmentRole(requirements, row?.role), sourceObjectIds: uniqueStrings([row?.id, link.endpointA?.deviceId, link.endpointA?.interfaceId, link.endpointB?.deviceId, link.endpointB?.interfaceId, link.subnetCidr]) }); }
  for (const pool of dhcpPools) { const row = addressingRows.find((item) => pool.id.includes(item.id)); annotateObject({ object: pool, objectType: "dhcp-pool", objectRole: pool.allocationState, requirements, sourceRequirementIds: requirementIdsForSegmentRole(requirements, row?.role), sourceObjectIds: uniqueStrings([row?.id, pool.siteId, String(pool.vlanId), pool.subnetCidr]) }); }
  for (const reservation of ipReservations) annotateObject({ object: reservation, objectType: "ip-reservation", objectRole: reservation.reservationRole, requirements, sourceRequirementIds: requirementIdsForKeys(requirements, ["management", "managementAccess", "siteCount", "cloudRoutingModel", "interSiteTrafficModel"]), sourceObjectIds: uniqueStrings([reservation.ownerId, reservation.subnetCidr, reservation.ipAddress]) });
  for (const rule of policyRules) { const sourceZone = securityZones.find((zone) => zone.id === rule.sourceZoneId); const destinationZone = securityZones.find((zone) => zone.id === rule.destinationZoneId); annotateObject({ object: rule, objectType: "policy-rule", objectRole: rule.action, requirements, sourceRequirementIds: uniqueStrings([...(sourceZone?.sourceRequirementIds ?? []), ...(destinationZone?.sourceRequirementIds ?? [])]), sourceObjectIds: uniqueStrings([rule.sourceZoneId, rule.destinationZoneId]) }); }
  for (const rule of natRules) { const sourceZone = securityZones.find((zone) => zone.id === rule.sourceZoneId); annotateObject({ object: rule, objectType: "nat-rule", objectRole: rule.translatedAddressMode, requirements, sourceRequirementIds: uniqueStrings([...(sourceZone?.sourceRequirementIds ?? []), ...requirementIdsForKeys(requirements, ["internetModel", "guestWifi", "dualIsp"])]), sourceObjectIds: uniqueStrings([rule.sourceZoneId, rule.destinationZoneId, ...rule.sourceSubnetCidrs]) }); }

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
      "This object model is backend-generated from current planning inputs, routing/segmentation relationships, security flow requirements, and requirement-driven policy consequences.",
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
    requirementsJson: project.requirementsJson,
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
