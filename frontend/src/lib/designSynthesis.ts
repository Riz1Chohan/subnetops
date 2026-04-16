import type { Project, Site, Vlan } from "./types";
import type { RequirementsProfile } from "./requirementsProfile";
import { buildUnifiedDesignTruthModel, type UnifiedDesignTruthModel } from "./designTruthModel";
import { parseDiscoveryWorkspaceState } from "./discoveryFoundation";
import {
  canonicalizeCidr,
  cidrOverlap,
  classifySegmentRole,
  intToIpv4,
  ipv4ToInt,
  parseCidrRange,
  recommendedPrefixForHosts,
  subnetFacts,
  subnetWithinBlock,
  type ParsedCidrRange,
  type SegmentRole,
} from "./networkValidators";

export interface PlannedSiteSummary {
  id: string;
  name: string;
  siteCode: string;
  location?: string;
  source: "configured" | "proposed";
  siteBlockCidr?: string;
  summaryPrefix?: number;
  plannedDemandAddresses: number;
  plannedDemandHosts: number;
  note?: string;
}

export interface AddressingPlanRow {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string;
  siteBlockCidr?: string;
  source: "configured" | "proposed";
  vlanId?: number;
  segmentName: string;
  purpose: string;
  role: SegmentRole;
  roleLabel?: string;
  zoneName?: string;
  subnetCidr: string;
  mask: string;
  gatewayIp: string;
  dhcpEnabled: boolean;
  dhcpRange?: string;
  staticReserve?: string;
  usableHosts: number;
  estimatedHosts: number;
  headroom: number;
  utilization: number;
  insideSiteBlock: boolean | null;
  notes: string[];
}

export interface TraceabilityItem {
  title: string;
  requirement: string;
  designOutcome: string;
}

export interface SiteHierarchyItem extends PlannedSiteSummary {
  blockCapacity: number;
  allocatedSegmentAddresses: number;
  blockHeadroomAddresses: number;
  blockUtilization: number;
  configuredSegmentCount: number;
  proposedSegmentCount: number;
  summarizationTarget?: string;
}

export interface SegmentModelItem {
  role: SegmentRole;
  label: string;
  vlanId?: number;
  purpose: string;
  dhcpEnabled: boolean;
  siteCount: number;
  configuredCount: number;
  proposedCount: number;
  totalEstimatedHosts: number;
  recommendedPrefix: number;
}

export interface DesignReviewItem {
  kind: "assumption" | "decision" | "risk";
  title: string;
  detail: string;
}

export interface WanLinkPlanRow {
  id: string;
  linkName: string;
  source: "proposed" | "configured";
  transport: string;
  parentBlockCidr?: string;
  subnetCidr: string;
  endpointASiteId?: string;
  endpointASiteName: string;
  endpointAIp: string;
  endpointBSiteId?: string;
  endpointBSiteName: string;
  endpointBIp: string;
  notes: string[];
}

export interface RoutePlanItem {
  siteId: string;
  siteName: string;
  siteCode?: string;
  siteBlockCidr?: string;
  summaryAdvertisement?: string;
  loopbackCidr?: string;
  localSegmentCount: number;
  localAddressCount: number;
  transitAdjacencyCount: number;
  notes: string[];
}

export interface SecurityZonePlan {
  zoneName: string;
  zoneType: "trusted" | "restricted" | "untrusted" | "management" | "service" | "transit" | "edge" | "cloud";
  segments: string[];
  trustLevel: string;
  enforcement: string;
  northSouthPolicy: string;
  eastWestPolicy: string;
  identityControl: string;
  monitoringExpectation: string;
  notes: string[];
}

export interface SecurityControlItem {
  control: string;
  status: "required" | "recommended" | "optional";
  rationale: string;
  implementationHint: string;
}

export interface SecurityPolicyMatrixRow {
  sourceZone: string;
  targetZone: string;
  defaultAction: string;
  allowedFlows: string;
  controlPoint: string;
  notes: string[];
}

export interface SegmentationReviewItem {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  affected: string[];
}

export interface LogicalDomainIntent {
  name: string;
  segments: string[];
  purpose: string;
  placement: string;
  policy: string;
}

export interface HighLevelDesignSummary {
  architecturePattern: string;
  layerModel: string;
  wanArchitecture: string;
  cloudArchitecture: string;
  dataCenterArchitecture: string;
  redundancyModel: string;
  routingStrategy: string;
  switchingStrategy: string;
  segmentationStrategy: string;
  securityArchitecture: string;
  wirelessArchitecture: string;
  operationsArchitecture: string;
  rationale: string[];
}

export interface LowLevelSiteDesign {
  siteId: string;
  siteName: string;
  siteCode?: string;
  siteRole: string;
  layerModel: string;
  routingRole: string;
  switchingProfile: string;
  securityBoundary: string;
  localServiceModel: string;
  wirelessModel: string;
  physicalAssumption: string;
  summaryRoute?: string;
  loopbackCidr?: string;
  transitAdjacencyCount: number;
  localSegmentCount: number;
  localSegments: string[];
  implementationFocus: string[];
  notes: string[];
}

export interface RoutingProtocolPlan {
  protocol: string;
  scope: string;
  purpose: string;
  recommendation: string;
  notes: string[];
}

export interface RoutePolicyPlan {
  policyName: string;
  scope: string;
  intent: string;
  recommendation: string;
  riskIfSkipped: string;
}

export interface SwitchingDesignPlan {
  topic: string;
  recommendation: string;
  implementationHint: string;
  rationale: string;
}

export interface QosPlanItem {
  trafficClass: string;
  treatment: string;
  marking: string;
  scope: string;
  rationale: string;
}

export interface RoutingSwitchingReviewItem {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  affected: string[];
}

export interface ImplementationPlanSummary {
  rolloutStrategy: string;
  migrationStrategy: string;
  downtimePosture: string;
  validationApproach: string;
  rollbackPosture: string;
  teamExecutionModel: string;
  timelineGuidance: string;
  handoffPackage: string;
}

export interface ImplementationPhasePlan {
  phase: string;
  objective: string;
  scope: string;
  dependencies: string[];
  successCriteria: string[];
}

export interface CutoverChecklistItem {
  stage: "pre-check" | "cutover" | "post-check";
  item: string;
  owner: string;
  rationale: string;
}

export interface RollbackPlanItem {
  trigger: string;
  action: string;
  scope: string;
}

export interface ValidationTestPlanItem {
  stage: string;
  test: string;
  expectedOutcome: string;
  evidence: string;
}

export interface ImplementationRiskItem {
  severity: "critical" | "warning" | "info";
  title: string;
  mitigation: string;
  owner: string;
}

export interface ConfigurationStandardItem {
  topic: string;
  standard: string;
  rationale: string;
}

export interface ConfigurationTemplateArtifact {
  name: string;
  scope: string;
  intent: string;
  includes: string[];
  sampleLines: string[];
  notes: string[];
}

export interface OperationsArtifactItem {
  artifact: string;
  purpose: string;
  owner: string;
  timing: string;
}


export interface TopologyBlueprint {
  topologyType: "collapsed-core" | "hub-spoke" | "multi-site" | "hybrid-cloud";
  topologyLabel: string;
  primarySiteId?: string;
  primarySiteName?: string;
  internetBreakout: "centralized" | "distributed";
  cloudConnected: boolean;
  redundancyModel: string;
  servicePlacementModel: string;
  notes: string[];
  cloudProvider?: string;
  cloudPattern?: string;
  wanPattern?: string;
  topologyNarrative?: string;
}

export interface SitePlacementDevice {
  id: string;
  siteId: string;
  siteName: string;
  deviceName: string;
  siteTier: "primary" | "branch" | "single-site" | "cloud";
  uplinkTarget?: string;
  deviceType: "firewall" | "router" | "core-switch" | "distribution-switch" | "access-switch" | "wireless-controller" | "access-point" | "server" | "cloud-edge";
  role: string;
  quantity: number;
  placement: string;
  connectedZones: string[];
  connectedSubnets: string[];
  interfaceLabels: string[];
  notes: string[];
}

export interface ServicePlacementItem {
  id: string;
  serviceName: string;
  serviceType: "shared-service" | "dmz-service" | "local-service" | "cloud-service" | "management-service";
  placementType: "local" | "centralized" | "dmz" | "cloud";
  locationModel?: string;
  siteId?: string;
  siteName: string;
  zoneName: string;
  subnetCidr?: string;
  dependsOn: string[];
  consumers: string[];
  publishedExternally?: boolean;
  ingressPath?: string[];
  attachedDevice?: string;
  upstreamDevice?: string;
  ingressInterface?: string;
  notes: string[];
}

export interface SecurityBoundaryDetail {
  zoneName: string;
  siteName: string;
  boundaryName: string;
  subnetCidrs: string[];
  attachedDevice: string;
  attachedInterface?: string;
  upstreamBoundary: string;
  upstreamInterface?: string;
  downstreamAssets: string[];
  permittedPeers: string[];
  controlPoint: string;
  inboundPolicy: string;
  eastWestPolicy: string;
  managementSource: string;
  natPolicy: string;
  routeDomain?: string;
  insideRelationships: string[];
  outsideRelationships: string[];
  publishedServices: string[];
  notes: string[];
}

export interface TrafficFlowPath {
  id: string;
  flowName: string;
  flowLabel: string;
  flowCategory:
    | "user-local-gateway"
    | "user-local-service"
    | "user-internet"
    | "guest-internet"
    | "management-infrastructure"
    | "site-centralized-service"
    | "site-cloud-service"
    | "internet-dmz"
    | "remote-user-internal";
  source: string;
  destination: string;
  sourceSite?: string;
  destinationSite?: string;
  sourceZone: string;
  destinationZone: string;
  sourceSubnetCidr?: string;
  destinationSubnetCidr?: string;
  path: string[];
  controlPoints: string[];
  routeModel: string;
  natBehavior: string;
  enforcementPolicy: string;
  policyNotes: string[];
}

export interface FlowCoverageItem {
  id: string;
  label: string;
  required: boolean;
  status: "ready" | "partial" | "pending";
  detail: string;
  matchedFlowIds: string[];
}

export interface DesignEngineFoundation {
  stageLabel: string;
  summary: string;
  objectCounts: {
    siteHierarchy: number;
    addressingRows: number;
    topologyPlacements: number;
    servicePlacements: number;
    securityBoundaries: number;
    trafficFlows: number;
    routingIdentities: number;
    wanLinks: number;
    traceabilityItems: number;
    openIssues: number;
  };
  strongestLayer: string;
  nextPriority: string;
  coverage: Array<{
    label: string;
    status: "ready" | "partial" | "pending";
    detail: string;
  }>;
}

export interface SynthesizedLogicalDesign {
  organizationBlock: string;
  organizationBlockAssumed: boolean;
  organizationHierarchy: {
    organizationCapacity: number;
    allocatedSiteAddresses: number;
    plannedSiteDemandAddresses: number;
    organizationHeadroom: number;
    organizationUtilization: number;
  };
  wanReserveBlock?: string;
  siteSummaries: PlannedSiteSummary[];
  siteHierarchy: SiteHierarchyItem[];
  addressingPlan: AddressingPlanRow[];
  recommendedSegments: Array<{ role: SegmentRole; label: string; vlanId?: number; purpose: string }>;
  segmentModel: SegmentModelItem[];
  wanLinks: WanLinkPlanRow[];
  topology: TopologyBlueprint;
  sitePlacements: SitePlacementDevice[];
  servicePlacements: ServicePlacementItem[];
  securityBoundaries: SecurityBoundaryDetail[];
  trafficFlows: TrafficFlowPath[];
  flowCoverage: FlowCoverageItem[];
  routingPlan: RoutePlanItem[];
  routePlan?: RoutePlanItem[];
  topologyModel?: TopologyBlueprint;
  servicePlacementModel?: ServicePlacementItem[];
  securityBoundaryModel?: SecurityBoundaryDetail[];
  trafficFlowModel?: TrafficFlowPath[];
  routingIntentModel?: { siteRouting: RoutePlanItem[] };
  designTruthModel: UnifiedDesignTruthModel;
  logicalDomains: LogicalDomainIntent[];
  securityZones: SecurityZonePlan[];
  securityControls: SecurityControlItem[];
  securityPolicyMatrix: SecurityPolicyMatrixRow[];
  segmentationReview: SegmentationReviewItem[];
  routingProtocols: RoutingProtocolPlan[];
  routePolicies: RoutePolicyPlan[];
  switchingDesign: SwitchingDesignPlan[];
  qosPlan: QosPlanItem[];
  routingSwitchingReview: RoutingSwitchingReviewItem[];
  implementationPlan: ImplementationPlanSummary;
  implementationPhases: ImplementationPhasePlan[];
  cutoverChecklist: CutoverChecklistItem[];
  rollbackPlan: RollbackPlanItem[];
  validationPlan: ValidationTestPlanItem[];
  implementationRisks: ImplementationRiskItem[];
  configurationStandards: ConfigurationStandardItem[];
  configurationTemplates: ConfigurationTemplateArtifact[];
  operationsArtifacts: OperationsArtifactItem[];
  highLevelDesign: HighLevelDesignSummary;
  lowLevelDesign: LowLevelSiteDesign[];
  traceability: TraceabilityItem[];
  designSummary: string[];
  designReview: DesignReviewItem[];
  openIssues: string[];
  implementationNextSteps: string[];
  designEngineFoundation: DesignEngineFoundation;
  stats: {
    configuredSites: number;
    proposedSites: number;
    configuredSegments: number;
    proposedSegments: number;
    missingSiteBlocks: number;
    rowsOutsideSiteBlocks: number;
  };
}

interface SegmentTemplate {
  role: SegmentRole;
  label: string;
  purpose: string;
  vlanId?: number;
  estimatedHosts: number;
  dhcpEnabled: boolean;
  notes?: string[];
}

function toNumber(value: string | number | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPositive(value: number, floor = 0) {
  return Math.max(floor, Math.round(value));
}

function roleLabel(role: SegmentRole) {
  return role.replace(/_/g, " ");
}

function roleSortWeight(role: SegmentRole) {
  switch (role) {
    case "USER":
      return 10;
    case "SERVER":
      return 20;
    case "GUEST":
      return 30;
    case "PRINTER":
      return 40;
    case "VOICE":
      return 50;
    case "IOT":
      return 60;
    case "CAMERA":
      return 70;
    case "MANAGEMENT":
      return 80;
    case "WAN_TRANSIT":
      return 90;
    case "LOOPBACK":
      return 100;
    default:
      return 110;
  }
}

function blockAddressCount(prefix: number) {
  return 2 ** (32 - prefix);
}

function prefixForAddressCount(addressCount: number) {
  const required = Math.max(4, Math.ceil(addressCount));
  for (let prefix = 32; prefix >= 0; prefix -= 1) {
    if (blockAddressCount(prefix) >= required) return prefix;
  }
  return 0;
}

function cidrAddressCount(cidr?: string) {
  const parsed = cidr ? parseCidrRange(cidr) : null;
  return parsed ? blockAddressCount(parsed.prefix) : 0;
}

function inferWorkingOrganizationBlock(project?: Project, siteCount = 1, usersPerSite = 50) {
  const explicit = canonicalizeCidr(project?.basePrivateRange || "");
  if (explicit) return { cidr: explicit, assumed: false };

  const roughUsers = Math.max(1, siteCount) * Math.max(25, usersPerSite);
  if (siteCount <= 4 && roughUsers <= 500) return { cidr: "10.100.0.0/16", assumed: true };
  if (siteCount <= 16 && roughUsers <= 4000) return { cidr: "10.64.0.0/12", assumed: true };
  return { cidr: "10.0.0.0/8", assumed: true };
}

function defaultSiteCode(index: number) {
  return `SITE${String(index + 1).padStart(2, "0")}`;
}

function siteDisplayName(index: number, existingCount: number) {
  if (existingCount === 0 && index === 0) return "Primary Site";
  return `Site ${index + 1}`;
}

function buildWorkingSites(sites: Site[], plannedSiteCount: number) {
  const count = Math.max(plannedSiteCount, sites.length, 1);
  const working: Array<PlannedSiteSummary & { originalSite?: Site }> = [];

  for (let index = 0; index < count; index += 1) {
    const existing = sites[index];
    if (existing) {
      working.push({
        id: existing.id,
        name: existing.name,
        siteCode: existing.siteCode || defaultSiteCode(index),
        location: existing.location,
        source: "configured",
        siteBlockCidr: canonicalizeCidr(existing.defaultAddressBlock || "") || undefined,
        plannedDemandAddresses: 0,
        plannedDemandHosts: 0,
        originalSite: existing,
      });
      continue;
    }

    working.push({
      id: `planned-site-${index + 1}`,
      name: siteDisplayName(index, sites.length),
      siteCode: defaultSiteCode(index),
      source: "proposed",
      plannedDemandAddresses: 0,
      plannedDemandHosts: 0,
      note: "Proposed placeholder site generated from the requirements site count.",
    });
  }

  return working;
}

function buildRecommendedSegments(profile: RequirementsProfile, siteIndex: number, siteCount: number): SegmentTemplate[] {
  const usersPerSite = Math.max(5, toNumber(profile.usersPerSite, 50));
  const printerCount = clampPositive(toNumber(profile.printerCount, profile.printers ? 4 : 0), profile.printers ? 2 : 0);
  const phoneCount = clampPositive(toNumber(profile.phoneCount, profile.voice ? Math.round(usersPerSite * 0.8) : 0), profile.voice ? 2 : 0);
  const apCount = clampPositive(toNumber(profile.apCount, profile.wireless ? 4 : 0), profile.wireless ? 2 : 0);
  const cameraCount = clampPositive(toNumber(profile.cameraCount, profile.cameras ? 8 : 0), profile.cameras ? 2 : 0);
  const iotCount = clampPositive(toNumber(profile.iotDeviceCount, profile.iot ? 12 : 0), profile.iot ? 2 : 0);
  const serverCount = clampPositive(toNumber(profile.serverCount, 2), 0);
  const templates: SegmentTemplate[] = [];

  templates.push({
    role: "USER",
    label: profile.planningFor === "Clinic" ? "Clinical / Staff Access" : "User Access",
    purpose: profile.planningFor === "Clinic" ? "Primary user and clinical workstation access" : "Primary user access",
    vlanId: 10,
    estimatedHosts: usersPerSite,
    dhcpEnabled: true,
    notes: ["Sized from the requirements user-per-site input."],
  });

  if (profile.guestWifi) {
    templates.push({
      role: "GUEST",
      label: "Guest Access",
      purpose: profile.guestPolicy,
      vlanId: 40,
      estimatedHosts: Math.max(20, Math.round(usersPerSite * 0.5)),
      dhcpEnabled: true,
      notes: ["Guest access stays logically separate from the trusted user segment."],
    });
  }

  if (profile.printers || printerCount > 0) {
    templates.push({
      role: "PRINTER",
      label: "Printers",
      purpose: "Shared print devices and print services",
      vlanId: 50,
      estimatedHosts: Math.max(2, printerCount),
      dhcpEnabled: true,
      notes: ["Separating printers reduces broadcast noise and user-to-device sprawl."],
    });
  }

  if (profile.voice || phoneCount > 0) {
    templates.push({
      role: "VOICE",
      label: "Voice",
      purpose: profile.voiceQos,
      vlanId: 60,
      estimatedHosts: Math.max(2, phoneCount),
      dhcpEnabled: true,
      notes: ["Voice endpoints are isolated so QoS and policy can be applied cleanly."],
    });
  }

  if (profile.iot || iotCount > 0) {
    templates.push({
      role: "IOT",
      label: "IoT / Specialty",
      purpose: "IoT, OT, medical, or lab devices",
      vlanId: 70,
      estimatedHosts: Math.max(2, iotCount),
      dhcpEnabled: true,
      notes: ["Specialty devices stay out of the primary user segment."],
    });
  }

  if (profile.cameras || cameraCount > 0) {
    templates.push({
      role: "CAMERA",
      label: "Cameras",
      purpose: "Video surveillance and camera endpoints",
      vlanId: 80,
      estimatedHosts: Math.max(2, cameraCount),
      dhcpEnabled: true,
      notes: ["Camera traffic and retention targets are easier to manage on their own segment."],
    });
  }

  if (profile.management || apCount > 0) {
    templates.push({
      role: "MANAGEMENT",
      label: "Management",
      purpose: profile.managementIpPolicy,
      vlanId: 90,
      estimatedHosts: Math.max(16, apCount + printerCount + cameraCount + iotCount + 6),
      dhcpEnabled: false,
      notes: ["Management is treated as an infrastructure-only segment with a tighter reserve model."],
    });
  }

  const centralizedServers = /central/i.test(profile.serverPlacement || "") || /main/i.test(profile.serverPlacement || "");
  const includeServers = centralizedServers ? siteIndex === 0 : serverCount > 0;
  if (includeServers) {
    templates.push({
      role: "SERVER",
      label: centralizedServers ? "Central Services" : "Servers",
      purpose: centralizedServers
        ? "Centralized shared services, directory, DNS/DHCP, and application hosts"
        : "Local site services and application servers",
      vlanId: 20,
      estimatedHosts: centralizedServers ? Math.max(4, serverCount) : Math.max(2, Math.ceil(serverCount / Math.max(1, siteCount))),
      dhcpEnabled: false,
      notes: [
        centralizedServers
          ? "Server placement was set to centralized services, so the server segment is anchored at the primary site."
          : "Servers are planned inside the local site footprint.",
      ],
    });
  }

  templates.push({
    role: "LOOPBACK",
    label: "Loopback",
    purpose: "Stable per-site routing and monitoring identity",
    estimatedHosts: 1,
    dhcpEnabled: false,
    notes: ["A dedicated /32 loopback is reserved per site for routing identity, monitoring, and management references."],
  });

  return templates;
}

function demandForSite(profile: RequirementsProfile, siteIndex: number, siteCount: number) {
  const templates = buildRecommendedSegments(profile, siteIndex, siteCount);
  const infrastructureReserve = 64
    + (siteCount > 1 ? 32 : 0)
    + (profile.dualIsp ? 8 : 0)
    + ((profile.cloudConnected || profile.environmentType !== "On-prem") && siteIndex === 0 ? 16 : 0);
  const plannedDemandAddresses = templates.reduce((total, segment) => {
    const prefix = recommendedPrefixForHosts(segment.estimatedHosts, segment.role);
    return total + blockAddressCount(prefix);
  }, infrastructureReserve);
  const plannedDemandHosts = templates.reduce((total, segment) => total + segment.estimatedHosts, 0);
  const reserveMultiplier = /consistent|summar/i.test(profile.siteBlockStrategy || "") ? 1.35 : 1.2;
  const siteBlockPrefix = prefixForAddressCount(plannedDemandAddresses * reserveMultiplier);

  return {
    templates,
    plannedDemandAddresses,
    plannedDemandHosts,
    siteBlockPrefix,
  };
}

function findAvailableChildBlock(parent: ParsedCidrRange, requestedPrefix: number, occupied: ParsedCidrRange[]) {
  if (requestedPrefix < parent.prefix) return null;
  const step = blockAddressCount(requestedPrefix);
  let candidateNetwork = parent.network;

  while (candidateNetwork + step - 1 <= parent.broadcast) {
    const candidate: ParsedCidrRange = {
      ip: intToIpv4(candidateNetwork),
      prefix: requestedPrefix,
      network: candidateNetwork,
      broadcast: candidateNetwork + step - 1,
    };

    const overlaps = occupied.some((item) => cidrOverlap(candidate, item));
    if (!overlaps) return candidate;
    candidateNetwork += step;
  }

  return null;
}

function findAvailableChildBlockFromEnd(parent: ParsedCidrRange, requestedPrefix: number, occupied: ParsedCidrRange[]) {
  if (requestedPrefix < parent.prefix) return null;
  const step = blockAddressCount(requestedPrefix);
  const slots = Math.floor((blockAddressCount(parent.prefix) - step) / step);

  for (let slot = slots; slot >= 0; slot -= 1) {
    const candidateNetwork = parent.network + slot * step;
    const candidate: ParsedCidrRange = {
      ip: intToIpv4(candidateNetwork),
      prefix: requestedPrefix,
      network: candidateNetwork,
      broadcast: candidateNetwork + step - 1,
    };
    const overlaps = occupied.some((item) => cidrOverlap(candidate, item));
    if (!overlaps) return candidate;
  }

  return null;
}

function rangeFromBounds(start?: number | null, end?: number | null) {
  if (start === null || start === undefined || end === null || end === undefined || end < start) return undefined;
  return `${intToIpv4(start)}–${intToIpv4(end)}`;
}

function computeServiceRanges(row: { subnetCidr: string; gatewayIp: string; dhcpEnabled: boolean; role: SegmentRole }) {
  const facts = subnetFacts(row.subnetCidr, row.role);
  if (!facts) {
    return { mask: "—", usableHosts: 0, dhcpRange: undefined, staticReserve: undefined };
  }

  if (row.role === "LOOPBACK" || row.role === "WAN_TRANSIT") {
    return {
      mask: facts.dottedMask,
      usableHosts: facts.usableAddresses,
      dhcpRange: undefined,
      staticReserve: undefined,
    };
  }

  const gatewayInt = row.gatewayIp && row.gatewayIp !== "—" ? ipv4ToInt(row.gatewayIp) : undefined;
  const firstUsable = facts.firstUsableIp ? ipv4ToInt(facts.firstUsableIp) : undefined;
  const lastUsable = facts.lastUsableIp ? ipv4ToInt(facts.lastUsableIp) : undefined;

  const reservedLowCount = row.role === "SERVER" || row.role === "MANAGEMENT"
    ? Math.min(24, Math.max(6, Math.round(facts.usableAddresses * 0.35)))
    : Math.min(48, Math.max(8, Math.round(facts.usableAddresses * 0.18)));
  const reservedHighCount = row.dhcpEnabled
    ? Math.min(32, Math.max(6, Math.round(facts.usableAddresses * 0.1)))
    : 0;

  const staticStart = gatewayInt !== undefined ? gatewayInt + 1 : firstUsable !== undefined ? firstUsable + 1 : undefined;
  const staticEnd = staticStart !== undefined && lastUsable !== undefined ? Math.min(lastUsable, staticStart + reservedLowCount - 1) : undefined;
  const dhcpStart = row.dhcpEnabled && staticEnd !== undefined ? staticEnd + 1 : undefined;
  const dhcpEnd = row.dhcpEnabled && lastUsable !== undefined && dhcpStart !== undefined ? Math.max(dhcpStart, lastUsable - reservedHighCount) : undefined;

  return {
    mask: facts.dottedMask,
    usableHosts: facts.usableAddresses,
    dhcpRange: row.dhcpEnabled ? rangeFromBounds(dhcpStart, dhcpEnd) : undefined,
    staticReserve: rangeFromBounds(staticStart, staticEnd),
  };
}

function buildConfiguredRow(vlan: Vlan, siteBlockCidr?: string): AddressingPlanRow | null {
  const role = classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""}`);
  const facts = subnetFacts(vlan.subnetCidr, role);
  if (!facts) return null;
  const usableHosts = facts.usableAddresses;
  const estimatedHosts = Math.max(0, vlan.estimatedHosts || 0);
  const headroom = Math.max(0, usableHosts - estimatedHosts);
  const utilization = usableHosts > 0 && estimatedHosts > 0 ? estimatedHosts / usableHosts : 0;
  const insideSiteBlock = subnetWithinBlock(vlan.subnetCidr, siteBlockCidr);
  const serviceRanges = computeServiceRanges({
    subnetCidr: facts.canonicalCidr,
    gatewayIp: vlan.gatewayIp,
    dhcpEnabled: vlan.dhcpEnabled,
    role,
  });

  const notes: string[] = [];
  if (siteBlockCidr && insideSiteBlock === false) notes.push("Configured subnet sits outside the current site summary block.");
  if (estimatedHosts > usableHosts && usableHosts > 0) notes.push("Estimated host demand exceeds the usable capacity of this subnet.");
  if (usableHosts > 0 && estimatedHosts > 0 && estimatedHosts / usableHosts >= 0.85) {
    notes.push("Configured subnet is at or above 85% of usable host capacity.");
  }

  return {
    id: vlan.id,
    siteId: vlan.siteId,
    siteName: vlan.site?.name || "Unassigned site",
    siteCode: vlan.site?.siteCode,
    siteBlockCidr,
    source: "configured",
    vlanId: vlan.vlanId,
    segmentName: vlan.vlanName,
    purpose: vlan.purpose || roleLabel(role),
    role,
    subnetCidr: facts.canonicalCidr,
    mask: serviceRanges.mask,
    gatewayIp: vlan.gatewayIp,
    dhcpEnabled: vlan.dhcpEnabled,
    dhcpRange: serviceRanges.dhcpRange,
    staticReserve: serviceRanges.staticReserve,
    usableHosts,
    estimatedHosts,
    headroom,
    utilization,
    insideSiteBlock,
    notes,
  };
}

function buildProposedRow(input: {
  siteId: string;
  siteName: string;
  siteCode?: string;
  siteBlockCidr?: string;
  template: SegmentTemplate;
  occupied: ParsedCidrRange[];
  additionalNotes?: string[];
  idSuffix?: string;
}) {
  const { siteId, siteName, siteCode, siteBlockCidr, template, occupied, additionalNotes, idSuffix } = input;
  const siteBlock = siteBlockCidr ? parseCidrRange(siteBlockCidr) : null;
  const notes = [...(template.notes || []), ...(additionalNotes || [])];
  let subnetCidr = "Unassigned";
  let gatewayIp = template.role === "LOOPBACK" ? "Self" : "—";
  let mask = "—";
  let dhcpRange: string | undefined;
  let staticReserve: string | undefined;
  let usableHosts = 0;
  let headroom = 0;
  let utilization = 0;
  let insideSiteBlock: boolean | null = null;

  if (siteBlock) {
    const requestedPrefix = recommendedPrefixForHosts(template.estimatedHosts, template.role);
    const candidate = findAvailableChildBlock(siteBlock, requestedPrefix, occupied);
    if (candidate) {
      subnetCidr = `${intToIpv4(candidate.network)}/${candidate.prefix}`;
      gatewayIp = template.role === "WAN_TRANSIT" || template.role === "LOOPBACK"
        ? intToIpv4(candidate.network)
        : intToIpv4(candidate.network + 1);
      occupied.push(candidate);
      const serviceRanges = computeServiceRanges({ subnetCidr, gatewayIp, dhcpEnabled: template.dhcpEnabled, role: template.role });
      mask = serviceRanges.mask;
      dhcpRange = serviceRanges.dhcpRange;
      staticReserve = serviceRanges.staticReserve;
      const facts = subnetFacts(subnetCidr, template.role);
      usableHosts = facts?.usableAddresses || 0;
      headroom = Math.max(0, usableHosts - template.estimatedHosts);
      utilization = usableHosts > 0 ? template.estimatedHosts / usableHosts : 0;
      insideSiteBlock = true;
    } else {
      notes.push("No free child subnet was found inside the current site block for this proposed segment.");
    }
  } else {
    notes.push("Site block is missing, so the proposed segment could not be placed automatically.");
  }

  return {
    id: `${siteId}-${template.role}-${idSuffix || "proposed"}`,
    siteId,
    siteName,
    siteCode,
    siteBlockCidr,
    source: "proposed" as const,
    vlanId: template.vlanId,
    segmentName: template.label,
    purpose: template.purpose,
    role: template.role,
    subnetCidr,
    mask,
    gatewayIp,
    dhcpEnabled: template.dhcpEnabled,
    dhcpRange,
    staticReserve,
    usableHosts,
    estimatedHosts: template.estimatedHosts,
    headroom,
    utilization,
    insideSiteBlock,
    notes,
  } satisfies AddressingPlanRow;
}

function configuredRowsNeedAdjustment(configuredRows: AddressingPlanRow[], template: SegmentTemplate) {
  if (configuredRows.length === 0) return true;
  return configuredRows.some((row) => (
    row.usableHosts < template.estimatedHosts
    || row.insideSiteBlock === false
    || row.dhcpEnabled !== template.dhcpEnabled
  ));
}

function transitEndpoints(block: ParsedCidrRange) {
  if (block.prefix === 31) {
    return { endpointA: intToIpv4(block.network), endpointB: intToIpv4(block.broadcast) };
  }
  return { endpointA: intToIpv4(block.network + 1), endpointB: intToIpv4(block.network + 2) };
}

function buildWanLinks(input: {
  organizationRange: ParsedCidrRange | null;
  occupiedSiteBlocks: ParsedCidrRange[];
  siteHierarchy: SiteHierarchyItem[];
  profile: RequirementsProfile;
}) {
  const { organizationRange, occupiedSiteBlocks, siteHierarchy, profile } = input;
  const shouldPlanWan = siteHierarchy.length > 1 || profile.cloudConnected || profile.environmentType !== "On-prem";
  if (!shouldPlanWan || !organizationRange || siteHierarchy.length === 0) {
    return { wanReserveBlock: undefined as string | undefined, wanLinks: [] as WanLinkPlanRow[] };
  }

  const primarySite = siteHierarchy[0];
  const targets = siteHierarchy.slice(1).map((site) => ({
    id: site.id,
    name: site.name,
    code: site.siteCode,
    transport: profile.internetModel,
  }));

  if (profile.cloudConnected || profile.environmentType !== "On-prem") {
    targets.push({
      id: "cloud-edge",
      name: `${profile.cloudProvider || "Cloud"} Edge`,
      code: "CLD",
      transport: profile.cloudConnectivity || "Site-to-cloud connectivity",
    });
  }

  if (targets.length === 0) {
    return { wanReserveBlock: undefined as string | undefined, wanLinks: [] as WanLinkPlanRow[] };
  }

  const reservePrefix = Math.max(organizationRange.prefix, prefixForAddressCount(Math.max(8, targets.length * 4)));
  const reserve = findAvailableChildBlockFromEnd(organizationRange, reservePrefix, occupiedSiteBlocks);
  const wanReserveBlock = reserve ? `${intToIpv4(reserve.network)}/${reserve.prefix}` : undefined;
  const localOccupancy: ParsedCidrRange[] = [];

  const wanLinks = targets.map((target, index) => {
    const block = reserve
      ? findAvailableChildBlock(reserve, 31, localOccupancy) || findAvailableChildBlock(reserve, 30, localOccupancy)
      : null;

    if (!block) {
      return {
        id: `wan-${index + 1}`,
        linkName: `${primarySite.name} ↔ ${target.name}`,
        source: "proposed" as const,
        transport: target.transport,
        parentBlockCidr: wanReserveBlock,
        subnetCidr: "Unassigned",
        endpointASiteId: primarySite.id,
        endpointASiteName: primarySite.name,
        endpointAIp: "—",
        endpointBSiteId: target.id.startsWith("cloud") ? undefined : target.id,
        endpointBSiteName: target.name,
        endpointBIp: "—",
        notes: ["No free transit subnet was available inside the WAN reserve block."],
      } satisfies WanLinkPlanRow;
    }

    localOccupancy.push(block);
    const { endpointA, endpointB } = transitEndpoints(block);
    const notes = [
      target.id.startsWith("cloud")
        ? "Cloud or hybrid connectivity should advertise only the required private prefixes across this edge."
        : "Use this point-to-point transit link to keep inter-site routing separate from user VLANs.",
    ];
    if (profile.dualIsp) notes.push("The requirements call for resilience, so evaluate whether this site also needs a secondary transport path.");
    if (!target.id.startsWith("cloud")) notes.push(`Summarize ${target.name} behind ${target.name}'s site block once implementation routing is planned.`);

    return {
      id: `wan-${index + 1}`,
      linkName: `${primarySite.name} ↔ ${target.name}`,
      source: "proposed" as const,
      transport: target.transport,
      parentBlockCidr: wanReserveBlock,
      subnetCidr: `${intToIpv4(block.network)}/${block.prefix}`,
      endpointASiteId: primarySite.id,
      endpointASiteName: primarySite.name,
      endpointAIp: endpointA,
      endpointBSiteId: target.id.startsWith("cloud") ? undefined : target.id,
      endpointBSiteName: target.name,
      endpointBIp: endpointB,
      notes,
    } satisfies WanLinkPlanRow;
  });

  return { wanReserveBlock, wanLinks };
}

function buildRoutingPlan(siteHierarchy: SiteHierarchyItem[], rows: AddressingPlanRow[], wanLinks: WanLinkPlanRow[], profile: RequirementsProfile) {
  return siteHierarchy.map((site, index) => {
    const siteRows = rows.filter((row) => row.siteId === site.id);
    const loopback = siteRows.find((row) => row.role === "LOOPBACK");
    const transitAdjacencyCount = wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id).length;
    const notes: string[] = [];
    if (index === 0 && siteHierarchy.length > 1) notes.push("Primary site is acting as the initial routing hub for branch summarization and shared services.");
    if (index > 0 && transitAdjacencyCount === 0 && siteHierarchy.length > 1) notes.push("Branch site does not yet have a proposed WAN transit link.");
    if (loopback?.subnetCidr) notes.push(`Use ${loopback.subnetCidr} as the stable routing and monitoring identity for ${site.name}.`);
    else notes.push("Loopback identity is still missing for this site.");
    if (/central/i.test(profile.serverPlacement || "") && index > 0) notes.push("This site is expected to consume centralized services over the WAN rather than host the main server block locally.");

    return {
      siteId: site.id,
      siteName: site.name,
      siteCode: site.siteCode,
      siteBlockCidr: site.siteBlockCidr,
      summaryAdvertisement: site.siteBlockCidr,
      loopbackCidr: loopback?.subnetCidr,
      localSegmentCount: siteRows.length,
      localAddressCount: siteRows.reduce((total, row) => total + cidrAddressCount(row.subnetCidr), 0),
      transitAdjacencyCount,
      notes,
    } satisfies RoutePlanItem;
  });
}


function buildRoutingProtocols(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  routingPlan: RoutePlanItem[];
  wanLinks: WanLinkPlanRow[];
  segmentModel: SegmentModelItem[];
}) {
  const { profile, siteHierarchy, routingPlan, wanLinks, segmentModel } = input;
  const multiSite = siteHierarchy.length > 1;
  const hybrid = profile.cloudConnected || profile.environmentType !== "On-prem";
  const voice = segmentModel.some((item) => item.role === "VOICE");
  const specialty = segmentModel.some((item) => ["IOT", "CAMERA"].includes(item.role));
  const plans: RoutingProtocolPlan[] = [];

  plans.push({
    protocol: multiSite || hybrid ? "OSPF" : "Static routing with an OSPF-ready edge",
    scope: multiSite || hybrid ? "Internal site-to-site and core routing domain" : "Local routed edge and VLAN gateway domain",
    purpose: multiSite || hybrid ? "Carry summarized site blocks, loopbacks, and internal reachability without turning every VLAN into a separately advertised route." : "Keep the first implementation simple while preserving a clean path to an internal IGP if the environment grows.",
    recommendation: multiSite || hybrid
      ? "Use loopbacks as router IDs, advertise only site summary blocks toward the core or hub, and keep point-to-point transport links outside user VLANs."
      : "Use routed VLAN gateways with a default route toward the internet or shared edge, and avoid unnecessary dynamic routing until scale or redundancy requires it.",
    notes: [
      multiSite ? "The saved requirements imply more than one site, so an internal IGP is easier to operate than a growing set of static routes." : "Single-site scope supports a smaller first implementation.",
      hybrid ? "Cloud or hybrid reachability should still be summarized into the internal routing domain rather than leaking many cloud-specific prefixes everywhere." : "No separate cloud-routing boundary is required yet.",
    ],
  });

  if (hybrid || profile.dualIsp) {
    plans.push({
      protocol: "BGP-style edge policy",
      scope: hybrid ? "Cloud edge, provider edge, or dual-ISP boundary" : "Provider or internet edge",
      purpose: "Keep provider-facing route control separate from the internal site-routing domain.",
      recommendation: hybrid
        ? "Treat cloud or provider links as controlled edge boundaries. Summarize site routes toward the edge and filter external/provider prefixes before they reach the internal core."
        : "If multiple providers or edge circuits are used, keep the edge policy distinct from the internal routing domain and do not redistribute everything everywhere by default.",
      notes: [
        profile.dualIsp ? "Dual transport was requested, so route preference and failover behavior should be explicit at the edge." : "Single-provider edge still benefits from a clean provider-facing route policy.",
      ],
    });
  }

  if (wanLinks.length > 0) {
    plans.push({
      protocol: "Point-to-point transit links",
      scope: "Inter-site and cloud-edge transport",
      purpose: "Keep transport addressing small, predictable, and separate from user/service addressing.",
      recommendation: "Use /31 or /30 transit links only for routing adjacencies. Do not stretch user VLANs across the WAN as a substitute for routed transport.",
      notes: [
        `${wanLinks.length} transport link${wanLinks.length === 1 ? " is" : "s are"} currently synthesized from the saved scope.`,
        routingPlan.some((item) => item.transitAdjacencyCount > 1) ? "Some sites imply multiple transit adjacencies, so summarization and policy boundaries matter more." : "The current transit model is compact and should stay simple in the first implementation.",
      ],
    });
  }

  if (voice || specialty) {
    plans.push({
      protocol: "QoS-aware routed access",
      scope: "Voice, specialty devices, and critical application paths",
      purpose: "Make sure voice and specialty traffic stay separated logically so prioritization and policy can be applied predictably.",
      recommendation: "Keep voice and specialty traffic on dedicated routed segments and carry markings consistently from the access edge toward the WAN/core boundaries.",
      notes: [
        voice ? "Voice was enabled, so delay-sensitive traffic should not share one flat user domain." : "Voice is not a major driver in this scope.",
        specialty ? "Specialty devices need policy-aware routing and switching boundaries." : "No major specialty-device edge was detected.",
      ],
    });
  }

  return plans;
}

function buildRoutePolicies(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  routingPlan: RoutePlanItem[];
  wanLinks: WanLinkPlanRow[];
}) {
  const { profile, siteHierarchy, routingPlan, wanLinks } = input;
  const multiSite = siteHierarchy.length > 1;
  const hybrid = profile.cloudConnected || profile.environmentType !== "On-prem";
  const policies: RoutePolicyPlan[] = [
    {
      policyName: "Site summarization",
      scope: multiSite ? "Between sites and toward the primary hub/core" : "Inside the local routed core",
      intent: "Advertise one summary per site block instead of every VLAN everywhere.",
      recommendation: "Use each site block as the normal summary boundary and keep transit networks out of user/service summaries.",
      riskIfSkipped: "Flat route advertisement increases control-plane noise, makes troubleshooting harder, and weakens fault isolation.",
    },
    {
      policyName: "Loopback advertisement",
      scope: "Internal routing domain",
      intent: "Preserve one stable routing and management identity per site or routing node.",
      recommendation: "Advertise loopbacks deliberately and use them for monitoring, router ID, and long-lived control-plane references.",
      riskIfSkipped: "Routing identities become tied to changeable interface addressing, which complicates operations and migration.",
    },
    {
      policyName: "Default-route handling",
      scope: multiSite ? "Hub/core to branch edges" : "Local internet or upstream edge",
      intent: "Keep default-route origination explicit so branches and access layers know where north-south traffic belongs.",
      recommendation: multiSite
        ? "Originate default only from the intended internet/shared-services edge and avoid creating multiple accidental default sources inside the internal design."
        : "Anchor the default route at the upstream edge and avoid circular next-hop logic inside the local design.",
      riskIfSkipped: "Unexpected north-south behavior and difficult failover troubleshooting can result.",
    },
    {
      policyName: "Redistribution discipline",
      scope: hybrid || profile.dualIsp ? "Internal/core to provider or cloud edges" : "Across internal design domains only if multiple protocols appear later",
      intent: "Avoid unrestricted route leaking between internal, provider, and cloud domains.",
      recommendation: "Redistribute only specific summaries or required prefixes, and document the policy boundary before implementation."
      ,
      riskIfSkipped: "Route feedback, routing-table growth, and unclear control-plane ownership become much more likely.",
    },
  ];

  if (hybrid || wanLinks.some((link) => /cloud/i.test(link.endpointBSiteName))) {
    policies.push({
      policyName: "Cloud and edge filtering",
      scope: "Cloud/provider boundary",
      intent: "Keep cloud-specific, provider, and internet-facing prefixes out of unrelated internal domains.",
      recommendation: "Treat cloud edges as policy boundaries: summarize site routes toward cloud, filter public/provider ranges, and keep management reachability intentionally scoped.",
      riskIfSkipped: "Cloud or provider routes can bleed into the wrong internal areas and make both security and troubleshooting worse.",
    });
  }

  if (profile.guestWifi) {
    policies.push({
      policyName: "Guest north-south policy",
      scope: "Guest zone to internet edge",
      intent: "Keep guest traffic out of internal route domains beyond what is strictly required for internet access or captive services.",
      recommendation: "Prefer local or tightly controlled guest breakout and do not advertise corporate/service prefixes into the guest edge unless explicitly required."
      ,
      riskIfSkipped: "Guest traffic can accidentally gain broader internal visibility or follow inefficient paths through trusted zones.",
    });
  }

  return policies;
}

function buildSwitchingDesign(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  segmentModel: SegmentModelItem[];
}) {
  const { profile, siteHierarchy, segmentModel } = input;
  const usersPerSite = toNumber(profile.usersPerSite, 50);
  const largeCampus = usersPerSite >= 250 || toNumber(profile.buildingCount, 1) > 1 || toNumber(profile.floorCount, 1) > 2;
  const voice = segmentModel.some((item) => item.role === "VOICE");
  const specialty = segmentModel.some((item) => ["IOT", "CAMERA"].includes(item.role));
  const designs: SwitchingDesignPlan[] = [
    {
      topic: "Layer 2 boundary model",
      recommendation: largeCampus || siteHierarchy.length > 1
        ? "Keep Layer 2 domains local to the site or access block and terminate VLANs at a routed distribution/core edge."
        : "Use a compact switched access layer, but still avoid stretching every VLAN farther than needed.",
      implementationHint: "Prune trunks, avoid broad default-allow VLAN trunks, and map only the required VLANs onto each uplink.",
      rationale: "Smaller fault domains reduce broadcast sprawl, simplify troubleshooting, and make security boundaries clearer.",
    },
    {
      topic: "Loop prevention and switching control plane",
      recommendation: largeCampus ? "Prefer RSTP or MST with a deliberate root design, and consider routed access instead of large shared VLAN domains." : "Use RSTP with a defined root/secondary-root strategy and do not rely on ad hoc default spanning-tree behavior.",
      implementationHint: "Define root placement on the aggregation/distribution layer and pair that with portfast/edge-guard protections at access ports.",
      rationale: "A predictable L2 control plane is part of senior-grade switching design, not an afterthought.",
    },
    {
      topic: "Uplink resilience",
      recommendation: profile.dualIsp || largeCampus
        ? "Use aggregated uplinks where the platform supports it and match the logical design's redundancy targets to the physical uplink model."
        : "Keep uplinks simple, but document the intended failure domain and upgrade path if resilience increases later.",
      implementationHint: "Use LACP or the platform's supported equivalent for parallel uplinks rather than independent active links without a policy model.",
      rationale: "Uplink behavior should align with both the routing design and the outage tolerance defined in the requirements.",
    },
    {
      topic: "First-hop gateway placement",
      recommendation: "Terminate VLAN gateways at the routed edge or distribution/core boundary rather than leaving gateway logic scattered across unmanaged access islands.",
      implementationHint: siteHierarchy.length > 1 ? "Keep gateway placement consistent per site and line it up with the summary block that each site advertises." : "Keep gateway placement consistent inside the single site's routed edge.",
      rationale: "Consistent gateway placement makes summarization, ACL policy, and troubleshooting much more supportable.",
    },
  ];

  if (voice || specialty || profile.wireless) {
    designs.push({
      topic: "Access edge templates",
      recommendation: "Use role-based access templates for user, voice, AP, printer, camera, IoT, and management ports rather than one generic access-port policy.",
      implementationHint: "Map each edge role to the correct VLAN, trust boundary, port-security posture, and QoS marking policy.",
      rationale: "Edge consistency is how the logical design turns into a supportable switching build rather than a one-off device-by-device exercise.",
    });
  }

  return designs;
}

function buildQosPlan(profile: RequirementsProfile, segmentModel: SegmentModelItem[]) {
  const hasVoice = segmentModel.some((item) => item.role === "VOICE");
  const hasGuest = segmentModel.some((item) => item.role === "GUEST");
  const hasServices = segmentModel.some((item) => ["SERVER", "MANAGEMENT"].includes(item.role));
  const plan: QosPlanItem[] = [];

  if (hasVoice) {
    plan.push({
      trafficClass: "Voice / real-time",
      treatment: "Strict or high-priority low-latency forwarding",
      marking: "Preserve trusted voice markings and validate at the access edge",
      scope: "Access edge, uplinks, and WAN/core handoff",
      rationale: profile.voiceQos,
    });
  }

  if (hasServices) {
    plan.push({
      trafficClass: "Critical infrastructure and shared services",
      treatment: "Preferential treatment over bulk/background traffic",
      marking: "Use controlled internal markings for infrastructure and service traffic classes",
      scope: "Core/distribution and WAN or service-edge boundaries",
      rationale: profile.criticalServicesModel,
    });
  }

  plan.push({
    trafficClass: "Standard user and application traffic",
    treatment: "Best-effort by default with room for important interactive business applications",
    marking: "Mark only where the platform and policy model support it; avoid uncontrolled re-marking at many layers",
    scope: "General access and routed access boundaries",
    rationale: profile.bandwidthProfile,
  });

  if (hasGuest) {
    plan.push({
      trafficClass: "Guest / untrusted access",
      treatment: "Rate-limit or deprioritize when needed relative to trusted business traffic",
      marking: "Do not allow guest markings to influence internal priority treatment",
      scope: "Guest edge and internet breakout paths",
      rationale: profile.guestPolicy,
    });
  }

  return plan;
}

function buildRoutingSwitchingReview(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  routingPlan: RoutePlanItem[];
  wanLinks: WanLinkPlanRow[];
  routingProtocols: RoutingProtocolPlan[];
  routePolicies: RoutePolicyPlan[];
  switchingDesign: SwitchingDesignPlan[];
  qosPlan: QosPlanItem[];
  segmentModel: SegmentModelItem[];
}) {
  const { profile, siteHierarchy, routingPlan, wanLinks, routePolicies, switchingDesign, qosPlan, segmentModel } = input;
  const items: RoutingSwitchingReviewItem[] = [];
  const multiSite = siteHierarchy.length > 1;
  const hybrid = profile.cloudConnected || profile.environmentType !== "On-prem";
  const voice = segmentModel.some((item) => item.role === "VOICE");
  const missingLoopbacks = routingPlan.filter((item) => !item.loopbackCidr);
  if (multiSite && wanLinks.length === 0) {
    items.push({
      severity: "critical",
      title: "Multi-site scope lacks synthesized transport links",
      detail: "The project implies multiple sites, but the logical design does not currently have any inter-site transport links to carry routing adjacencies or summarized site reachability.",
      affected: siteHierarchy.map((item) => item.name),
    });
  }
  if (missingLoopbacks.length > 0) {
    items.push({
      severity: "critical",
      title: "Loopback identities are still missing",
      detail: "A stable routing and monitoring identity should exist per site or routing node before the implementation handoff is considered ready.",
      affected: missingLoopbacks.map((item) => item.siteName),
    });
  }
  if (hybrid && !routePolicies.some((item) => item.policyName === "Cloud and edge filtering")) {
    items.push({
      severity: "warning",
      title: "Cloud edge filtering policy is not explicit enough",
      detail: "Hybrid or cloud-connected designs should show how cloud/provider routes are filtered and summarized at the edge boundary.",
      affected: [profile.cloudProvider || "Cloud edge"],
    });
  }
  if (voice && qosPlan.length === 0) {
    items.push({
      severity: "warning",
      title: "Voice exists without a QoS treatment plan",
      detail: "The current requirements include voice or real-time traffic, but the design output does not yet carry a matching QoS plan.",
      affected: ["Voice"],
    });
  }
  if (!switchingDesign.some((item) => item.topic === "Loop prevention and switching control plane")) {
    items.push({
      severity: "warning",
      title: "Spanning-tree and L2 control-plane expectations are missing",
      detail: "The logical design should explicitly state how loops are prevented and where Layer 2 control-plane roles are anchored.",
      affected: siteHierarchy.map((item) => item.name),
    });
  }
  if (siteHierarchy.some((site) => site.allocatedSegmentAddresses > site.blockCapacity && site.blockCapacity > 0)) {
    items.push({
      severity: "critical",
      title: "Some site blocks are already over-allocated",
      detail: "A routing and switching design is not implementation-ready when the addressing hierarchy already exceeds the available site block space.",
      affected: siteHierarchy.filter((site) => site.allocatedSegmentAddresses > site.blockCapacity && site.blockCapacity > 0).map((site) => site.name),
    });
  }
  if (items.length === 0) {
    items.push({
      severity: "info",
      title: "Routing and switching posture is coherent for the saved scope",
      detail: "The current logical design shows a believable routing model, summarization approach, and switching boundary plan for a first implementation handoff.",
      affected: [],
    });
  }
  return items;
}

function buildImplementationPlanSummary(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  wanLinks: WanLinkPlanRow[];
  securityZones: SecurityZonePlan[];
}) {
  const { profile, siteHierarchy, wanLinks, securityZones } = input;
  const multiSite = siteHierarchy.length > 1;
  const hybrid = profile.cloudConnected || profile.environmentType !== "On-prem";
  const remote = profile.remoteAccess;

  const rolloutStrategy = multiSite
    ? `${profile.rolloutModel} with a pilot or primary site first, then controlled rollout to the remaining ${siteHierarchy.length - 1} site${siteHierarchy.length - 1 === 1 ? "" : "s"}.`
    : `${profile.rolloutModel} with a single-site execution window and explicit pre/post validation.`;

  const migrationStrategy = /new/i.test(profile.projectPhase)
    ? "Treat this as a staged greenfield bring-up: establish core services, security boundaries, and site addressing before user cutover."
    : /expand|add/i.test(profile.projectPhase)
      ? "Use additive migration where possible so new segments, uplinks, and services are introduced before production traffic is moved."
      : "Use a phased migration with design freeze, pilot validation, and tightly reviewed production cutovers rather than one large unstructured change.";

  const downtimePosture = `${profile.downtimeConstraint}. ${multiSite ? "Use smaller site-based windows instead of one global outage where possible." : "Keep the outage window tightly bounded and communicated to stakeholders."}`;
  const validationApproach = `Validate in sequence: addressing and gateway reachability, routing adjacency and summaries, security boundary enforcement, service reachability, then user and guest experience. ${remote || hybrid ? "Include remote-access and cloud-edge verification before sign-off." : "Complete local site verification before sign-off."}`;
  const rollbackPosture = wanLinks.length > 0
    ? "Each routed edge change should have a rollback trigger tied to lost adjacency, broken summary reachability, or failed critical-service validation."
    : "Each cutover step should have a rollback trigger tied to failed gateway, service, or user validation before moving deeper into the sequence.";
  const teamExecutionModel = `${profile.teamCapability}. Assign an implementation lead, validation owner, security reviewer, and communications owner even if one person covers multiple roles.`;
  const timelineGuidance = `${profile.implementationTimeline}. Freeze logical design and addressing decisions before the first production cutover.`;
  const handoffPackage = `${profile.outputPackage} for ${profile.primaryAudience}, including the logical design, addressing plan, routing/security intent, implementation plan, rollback triggers, and validation evidence.`;

  return {
    rolloutStrategy,
    migrationStrategy,
    downtimePosture,
    validationApproach,
    rollbackPosture,
    teamExecutionModel,
    timelineGuidance,
    handoffPackage,
  } satisfies ImplementationPlanSummary;
}

function buildImplementationPhases(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  routingPlan: RoutePlanItem[];
  wanLinks: WanLinkPlanRow[];
  securityZones: SecurityZonePlan[];
  segmentModel: SegmentModelItem[];
}) {
  const { profile, siteHierarchy, routingPlan, wanLinks, securityZones, segmentModel } = input;
  const multiSite = siteHierarchy.length > 1;
  const hasGuest = segmentModel.some((item) => item.role === "GUEST");
  const hasVoice = segmentModel.some((item) => item.role === "VOICE");
  const phases: ImplementationPhasePlan[] = [
    {
      phase: "1. Design freeze and prerequisites",
      objective: "Freeze the approved logical design, addressing hierarchy, and implementation ownership before any production changes begin.",
      scope: "Requirements sign-off, site block confirmation, summary route review, change window approval, and stakeholder communications.",
      dependencies: [
        "Final organization and site blocks confirmed",
        "Open critical validation issues resolved",
        "Implementation window and communications approved",
      ],
      successCriteria: [
        "Address hierarchy is locked for implementation",
        "Roles and change ownership are clear",
        "Rollback triggers are agreed before execution",
      ],
    },
    {
      phase: "2. Core services and control-plane preparation",
      objective: "Prepare routing identity, management access, shared services, and the security control points that the production cutover depends on.",
      scope: "Loopbacks, WAN/transit reservations, gateway conventions, management reachability, shared services reachability, and monitoring visibility.",
      dependencies: [
        "Baseline configs or templates prepared",
        "Management and logging expectations defined",
        "Critical shared services identified",
      ],
      successCriteria: [
        "Routing identities and summaries are ready",
        "Management and monitoring reach the intended control plane",
        "Shared services are reachable from the planned trusted domains",
      ],
    },
    {
      phase: multiSite ? "3. Pilot or primary-site cutover" : "3. Site cutover",
      objective: multiSite ? "Validate the design on the primary or pilot site before repeating it everywhere else." : "Move the site onto the new logical design in a controlled sequence.",
      scope: multiSite ? `Apply the site hierarchy, segment model, and security boundaries at ${siteHierarchy[0]?.name || "the primary site"}.` : "Apply the final segment, routing, and security design at the site.",
      dependencies: [
        "Phase 1 and 2 completed",
        "Cutover checklist approved",
        "Rollback plan ready at the console/operations bridge",
      ],
      successCriteria: [
        "Gateways, services, and trusted user access validate successfully",
        hasGuest ? "Guest isolation validates as intended" : "No guest-isolation validation is required for this scope",
        hasVoice ? "Voice or real-time treatment behaves acceptably" : "No voice-specific validation is required for this scope",
      ],
    },
  ];

  if (multiSite) {
    phases.push({
      phase: "4. Branch or remaining-site rollout",
      objective: "Repeat the validated pattern across the remaining sites with minimal deviation from the approved logical design.",
      scope: `Roll the approved design to ${Math.max(siteHierarchy.length - 1, 1)} remaining site${siteHierarchy.length - 1 === 1 ? "" : "s"}, preserving addressing, summaries, and trust boundaries.`,
      dependencies: [
        "Pilot/primary site validated",
        "Site-specific constraints reviewed",
        wanLinks.length > 0 ? "Transit links and edge routes reserved for each additional site" : "Any remaining site transport constraints documented",
      ],
      successCriteria: [
        "Additional sites inherit the same design intent cleanly",
        "Summaries, routing identity, and security posture remain consistent",
        "Cross-site service reachability validates without introducing address conflicts",
      ],
    });
  }

  phases.push({
    phase: `${multiSite ? "5" : "4"}. Security, routing, and failover verification`,
    objective: "Prove that the implemented design behaves correctly under both normal and failure-aware test conditions.",
    scope: "Policy checks, route path review, summary reachability, remote/cloud edge tests where relevant, and resilience/failover checks where the scenario requires them.",
    dependencies: [
      "Production cutover completed",
      securityZones.length > 0 ? "Security zones and control points active" : "Basic policy boundaries active",
      routingPlan.length > 0 ? "Routing identities and summaries present" : "Local routed design ready for review",
    ],
    successCriteria: [
      "Critical services stay reachable through the intended paths",
      "Blocked flows remain blocked",
      "Failure-domain and recovery behavior match the agreed outage tolerance",
    ],
  });

  phases.push({
    phase: `${multiSite ? "6" : "5"}. Documentation, acceptance, and handoff`,
    objective: "Close the project with evidence, final documentation, and a supportable handoff package.",
    scope: "Implementation record, validation evidence, final tables/diagrams, known issues, and operator-facing handoff notes.",
    dependencies: [
      "Validation evidence captured",
      "Residual issues documented",
      "Final review completed with the target audience",
    ],
    successCriteria: [
      "The design package is usable by engineering and operations",
      "Known deviations and risks are documented",
      "The support team understands the new boundaries and expected behavior",
    ],
  });

  return phases;
}

function buildCutoverChecklist(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  wanLinks: WanLinkPlanRow[];
}) {
  const { profile, siteHierarchy, wanLinks } = input;
  const multiSite = siteHierarchy.length > 1;
  const items: CutoverChecklistItem[] = [
    { stage: "pre-check", item: "Confirm the approved addressing table, gateways, summaries, and affected sites for this change window.", owner: "Implementation lead", rationale: "The cutover should execute the approved logical design, not an improvised interpretation." },
    { stage: "pre-check", item: "Back up current configs, inventory the affected devices, and confirm console or out-of-band access.", owner: "Implementation lead", rationale: "Rollback is only realistic when the pre-change state is captured and reachable." },
    { stage: "pre-check", item: `Review downtime expectations and stakeholder communications: ${profile.downtimeConstraint}.`, owner: "Project or change owner", rationale: "The project should not surprise the business during a production cutover." },
    { stage: "cutover", item: "Apply the new VLAN/subnet/gateway model in the planned sequence rather than changing many unrelated control points at once.", owner: "Implementation lead", rationale: "Sequencing preserves fault isolation and makes rollback decisions clearer." },
    { stage: "cutover", item: "Verify routing adjacency, site summaries, and default-path expectations before moving user or guest traffic fully onto the new design.", owner: "Routing owner", rationale: "Control-plane correctness must be proven before trusting the data plane." },
    { stage: "cutover", item: "Validate security boundaries and intended allowed flows before declaring the cutover complete.", owner: "Security reviewer", rationale: "A working network that ignores its trust model is not an acceptable result." },
    { stage: "post-check", item: "Run service validation for trusted users, shared services, guest access, and management reachability as applicable.", owner: "Validation owner", rationale: "Post-checks prove that the change worked for real users and operators." },
    { stage: "post-check", item: "Capture final evidence, exceptions, and follow-up actions in the implementation record.", owner: "Project or change owner", rationale: "Senior-grade delivery includes evidence, not just a claim that the cutover succeeded." },
  ];

  if (multiSite) {
    items.splice(3, 0, { stage: "pre-check", item: "Confirm which site or pilot wave is in scope for this window and keep the remaining sites unchanged until validation passes.", owner: "Project or change owner", rationale: "Multi-site rollouts should be wave-based, not all-or-nothing by default." });
  }
  if (wanLinks.length > 0) {
    items.push({ stage: "post-check", item: "Verify inter-site or cloud-edge reachability across every affected transit link and confirm summary-route behavior from each edge.", owner: "Routing owner", rationale: "WAN and hybrid designs fail in subtle ways if the edge is not validated explicitly." });
  }

  return items;
}

function buildRollbackPlan(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  wanLinks: WanLinkPlanRow[];
  securityZones: SecurityZonePlan[];
}) {
  const { profile, siteHierarchy, wanLinks, securityZones } = input;
  const items: RollbackPlanItem[] = [
    {
      trigger: "Critical gateway or service validation fails after the routed/subnet change",
      action: "Restore the last known-good gateway/VLAN/routing state for the affected scope before attempting deeper troubleshooting.",
      scope: siteHierarchy.length > 1 ? "Per affected site or cutover wave" : "Site-wide",
    },
    {
      trigger: "Routing adjacency, site summary reachability, or default-path behavior breaks beyond the agreed outage tolerance",
      action: "Revert the affected edge or summary-route change and re-establish the previous path while preserving management access.",
      scope: wanLinks.length > 0 ? "Affected routed edge or transport link" : "Affected routed boundary",
    },
    {
      trigger: "Security policy blocks critical production flows or exposes a trust boundary incorrectly",
      action: "Return to the last reviewed policy state and reopen only the minimum reviewed flows needed for stability.",
      scope: securityZones.length > 0 ? "Affected zone boundary" : "Affected service boundary",
    },
    {
      trigger: `Change duration exceeds the planned window or communications threshold (${profile.downtimeConstraint})`,
      action: "Stop adding new changes, stabilize the environment, and execute the pre-approved rollback point for the unfinished scope.",
      scope: "Current change window",
    },
  ];
  return items;
}

function buildValidationPlan(input: {
  profile: RequirementsProfile;
  securityZones: SecurityZonePlan[];
  wanLinks: WanLinkPlanRow[];
  segmentModel: SegmentModelItem[];
}) {
  const { profile, securityZones, wanLinks, segmentModel } = input;
  const items: ValidationTestPlanItem[] = [
    {
      stage: "Pre-cutover baseline",
      test: "Capture current gateway, service, management, and user-path health before changes begin.",
      expectedOutcome: "A baseline exists for comparison and rollback decisions.",
      evidence: "Ping/traceroute outputs, management reachability, and service screenshots or logs.",
    },
    {
      stage: "Cutover validation",
      test: "Confirm the new gateways, DHCP behavior, and routed reachability per affected segment.",
      expectedOutcome: "Each changed segment reaches its intended gateway and reviewed services without overlap or routing ambiguity.",
      evidence: "Gateway tests, DHCP lease proof, and routed reachability checks.",
    },
    {
      stage: "Security verification",
      test: "Check that allowed flows work and blocked flows remain blocked across the defined trust boundaries.",
      expectedOutcome: "The design's policy intent matches the implemented behavior.",
      evidence: "Firewall/ACL logs, successful approved-flow tests, and failed blocked-flow tests.",
    },
  ];
  if (wanLinks.length > 0) {
    items.push({
      stage: "WAN / cloud edge verification",
      test: "Validate transit links, site summaries, cloud/provider edge paths, and failback/default-route expectations.",
      expectedOutcome: "Inter-site and edge reachability work through the intended routed paths.",
      evidence: "Adjacency status, route table checks, traceroutes, and service reachability from both sides of the edge.",
    });
  }
  if (segmentModel.some((item) => item.role === "VOICE") || /voice|real-time/i.test(profile.latencySensitivity)) {
    items.push({
      stage: "QoS / real-time validation",
      test: "Verify that voice or latency-sensitive traffic receives the expected treatment during load or contention.",
      expectedOutcome: "Real-time traffic remains usable and consistent with the design intent.",
      evidence: "Call or application test notes, queue/policy counters, and user validation.",
    });
  }
  if (profile.remoteAccess || securityZones.some((zone) => zone.zoneName === "Remote access edge")) {
    items.push({
      stage: "Remote-access verification",
      test: "Validate authentication, landing-zone placement, and the approved destination reachability for remote users or admins.",
      expectedOutcome: "Remote sessions land with the intended trust posture and do not bypass segmentation rules.",
      evidence: "Login proof, route/path validation, and policy logs.",
    });
  }
  items.push({
    stage: "Post-cutover acceptance",
    test: "Review monitoring, logging, backups, and handoff artifacts after the technical checks pass.",
    expectedOutcome: "Operations receives an evidence-backed handoff instead of a best-guess support posture.",
    evidence: "Monitoring visibility, log ingestion proof, config backup status, and final report package.",
  });
  return items;
}

function buildImplementationRisks(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  openIssues: string[];
  implementationSummary: ImplementationPlanSummary;
  segmentationReview: SegmentationReviewItem[];
  routingSwitchingReview: RoutingSwitchingReviewItem[];
}) {
  const { profile, siteHierarchy, openIssues, implementationSummary, segmentationReview, routingSwitchingReview } = input;
  const risks: ImplementationRiskItem[] = [];

  if (openIssues.length > 0) {
    risks.push({
      severity: "critical",
      title: "Open design issues still exist before execution",
      mitigation: "Resolve or explicitly waive the remaining open issues before the production cutover window begins.",
      owner: "Design authority / implementation lead",
    });
  }
  if (/small|limited|lean/i.test(profile.teamCapability)) {
    risks.push({
      severity: "warning",
      title: "Execution team may be thin for concurrent design, cutover, and validation duties",
      mitigation: implementationSummary.teamExecutionModel,
      owner: "Project or change owner",
    });
  }
  if (siteHierarchy.length > 1 && !/phase|wave|pilot/i.test(profile.rolloutModel)) {
    risks.push({
      severity: "warning",
      title: "Multi-site scope without an explicitly phased rollout model",
      mitigation: "Break the rollout into a pilot or site-based wave plan before production work starts.",
      owner: "Project or change owner",
    });
  }
  if (segmentationReview.some((item) => item.severity === "critical") || routingSwitchingReview.some((item) => item.severity === "critical")) {
    risks.push({
      severity: "critical",
      title: "Critical design-review findings would undermine a clean cutover",
      mitigation: "Resolve critical segmentation, routing, or switching findings before the implementation window.",
      owner: "Technical design reviewer",
    });
  }
  if (risks.length === 0) {
    risks.push({
      severity: "info",
      title: "Implementation posture is reviewable",
      mitigation: "Proceed only after the cutover checklist, rollback triggers, and validation plan are accepted by the team.",
      owner: "Implementation lead",
    });
  }

  return risks;
}

function buildLogicalDomains(segmentModel: SegmentModelItem[], profile: RequirementsProfile) {

  const grouped = (roles: SegmentRole[]) => segmentModel
    .filter((segment) => roles.includes(segment.role))
    .map((segment) => segment.vlanId ? `VLAN ${segment.vlanId} ${segment.label}` : segment.label);

  const domains: LogicalDomainIntent[] = [];
  const corporateSegments = grouped(["USER"]);
  if (corporateSegments.length > 0) {
    domains.push({
      name: "Corporate access domain",
      segments: corporateSegments,
      purpose: "Trusted staff, office, and primary production user access.",
      placement: "Present at each user-facing site and kept separate from management, guest, and services.",
      policy: `${profile.securityPosture}.`,
    });
  }

  const serviceSegments = grouped(["SERVER", "PRINTER"]);
  if (serviceSegments.length > 0) {
    domains.push({
      name: "Services domain",
      segments: serviceSegments,
      purpose: "Shared infrastructure, application services, and service-adjacent devices.",
      placement: /central/i.test(profile.serverPlacement || "")
        ? "Prefer centralized placement at the primary site or shared service edge."
        : "Can be distributed per site where local service delivery is required.",
      policy: `${profile.criticalServicesModel}.`,
    });
  }

  const guestSegments = grouped(["GUEST"]);
  if (guestSegments.length > 0) {
    domains.push({
      name: "Guest access domain",
      segments: guestSegments,
      purpose: "Untrusted or semi-trusted guest wireless/internet access.",
      placement: "Local internet breakout or tightly controlled upstream access only.",
      policy: `${profile.guestPolicy}.`,
    });
  }

  const specialtySegments = grouped(["VOICE", "IOT", "CAMERA"]);
  if (specialtySegments.length > 0) {
    domains.push({
      name: "Specialty device domain",
      segments: specialtySegments,
      purpose: "Voice, IoT, OT, camera, or other non-user traffic classes with different policy needs.",
      placement: "Separated from primary user access so policy and QoS can be applied cleanly.",
      policy: `${profile.qosModel}. ${profile.trustBoundaryModel}.`,
    });
  }

  const managementSegments = grouped(["MANAGEMENT"]);
  if (managementSegments.length > 0) {
    domains.push({
      name: "Management and control domain",
      segments: managementSegments,
      purpose: "Privileged administration, monitoring, and device management access.",
      placement: "Only exposed to trusted operators and management tooling.",
      policy: `${profile.managementAccess}. ${profile.managementIpPolicy}.`,
    });
  }

  const infrastructureSegments = grouped(["WAN_TRANSIT", "LOOPBACK"]);
  if (infrastructureSegments.length > 0) {
    domains.push({
      name: "Routing and transport domain",
      segments: infrastructureSegments,
      purpose: "Inter-site transit, loopback identity, and routed transport control.",
      placement: "Used at site edges and routing adjacencies rather than for end-user access.",
      policy: `${profile.cloudRoutingModel}.`,
    });
  }

  return domains;
}


function buildSecurityZones(logicalDomains: LogicalDomainIntent[], segmentModel: SegmentModelItem[], profile: RequirementsProfile) {
  const zones: SecurityZonePlan[] = [];
  const findDomain = (name: string) => logicalDomains.find((domain) => domain.name === name);

  const corporate = findDomain("Corporate access domain");
  if (corporate) {
    zones.push({
      zoneName: "Trusted user zone",
      zoneType: "trusted",
      segments: corporate.segments,
      trustLevel: "Trusted staff and primary business access",
      enforcement: "Routed gateway boundary with firewall or ACL policy toward services, management, guest, and specialty zones",
      northSouthPolicy: "Allow only required internet, remote-service, and application flows. Inspect outbound access where security posture requires it.",
      eastWestPolicy: "Do not allow unrestricted east-west movement into services, management, or guest zones.",
      identityControl: profile.identityModel,
      monitoringExpectation: profile.monitoringModel,
      notes: ["This zone should remain the main user domain rather than a catch-all for every device type."],
    });
  }

  const services = findDomain("Services domain");
  if (services) {
    zones.push({
      zoneName: "Services zone",
      zoneType: "service",
      segments: services.segments,
      trustLevel: "Restricted shared-service boundary",
      enforcement: "Protected by service-facing firewall policy, internal ACLs, or routed policy boundaries.",
      northSouthPolicy: "Expose only the service flows required by users, admins, branches, or cloud consumers.",
      eastWestPolicy: "Limit east-west access to explicit service dependencies rather than broad lateral trust.",
      identityControl: profile.identityModel,
      monitoringExpectation: `${profile.loggingModel}. ${profile.backupPolicy}.`,
      notes: [/central/i.test(profile.serverPlacement || "") ? "Primary shared services are expected to anchor here." : "Local site services can live here, but they should still stay isolated from user access."],
    });
  }

  const guest = findDomain("Guest access domain");
  if (guest) {
    zones.push({
      zoneName: "Guest zone",
      zoneType: "untrusted",
      segments: guest.segments,
      trustLevel: "Untrusted or semi-trusted access",
      enforcement: "Internet-only breakout or tightly filtered upstream access with no implicit trust into internal zones.",
      northSouthPolicy: profile.guestPolicy,
      eastWestPolicy: "Deny guest-to-corporate, guest-to-management, and guest-to-services by default unless a reviewed exception exists.",
      identityControl: profile.wirelessModel,
      monitoringExpectation: profile.loggingModel,
      notes: ["Guest access should never inherit the same policy posture as staff access."],
    });
  }

  const specialty = findDomain("Specialty device domain");
  if (specialty) {
    zones.push({
      zoneName: "Specialty device zone",
      zoneType: "restricted",
      segments: specialty.segments,
      trustLevel: "Constrained device trust with tighter traffic controls",
      enforcement: "Apply zone policy, QoS, and service-allow lists per device class rather than giving broad user-like access.",
      northSouthPolicy: "Permit only device-specific flows to controllers, call platforms, recorders, or application services.",
      eastWestPolicy: "Avoid lateral trust between specialty devices and user endpoints unless there is a proven business need.",
      identityControl: profile.trustBoundaryModel,
      monitoringExpectation: `${profile.monitoringModel}. ${profile.qosModel}.`,
      notes: ["Voice, IoT, cameras, and similar systems should not sit in the same trust model as general user access."],
    });
  }

  const management = findDomain("Management and control domain");
  if (management) {
    zones.push({
      zoneName: "Management zone",
      zoneType: "management",
      segments: management.segments,
      trustLevel: "Privileged administrative access only",
      enforcement: "Administrative boundary enforced through dedicated subnets, jump/bastion paths, or firewall policy.",
      northSouthPolicy: profile.managementAccess,
      eastWestPolicy: "Allow only administrative protocols from approved operators or tooling; deny general user access by default.",
      identityControl: `${profile.identityModel}. ${profile.adminBoundary}.`,
      monitoringExpectation: `${profile.loggingModel}. ${profile.monitoringModel}.`,
      notes: ["Management should remain reachable only from trusted operators and tooling."],
    });
  }

  const transport = findDomain("Routing and transport domain");
  if (transport) {
    zones.push({
      zoneName: "Routing and transport zone",
      zoneType: "transit",
      segments: transport.segments,
      trustLevel: "Control-plane and transport-only trust",
      enforcement: "Keep routed transport separate from user VLANs and treat edge adjacencies as infrastructure-only boundaries.",
      northSouthPolicy: "Allow only routing, monitoring, and tightly scoped transport flows.",
      eastWestPolicy: "Do not use transport networks as shared service or user access paths.",
      identityControl: profile.cloudRoutingModel,
      monitoringExpectation: `${profile.monitoringModel}. ${profile.loggingModel}.`,
      notes: ["Transit links and loopbacks exist to support routing identity and transport, not end-user traffic."],
    });
  }

  if (profile.remoteAccess) {
    zones.push({
      zoneName: "Remote access edge",
      zoneType: "edge",
      segments: [profile.remoteAccessMethod],
      trustLevel: "Externally terminated but identity-gated access",
      enforcement: "Terminate remote access at a reviewed edge and land it into policy-controlled internal zones.",
      northSouthPolicy: `Use ${profile.remoteAccessMethod} with strong identity checks before allowing access into trusted zones.`,
      eastWestPolicy: "Do not grant broad lateral trust from the remote-access edge; policy should map access to role and destination.",
      identityControl: `${profile.identityModel}. MFA or equivalent strong identity controls should be assumed.`,
      monitoringExpectation: `${profile.loggingModel}. Remote access events should be reviewable centrally.`,
      notes: ["Remote access is a security boundary, not just another network segment."],
    });
  }

  if (profile.cloudConnected || profile.environmentType !== "On-prem") {
    zones.push({
      zoneName: "Cloud service boundary",
      zoneType: "cloud",
      segments: [profile.cloudNetworkModel],
      trustLevel: "Provider-hosted private application boundary",
      enforcement: "Keep cloud prefixes, identity boundaries, and route advertisements explicitly scoped.",
      northSouthPolicy: `${profile.cloudConnectivity}. ${profile.cloudTrafficBoundary}.`,
      eastWestPolicy: "Allow only the reviewed private flows between on-prem and cloud application/service boundaries.",
      identityControl: `${profile.cloudIdentityBoundary}. ${profile.identityModel}.`,
      monitoringExpectation: `${profile.monitoringModel}. ${profile.loggingModel}.`,
      notes: ["Cloud connectivity should behave like a reviewed trust boundary, not like an extension cord for the LAN."],
    });
  }

  return zones;
}

function buildSecurityControls(profile: RequirementsProfile, segmentModel: SegmentModelItem[]) {
  const controls: SecurityControlItem[] = [
    {
      control: "Inter-zone default deny posture",
      status: "required",
      rationale: "A segmented design loses most of its value if unlike trust zones are allowed to talk freely by default.",
      implementationHint: "Use firewall zones, routed ACLs, or policy controls so only reviewed flows are allowed between user, services, management, guest, and specialty boundaries.",
    },
    {
      control: "Central logging and event retention",
      status: "required",
      rationale: "Security review and operational support both need a reliable record of infrastructure and access events.",
      implementationHint: `${profile.loggingModel}.`,
    },
    {
      control: "Network monitoring and health visibility",
      status: "required",
      rationale: "A senior-grade design package should assume operational visibility from day one.",
      implementationHint: `${profile.monitoringModel}.`,
    },
  ];

  if (profile.management || segmentModel.some((segment) => segment.role === "MANAGEMENT")) {
    controls.push({
      control: "Privileged management isolation",
      status: "required",
      rationale: "Administrative traffic should not share the same trust and reachability model as user access.",
      implementationHint: `${profile.managementAccess}. ${profile.managementIpPolicy}.`,
    });
  }

  if (profile.guestWifi || segmentModel.some((segment) => segment.role === "GUEST")) {
    controls.push({
      control: "Guest isolation and internet-only policy",
      status: "required",
      rationale: "Guest access is one of the clearest internal vs untrusted boundaries in a campus or branch design.",
      implementationHint: `${profile.guestPolicy}.`,
    });
  }

  if (profile.remoteAccess) {
    controls.push({
      control: "Remote access identity enforcement",
      status: "required",
      rationale: "Remote access extends the attack surface and should be identity-gated before it reaches trusted zones.",
      implementationHint: `Terminate ${profile.remoteAccessMethod} at a reviewed edge with strong identity checks and role-based destination access.`,
    });
  }

  if (profile.wireless || profile.guestWifi) {
    controls.push({
      control: "SSID-to-zone mapping",
      status: "required",
      rationale: "Wireless access should inherit the same trust model as the wired design rather than creating unmanaged overlays.",
      implementationHint: `${profile.wirelessModel}.`,
    });
  }

  if (profile.iot || profile.cameras || profile.voice) {
    controls.push({
      control: "Specialty-device traffic allow lists",
      status: "recommended",
      rationale: "Device classes such as voice, IoT, and cameras usually need narrower and more predictable flows than user endpoints.",
      implementationHint: `${profile.trustBoundaryModel}. ${profile.qosModel}.`,
    });
  }

  if (profile.cloudConnected || profile.environmentType !== "On-prem") {
    controls.push({
      control: "Cloud boundary scoping",
      status: "required",
      rationale: "Hybrid designs need clear separation between private cloud prefixes, identity scope, and public-edge access.",
      implementationHint: `${profile.cloudConnectivity}. ${profile.cloudTrafficBoundary}. ${profile.cloudIdentityBoundary}.`,
    });
  }

  controls.push({
    control: "Configuration backup and recovery discipline",
    status: "recommended",
    rationale: "Security and resilience both improve when infrastructure state is recoverable and reviewable.",
    implementationHint: `${profile.backupPolicy}.`,
  });

  return controls;
}

function buildSecurityPolicyMatrix(zones: SecurityZonePlan[]) {
  const matrix: SecurityPolicyMatrixRow[] = [];
  const has = (name: string) => zones.some((zone) => zone.zoneName === name);
  const add = (row: SecurityPolicyMatrixRow) => matrix.push(row);

  if (has("Trusted user zone") && has("Services zone")) {
    add({
      sourceZone: "Trusted user zone",
      targetZone: "Services zone",
      defaultAction: "Allow reviewed business flows only",
      allowedFlows: "Directory, DNS/DHCP, application access, print/file services, approved internal apps",
      controlPoint: "Internal firewall policy or routed ACL boundary",
      notes: ["Do not give the user zone unrestricted access to every service just because both are internal."],
    });
  }
  if (has("Trusted user zone") && has("Guest zone")) {
    add({
      sourceZone: "Trusted user zone",
      targetZone: "Guest zone",
      defaultAction: "Deny by default",
      allowedFlows: "Normally none",
      controlPoint: "Inter-zone firewall or ACL boundary",
      notes: ["User and guest traffic should not mix laterally."],
    });
  }
  if (has("Guest zone") && has("Trusted user zone")) {
    add({
      sourceZone: "Guest zone",
      targetZone: "Trusted user zone",
      defaultAction: "Deny by default",
      allowedFlows: "None unless a reviewed captive-portal or onboarding exception exists",
      controlPoint: "Guest firewall policy or internet-only breakout edge",
      notes: ["Guest is treated as untrusted relative to corporate access."],
    });
  }
  if (has("Guest zone") && has("Services zone")) {
    add({
      sourceZone: "Guest zone",
      targetZone: "Services zone",
      defaultAction: "Deny by default",
      allowedFlows: "Normally none; only tightly reviewed guest-facing services if intentionally exposed",
      controlPoint: "Firewall DMZ/service policy",
      notes: ["Do not let guest access inherit internal service trust."],
    });
  }
  if (has("Management zone") && has("Trusted user zone")) {
    add({
      sourceZone: "Management zone",
      targetZone: "Trusted user zone",
      defaultAction: "Minimal and exceptional",
      allowedFlows: "Administrative troubleshooting only where approved",
      controlPoint: "Privileged admin policy/jump path",
      notes: ["Management should initiate admin traffic when required, not remain broadly reachable from users."],
    });
  }
  if (has("Management zone") && has("Services zone")) {
    add({
      sourceZone: "Management zone",
      targetZone: "Services zone",
      defaultAction: "Allow reviewed administrative flows",
      allowedFlows: "SSH/HTTPS/API/SNMP or platform-specific admin tooling as approved",
      controlPoint: "Admin firewall policy or bastion/jump architecture",
      notes: ["Admin access should be logged and attributable."],
    });
  }
  if (has("Specialty device zone") && has("Services zone")) {
    add({
      sourceZone: "Specialty device zone",
      targetZone: "Services zone",
      defaultAction: "Allow device-specific flows only",
      allowedFlows: "Call control, controllers, NVR/recording, OT applications, or approved service dependencies",
      controlPoint: "Policy boundary with protocol-specific allow rules",
      notes: ["Specialty traffic should be allow-listed rather than granted broad service reachability."],
    });
  }
  if (has("Remote access edge") && has("Trusted user zone")) {
    add({
      sourceZone: "Remote access edge",
      targetZone: "Trusted user zone",
      defaultAction: "Role-based allow only",
      allowedFlows: "Approved user destinations after identity verification",
      controlPoint: "Remote access gateway and internal policy boundary",
      notes: ["Remote access should not land with the same trust posture as an internal wired user by default."],
    });
  }
  if (has("Remote access edge") && has("Management zone")) {
    add({
      sourceZone: "Remote access edge",
      targetZone: "Management zone",
      defaultAction: "Highly restricted",
      allowedFlows: "Only approved admin workflows through privileged access controls",
      controlPoint: "VPN gateway plus bastion/admin policy",
      notes: ["Administrative remote access should be tightly constrained and logged."],
    });
  }
  if (has("Cloud service boundary") && has("Services zone")) {
    add({
      sourceZone: "Cloud service boundary",
      targetZone: "Services zone",
      defaultAction: "Allow reviewed private application flows",
      allowedFlows: "Private service/application traffic, identity, and management flows explicitly required by the design",
      controlPoint: "Hybrid edge firewall and route-policy boundary",
      notes: ["Cloud connectivity should remain scoped to private reviewed prefixes and flows."],
    });
  }
  if (has("Routing and transport zone") && has("Trusted user zone")) {
    add({
      sourceZone: "Routing and transport zone",
      targetZone: "Trusted user zone",
      defaultAction: "Deny user-data use by default",
      allowedFlows: "Control-plane and management visibility only",
      controlPoint: "Edge routing and infrastructure policy",
      notes: ["Transit networks are not a user or service access domain."],
    });
  }

  return matrix;
}

function buildSegmentationReview(input: {
  profile: RequirementsProfile;
  rows: AddressingPlanRow[];
  segmentModel: SegmentModelItem[];
  securityZones: SecurityZonePlan[];
}) {
  const { profile, rows, segmentModel, securityZones } = input;
  const items: SegmentationReviewItem[] = [];
  const hasRole = (role: SegmentRole) => segmentModel.some((segment) => segment.role === role);
  const hasZone = (zoneName: string) => securityZones.some((zone) => zone.zoneName === zoneName);

  if (profile.guestWifi && !hasRole("GUEST")) {
    items.push({ severity: "critical", title: "Guest requirement has no guest segment", detail: "The requirements call for guest access, but no guest segment exists in the current synthesized model.", affected: ["Guest access"] });
  }
  if (profile.management && !hasRole("MANAGEMENT")) {
    items.push({ severity: "critical", title: "Management isolation is missing", detail: "Management was requested, but there is no dedicated management segment in the current logical design.", affected: ["Management"] });
  }
  if (profile.remoteAccess && !hasZone("Remote access edge")) {
    items.push({ severity: "warning", title: "Remote access edge not modeled as its own boundary", detail: "Remote access is enabled, but the design does not yet treat that edge as a clearly reviewed security boundary.", affected: ["Remote access"] });
  }
  if ((profile.iot || profile.cameras || profile.voice) && !hasZone("Specialty device zone")) {
    items.push({ severity: "warning", title: "Specialty traffic lacks a distinct policy zone", detail: "Voice, IoT, or camera traffic is expected, but the design does not yet show a clear specialty-device boundary.", affected: ["Voice / IoT / Cameras"] });
  }
  if ((profile.cloudConnected || profile.environmentType !== "On-prem") && !hasZone("Cloud service boundary")) {
    items.push({ severity: "warning", title: "Hybrid/cloud boundary is under-modeled", detail: "Cloud-connected scope exists, but the security model does not yet show a clear cloud service boundary and controlled flows.", affected: ["Cloud / Hybrid"] });
  }

  const guestUserOverlap = rows.some((row) => row.role === "GUEST" && rows.some((other) => other.siteId === row.siteId && other.role === "USER" && other.subnetCidr === row.subnetCidr && row.subnetCidr !== "Unassigned"));
  if (guestUserOverlap) {
    items.push({ severity: "critical", title: "Guest and user traffic share the same subnet", detail: "At least one site currently places guest and trusted user traffic inside the same subnet, which defeats the intended trust boundary.", affected: ["Guest zone", "Trusted user zone"] });
  }

  const managementUserOverlap = rows.some((row) => row.role === "MANAGEMENT" && rows.some((other) => other.siteId === row.siteId && other.role === "USER" && other.subnetCidr === row.subnetCidr && row.subnetCidr !== "Unassigned"));
  if (managementUserOverlap) {
    items.push({ severity: "critical", title: "Management and user traffic share the same subnet", detail: "At least one site currently places privileged management access inside the same subnet as user traffic.", affected: ["Management zone", "Trusted user zone"] });
  }

  const sharedFlatModel = securityZones.length <= 2 && (profile.guestWifi || profile.management || profile.remoteAccess || profile.iot || profile.cameras);
  if (sharedFlatModel) {
    items.push({ severity: "warning", title: "Security model still looks flat", detail: "The current design has too few distinct security zones for the enabled feature set, which suggests the trust model may still be too broad.", affected: securityZones.map((zone) => zone.zoneName) });
  }

  if (items.length === 0) {
    items.push({ severity: "info", title: "Segmentation posture looks coherent", detail: "The current synthesized design shows distinct trust boundaries for the enabled feature set. Final platform-specific rules still need implementation review.", affected: securityZones.map((zone) => zone.zoneName) });
  }

  return items;
}

function buildHighLevelDesign(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  segmentModel: SegmentModelItem[];
  logicalDomains: LogicalDomainIntent[];
  wanLinks: WanLinkPlanRow[];
  topology: TopologyBlueprint;
  sitePlacements: SitePlacementDevice[];
  servicePlacements: ServicePlacementItem[];
  securityBoundaries: SecurityBoundaryDetail[];
  trafficFlows: TrafficFlowPath[];
  flowCoverage: FlowCoverageItem[];
  routingPlan: RoutePlanItem[];
  routePlan?: RoutePlanItem[];
  topologyModel?: TopologyBlueprint;
  servicePlacementModel?: ServicePlacementItem[];
  securityBoundaryModel?: SecurityBoundaryDetail[];
  trafficFlowModel?: TrafficFlowPath[];
  routingIntentModel?: { siteRouting: RoutePlanItem[] };
}) {
  const { profile, siteHierarchy, segmentModel, logicalDomains, wanLinks, routingPlan } = input;
  const siteCount = siteHierarchy.length;
  const usersPerSite = toNumber(profile.usersPerSite, 50);
  const buildingCount = toNumber(profile.buildingCount, 1);
  const floorCount = toNumber(profile.floorCount, 1);
  const largeCampus = usersPerSite >= 250 || buildingCount > 1 || floorCount > 2;
  const multiSite = siteCount > 1;
  const hybrid = profile.cloudConnected || profile.environmentType !== "On-prem";
  const specialtyEdge = segmentModel.some((segment) => ["VOICE", "IOT", "CAMERA"].includes(segment.role));
  const managementBoundary = segmentModel.some((segment) => segment.role === "MANAGEMENT");
  const architecturePattern = multiSite
    ? "Multi-site hub-and-spoke logical architecture with a primary site coordinating shared services and branch/site summarization"
    : largeCampus
      ? "Single-site campus-style logical architecture with a collapsed core/distribution layer and structured access edge"
      : "Compact single-site routed access architecture with segmented service boundaries";
  const layerModel = multiSite
    ? "Primary site acts as the shared service and routing hub, while smaller sites use a collapsed edge and summarized uplinks"
    : largeCampus
      ? "Use a routed distribution/core boundary above the access layer to avoid extending large Layer 2 domains"
      : "Use a collapsed core/access approach with VLAN boundaries terminated at a local Layer 3 edge";
  const wanArchitecture = multiSite
    ? `${profile.internetModel} with ${wanLinks.length > 0 ? `${wanLinks.length} dedicated transit link${wanLinks.length === 1 ? "" : "s"}` : "planned inter-site transport"}${profile.dualIsp ? ", plus resilience planning for dual transport paths" : ""}.`
    : "No branch WAN is required yet; keep the routed edge simple and prepare for future site summarization if the project expands.";
  const cloudArchitecture = hybrid
    ? `${profile.cloudProvider} connectivity via ${profile.cloudConnectivity}. Keep cloud prefixes, identity boundaries, and on-prem summaries explicitly separated.`
    : "Cloud connectivity is not a primary driver in the current scope, so the design stays focused on on-prem logical domains and routed service boundaries.";
  const dataCenterArchitecture = /central/i.test(profile.serverPlacement || "")
    ? multiSite
      ? "Use a centralized services model at the primary site or shared service edge rather than duplicating every service at every branch."
      : "Use a small centralized service block inside the primary site and keep user/service traffic separated by policy."
    : "Distributed local services may exist per site, but each site should still preserve a clear services domain and avoid mixing services into user segments.";
  const redundancyModel = profile.dualIsp
    ? `Target resilient WAN or internet access, redundant uplinks where practical, and controlled failover aligned with ${profile.resilienceTarget}.`
    : `Use a simpler primary-path design with measured resilience aligned to ${profile.resilienceTarget}; add redundancy only where the critical service profile justifies it.`;
  const routingStrategy = multiSite || hybrid
    ? "Use a summarized internal routing model between site blocks, keep loopbacks stable for routing identity, and reserve BGP-style thinking for provider/cloud edges when needed."
    : "Keep routing inside a single logical domain with routed VLAN gateways and a small, supportable internal control plane.";
  const switchingStrategy = largeCampus || specialtyEdge
    ? "Use structured access switching, aggregated uplinks where supported, and avoid unnecessary large Layer 2 blast radii across buildings or floors."
    : "Use compact access switching with deliberate VLAN trunks, routed gateways, and minimal fault-domain sprawl.";
  const segmentationStrategy = `Translate ${logicalDomains.length} logical domain${logicalDomains.length === 1 ? "" : "s"} into VLANs, routed boundaries, and firewall/policy enforcement points instead of mixing unlike trust levels together.`;
  const securityArchitecture = managementBoundary || profile.guestWifi || profile.remoteAccess || profile.iot || profile.cameras
    ? `${profile.trustBoundaryModel}. Pair this with ${profile.identityModel}, separate management access, and clear north-south vs east-west control points.`
    : `${profile.securityPosture}. The design can remain lighter, but still should not collapse all services and users into a single flat trust zone.`;
  const wirelessArchitecture = profile.wireless || profile.guestWifi
    ? `${profile.wirelessModel}. Keep SSIDs mapped to the correct trust domains rather than treating wireless as one broad access network.`
    : "Wireless is not a major design driver in the current scope.";
  const operationsArchitecture = `${profile.monitoringModel}. ${profile.loggingModel}. ${profile.backupPolicy}.`;
  const rationale = [
    `Architecture pattern chosen because the project scope covers ${siteCount} site${siteCount === 1 ? "" : "s"} with ${usersPerSite} users per site and a primary goal of ${profile.primaryGoal}.`,
    multiSite
      ? "Site summary blocks and point-to-point transport links let the design scale without losing route summarization discipline."
      : "A simpler single-site architecture keeps the control plane supportable while still preserving segmentation and growth headroom.",
    hybrid
      ? "Hybrid/cloud boundaries are treated as architecture-level decisions, not just extra subnets, so cloud placement and routing stay reviewable before implementation."
      : "The current environment stays on-prem focused, so the first architecture priority remains clean segmentation, addressing, and operational supportability.",
    routingPlan.some((item) => item.transitAdjacencyCount > 1)
      ? "Several sites already imply multiple routed adjacencies, so summarization and site-edge policy must be explicit in the design package."
      : "The current transit model is still compact, which supports a simpler first-pass routing design and handoff package.",
  ];

  return {
    architecturePattern,
    layerModel,
    wanArchitecture,
    cloudArchitecture,
    dataCenterArchitecture,
    redundancyModel,
    routingStrategy,
    switchingStrategy,
    segmentationStrategy,
    securityArchitecture,
    wirelessArchitecture,
    operationsArchitecture,
    rationale,
  } satisfies HighLevelDesignSummary;
}

function buildLowLevelDesign(input: {
  profile: RequirementsProfile;
  siteHierarchy: SiteHierarchyItem[];
  rows: AddressingPlanRow[];
  topology: TopologyBlueprint;
  sitePlacements: SitePlacementDevice[];
  servicePlacements: ServicePlacementItem[];
  securityBoundaries: SecurityBoundaryDetail[];
  trafficFlows: TrafficFlowPath[];
  flowCoverage: FlowCoverageItem[];
  routingPlan: RoutePlanItem[];
  routePlan?: RoutePlanItem[];
  topologyModel?: TopologyBlueprint;
  servicePlacementModel?: ServicePlacementItem[];
  securityBoundaryModel?: SecurityBoundaryDetail[];
  trafficFlowModel?: TrafficFlowPath[];
  routingIntentModel?: { siteRouting: RoutePlanItem[] };
  wanLinks: WanLinkPlanRow[];
}) {
  const { profile, siteHierarchy, rows, topology, sitePlacements, servicePlacements, securityBoundaries, trafficFlows, routingPlan, wanLinks } = input;
  return siteHierarchy.map((site, index) => {
    const siteRows = rows.filter((row) => row.siteId === site.id);
    const routedRows = siteRows.filter((row) => !["WAN_TRANSIT", "LOOPBACK"].includes(row.role));
    const routing = routingPlan.find((item) => item.siteId === site.id);
    const transitLinks = wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
    const largeSite = site.plannedDemandHosts >= 200 || toNumber(profile.floorCount, 1) > 2 || toNumber(profile.buildingCount, 1) > 1;
    const siteRole = siteHierarchy.length === 1
      ? "Primary production site"
      : index === 0
        ? "Primary hub / shared-services site"
        : "Branch / spoke site";
    const layerModel = largeSite
      ? "Collapsed core/distribution with structured access edge and routed VLAN boundaries"
      : "Compact routed edge with local VLAN gateways and limited Layer 2 scope";
    const routingRole = index === 0 && siteHierarchy.length > 1
      ? "Aggregates branch/site summaries and acts as the first routing handoff anchor"
      : siteHierarchy.length > 1
        ? "Advertises the local site block toward the hub and keeps branch-local VLANs summarized"
        : "Maintains one primary local routing domain for segmented services and user access";
    const switchingProfile = largeSite || profile.voice || profile.wireless
      ? "Use structured access switching, dedicated uplink trunks, and aggregated uplinks where the platform supports it"
      : "Use a smaller access switching profile with deliberate VLAN trunks and simple uplink fault domains";
    const securityBoundary = [profile.trustBoundaryModel, profile.managementAccess].join(" ");
    const localServiceModel = /central/i.test(profile.serverPlacement || "") && index > 0
      ? "Consumes shared services across the routed core/WAN rather than hosting the primary service block locally"
      : index === 0 && /central/i.test(profile.serverPlacement || "")
        ? "Hosts or anchors the primary shared service boundary for the wider design"
        : "Can host local services, but should keep them inside a distinct services domain";
    const wirelessModel = profile.wireless || profile.guestWifi
      ? `${profile.wirelessModel}. Keep corporate and guest access mapped to the correct segments at this site.`
      : "Wireless is not a major local design driver.";
    const physicalAssumption = `${profile.siteLayoutModel}. ${profile.physicalScope}. ${profile.closetModel}.`;
    const implementationFocus: string[] = [];
    if (!site.siteBlockCidr) implementationFocus.push("Lock the site summary block before finalizing any child segment subnets.");
    if (siteRows.some((row) => row.source === "proposed")) implementationFocus.push("Turn the remaining proposed segments into approved site/VLAN records or intentionally reject them.");
    if (siteRows.some((row) => row.insideSiteBlock === false)) implementationFocus.push("Move any out-of-block subnets back into the site hierarchy before routing policy is finalized.");
    if (!routing?.loopbackCidr) implementationFocus.push("Reserve or confirm a loopback identity so routing, monitoring, and management references stay stable.");
    if (siteHierarchy.length > 1 && transitLinks.length === 0) implementationFocus.push("Confirm the site-edge transit adjacency and its routing handoff back toward the hub or shared edge.");
    if (implementationFocus.length === 0) implementationFocus.push("Carry the synthesized site summary, routed segments, and trust boundaries into the implementation handoff package.");

    const notes = [
      `${site.name} currently carries ${routedRows.length} routed local segment${routedRows.length === 1 ? "" : "s"} inside ${site.siteBlockCidr || "an unconfirmed site block"}.`,
      `Topology context is ${topology.topologyLabel.toLowerCase()}, with ${sitePlacements.filter((item) => item.siteId === site.id).length} synthesized placement object${sitePlacements.filter((item) => item.siteId === site.id).length === 1 ? "" : "s"}, ${servicePlacements.filter((item) => item.siteId === site.id).length} service placement${servicePlacements.filter((item) => item.siteId === site.id).length === 1 ? "" : "s"}, ${securityBoundaries.filter((item) => item.siteName === site.name).length} boundary object${securityBoundaries.filter((item) => item.siteName === site.name).length === 1 ? "" : "s"}, and ${trafficFlows.filter((item) => item.sourceSite === site.name || item.destinationSite === site.name).length} tracked flow${trafficFlows.filter((item) => item.sourceSite === site.name || item.destinationSite === site.name).length === 1 ? "" : "s"}.`,
      routing?.summaryAdvertisement
        ? `Use ${routing.summaryAdvertisement} as the main summary advertisement for this site once routing is implemented.`
        : "This site does not yet have a confirmed summarization boundary.",
      routing?.loopbackCidr
        ? `Use ${routing.loopbackCidr} as the stable routing and monitoring identity for this site.`
        : "Loopback identity is still missing and should be reserved before final implementation.",
    ];

    return {
      siteId: site.id,
      siteName: site.name,
      siteCode: site.siteCode,
      siteRole,
      layerModel,
      routingRole,
      switchingProfile,
      securityBoundary,
      localServiceModel,
      wirelessModel,
      physicalAssumption,
      summaryRoute: routing?.summaryAdvertisement,
      loopbackCidr: routing?.loopbackCidr,
      transitAdjacencyCount: routing?.transitAdjacencyCount || 0,
      localSegmentCount: routedRows.length,
      localSegments: routedRows.map((row) => row.vlanId ? `VLAN ${row.vlanId} ${row.segmentName}` : row.segmentName),
      implementationFocus,
      notes,
    } satisfies LowLevelSiteDesign;
  });
}

function traceabilityItems(profile: RequirementsProfile, synthesis: { organizationBlockAssumed: boolean; siteCount: number; proposedSegments: number; }) {
  const items: TraceabilityItem[] = [
    {
      title: "Address hierarchy",
      requirement: `${profile.addressHierarchyModel}.`,
      designOutcome: "The synthesis engine builds an organization block, then site summary blocks, then per-segment subnets so the logical design can be reviewed before implementation.",
    },
    {
      title: "Growth planning",
      requirement: `${profile.growthBufferModel}.`,
      designOutcome: "Each proposed subnet is sized with reserve headroom instead of matching the current host count exactly.",
    },
  ];

  if (synthesis.organizationBlockAssumed) {
    items.push({
      title: "Working organization block",
      requirement: "No explicit base private range was saved at the project level.",
      designOutcome: "SubnetOps used a temporary working organization block so the logical design and addressing table could still be composed. Save the final base private range to lock the hierarchy down.",
    });
  }

  if (toNumber(profile.siteCount, 1) > 1) {
    items.push({
      title: "Multi-site planning",
      requirement: `${profile.siteCount} sites with ${profile.internetModel}.`,
      designOutcome: "The plan reserves per-site summary blocks so branch/site growth and route summarization are easier to manage.",
    });
  }

  if (profile.guestWifi) {
    items.push({
      title: "Guest isolation",
      requirement: `${profile.guestPolicy}.`,
      designOutcome: "A guest segment is proposed for each site instead of mixing guest devices into the trusted user segment.",
    });
  }

  if (profile.management) {
    items.push({
      title: "Management boundary",
      requirement: `${profile.managementAccess}.`,
      designOutcome: "A dedicated management segment is kept separate so device administration and monitoring stay out of user VLANs.",
    });
  }

  if (profile.voice || toNumber(profile.phoneCount, 0) > 0) {
    items.push({
      title: "Voice and QoS",
      requirement: `${profile.voiceQos}.`,
      designOutcome: "Voice endpoints are placed on a dedicated segment so QoS, call control, and troubleshooting policy can be applied cleanly.",
    });
  }

  if (profile.cloudConnected || profile.environmentType !== "On-prem") {
    items.push({
      title: "Cloud / hybrid boundary",
      requirement: `${profile.cloudProvider} over ${profile.cloudConnectivity} with ${profile.cloudTrafficBoundary}.`,
      designOutcome: "The site hierarchy remains summarized so on-prem, cloud, and hybrid routing boundaries can be reviewed without starting from raw configuration.",
    });
  }

  if (synthesis.proposedSegments > 0) {
    items.push({
      title: "Design completion gap",
      requirement: "The requirements call for segments that are not all configured yet.",
      designOutcome: "SubnetOps keeps those rows visible as proposed design outputs so engineers and PMs can review the full intent before turning everything into live records.",
    });
  }

  if (toNumber(profile.siteCount, 1) > 1 || profile.cloudConnected || profile.environmentType !== "On-prem") {
    items.push({
      title: "Routing and transport model",
      requirement: `${profile.cloudRoutingModel}. ${profile.internetModel}.`,
      designOutcome: "The logical design now carries site summaries, loopback identities, and routed transit links so the routing handoff is visible before protocol-specific configuration begins.",
    });
  }

  if (profile.guestWifi || profile.management || profile.remoteAccess || profile.iot || profile.cameras) {
    items.push({
      title: "Security boundary mapping",
      requirement: `${profile.trustBoundaryModel}. ${profile.securityPosture}.`,
      designOutcome: "The design package keeps user, guest, management, services, and specialty traffic in distinct logical domains so policy and firewall planning have a clear starting point.",
    });
  }

  if (profile.wireless || profile.guestWifi) {
    items.push({
      title: "Wireless domain mapping",
      requirement: `${profile.wirelessModel}.`,
      designOutcome: "Wireless is treated as a mapped access domain tied back to the correct user or guest segments, rather than as a separate unmanaged overlay.",
    });
  }

  return items;
}

function buildSiteHierarchy(sites: PlannedSiteSummary[], rows: AddressingPlanRow[]) {
  return sites.map((site) => {
    const siteRows = rows.filter((row) => row.siteId === site.id);
    const configuredSegmentCount = siteRows.filter((row) => row.source === "configured").length;
    const proposedSegmentCount = siteRows.filter((row) => row.source === "proposed").length;
    const allocatedSegmentAddresses = siteRows.reduce((total, row) => total + cidrAddressCount(row.subnetCidr), 0);
    const blockCapacity = cidrAddressCount(site.siteBlockCidr);
    const blockHeadroomAddresses = Math.max(0, blockCapacity - allocatedSegmentAddresses);
    const blockUtilization = blockCapacity > 0 ? allocatedSegmentAddresses / blockCapacity : 0;

    return {
      ...site,
      blockCapacity,
      allocatedSegmentAddresses,
      blockHeadroomAddresses,
      blockUtilization,
      configuredSegmentCount,
      proposedSegmentCount,
      summarizationTarget: site.siteBlockCidr || undefined,
    } satisfies SiteHierarchyItem;
  });
}

function buildSegmentModel(rows: AddressingPlanRow[]) {
  return Array.from(rows.reduce((map, row) => {
    const key = `${row.role}-${row.vlanId ?? "none"}-${row.segmentName}`;
    const entry = map.get(key) || {
      role: row.role,
      label: row.segmentName,
      vlanId: row.vlanId,
      purpose: row.purpose,
      dhcpEnabled: row.dhcpEnabled,
      siteCount: 0,
      configuredCount: 0,
      proposedCount: 0,
      totalEstimatedHosts: 0,
      recommendedPrefix: recommendedPrefixForHosts(Math.max(1, row.estimatedHosts), row.role),
      seenSites: new Set<string>(),
    };

    if (!entry.seenSites.has(row.siteId)) {
      entry.seenSites.add(row.siteId);
      entry.siteCount += 1;
    }
    if (row.source === "configured") entry.configuredCount += 1;
    if (row.source === "proposed") entry.proposedCount += 1;
    entry.totalEstimatedHosts += row.estimatedHosts;
    entry.recommendedPrefix = Math.min(entry.recommendedPrefix, recommendedPrefixForHosts(Math.max(1, row.estimatedHosts), row.role));
    map.set(key, entry);
    return map;
  }, new Map<string, {
    role: SegmentRole;
    label: string;
    vlanId?: number;
    purpose: string;
    dhcpEnabled: boolean;
    siteCount: number;
    configuredCount: number;
    proposedCount: number;
    totalEstimatedHosts: number;
    recommendedPrefix: number;
    seenSites: Set<string>;
  }>()).values()).map((entry) => ({
    role: entry.role,
    label: entry.label,
    vlanId: entry.vlanId,
    purpose: entry.purpose,
    dhcpEnabled: entry.dhcpEnabled,
    siteCount: entry.siteCount,
    configuredCount: entry.configuredCount,
    proposedCount: entry.proposedCount,
    totalEstimatedHosts: entry.totalEstimatedHosts,
    recommendedPrefix: entry.recommendedPrefix,
  } satisfies SegmentModelItem)).sort((a, b) => {
    if (roleSortWeight(a.role) !== roleSortWeight(b.role)) return roleSortWeight(a.role) - roleSortWeight(b.role);
    return a.label.localeCompare(b.label);
  });
}

function buildDesignReview(input: {
  profile: RequirementsProfile;
  organizationBlockAssumed: boolean;
  siteHierarchy: SiteHierarchyItem[];
  rows: AddressingPlanRow[];
  proposedSegments: number;
  rowsOutsideSiteBlocks: number;
  missingSiteBlocks: number;
  wanReserveBlock?: string;
  wanLinks: WanLinkPlanRow[];
  topology: TopologyBlueprint;
  sitePlacements: SitePlacementDevice[];
  servicePlacements: ServicePlacementItem[];
  securityBoundaries: SecurityBoundaryDetail[];
  trafficFlows: TrafficFlowPath[];
  flowCoverage: FlowCoverageItem[];
  routingPlan: RoutePlanItem[];
  routePlan?: RoutePlanItem[];
  topologyModel?: TopologyBlueprint;
  servicePlacementModel?: ServicePlacementItem[];
  securityBoundaryModel?: SecurityBoundaryDetail[];
  trafficFlowModel?: TrafficFlowPath[];
  routingIntentModel?: { siteRouting: RoutePlanItem[] };
}) {
  const { profile, organizationBlockAssumed, siteHierarchy, rows, proposedSegments, rowsOutsideSiteBlocks, missingSiteBlocks, wanReserveBlock, wanLinks, routingPlan } = input;
  const items: DesignReviewItem[] = [];

  if (organizationBlockAssumed) {
    items.push({
      kind: "assumption",
      title: "Working organization range",
      detail: "The project base private range is still assumed. Save the final organization block to lock route summarization and site allocation decisions.",
    });
  }

  items.push({
    kind: "decision",
    title: "Organization → site → segment hierarchy",
    detail: `The design follows ${profile.addressHierarchyModel} with ${profile.siteBlockStrategy}, so each site gets a summary block before child subnets are allocated.`,
  });

  items.push({
    kind: "decision",
    title: "Growth and reserve model",
    detail: `Subnet sizing uses ${profile.growthBufferModel}, and service ranges follow the saved gateway convention of ${profile.gatewayConvention}.`,
  });

  if (profile.guestWifi) {
    items.push({
      kind: "decision",
      title: "Guest isolation",
      detail: "Guest access remains on its own segment so trust boundaries stay clear before implementation begins.",
    });
  }

  if (profile.management || /management/i.test(profile.managementIpPolicy)) {
    items.push({
      kind: "decision",
      title: "Management network separation",
      detail: `Management is treated separately using ${profile.managementIpPolicy}, which keeps device administration outside user-facing segments.`,
    });
  }

  if (wanLinks.length > 0) {
    items.push({
      kind: "decision",
      title: "WAN transit and routing identity planning",
      detail: `SubnetOps reserved ${wanReserveBlock || "a transit pool"} for point-to-point links and assigned one loopback identity per site so routing and monitoring references can be reviewed before implementation.`,
    });
  }

  if (missingSiteBlocks > 0) {
    items.push({
      kind: "risk",
      title: "Missing site summary blocks",
      detail: `${missingSiteBlocks} site${missingSiteBlocks === 1 ? " is" : "s are"} still missing a locked parent block, which limits deterministic subnet placement and summarization planning.`,
    });
  }

  if (rowsOutsideSiteBlocks > 0) {
    items.push({
      kind: "risk",
      title: "Rows outside parent site block",
      detail: `${rowsOutsideSiteBlocks} address row${rowsOutsideSiteBlocks === 1 ? " sits" : "s sit"} outside the current site summary block, which weakens hierarchy and route aggregation.`,
    });
  }

  if (proposedSegments > 0) {
    items.push({
      kind: "risk",
      title: "Design intent not fully committed",
      detail: `${proposedSegments} row${proposedSegments === 1 ? " remains" : "s remain"} proposed rather than configured, so the live records still lag the synthesized design intent.`,
    });
  }

  const highPressureRows = rows.filter((row) => row.usableHosts > 0 && row.estimatedHosts > 0 && row.utilization >= 0.85);
  if (highPressureRows.length > 0) {
    items.push({
      kind: "risk",
      title: "Capacity pressure detected",
      detail: `${highPressureRows.length} configured or proposed subnet${highPressureRows.length === 1 ? " is" : "s are"} already at or above 85% of usable host space and should be reviewed before implementation.`,
    });
  }

  const siteCapacityPressure = siteHierarchy.filter((site) => site.blockCapacity > 0 && site.blockUtilization >= 0.8);
  if (siteCapacityPressure.length > 0) {
    items.push({
      kind: "risk",
      title: "Site summary block pressure",
      detail: `${siteCapacityPressure.length} site summary block${siteCapacityPressure.length === 1 ? " is" : "s are"} already heavily consumed, reducing future flexibility for growth or re-segmentation.`,
    });
  }

  const unassignedWanLinks = wanLinks.filter((link) => link.subnetCidr === "Unassigned");
  if ((siteHierarchy.length > 1 || profile.cloudConnected || profile.environmentType !== "On-prem") && unassignedWanLinks.length > 0) {
    items.push({
      kind: "risk",
      title: "Transit plan is incomplete",
      detail: `${unassignedWanLinks.length} WAN or cloud edge link${unassignedWanLinks.length === 1 ? " is" : "s are"} still unassigned, so routing and implementation handoff are not complete yet.`,
    });
  }

  const missingLoopbacks = routingPlan.filter((item) => !item.loopbackCidr);
  if (missingLoopbacks.length > 0) {
    items.push({
      kind: "risk",
      title: "Loopback identity gap",
      detail: `${missingLoopbacks.length} site${missingLoopbacks.length === 1 ? " is" : "s are"} still missing a loopback identity, which weakens routing and monitoring consistency.`,
    });
  }

  return items;
}

function buildOpenIssues(rows: AddressingPlanRow[], siteHierarchy: SiteHierarchyItem[], review: DesignReviewItem[], wanLinks: WanLinkPlanRow[], routingPlan: RoutePlanItem[], segmentationReview: SegmentationReviewItem[]) {
  const issues = new Set<string>();

  review
    .filter((item) => item.kind === "risk")
    .forEach((item) => issues.add(item.detail));

  rows
    .filter((row) => row.subnetCidr === "Unassigned")
    .forEach((row) => issues.add(`${row.siteName} / ${row.segmentName} is still unassigned because there is no confirmed free subnet inside the parent site block.`));

  rows
    .filter((row) => row.insideSiteBlock === false)
    .forEach((row) => issues.add(`${row.siteName} / ${row.segmentName} sits outside the current site summary block and should be moved back into the parent hierarchy.`));

  rows
    .filter((row) => row.notes.some((note) => /exceeds the usable capacity/i.test(note)))
    .forEach((row) => issues.add(`${row.siteName} / ${row.segmentName} has more estimated hosts than the current subnet can safely hold.`));

  siteHierarchy
    .filter((site) => !site.siteBlockCidr)
    .forEach((site) => issues.add(`${site.name} does not yet have a confirmed site summary block.`));

  wanLinks
    .filter((link) => link.subnetCidr === "Unassigned")
    .forEach((link) => issues.add(`${link.linkName} does not yet have a reserved transit subnet.`));

  routingPlan
    .filter((item) => !item.loopbackCidr)
    .forEach((item) => issues.add(`${item.siteName} is still missing a dedicated loopback identity.`));

  segmentationReview
    .filter((item) => item.severity !== "info")
    .forEach((item) => issues.add(item.detail));

  return Array.from(issues);
}

function buildConfigurationStandards(input: {
  profile: RequirementsProfile;
  segmentModel: SegmentModelItem[];
  securityZones: SecurityZonePlan[];
  routingPlan: RoutePlanItem[];
  wanLinks: WanLinkPlanRow[];
}) {
  const { profile, segmentModel, securityZones, routingPlan, wanLinks } = input;
  const voice = segmentModel.some((item) => item.role === "VOICE");
  const guest = segmentModel.some((item) => item.role === "GUEST");
  const management = segmentModel.some((item) => item.role === "MANAGEMENT");
  const hybrid = profile.cloudConnected || profile.environmentType !== "On-prem";
  const multiSite = routingPlan.length > 1;

  const items: ConfigurationStandardItem[] = [
    {
      topic: "Naming standard",
      standard: profile.namingStandard,
      rationale: "Device names, interfaces, VLAN labels, and documents should stay consistent so configs and diagrams can be cross-referenced safely.",
    },
    {
      topic: "Gateway convention",
      standard: profile.gatewayConvention,
      rationale: "A fixed gateway convention reduces implementation drift and makes troubleshooting easier during cutover and support.",
    },
    {
      topic: "Management addressing",
      standard: profile.managementIpPolicy,
      rationale: "Infrastructure management should be isolated from user traffic and stay predictable across every site and device role.",
    },
    {
      topic: "Monitoring and telemetry",
      standard: profile.monitoringModel,
      rationale: "Device health, interface state, and routing/security changes need centralized visibility from day one.",
    },
    {
      topic: "Logging",
      standard: profile.loggingModel,
      rationale: "Operational and security events should land in a central location so incidents and change issues can be traced quickly.",
    },
    {
      topic: "Config backup and recovery",
      standard: profile.backupPolicy,
      rationale: "A rollback plan only works when running configs and golden baselines are preserved and versioned.",
    },
    {
      topic: "AAA and privileged admin model",
      standard: profile.identityModel,
      rationale: "Administrative access should follow the identity boundary and trust model captured in requirements, not ad-hoc local accounts alone.",
    },
    {
      topic: "Reserved address space",
      standard: profile.reservedRangePolicy,
      rationale: "Infrastructure, management, and future-growth ranges must remain protected inside each site block so later expansion does not break summarization.",
    },
  ];

  if (guest) {
    items.push({
      topic: "Guest service boundary",
      standard: profile.guestPolicy,
      rationale: "Guest access should be enforced through a clear L3/L4 boundary and should not rely on informal ACL exceptions later.",
    });
  }
  if (voice) {
    items.push({
      topic: "Voice QoS and edge treatment",
      standard: profile.voiceQos,
      rationale: "Voice or real-time traffic needs a repeatable edge, uplink, and WAN treatment standard if it is to behave consistently after rollout.",
    });
  }
  if (management) {
    items.push({
      topic: "Privileged access boundary",
      standard: profile.managementAccess,
      rationale: "Management reachability should be constrained to approved administrative paths rather than shared user access networks.",
    });
  }
  if (hybrid) {
    items.push({
      topic: "Cloud route and identity boundary",
      standard: `${profile.cloudRoutingModel}; ${profile.cloudIdentityBoundary}`,
      rationale: "Cloud-connected designs need a consistent route, identity, and trust standard at the provider edge before implementation begins.",
    });
  }
  if (multiSite || wanLinks.length > 0) {
    items.push({
      topic: "WAN transport and summarization",
      standard: "Loopbacks, site summaries, and transit links should follow the synthesized routing plan without per-site improvisation.",
      rationale: "Consistent inter-site standards reduce routing drift and simplify failover and troubleshooting across the estate.",
    });
  }
  if (securityZones.length > 0) {
    items.push({
      topic: "Zone-based policy intent",
      standard: "Allowed flows should follow the security zone matrix, with blocked flows remaining blocked by default unless explicitly reviewed.",
      rationale: "Security policy should be derived from trusted design intent rather than informal one-off exceptions during deployment.",
    });
  }

  return items;
}

function buildConfigurationTemplates(input: {
  profile: RequirementsProfile;
  segmentModel: SegmentModelItem[];
  wanLinks: WanLinkPlanRow[];
  routingProtocols: RoutingProtocolPlan[];
  routePolicies: RoutePolicyPlan[];
  switchingDesign: SwitchingDesignPlan[];
  securityZones: SecurityZonePlan[];
}) {
  const { profile, segmentModel, wanLinks, routingProtocols, routePolicies, switchingDesign, securityZones } = input;
  const multiSite = wanLinks.length > 0;
  const voice = segmentModel.some((item) => item.role === "VOICE");
  const guest = segmentModel.some((item) => item.role === "GUEST");
  const wireless = profile.wireless || segmentModel.some((item) => item.role === "MANAGEMENT");
  const hybrid = profile.cloudConnected || profile.environmentType !== "On-prem";

  const templates: ConfigurationTemplateArtifact[] = [
    {
      name: "Network device baseline",
      scope: "All managed routers, switches, and firewalls",
      intent: "Create a minimum secure, supportable baseline before site-specific role configuration is layered on top.",
      includes: [
        "hostname and naming convention",
        "management IP / loopback reference",
        "AAA / local break-glass admin policy",
        "NTP, DNS, syslog, SNMP/telemetry, and config archive expectations",
        "banner, timezone, and standard hardening controls",
      ],
      sampleLines: [
        "hostname <SITE>-<ROLE>-01",
        "ip domain-name <org.example>",
        "logging host <syslog-server>",
        "ntp server <time-source>",
        "snmp-server group <ops-group> v3 priv",
      ],
      notes: [
        "This should become a reusable golden baseline, not a one-off per device.",
      ],
    },
    {
      name: "Access switch baseline",
      scope: "Edge switches and user-facing access layers",
      intent: "Standardize access ports, edge protections, uplinks, and role separation at the campus or branch edge.",
      includes: [
        "management SVI or management reachability standard",
        "default access port template",
        voice ? "voice-ready access port template" : "edge role templates for user and shared-device ports",
        "uplink / trunk template with allowed VLAN discipline",
        "port security, storm control, and edge loop-prevention posture",
      ],
      sampleLines: [
        "interface range <user-ports>",
        " switchport mode access",
        voice ? " switchport voice vlan <VOICE_VLAN>" : " spanning-tree portfast",
        " spanning-tree portfast",
        " storm-control broadcast level <threshold>",
      ],
      notes: [
        switchingDesign.some((item) => /lacp|uplink/i.test(item.topic.toLowerCase()))
          ? "Uplink resilience and port-channel behavior should follow the synthesized switching guidance."
          : "Keep uplink controls explicit even when the current site is small.",
      ],
    },
    {
      name: "SVI and gateway template",
      scope: "Layer 3 interfaces for VLAN gateways and helper services",
      intent: "Keep every segment gateway, helper policy, and local interface role aligned with the addressing plan.",
      includes: [
        "description and naming tied to the segment model",
        "gateway IP convention",
        "DHCP helper or local server handling where needed",
        "ACL / zone handoff reference for sensitive segments",
      ],
      sampleLines: [
        "interface vlan <VLAN_ID>",
        " description <SEGMENT_NAME>",
        " ip address <GATEWAY_IP> <MASK>",
        " ip helper-address <DHCP_SERVER>",
      ],
      notes: [
        guest ? "Guest interfaces should point to the guest-service or firewall policy boundary, not to trusted internal services by default." : "Trusted services should match the summarized addressing hierarchy.",
      ],
    },
  ];

  if (multiSite || routingProtocols.length > 0) {
    templates.push({
      name: "Routing edge and summarization template",
      scope: "WAN edges, branch routers, and L3 distribution roles",
      intent: "Carry loopbacks, summaries, and transit links into a repeatable routed design baseline.",
      includes: [
        "loopback identity",
        "routing process baseline",
        "summary advertisement or route aggregation points",
        "default-route and edge filtering stance",
        "transit interface description and addressing standard",
      ],
      sampleLines: [
        "interface loopback0",
        " ip address <LOOPBACK_IP> 255.255.255.255",
        "router <PROTOCOL>",
        " network <SITE_BLOCK> area <AREA/DOMAIN>",
        " ip route <SUMMARY_OR_DEFAULT> <NEXT_HOP>",
      ],
      notes: [
        routePolicies.length > 0 ? `Key route-policy themes: ${routePolicies.slice(0, 2).map((item) => item.policyName).join('; ')}.` : "Treat redistribution and edge filtering as explicit review items before production rollout.",
      ],
    });
  }

  templates.push({
    name: "Security policy handoff template",
    scope: "Firewalls, ACL boundaries, and remote-access policy points",
    intent: "Translate security zones and allowed-flow expectations into a consistent reviewable handoff package.",
    includes: [
      "zone/source/target matrix reference",
      "default deny or restrictive baseline",
      "approved shared-service flows",
      profile.remoteAccess ? "remote-access landing-zone and identity controls" : "admin access boundary controls",
      "logging requirements for policy changes and denied flows",
    ],
    sampleLines: [
      "policy <SOURCE_ZONE>-to-<TARGET_ZONE>",
      " default-action deny",
      " allow <APPROVED_SERVICE_SET>",
      " log session-init session-close",
    ],
    notes: [
      securityZones.length > 0 ? `The synthesized security model currently defines ${securityZones.length} zone boundaries to anchor this artifact.` : "Even a small design should have an explicit policy handoff artifact.",
    ],
  });

  if (wireless) {
    templates.push({
      name: "Wireless and SSID template",
      scope: "Controllers, cloud-managed wireless platforms, and access policy mappings",
      intent: "Keep SSID roles, VLAN mapping, and AAA/security expectations consistent across the estate.",
      includes: [
        "staff SSID to trusted user zone mapping",
        guest ? "guest SSID to isolated guest zone mapping" : "single trusted SSID posture",
        "AAA / captive / identity expectations",
        "AP management placement and telemetry",
      ],
      sampleLines: [
        "wlan <STAFF_SSID>",
        " vlan <USER_VLAN>",
        guest ? "wlan <GUEST_SSID> -> vlan <GUEST_VLAN>" : " security <802.1X/WPA3 policy>",
        " radius-server <AAA_SOURCE>",
      ],
      notes: [
        `Wireless model reference: ${profile.wirelessModel}.`,
      ],
    });
  }

  if (hybrid) {
    templates.push({
      name: "Cloud edge and hybrid connectivity template",
      scope: "VPN/edge routers, cloud gateways, or provider-connect boundaries",
      intent: "Standardize provider edge routing, identity, monitoring, and route controls for hybrid-connected environments.",
      includes: [
        "cloud edge addressing and transit standard",
        "provider route filtering or summary controls",
        "identity and trust boundary references",
        "cloud operations telemetry and logging expectations",
      ],
      sampleLines: [
        "interface <CLOUD_EDGE>",
        " ip address <TRANSIT_IP> <MASK>",
        "router <EDGE_PROTOCOL>",
        " neighbor <CLOUD_PEER> remote-as <ASN>",
        "route-map <CLOUD_POLICY> permit 10",
      ],
      notes: [
        `${profile.cloudProvider} / ${profile.cloudConnectivity} should remain aligned with the synthesized cloud-boundary and routing guidance.`,
      ],
    });
  }

  return templates;
}

function buildOperationsArtifacts(input: {
  profile: RequirementsProfile;
  configurationTemplates: ConfigurationTemplateArtifact[];
}) {
  const { profile, configurationTemplates } = input;
  return [
    {
      artifact: "Golden baseline pack",
      purpose: "Version-controlled baseline configs and standards for each major device role before site customization begins.",
      owner: "Network engineering",
      timing: "Before pilot or primary-site deployment",
    },
    {
      artifact: "Site-specific variable sheet",
      purpose: "Track site codes, loopbacks, management IPs, VLAN IDs, summaries, and edge-specific parameters cleanly per site.",
      owner: "Implementation lead",
      timing: "Before each cutover wave",
    },
    {
      artifact: "Policy exception register",
      purpose: "Capture any deviations from the standard security, routing, or access template so they remain reviewed and supportable.",
      owner: "Security or technical reviewer",
      timing: "During design review and before production changes",
    },
    {
      artifact: "Validation evidence pack",
      purpose: `Collect screenshots, command output, and checklist evidence showing that the ${configurationTemplates.length} planned template artifact${configurationTemplates.length === 1 ? "" : "s"} were implemented and verified correctly.`,
      owner: "Validation owner",
      timing: "During and after cutover",
    },
  ] satisfies OperationsArtifactItem[];
}


function inferTopologyBlueprint(input: { profile: RequirementsProfile; siteHierarchy: SiteHierarchyItem[]; wanLinks: WanLinkPlanRow[]; rows: AddressingPlanRow[]; }) {
  const { profile, siteHierarchy, wanLinks, rows } = input;
  const cloudConnected = profile.cloudConnected || profile.environmentType !== "On-prem";
  const centralizedBreakout = /central/i.test(profile.internetModel || "") || /central/i.test(profile.serverPlacement || "");
  const primarySite = siteHierarchy[0];
  let topologyType: TopologyBlueprint["topologyType"] = "collapsed-core";
  if (cloudConnected) topologyType = "hybrid-cloud";
  else if (siteHierarchy.length > 1 && centralizedBreakout) topologyType = "hub-spoke";
  else if (siteHierarchy.length > 1) topologyType = "multi-site";

  const topologyLabel = topologyType === "collapsed-core"
    ? "Single-site collapsed core / edge"
    : topologyType === "hub-spoke"
      ? "Hub-and-spoke WAN with centralized services"
      : topologyType === "hybrid-cloud"
        ? "Hybrid multi-site with cloud edge"
        : "Distributed multi-site logical design";

  const notes = [
    topologyType === "collapsed-core"
      ? "The design keeps routing, switching, and perimeter policy anchored at one site rather than pretending a WAN exists when it does not."
      : topologyType === "hub-spoke"
        ? "Branch sites are treated as dependent spoke locations and should normally reach shared services and controlled internet breakout through the primary site."
        : topologyType === "hybrid-cloud"
          ? "Cloud connectivity is treated as a first-class edge, so service placement and traffic paths must distinguish on-prem, DMZ, and cloud-hosted assets."
          : "Sites should be evaluated as peer locations with explicit transport and route-domain boundaries rather than one generic site template repeated everywhere.",
  ];
  return {
    topologyType,
    topologyLabel,
    primarySiteId: primarySite?.id,
    primarySiteName: primarySite?.name,
    internetBreakout: centralizedBreakout ? "centralized" : "distributed",
    cloudConnected,
    redundancyModel: profile.dualIsp ? "Dual edge / resilient perimeter" : "Single active perimeter path",
    servicePlacementModel: profile.serverPlacement || "centralized servers or services",
    cloudProvider: profile.cloudProvider || undefined,
    cloudPattern: cloudConnected ? (profile.cloudConnectivity || "cloud edge attached") : "not attached",
    wanPattern: siteHierarchy.length > 1 ? (centralizedBreakout ? "centralized WAN / breakout" : "distributed WAN / breakout") : "local only",
    topologyNarrative: notes[0],
    notes: [
      ...notes,
      ...(wanLinks.length === 0 && siteHierarchy.length > 1 ? ["The scope implies multiple sites, but transport links still need to be confirmed before the design is implementation-ready."] : []),
    ],
  } satisfies TopologyBlueprint;
}

function zoneNameForRole(role: SegmentRole) {
  switch (role) {
    case "USER": return "User zone";
    case "SERVER": return "Server zone";
    case "GUEST": return "Guest zone";
    case "PRINTER": return "Printer / peripheral zone";
    case "VOICE": return "Voice zone";
    case "IOT": return "IoT / OT zone";
    case "CAMERA": return "Camera / security zone";
    case "MANAGEMENT": return "Management zone";
    case "WAN_TRANSIT": return "WAN transit zone";
    case "LOOPBACK": return "Routing identity";
    default: return "General service zone";
  }
}

function firstSubnetForRole(rows: AddressingPlanRow[], role: SegmentRole) {
  return rows.find((row) => row.role === role && row.subnetCidr !== "Unassigned");
}

function findDmzServerRow(rows: AddressingPlanRow[], siteId?: string) {
  const scoped = siteId ? rows.filter((row) => row.siteId === siteId) : rows;
  return scoped.find((row) => row.subnetCidr !== "Unassigned" && /dmz/i.test(`${row.segmentName} ${row.purpose}`))
    || scoped.find((row) => row.role === "SERVER" && row.subnetCidr !== "Unassigned");
}

function routeBehaviorForTopology(topology: TopologyBlueprint, sourceSite?: string, destinationSite?: string) {
  if (topology.topologyType === "collapsed-core") return "Local routed core to perimeter edge";
  if (topology.topologyType === "hub-spoke") {
    if (sourceSite && destinationSite && sourceSite !== destinationSite) {
      return sourceSite === topology.primarySiteName || destinationSite === topology.primarySiteName
        ? `Spoke-to-hub routed path through ${topology.primarySiteName}`
        : `Spoke-to-spoke traffic should traverse ${topology.primarySiteName} rather than bypass the hub`;
    }
    return `Site traffic follows a hub-and-spoke path through ${topology.primarySiteName}`;
  }
  if (topology.topologyType === "hybrid-cloud") return "On-prem routing domain with controlled cloud-edge advertisement and filtering";
  return "Peer multi-site routing with explicit transport boundaries and site summaries";
}

function buildInterfaceLabels(deviceType: SitePlacementDevice["deviceType"], siteRows: AddressingPlanRow[], options?: { isPrimary?: boolean; distributedBreakout?: boolean; topologyType?: TopologyBlueprint["topologyType"] }) {
  const zoneRows = (role: SegmentRole) => siteRows.filter((row) => row.role === role).map((row) => row.subnetCidr);
  const topologyType = options?.topologyType;
  const labels: string[] = [];
  if (deviceType === "firewall") {
    labels.push(`Gi0/0 outside${options?.distributedBreakout ? ' / local internet' : topologyType === 'hub-spoke' && options?.isPrimary ? ' / central internet' : ''}`);
    labels.push(topologyType === 'collapsed-core' ? 'Gi0/1 inside / collapsed core handoff' : 'Gi0/1 inside / trusted core');
    if (zoneRows('SERVER').length > 0 || siteRows.some((row) => /dmz/i.test(`${row.segmentName} ${row.purpose}`))) labels.push('Gi0/2 dmz / published services');
    if (zoneRows('MANAGEMENT').length > 0) labels.push('Gi0/3 management / admin');
    if (topologyType === 'hybrid-cloud' && options?.isPrimary) labels.push('Gi0/4 cloud edge transit');
  } else if (deviceType === "router") {
    labels.push(topologyType === 'hub-spoke' ? 'Gi0/0 wan / hub transport' : 'Gi0/0 wan / provider');
    labels.push('Gi0/1 lan handoff');
    if (options?.isPrimary || topologyType !== 'collapsed-core') labels.push('Lo0 routing identity');
    if (siteRows.some((row) => row.role === 'WAN_TRANSIT') || topologyType === 'hybrid-cloud') labels.push(topologyType === 'hybrid-cloud' ? 'Tunnel0 / cloud transport' : 'Tunnel0 / routed transport');
  } else if (deviceType === "core-switch") {
    labels.push(topologyType === 'collapsed-core' ? 'Po1 / campus uplink' : 'Po1 / upstream core');
    labels.push('SVI gateway set');
    zoneRows('USER').slice(0,1).forEach(() => labels.push('Vlan10 user gateway'));
    zoneRows('GUEST').slice(0,1).forEach(() => labels.push('Vlan30 guest gateway'));
    zoneRows('SERVER').slice(0,1).forEach(() => labels.push('Vlan20 server gateway'));
    zoneRows('MANAGEMENT').slice(0,1).forEach(() => labels.push('Vlan90 management gateway'));
  } else if (deviceType === "access-switch") {
    labels.push(topologyType === 'hub-spoke' ? 'Gi1/0/48 edge uplink trunk' : 'Gi1/0/48 uplink trunk');
    labels.push('Gi1/0/1-24 user access');
    if (zoneRows('GUEST').length > 0) labels.push('Gi1/0/25-32 guest / AP edge');
  } else if (deviceType === "access-point") {
    labels.push('Eth0 trunk / PoE');
    labels.push('SSID corp');
    if (zoneRows('GUEST').length > 0) labels.push('SSID guest');
  } else if (deviceType === "server") {
    labels.push('Eth0 service / app');
    if (siteRows.some((row) => /dmz/i.test(`${row.segmentName} ${row.purpose}`))) labels.push('Eth1 dmz / published');
    if (topologyType === 'hybrid-cloud') labels.push('Eth2 sync / cloud peer');
  } else if (deviceType === "cloud-edge") {
    labels.push('VPN gateway / transit');
    labels.push('VNet / subnet association');
    labels.push('Route table / cloud boundary');
  }
  return labels.slice(0, 5);
}

function siteToken(input: { siteName: string; siteCode?: string; namingTokenPreference?: string; buildingLabel?: string; floorLabel?: string }) {
  const cleanedCode = (input.siteCode || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const preference = (input.namingTokenPreference || '').toLowerCase();
  const fullName = input.siteName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const abbreviatedName = input.siteName.toUpperCase().replace(/[^A-Z0-9 ]+/g, '').split(/\s+/).filter(Boolean).map((part) => part.slice(0, 3)).join('_');
  const buildingToken = (input.buildingLabel || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const floorToken = (input.floorLabel || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const base = (cleanedCode || abbreviatedName || fullName || 'SITE').slice(0, 18);
  if (preference.includes('full location') || preference.includes('full site name')) return (fullName || cleanedCode || 'SITE').slice(0, 18);
  if (preference.includes('building') && preference.includes('floor')) return [base, buildingToken || 'BLDG', floorToken || 'FLR'].filter(Boolean).join('_').slice(0, 28);
  if (preference.includes('building')) return [base, buildingToken || 'BLDG'].filter(Boolean).join('_').slice(0, 24);
  if (preference.includes('floor')) return [base, floorToken || 'FLR'].filter(Boolean).join('_').slice(0, 24);
  if (preference.includes('site code')) return (cleanedCode || abbreviatedName || 'SITE').slice(0, 12);
  if (cleanedCode) return cleanedCode;
  return (abbreviatedName || fullName || 'SITE').slice(0, 18);
}

function devicePrefix(deviceType: SitePlacementDevice["deviceType"]) {
  switch (deviceType) {
    case 'firewall': return 'FW';
    case 'router': return 'RTR';
    case 'core-switch': return 'SW';
    case 'distribution-switch': return 'DSW';
    case 'access-switch': return 'SW';
    case 'access-point': return 'AP';
    case 'wireless-controller': return 'WLC';
    case 'server': return 'SRV';
    case 'cloud-edge': return 'CLD';
    default: return 'DEV';
  }
}

function readableDeviceLabel(deviceType: SitePlacementDevice["deviceType"], input: { isPrimary: boolean; topologyType: TopologyBlueprint["topologyType"] }) {
  switch (deviceType) {
    case 'firewall': return input.isPrimary ? 'perimeter firewall' : 'branch firewall';
    case 'router': return input.topologyType === 'hub-spoke' ? 'spoke WAN router' : 'WAN edge router';
    case 'core-switch': return input.topologyType === 'collapsed-core' ? 'collapsed core switch' : 'core switch';
    case 'access-switch': return 'access switch';
    case 'distribution-switch': return 'distribution switch';
    case 'access-point': return 'wireless access point';
    case 'wireless-controller': return 'wireless controller';
    case 'server': return 'service stack';
    case 'cloud-edge': return 'cloud edge';
    default: return deviceType;
  }
}

function deviceNameForPlacement(input: { siteName: string; siteCode?: string; buildingLabel?: string; floorLabel?: string; deviceType: SitePlacementDevice["deviceType"]; isPrimary: boolean; topologyType: TopologyBlueprint["topologyType"]; namingConvention?: string; namingTokenPreference?: string; customNamingPattern?: string; sequence?: number; }) {
  const { siteName, siteCode, buildingLabel, floorLabel, deviceType, isPrimary, topologyType, namingConvention, namingTokenPreference, customNamingPattern, sequence = 1 } = input;
  const convention = (namingConvention || '').toLowerCase();
  const token = siteToken({ siteName, siteCode, namingTokenPreference, buildingLabel, floorLabel });
  const prefix = devicePrefix(deviceType);
  const readable = readableDeviceLabel(deviceType, { isPrimary, topologyType });
  if (/custom/.test(convention) && (customNamingPattern || '').trim()) {
    const replacements: Record<string, string> = {
      '{site}': token,
      '{siteCode}': (siteCode || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_') || token,
      '{siteName}': siteName.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      '{building}': (buildingLabel || 'BLDG').toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      '{floor}': (floorLabel || 'FLR').toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      '{role}': prefix,
      '{index}': String(sequence).padStart(2, '0'),
    };
    let output = (customNamingPattern || '').trim();
    Object.entries(replacements).forEach(([key, value]) => {
      output = output.split(key).join(value);
    });
    return output.replace(/[^A-Z0-9_-]+/gi, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '') || `${prefix}_${token}_${String(sequence).padStart(2, '0')}`;
  }
  if (/short-code/.test(convention)) return `${prefix}_${token}_${String(sequence).padStart(2, '0')}`;
  if (/location-role-index/.test(convention)) return `${token}-${prefix}-${String(sequence).padStart(2, '0')}`;
  if (/readable/.test(convention)) return `${siteName}-${prefix}${sequence}`;
  return `${siteName} ${readable}`;
}

function buildSitePlacements(input: { profile: RequirementsProfile; topology: TopologyBlueprint; siteHierarchy: SiteHierarchyItem[]; rows: AddressingPlanRow[]; }) {
  const { profile, topology, siteHierarchy, rows } = input;
  const devices: SitePlacementDevice[] = [];
  siteHierarchy.forEach((site, index) => {
    const siteRows = rows.filter((row) => row.siteId === site.id && row.subnetCidr !== "Unassigned");
    const zoneSet = Array.from(new Set(siteRows.map((row) => zoneNameForRole(row.role))));
    const subnetSet = siteRows.map((row) => row.subnetCidr);
    const isPrimary = site.id === topology.primarySiteId || index === 0;
    const branchOrRemote = topology.topologyType !== "collapsed-core" && !isPrimary;

    const edgeDeviceType = branchOrRemote && topology.internetBreakout === "distributed" ? "router" : "firewall";
    devices.push({
      id: `${site.id}-edge-firewall`,
      siteId: site.id,
      siteName: site.name,
      deviceName: deviceNameForPlacement({ siteName: site.name, siteCode: site.siteCode, buildingLabel: (site as any).buildingLabel, floorLabel: (site as any).floorLabel, deviceType: edgeDeviceType, isPrimary, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      siteTier: isPrimary ? (topology.topologyType === "collapsed-core" ? "single-site" : "primary") : "branch",
      uplinkTarget: isPrimary ? (topology.cloudConnected ? `${profile.cloudProvider || "Cloud"} edge` : "Internet edge") : (topology.primarySiteName || "Primary site"),
      deviceType: edgeDeviceType,
      role: branchOrRemote ? (topology.internetBreakout === "distributed" ? "Branch WAN / internet edge" : "Branch trusted edge") : "Perimeter edge",
      quantity: profile.dualIsp && isPrimary ? 2 : 1,
      placement: isPrimary ? `Perimeter edge at ${site.name}` : `WAN edge at ${site.name}`,
      connectedZones: zoneSet.filter((item) => item !== "Routing identity"),
      connectedSubnets: subnetSet.filter((item) => item !== "Unassigned").slice(0, 6),
      interfaceLabels: buildInterfaceLabels(branchOrRemote && topology.internetBreakout === "distributed" ? "router" : "firewall", siteRows, { isPrimary, distributedBreakout: topology.internetBreakout === "distributed", topologyType: topology.topologyType }),
      notes: [
        isPrimary && topology.internetBreakout === "centralized" ? "This edge is the main north-south control point for trusted, guest, and DMZ traffic." : "This edge enforces site ingress/egress and hands traffic to the routed transport domain.",
      ],
    });

    const switchingDeviceType = isPrimary || topology.topologyType === "collapsed-core" ? "core-switch" : "access-switch";
    devices.push({
      id: `${site.id}-core-switch`,
      siteId: site.id,
      siteName: site.name,
      deviceName: deviceNameForPlacement({ siteName: site.name, siteCode: site.siteCode, buildingLabel: (site as any).buildingLabel, floorLabel: (site as any).floorLabel, deviceType: switchingDeviceType, isPrimary, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      siteTier: isPrimary ? (topology.topologyType === "collapsed-core" ? "single-site" : "primary") : "branch",
      uplinkTarget: edgeDeviceType === "router" ? `${site.name} branch edge` : `${site.name} perimeter edge`,
      deviceType: switchingDeviceType,
      role: isPrimary || topology.topologyType === "collapsed-core" ? "Primary VLAN gateway / aggregation" : "Local access aggregation",
      quantity: 1,
      placement: isPrimary || topology.topologyType === "collapsed-core" ? `Main routed switching layer at ${site.name}` : `Branch access aggregation at ${site.name}`,
      connectedZones: zoneSet.filter((item) => !["WAN transit zone", "Routing identity"].includes(item)),
      connectedSubnets: subnetSet.filter((item) => item !== "Unassigned").slice(0, 8),
      interfaceLabels: buildInterfaceLabels(isPrimary || topology.topologyType === "collapsed-core" ? "core-switch" : "access-switch", siteRows, { isPrimary, distributedBreakout: topology.internetBreakout === "distributed", topologyType: topology.topologyType }),
      notes: [
        "Use this placement object to understand which VLANs and local service segments terminate at this site.",
      ],
    });

    if (profile.wireless || profile.guestWifi) {
      devices.push({
        id: `${site.id}-wireless`,
        siteId: site.id,
        siteName: site.name,
        deviceName: deviceNameForPlacement({ siteName: site.name, siteCode: site.siteCode, buildingLabel: (site as any).buildingLabel, floorLabel: (site as any).floorLabel, deviceType: "access-point", isPrimary, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
        siteTier: isPrimary ? (topology.topologyType === "collapsed-core" ? "single-site" : "primary") : "branch",
        uplinkTarget: switchingDeviceType === "core-switch" ? `${site.name} core switch` : `${site.name} access switch`,
        deviceType: "access-point",
        role: profile.guestWifi ? "Staff and guest wireless access" : "Wireless access",
        quantity: Math.max(1, toNumber(profile.apCount, 4)),
        placement: `User access layer at ${site.name}`,
        connectedZones: profile.guestWifi ? ["User zone", "Guest zone"] : ["User zone"],
        connectedSubnets: siteRows.filter((row) => row.role === "USER" || row.role === "GUEST").map((row) => row.subnetCidr),
        interfaceLabels: buildInterfaceLabels("access-point", siteRows, { isPrimary, distributedBreakout: topology.internetBreakout === "distributed", topologyType: topology.topologyType }),
        notes: [profile.wirelessModel || "Wireless model not yet specified"],
      });
    }

    const serverRows = siteRows.filter((row) => row.role === "SERVER");
    if (serverRows.length > 0) {
      devices.push({
        id: `${site.id}-server-stack`,
        siteId: site.id,
        siteName: site.name,
        deviceName: deviceNameForPlacement({ siteName: site.name, siteCode: site.siteCode, buildingLabel: (site as any).buildingLabel, floorLabel: (site as any).floorLabel, deviceType: "server", isPrimary, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
        siteTier: isPrimary ? (topology.topologyType === "collapsed-core" ? "single-site" : "primary") : "branch",
        uplinkTarget: switchingDeviceType === "core-switch" ? `${site.name} core switch` : `${site.name} access switch`,
        deviceType: "server",
        role: isPrimary && /central/i.test(profile.serverPlacement || "") ? "Centralized shared services" : "Local application or support services",
        quantity: Math.max(1, serverRows.length),
        placement: `Server/service zone at ${site.name}`,
        connectedZones: ["Server zone"],
        connectedSubnets: serverRows.map((row) => row.subnetCidr),
        interfaceLabels: buildInterfaceLabels("server", siteRows, { isPrimary, distributedBreakout: topology.internetBreakout === "distributed", topologyType: topology.topologyType }),
        notes: [
          isPrimary && /central/i.test(profile.serverPlacement || "") ? "Shared services, identity, and platform dependencies should normally live here for spoke sites." : "This site keeps local server workloads or support services inside its server zone.",
        ],
      });
    }
  });

  if (topology.cloudConnected) {
    devices.push({
      id: `cloud-edge`,
      siteId: `cloud-edge`,
      siteName: `${profile.cloudProvider || "Cloud"} edge`,
      deviceName: `${profile.cloudProvider || "Cloud"} cloud edge`,
      siteTier: "cloud",
      uplinkTarget: topology.primarySiteName || "Primary site",
      deviceType: "cloud-edge",
      role: "Provider VNet/VPC boundary",
      quantity: 1,
      placement: `${profile.cloudProvider || "Cloud"} tenant / virtual network edge`,
      connectedZones: ["Cloud service boundary"],
      connectedSubnets: [],
      interfaceLabels: buildInterfaceLabels("cloud-edge", [], { isPrimary: false, distributedBreakout: false }),
      notes: [profile.cloudConnectivity || "Cloud connectivity to be confirmed"],
    });
  }
  return devices;
}

function buildServicePlacements(input: { profile: RequirementsProfile; topology: TopologyBlueprint; siteHierarchy: SiteHierarchyItem[]; rows: AddressingPlanRow[]; }) {
  const { profile, topology, siteHierarchy, rows } = input;
  const primarySite = siteHierarchy.find((site) => site.id === topology.primarySiteId) || siteHierarchy[0];
  const items: ServicePlacementItem[] = [];
  const siteName = primarySite?.name || "Primary site";
  const centralServerRow = rows.find((row) => row.siteId === primarySite?.id && row.role === "SERVER" && row.subnetCidr !== "Unassigned");
  const managementRow = rows.find((row) => row.siteId === primarySite?.id && row.role === "MANAGEMENT" && row.subnetCidr !== "Unassigned");
  const dmzRow = findDmzServerRow(rows, primarySite?.id);

  if (centralServerRow) {
    items.push({
      id: 'svc-shared-services',
      serviceName: 'Shared internal service stack',
      serviceType: 'shared-service',
      placementType: topology.topologyType === 'collapsed-core' ? 'local' : 'centralized',
      siteId: primarySite?.id,
      siteName,
      zoneName: 'Server zone',
      subnetCidr: centralServerRow.subnetCidr,
      dependsOn: ['Routing identity', 'Trusted internal routing', 'Directory/DNS/DHCP reachability'],
      consumers: topology.topologyType === 'collapsed-core' ? ['Local user and management segments'] : ['Primary site users', 'Branch users', 'Management zone'],
      attachedDevice: deviceNameForPlacement({ siteName, siteCode: primarySite?.siteCode, buildingLabel: (primarySite as any)?.buildingLabel, floorLabel: (primarySite as any)?.floorLabel, deviceType: 'core-switch', isPrimary: true, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      upstreamDevice: deviceNameForPlacement({ siteName, siteCode: primarySite?.siteCode, buildingLabel: (primarySite as any)?.buildingLabel, floorLabel: (primarySite as any)?.floorLabel, deviceType: 'firewall', isPrimary: true, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      ingressInterface: 'Vlan20 / server gateway',
      notes: ['This placement object names where shared internal services are expected to live instead of leaving them as generic report language.'],
    });
  }
  if (managementRow) {
    items.push({
      id: 'svc-management',
      serviceName: 'Management and monitoring plane',
      serviceType: 'management-service',
      placementType: 'centralized',
      siteId: primarySite?.id,
      siteName,
      zoneName: 'Management zone',
      subnetCidr: managementRow.subnetCidr,
      dependsOn: ['Privileged access boundary', 'Logging', 'Monitoring'],
      consumers: ['Network operations', 'Security / admin operators'],
      attachedDevice: deviceNameForPlacement({ siteName, siteCode: primarySite?.siteCode, buildingLabel: (primarySite as any)?.buildingLabel, floorLabel: (primarySite as any)?.floorLabel, deviceType: 'core-switch', isPrimary: true, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      upstreamDevice: `${siteName} management boundary`,
      ingressInterface: 'Vlan90 / management gateway',
      notes: [profile.managementAccess || 'Management access assumptions not yet set'],
    });
  }
  if (dmzRow && (topology.internetBreakout === 'centralized' || profile.remoteAccess || /dmz/i.test(`${dmzRow.segmentName} ${dmzRow.purpose}`))) {
    items.push({
      id: 'svc-dmz-boundary',
      serviceName: 'Published edge / DMZ service boundary',
      serviceType: 'dmz-service',
      placementType: 'dmz',
      siteId: primarySite?.id,
      siteName,
      zoneName: 'DMZ / edge service zone',
      subnetCidr: dmzRow.subnetCidr,
      dependsOn: ['Perimeter firewall', 'North-south security policy', 'Optional NAT / reverse proxy'],
      consumers: ['Internet users for published services', 'Trusted management zone for administration'],
      publishedExternally: true,
      ingressPath: ['Internet', `${siteName} perimeter edge`, `${siteName} DMZ subnet`, `${siteName} DMZ host`],
      attachedDevice: deviceNameForPlacement({ siteName, siteCode: primarySite?.siteCode, buildingLabel: (primarySite as any)?.buildingLabel, floorLabel: (primarySite as any)?.floorLabel, deviceType: 'firewall', isPrimary: true, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      upstreamDevice: deviceNameForPlacement({ siteName, siteCode: primarySite?.siteCode, buildingLabel: (primarySite as any)?.buildingLabel, floorLabel: (primarySite as any)?.floorLabel, deviceType: 'firewall', isPrimary: true, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      ingressInterface: 'Gi0/2 dmz / published services',
      notes: ['DMZ placement is now explicit: this subnet sits behind the perimeter edge and should not be treated as a generic internal server segment.'],
    });
  }
  if (profile.cloudConnected || profile.environmentType !== 'On-prem') {
    items.push({
      id: 'svc-cloud-apps',
      serviceName: `${profile.cloudProvider || 'Cloud'} application boundary`,
      serviceType: 'cloud-service',
      placementType: 'cloud',
      siteName: `${profile.cloudProvider || 'Cloud'} edge`,
      zoneName: 'Cloud service boundary',
      dependsOn: [profile.cloudConnectivity || 'Cloud connectivity', profile.cloudRoutingModel || 'Cloud routing'],
      consumers: ['Selected internal users', 'Remote access users', 'Inter-site application flows'],
      notes: [profile.cloudHostingModel || 'Cloud hosting model not specified'],
    });
  }
  if (profile.remoteAccess) {
    items.push({
      id: 'svc-remote-access',
      serviceName: 'Remote access gateway',
      serviceType: 'dmz-service',
      placementType: topology.internetBreakout === 'centralized' ? 'dmz' : 'local',
      siteId: primarySite?.id,
      siteName,
      zoneName: 'DMZ / edge service zone',
      subnetCidr: dmzRow?.subnetCidr,
      dependsOn: ['Perimeter firewall', 'Identity service', 'Management plane'],
      consumers: ['Remote staff', 'Administrators'],
      publishedExternally: true,
      ingressPath: ['Internet', `${siteName} perimeter edge`, `${siteName} remote access boundary`],
      attachedDevice: deviceNameForPlacement({ siteName, siteCode: primarySite?.siteCode, buildingLabel: (primarySite as any)?.buildingLabel, floorLabel: (primarySite as any)?.floorLabel, deviceType: 'firewall', isPrimary: true, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      upstreamDevice: deviceNameForPlacement({ siteName, siteCode: primarySite?.siteCode, buildingLabel: (primarySite as any)?.buildingLabel, floorLabel: (primarySite as any)?.floorLabel, deviceType: 'firewall', isPrimary: true, topologyType: topology.topologyType, namingConvention: profile.deviceNamingConvention, namingTokenPreference: profile.namingTokenPreference, customNamingPattern: (profile as any).customNamingPattern, sequence: 1 }),
      ingressInterface: 'Gi0/0 outside → Gi0/2 dmz',
      notes: [profile.remoteAccessMethod || 'Remote access method not set'],
    });
  }
  return items;
}

function buildSecurityBoundaries(input: { topology: TopologyBlueprint; sitePlacements: SitePlacementDevice[]; rows: AddressingPlanRow[]; servicePlacements: ServicePlacementItem[]; routingPlan: RoutePlanItem[]; }) {
  const { topology, sitePlacements, rows, servicePlacements, routingPlan } = input;
  const boundaries: SecurityBoundaryDetail[] = [];
  const siteNames = Array.from(new Set(rows.map((row) => row.siteName)));

  siteNames.forEach((siteName) => {
    const siteRows = rows.filter((row) => row.siteName === siteName && row.subnetCidr !== 'Unassigned');
    const edge = sitePlacements.find((item) => item.siteName === siteName && (item.deviceType === 'firewall' || item.deviceType === 'router'));
    const siteRoute = routingPlan.find((item) => item.siteName === siteName);
    const grouped = new Map<string, AddressingPlanRow[]>();
    siteRows.forEach((row) => {
      const key = zoneNameForRole(row.role);
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    });

    grouped.forEach((zoneRows, zoneName) => {
      const isGuest = /guest/i.test(zoneName);
      const isMgmt = /management/i.test(zoneName);
      const isTransit = /transit/i.test(zoneName);
      const hasDmzSignal = zoneRows.some((row) => /dmz/i.test(`${row.segmentName} ${row.purpose}`));
      const isServer = /server/i.test(zoneName) || hasDmzSignal;
      const isDmz = hasDmzSignal || (isServer && siteName === topology.primarySiteName && topology.internetBreakout === 'centralized');
      const resolvedZoneName = isDmz ? 'DMZ / edge service zone' : zoneName;
      const attachedDevice = edge ? edge.deviceName : `${siteName} routed edge`;
      const boundaryName = `${siteName} ${isDmz ? 'DMZ boundary' : zoneName}`;
      const permittedPeers = isGuest
        ? ['Internet only via perimeter policy']
        : isMgmt
          ? ['Management plane', 'Approved infrastructure endpoints']
          : isDmz
            ? ['Internet via published policy', 'Management zone for administration']
            : isServer
              ? ['Trusted user zone', 'Management zone', topology.topologyType !== 'collapsed-core' ? 'Branch routed domains via policy' : '']
              : ['Trusted internal zones subject to policy'];
      const publishedServices = servicePlacements
        .filter((service) => service.siteName === siteName && service.zoneName === resolvedZoneName && service.publishedExternally)
        .map((service) => service.serviceName);
      const insideRelationships = isGuest
        ? []
        : isMgmt
          ? ['Management initiates toward infrastructure control plane only']
          : isTransit
            ? ['Local route domain and edge identity']
            : isDmz
              ? ['Approved back-end service dependencies', 'Management administration path']
              : isServer
                ? ['Trusted user zone', 'Management zone', topology.topologyType !== 'collapsed-core' ? 'Remote site summaries via routed policy' : '']
                : ['Local routed core and approved inter-zone services'];
      const outsideRelationships = isGuest
        ? ['Internet edge only']
        : isTransit
          ? [topology.cloudConnected ? 'Cloud / WAN transport' : 'WAN transport']
          : isDmz
            ? ['Published internet edge', 'External consumers through reverse proxy or static NAT']
            : isMgmt
              ? ['No general outside peer; privileged admin entry only']
              : [topology.internetBreakout === 'centralized' && siteName !== topology.primarySiteName ? `${topology.primarySiteName} perimeter policy hub` : 'Perimeter edge or adjacent routed domains'];

      boundaries.push({
        zoneName: resolvedZoneName,
        siteName,
        boundaryName,
        subnetCidrs: zoneRows.map((row) => row.subnetCidr),
        attachedDevice,
        attachedInterface: isDmz ? 'Gi0/2 dmz / published services' : isGuest ? 'Gi0/1 inside / guest handoff' : isMgmt ? 'Vlan90 / management gateway' : isTransit ? 'Transit routed handoff' : 'Inside routed handoff',
        upstreamBoundary: isGuest ? 'Internet edge' : isTransit ? 'WAN / cloud transport boundary' : isDmz ? 'Published perimeter edge' : 'Trusted routed core',
        upstreamInterface: isDmz ? 'Gi0/0 outside' : isGuest ? 'Outside NAT boundary' : isTransit ? 'WAN transport' : 'Trusted routed core',
        downstreamAssets: zoneRows.map((row) => row.segmentName),
        permittedPeers: permittedPeers.filter(Boolean),
        controlPoint: isGuest ? 'Guest firewall / internet breakout policy' : isMgmt ? 'Privileged management ACL / firewall policy' : isDmz ? 'Firewall DMZ/service policy' : isTransit ? 'Routing / transport policy' : 'Internal segmentation policy',
        inboundPolicy: isDmz ? 'Inbound internet allowed only to explicitly published services and ports.' : isGuest ? 'No inbound from trusted or internet into guest clients.' : 'Inbound allowed only from approved zones and management paths.',
        eastWestPolicy: isMgmt ? 'Management initiates to infrastructure; reverse access should be tightly restricted.' : isDmz ? 'DMZ does not initiate east-west trust into internal zones except explicit back-end dependencies.' : isGuest ? 'Guest east-west denied by default.' : 'Same-trust communication should still be limited to documented service dependencies.',
        managementSource: isMgmt ? 'Privileged admin workstations / management VPN' : 'Management zone only',
        natPolicy: isGuest ? 'Source NAT at internet edge for guest egress.' : isDmz ? 'Static NAT / reverse proxy only for published services; no blanket inbound NAT.' : 'No special NAT expected inside the trust boundary.',
        routeDomain: siteRoute?.summaryAdvertisement || siteRoute?.loopbackCidr,
        insideRelationships: insideRelationships.filter(Boolean),
        outsideRelationships: outsideRelationships.filter(Boolean),
        publishedServices,
        notes: [
          `This boundary is attached to ${attachedDevice} and is no longer described only in generic terms.`,
          topology.topologyType === 'hub-spoke' && siteName !== topology.primarySiteName && !isTransit ? `Traffic leaving ${siteName} should normally traverse ${topology.primarySiteName} for shared policy enforcement.` : 'Boundary stays local to the site routing and policy edge.',
        ],
      });
    });
  });

  return boundaries;
}

function addUniqueFlow(target: TrafficFlowPath[], flow: TrafficFlowPath) {
  if (target.some((item) => item.id === flow.id || item.flowLabel === flow.flowLabel)) return;
  target.push(flow);
}

function wanLinkNameForSite(wanLinks: WanLinkPlanRow[], siteName?: string) {
  if (!siteName) return 'Inter-site transport';
  return wanLinks.find((link) => link.endpointASiteName === siteName || link.endpointBSiteName === siteName)?.linkName || 'Inter-site transport';
}

function buildTrafficFlows(input: { profile: RequirementsProfile; topology: TopologyBlueprint; siteHierarchy: SiteHierarchyItem[]; rows: AddressingPlanRow[]; wanLinks: WanLinkPlanRow[]; servicePlacements: ServicePlacementItem[]; }) {
  const { profile, topology, siteHierarchy, rows, wanLinks, servicePlacements } = input;
  const flows: TrafficFlowPath[] = [];
  const primarySite = siteHierarchy.find((site) => site.id === topology.primarySiteId) || siteHierarchy[0];
  const primaryServer = firstSubnetForRole(rows.filter((row) => row.siteId === primarySite?.id), 'SERVER');
  const dmzPlacement = servicePlacements.find((item) => item.serviceType === 'dmz-service');
  const cloudPlacement = servicePlacements.find((item) => item.serviceType === 'cloud-service');

  siteHierarchy.forEach((site) => {
    const siteRows = rows.filter((row) => row.siteId === site.id);
    const userRow = firstSubnetForRole(siteRows, 'USER');
    const guestRow = firstSubnetForRole(siteRows, 'GUEST');
    const managementRow = firstSubnetForRole(siteRows, 'MANAGEMENT');
    const localServerRow = firstSubnetForRole(siteRows, 'SERVER');
    const isPrimary = site.id === primarySite?.id;
    const breakoutPoint = topology.internetBreakout === 'centralized' && !isPrimary
      ? `${primarySite?.name || 'Primary site'} perimeter edge`
      : `${site.name} perimeter edge`;
    const breakoutPolicy = topology.internetBreakout === 'centralized' && !isPrimary
      ? `${site.name} reaches the internet through ${primarySite?.name || 'the primary site'} so branch browsing still crosses the shared north-south policy point.`
      : `${site.name} exits through its own perimeter edge after local north-south policy inspection.`;

    if (userRow) {
      addUniqueFlow(flows, {
        id: `flow-${site.id}-user-gateway`,
        flowName: 'User to local gateway',
        flowLabel: `${site.name} user → local gateway ${userRow.gatewayIp}`,
        flowCategory: 'user-local-gateway',
        source: `${site.name} user segment ${userRow.subnetCidr}`,
        destination: `${site.name} gateway ${userRow.gatewayIp}`,
        sourceSite: site.name,
        destinationSite: site.name,
        sourceZone: 'User zone',
        destinationZone: 'Routing identity',
        sourceSubnetCidr: userRow.subnetCidr,
        destinationSubnetCidr: userRow.subnetCidr,
        path: [`${site.name} access edge`, `${site.name} VLAN gateway ${userRow.gatewayIp}`],
        controlPoints: [`${site.name} first-hop gateway`, `${site.name} local inter-VLAN control`],
        routeModel: 'Local first-hop routing decision at the site gateway.',
        natBehavior: 'No NAT expected; this is an internal first-hop path.',
        enforcementPolicy: 'User traffic must hit the correct local gateway before any east-west or north-south policy can apply.',
        policyNotes: ['This flow makes the local gateway role explicit rather than assuming it is understood.'],
      });

      addUniqueFlow(flows, {
        id: `flow-${site.id}-user-internet`,
        flowName: 'Trusted user to internet',
        flowLabel: `${site.name} user → internet via ${breakoutPoint}`,
        flowCategory: 'user-internet',
        source: `${site.name} user segment ${userRow.subnetCidr}`,
        destination: 'Internet',
        sourceSite: site.name,
        destinationSite: topology.internetBreakout === 'centralized' && !isPrimary ? primarySite?.name : site.name,
        sourceZone: 'User zone',
        destinationZone: 'Untrusted / internet',
        sourceSubnetCidr: userRow.subnetCidr,
        path: topology.internetBreakout === 'centralized' && !isPrimary
          ? [`${site.name} access`, `${site.name} WAN edge`, wanLinkNameForSite(wanLinks, site.name), `${primarySite?.name || 'Primary site'} perimeter edge`, 'Internet']
          : [`${site.name} access`, `${site.name} routed core`, breakoutPoint, 'Internet'],
        controlPoints: topology.internetBreakout === 'centralized' && !isPrimary
          ? [`${site.name} WAN edge`, `${primarySite?.name || 'Primary site'} north-south firewall`, 'NAT / egress policy']
          : [`${site.name} edge firewall`, 'North-south policy / NAT'],
        routeModel: topology.internetBreakout === 'centralized' && !isPrimary
          ? routeBehaviorForTopology(topology, site.name, primarySite?.name)
          : routeBehaviorForTopology(topology, site.name),
        natBehavior: 'Source NAT / PAT at the active internet edge.',
        enforcementPolicy: 'Trusted users should reach the internet only after perimeter policy inspection and logging.',
        policyNotes: [breakoutPolicy, profile.securityPosture || 'Security posture not specified'],
      });
    }

    if (guestRow) {
      addUniqueFlow(flows, {
        id: `flow-${site.id}-guest-internet`,
        flowName: 'Guest to internet',
        flowLabel: `${site.name} guest → internet via ${breakoutPoint}`,
        flowCategory: 'guest-internet',
        source: `${site.name} guest segment ${guestRow.subnetCidr}`,
        destination: 'Internet',
        sourceSite: site.name,
        destinationSite: topology.internetBreakout === 'centralized' && !isPrimary ? primarySite?.name : site.name,
        sourceZone: 'Guest zone',
        destinationZone: 'Untrusted / internet',
        sourceSubnetCidr: guestRow.subnetCidr,
        path: topology.internetBreakout === 'centralized' && !isPrimary
          ? [`${site.name} guest VLAN`, `${site.name} WAN edge`, wanLinkNameForSite(wanLinks, site.name), `${primarySite?.name || 'Primary site'} guest egress`, 'Internet']
          : [`${site.name} guest VLAN`, breakoutPoint, 'Internet'],
        controlPoints: topology.internetBreakout === 'centralized' && !isPrimary
          ? [`${site.name} WAN edge`, `${primarySite?.name || 'Primary site'} guest egress policy`]
          : [`${site.name} guest egress policy`],
        routeModel: topology.internetBreakout === 'centralized' && !isPrimary
          ? `Guest traffic from ${site.name} is anchored to ${primarySite?.name || 'the primary site'} for breakout and should not enter trusted east-west paths.`
          : 'Guest traffic exits locally without access to trusted internal zones.',
        natBehavior: 'Source NAT at the guest internet edge.',
        enforcementPolicy: 'Guest access should not traverse into trusted internal zones.',
        policyNotes: [profile.guestPolicy || 'Guest policy not set'],
      });
    }

    if (userRow && localServerRow) {
      const localServerActsAsDmz = Boolean(dmzPlacement?.subnetCidr && dmzPlacement.subnetCidr === localServerRow.subnetCidr);
      addUniqueFlow(flows, {
        id: `flow-${site.id}-user-local-service`,
        flowName: 'User to local service',
        flowLabel: `${site.name} user → ${site.name} ${localServerActsAsDmz ? 'DMZ/service boundary' : 'local service zone'}`,
        flowCategory: 'user-local-service',
        source: `${site.name} user segment ${userRow.subnetCidr}`,
        destination: `${site.name} server segment ${localServerRow.subnetCidr}`,
        sourceSite: site.name,
        destinationSite: site.name,
        sourceZone: 'User zone',
        destinationZone: localServerActsAsDmz ? 'DMZ / edge service zone' : 'Server zone',
        sourceSubnetCidr: userRow.subnetCidr,
        destinationSubnetCidr: localServerRow.subnetCidr,
        path: [`${site.name} access`, `${site.name} routed core`, localServerActsAsDmz ? `${site.name} perimeter edge` : `${site.name} server zone`],
        controlPoints: ['Inter-zone ACL / firewall policy', 'Server access policy'],
        routeModel: routeBehaviorForTopology(topology, site.name, site.name),
        natBehavior: localServerActsAsDmz ? 'No inbound NAT on this internal path; use explicit policy only.' : 'No NAT expected on internal east-west communication.',
        enforcementPolicy: 'Only approved application and identity flows should cross from users into local services.',
        policyNotes: [localServerActsAsDmz ? 'This service subnet is acting as a DMZ or published boundary in the design.' : 'This path stays local to the site routing and service domain.'],
      });
    }

    if (managementRow) {
      addUniqueFlow(flows, {
        id: `flow-${site.id}-management-infrastructure`,
        flowName: 'Management to infrastructure',
        flowLabel: `${site.name} management → infrastructure control plane`,
        flowCategory: 'management-infrastructure',
        source: `${site.name} management segment ${managementRow.subnetCidr}`,
        destination: 'Network devices and infrastructure services',
        sourceSite: site.name,
        destinationSite: site.name,
        sourceZone: 'Management zone',
        destinationZone: 'Infrastructure control plane',
        sourceSubnetCidr: managementRow.subnetCidr,
        path: [`${site.name} management zone`, 'Routed core / control plane', 'Device management interfaces'],
        controlPoints: ['Privileged access controls', 'AAA / logging'],
        routeModel: 'Management path should stay in the control plane and not hairpin through user zones.',
        natBehavior: 'No NAT expected; this is a privileged internal path.',
        enforcementPolicy: 'Management traffic should originate only from dedicated admin zones and be fully logged.',
        policyNotes: [profile.managementAccess || 'Management access assumptions not yet set'],
      });
    }

    if (!isPrimary && userRow && primaryServer && (topology.topologyType === 'hub-spoke' || topology.topologyType === 'hybrid-cloud' || topology.topologyType === 'multi-site')) {
      addUniqueFlow(flows, {
        id: `flow-${site.id}-centralized-service`,
        flowName: 'Site user to centralized service',
        flowLabel: `${site.name} user → ${primarySite?.name || 'Primary'} shared services via ${wanLinkNameForSite(wanLinks, site.name)}`,
        flowCategory: 'site-centralized-service',
        source: `${site.name} user segment ${userRow.subnetCidr}`,
        destination: `${primarySite?.name || 'Primary'} shared services ${primaryServer.subnetCidr}`,
        sourceSite: site.name,
        destinationSite: primarySite?.name,
        sourceZone: 'User zone',
        destinationZone: 'Server zone',
        sourceSubnetCidr: userRow.subnetCidr,
        destinationSubnetCidr: primaryServer.subnetCidr,
        path: [`${site.name} access`, `${site.name} WAN edge`, wanLinkNameForSite(wanLinks, site.name), `${primarySite?.name || 'Primary'} perimeter / core`, `${primarySite?.name || 'Primary'} server zone`],
        controlPoints: [`${site.name} WAN edge`, `${primarySite?.name || 'Primary'} inter-zone controls`],
        routeModel: routeBehaviorForTopology(topology, site.name, primarySite?.name),
        natBehavior: 'No internet NAT on the inter-site path; keep this as routed private transport.',
        enforcementPolicy: 'Centralized-service traffic should follow the declared private transport and shared policy model.',
        policyNotes: [topology.internetBreakout === 'centralized' ? `Shared-service traffic should follow ${primarySite?.name || 'the primary site'} as the policy hub.` : 'Service traffic should stay in the private routed domain across sites.'],
      });
    }

    if (cloudPlacement && userRow) {
      addUniqueFlow(flows, {
        id: `flow-${site.id}-cloud-service`,
        flowName: 'Site to cloud-hosted service',
        flowLabel: `${site.name} trusted zones → ${profile.cloudProvider || 'Cloud'} service boundary`,
        flowCategory: 'site-cloud-service',
        source: `${site.name} trusted internal users`,
        destination: `${profile.cloudProvider || 'Cloud'} service boundary`,
        sourceSite: site.name,
        destinationSite: `${profile.cloudProvider || 'Cloud'} edge`,
        sourceZone: 'User / server zones',
        destinationZone: 'Cloud service boundary',
        sourceSubnetCidr: userRow.subnetCidr,
        destinationSubnetCidr: cloudPlacement.subnetCidr,
        path: topology.internetBreakout === 'centralized' && !isPrimary
          ? [`${site.name} routed core`, `${site.name} WAN edge`, wanLinkNameForSite(wanLinks, site.name), `${primarySite?.name || 'Primary site'} cloud edge`, profile.cloudConnectivity || 'Cloud edge transport', `${profile.cloudProvider || 'Cloud'} service boundary`]
          : [`${site.name} routed core`, `${site.name} perimeter edge`, profile.cloudConnectivity || 'Cloud edge transport', `${profile.cloudProvider || 'Cloud'} service boundary`],
        controlPoints: ['Cloud edge routing policy', 'Cloud identity / trust boundary'],
        routeModel: routeBehaviorForTopology(topology, site.name, `${profile.cloudProvider || 'Cloud'} edge`),
        natBehavior: 'Prefer private routed connectivity; avoid unnecessary internet-style NAT inside the cloud boundary.',
        enforcementPolicy: 'Cloud traffic should remain separated from general internet browsing and follow the declared cloud trust boundary.',
        policyNotes: [profile.cloudTrafficBoundary || 'Cloud traffic boundary not specified'],
      });
    }
  });

  if (dmzPlacement?.publishedExternally) {
    addUniqueFlow(flows, {
      id: 'flow-internet-to-dmz',
      flowName: 'Internet to published DMZ service',
      flowLabel: `Internet → ${dmzPlacement.siteName} published DMZ service`,
      flowCategory: 'internet-dmz',
      source: 'Internet user',
      destination: dmzPlacement.subnetCidr ? `${dmzPlacement.siteName} DMZ service ${dmzPlacement.subnetCidr}` : `${dmzPlacement.siteName} DMZ service boundary`,
      destinationSite: dmzPlacement.siteName,
      sourceZone: 'Untrusted / internet',
      destinationZone: 'DMZ / edge service zone',
      destinationSubnetCidr: dmzPlacement.subnetCidr,
      path: dmzPlacement.ingressPath || ['Internet', `${dmzPlacement.siteName} perimeter edge`, `${dmzPlacement.siteName} DMZ service boundary`],
      controlPoints: [`${dmzPlacement.siteName} perimeter firewall`, 'Published-service policy / reverse proxy'],
      routeModel: 'Inbound path terminates at the public edge and should not route directly into trusted internal zones.',
      natBehavior: 'Static NAT, reverse proxy, or load-balanced publication only for approved services.',
      enforcementPolicy: 'Only explicitly published DMZ services should be reachable from the internet; all other inbound traffic is denied.',
      policyNotes: [dmzPlacement.notes[0] || 'DMZ publication rules not yet refined'],
    });
  }

  if (profile.remoteAccess) {
    addUniqueFlow(flows, {
      id: 'flow-remote-access',
      flowName: 'Remote user to internal service',
      flowLabel: `Remote user → ${primarySite?.name || 'Primary site'} internal service via remote access edge`,
      flowCategory: 'remote-user-internal',
      source: 'Remote user / VPN client',
      destination: primaryServer ? `${primarySite?.name || 'Primary site'} shared services ${primaryServer.subnetCidr}` : 'Approved internal service',
      destinationSite: primarySite?.name,
      sourceZone: 'External remote-access zone',
      destinationZone: primaryServer ? 'Server zone' : 'Trusted internal zone',
      destinationSubnetCidr: primaryServer?.subnetCidr,
      path: ['Remote user', `${primarySite?.name || 'Primary site'} remote access gateway`, `${primarySite?.name || 'Primary site'} perimeter policy`, primaryServer ? `${primarySite?.name || 'Primary site'} server zone` : `${primarySite?.name || 'Primary site'} trusted zone`],
      controlPoints: ['VPN / remote access gateway', 'Identity policy', 'Post-auth access control'],
      routeModel: 'Remote access must terminate at the controlled edge before entering the internal route domain.',
      natBehavior: 'No general-purpose NAT after tunnel termination; rely on identity and route-based access control.',
      enforcementPolicy: 'Remote access should terminate in a controlled edge/DMZ context and then be filtered toward approved internal services.',
      policyNotes: [profile.remoteAccessMethod || 'Remote access method not set'],
    });
  }

  return flows;
}

function buildFlowCoverage(input: { profile: RequirementsProfile; topology: TopologyBlueprint; siteHierarchy: SiteHierarchyItem[]; rows: AddressingPlanRow[]; trafficFlows: TrafficFlowPath[]; servicePlacements: ServicePlacementItem[]; }) {
  const { profile, topology, siteHierarchy, rows, trafficFlows, servicePlacements } = input;
  const hasRole = (role: SegmentRole) => rows.some((row) => row.role === role && row.subnetCidr !== 'Unassigned');
  const multiSite = siteHierarchy.length > 1;
  const requiredChecks = [
    {
      id: 'user-local-gateway',
      label: 'User to local gateway',
      required: hasRole('USER'),
      detail: 'Every user segment should show its first-hop path to the local gateway.',
    },
    {
      id: 'user-local-service',
      label: 'User to local service',
      required: siteHierarchy.some((site) => {
        const siteRows = rows.filter((row) => row.siteId === site.id);
        return Boolean(firstSubnetForRole(siteRows, 'USER') && firstSubnetForRole(siteRows, 'SERVER'));
      }),
      detail: 'At least one site with both users and local services should show the east-west service path explicitly.',
    },
    {
      id: 'user-internet',
      label: 'Trusted user to internet',
      required: hasRole('USER'),
      detail: 'North-south browsing should be explicit for trusted users.',
    },
    {
      id: 'guest-internet',
      label: 'Guest to internet',
      required: profile.guestWifi || hasRole('GUEST'),
      detail: 'Guest breakout should be explicit whenever guest access is in scope.',
    },
    {
      id: 'management-infrastructure',
      label: 'Management to infrastructure',
      required: profile.management || hasRole('MANAGEMENT'),
      detail: 'The control-plane path for administrators should be explicit when management is in scope.',
    },
    {
      id: 'site-centralized-service',
      label: 'Site to centralized service',
      required: multiSite && Boolean(firstSubnetForRole(rows.filter((row) => row.siteId === (siteHierarchy.find((site) => site.id === topology.primarySiteId) || siteHierarchy[0])?.id), 'SERVER')),
      detail: 'Multi-site designs with shared services should show the inter-site service path.',
    },
    {
      id: 'site-cloud-service',
      label: 'Site to cloud service',
      required: topology.cloudConnected || servicePlacements.some((item) => item.placementType === 'cloud'),
      detail: 'Cloud-connected designs should show which traffic crosses the cloud boundary.',
    },
    {
      id: 'internet-dmz',
      label: 'Internet to DMZ service',
      required: servicePlacements.some((item) => item.publishedExternally),
      detail: 'Published services should show the controlled inbound edge path.',
    },
    {
      id: 'remote-user-internal',
      label: 'Remote user to internal service',
      required: profile.remoteAccess,
      detail: 'Remote-access designs should show the controlled entry path into internal services.',
    },
  ] as const;

  return requiredChecks.map((check) => {
    const matchedFlowIds = trafficFlows.filter((flow) => flow.flowCategory === check.id).map((flow) => flow.id);
    const status = check.required ? (matchedFlowIds.length > 0 ? 'ready' : 'pending') : 'ready';
    return {
      id: check.id,
      label: check.label,
      required: check.required,
      status,
      detail: check.required
        ? matchedFlowIds.length > 0
          ? `${check.detail} ${matchedFlowIds.length} flow path${matchedFlowIds.length === 1 ? '' : 's'} currently cover this scenario.`
          : `${check.detail} This required path is still missing from the generated flow model.`
        : `${check.detail} It is not required by the current scenario.`,
      matchedFlowIds,
    } satisfies FlowCoverageItem;
  });
}

export function synthesizeLogicalDesign(project: Project | undefined, sites: Site[], vlans: Vlan[], profile: RequirementsProfile): SynthesizedLogicalDesign {
  const plannedSiteCount = Math.max(1, Math.max(sites.length, toNumber(profile.siteCount, 1)));
  const organization = inferWorkingOrganizationBlock(project, plannedSiteCount, toNumber(profile.usersPerSite, 50));
  const organizationRange = parseCidrRange(organization.cidr);
  const workingSites = buildWorkingSites(sites, plannedSiteCount);

  const occupiedSiteBlocks: ParsedCidrRange[] = [];
  const siteDemandMap = new Map<string, ReturnType<typeof demandForSite>>();

  workingSites.forEach((site, index) => {
    const demand = demandForSite(profile, index, workingSites.length);
    site.plannedDemandAddresses = demand.plannedDemandAddresses;
    site.plannedDemandHosts = demand.plannedDemandHosts;
    site.summaryPrefix = demand.siteBlockPrefix;
    siteDemandMap.set(site.id, demand);

    const existingBlock = site.siteBlockCidr ? parseCidrRange(site.siteBlockCidr) : null;
    if (existingBlock) occupiedSiteBlocks.push(existingBlock);
  });

  if (/consistent|summar/i.test(profile.siteBlockStrategy || "") && workingSites.length > 1) {
    const branchPrefixes = workingSites.slice(1).map((site) => site.summaryPrefix || 32);
    const baselineBranchPrefix = branchPrefixes.length > 0 ? Math.min(...branchPrefixes) : workingSites[0].summaryPrefix || 32;
    workingSites.forEach((site, index) => {
      if (index === 0 && /central/i.test(profile.serverPlacement || "")) return;
      site.summaryPrefix = baselineBranchPrefix;
    });
  }

  if (organizationRange) {
    workingSites.forEach((site) => {
      if (site.siteBlockCidr) return;
      const requestedPrefix = Math.max(organizationRange.prefix, site.summaryPrefix || organizationRange.prefix);
      const block = findAvailableChildBlock(organizationRange, requestedPrefix, occupiedSiteBlocks);
      if (block) {
        site.siteBlockCidr = `${intToIpv4(block.network)}/${block.prefix}`;
        occupiedSiteBlocks.push(block);
        if (!site.note) site.note = "Proposed site block allocated from the organization range.";
      } else if (!site.note) {
        site.note = "No free summary block was available inside the organization range.";
      }
    });
  }

  const siteBlockMap = new Map(workingSites.map((site) => [site.id, site.siteBlockCidr]));
  const rows: AddressingPlanRow[] = [];

  workingSites.forEach((site) => {
    const configuredForSite = vlans.filter((vlan) => vlan.siteId === site.id || vlan.site?.id === site.id);
    const occupied = configuredForSite
      .map((vlan) => parseCidrRange(vlan.subnetCidr))
      .filter((item): item is ParsedCidrRange => Boolean(item));

    const configuredRowsForSite = configuredForSite
      .map((vlan) => buildConfiguredRow(vlan, siteBlockMap.get(site.id)))
      .filter((item): item is AddressingPlanRow => Boolean(item));

    configuredRowsForSite.forEach((item) => rows.push(item));

    const recommended = siteDemandMap.get(site.id)?.templates || [];
    const configuredByRole = configuredRowsForSite.reduce((map, row) => {
      const bucket = map.get(row.role) || [];
      bucket.push(row);
      map.set(row.role, bucket);
      return map;
    }, new Map<SegmentRole, AddressingPlanRow[]>());

    recommended
      .sort((a, b) => recommendedPrefixForHosts(a.estimatedHosts, a.role) - recommendedPrefixForHosts(b.estimatedHosts, b.role))
      .forEach((template) => {
        const matchingConfigured = configuredByRole.get(template.role) || [];
        if (matchingConfigured.length === 0) {
          rows.push(buildProposedRow({
            siteId: site.id,
            siteName: site.name,
            siteCode: site.siteCode,
            siteBlockCidr: site.siteBlockCidr,
            template,
            occupied,
            idSuffix: "proposed",
          }));
          return;
        }

        if (configuredRowsNeedAdjustment(matchingConfigured, template)) {
          rows.push(buildProposedRow({
            siteId: site.id,
            siteName: site.name,
            siteCode: site.siteCode,
            siteBlockCidr: site.siteBlockCidr,
            template,
            occupied,
            idSuffix: "correction",
            additionalNotes: [
              "A configured row already exists for this role, but the synthesized design still recommends an adjusted subnet or service model before implementation.",
            ],
          }));
        }
      });
  });

  rows.sort((a, b) => {
    const siteCompare = a.siteName.localeCompare(b.siteName);
    if (siteCompare !== 0) return siteCompare;
    if ((a.vlanId || 9999) !== (b.vlanId || 9999)) return (a.vlanId || 9999) - (b.vlanId || 9999);
    return roleSortWeight(a.role) - roleSortWeight(b.role);
  });

  const segmentModel = buildSegmentModel(rows);
  const { wanReserveBlock, wanLinks } = buildWanLinks({
    organizationRange,
    occupiedSiteBlocks,
    siteHierarchy: buildSiteHierarchy(workingSites.map((site) => ({
      id: site.id,
      name: site.name,
      siteCode: site.siteCode,
      location: site.location,
      source: site.source,
      siteBlockCidr: site.siteBlockCidr,
      summaryPrefix: site.summaryPrefix,
      plannedDemandAddresses: site.plannedDemandAddresses,
      plannedDemandHosts: site.plannedDemandHosts,
      note: site.note,
    })), rows),
    profile,
  });
  const recommendedSegments = segmentModel.map((segment) => ({
    role: segment.role,
    label: segment.label,
    vlanId: segment.vlanId,
    purpose: segment.purpose,
  }));

  const proposedSegments = rows.filter((row) => row.source === "proposed").length;
  const configuredSegments = rows.filter((row) => row.source === "configured").length;
  const missingSiteBlocks = workingSites.filter((site) => !site.siteBlockCidr).length;
  const rowsOutsideSiteBlocks = rows.filter((row) => row.insideSiteBlock === false).length;
  const siteHierarchy = buildSiteHierarchy(workingSites.map((site) => ({
    id: site.id,
    name: site.name,
    siteCode: site.siteCode,
    location: site.location,
    source: site.source,
    siteBlockCidr: site.siteBlockCidr,
    summaryPrefix: site.summaryPrefix,
    plannedDemandAddresses: site.plannedDemandAddresses,
    plannedDemandHosts: site.plannedDemandHosts,
    note: site.note,
  })), rows);

  const organizationCapacity = organizationRange ? blockAddressCount(organizationRange.prefix) : 0;
  const allocatedSiteAddresses = siteHierarchy.reduce((total, site) => total + site.blockCapacity, 0);
  const plannedSiteDemandAddresses = siteHierarchy.reduce((total, site) => total + site.plannedDemandAddresses, 0);
  const organizationUtilization = organizationCapacity > 0 ? allocatedSiteAddresses / organizationCapacity : 0;
  const organizationHeadroom = Math.max(0, organizationCapacity - allocatedSiteAddresses);

  const topology = inferTopologyBlueprint({ profile, siteHierarchy, wanLinks, rows });
  const sitePlacements = buildSitePlacements({ profile, topology, siteHierarchy, rows });
  const servicePlacements = buildServicePlacements({ profile, topology, siteHierarchy, rows });
  const routingPlan = buildRoutingPlan(siteHierarchy, rows, wanLinks, profile);
  const securityBoundaries = buildSecurityBoundaries({ topology, sitePlacements, rows, servicePlacements, routingPlan });
  const trafficFlows = buildTrafficFlows({ profile, topology, siteHierarchy, rows, wanLinks, servicePlacements });
  const flowCoverage = buildFlowCoverage({ profile, topology, siteHierarchy, rows, trafficFlows, servicePlacements });

  const routingProtocols = buildRoutingProtocols({
    profile,
    siteHierarchy,
    routingPlan,
    wanLinks,
    segmentModel,
  });
  const routePolicies = buildRoutePolicies({
    profile,
    siteHierarchy,
    routingPlan,
    wanLinks,
  });
  const switchingDesign = buildSwitchingDesign({
    profile,
    siteHierarchy,
    segmentModel,
  });
  const qosPlan = buildQosPlan(profile, segmentModel);
  const logicalDomains = buildLogicalDomains(segmentModel, profile);
  const securityZones = buildSecurityZones(logicalDomains, segmentModel, profile);
  const securityControls = buildSecurityControls(profile, segmentModel);
  const securityPolicyMatrix = buildSecurityPolicyMatrix(securityZones);
  const segmentationReview = buildSegmentationReview({
    profile,
    rows,
    segmentModel,
    securityZones,
  });
  const routingSwitchingReview = buildRoutingSwitchingReview({
    profile,
    siteHierarchy,
    routingPlan,
    wanLinks,
    routingProtocols,
    routePolicies,
    switchingDesign,
    qosPlan,
    segmentModel,
  });
  const implementationPlan = buildImplementationPlanSummary({
    profile,
    siteHierarchy,
    wanLinks,
    securityZones,
  });
  const implementationPhases = buildImplementationPhases({
    profile,
    siteHierarchy,
    routingPlan,
    wanLinks,
    securityZones,
    segmentModel,
  });
  const cutoverChecklist = buildCutoverChecklist({
    profile,
    siteHierarchy,
    wanLinks,
  });
  const rollbackPlan = buildRollbackPlan({
    profile,
    siteHierarchy,
    wanLinks,
    securityZones,
  });
  const validationPlan = buildValidationPlan({
    profile,
    securityZones,
    wanLinks,
    segmentModel,
  });
  const configurationStandards = buildConfigurationStandards({
    profile,
    segmentModel,
    securityZones,
    routingPlan,
    wanLinks,
  });
  const configurationTemplates = buildConfigurationTemplates({
    profile,
    segmentModel,
    wanLinks,
    routingProtocols,
    routePolicies,
    switchingDesign,
    securityZones,
  });
  const operationsArtifacts = buildOperationsArtifacts({
    profile,
    configurationTemplates,
  });
  const highLevelDesign = buildHighLevelDesign({
    profile,
    siteHierarchy,
    segmentModel,
    logicalDomains,
    wanLinks,
    topology,
    sitePlacements,
    servicePlacements,
    securityBoundaries,
    trafficFlows,
    flowCoverage,
    routingPlan,
  });
  const lowLevelDesign = buildLowLevelDesign({
    profile,
    siteHierarchy,
    rows,
    topology,
    sitePlacements,
    servicePlacements,
    securityBoundaries,
    trafficFlows,
    flowCoverage,
    routingPlan,
    wanLinks,
  });

  const designTruthModel = buildUnifiedDesignTruthModel({
    discoveryState: parseDiscoveryWorkspaceState(project?.discoveryJson),
    profile,
    topology,
    siteHierarchy,
    addressingPlan: rows,
    sitePlacements,
    routingPlan,
    securityBoundaries,
    servicePlacements,
    trafficFlows,
    wanLinks,
  });

  const designSummary = [
    `SubnetOps is using ${organization.cidr}${organization.assumed ? " as a temporary working organization block" : " as the saved organization block"} to shape a real logical addressing plan before implementation.`,
    `The current architecture direction is ${highLevelDesign.architecturePattern.toLowerCase()}, with ${highLevelDesign.layerModel.toLowerCase()}.`,
    `Topology resolution for v108 is ${topology.topologyLabel.toLowerCase()}, with ${topology.internetBreakout} internet breakout and ${topology.servicePlacementModel.toLowerCase()}.`,
    `The design currently covers ${workingSites.length} site${workingSites.length === 1 ? "" : "s"} with ${rows.length} address plan row${rows.length === 1 ? "" : "s"}, including ${configuredSegments} configured row${configuredSegments === 1 ? "" : "s"} and ${proposedSegments} still-proposed row${proposedSegments === 1 ? "" : "s"}.`,
    `Each site is given a summary block, then per-segment child subnets are placed inside that site block so conflicts, headroom, and trust boundaries can be reviewed before any device configuration is attempted.`,
    `The organization hierarchy is currently consuming ${allocatedSiteAddresses} addresses out of ${organizationCapacity || 0} available in the organization block, which is about ${Math.round(organizationUtilization * 100)}% of the parent range.`,
    `The security model currently defines ${securityZones.length} zone${securityZones.length === 1 ? "" : "s"} with ${securityControls.length} explicit control recommendation${securityControls.length === 1 ? "" : "s"}, so segmentation and policy intent are reviewable before implementation.`,
    `The flow engine currently covers ${flowCoverage.filter((item) => item.required && item.status === "ready").length} required traffic pattern${flowCoverage.filter((item) => item.required && item.status === "ready").length === 1 ? "" : "s"} out of ${flowCoverage.filter((item) => item.required).length}, so path coverage is being tracked against the recovery roadmap instead of only listing arbitrary example flows.`,
    `The routing and switching package now carries ${routingProtocols.length} protocol or transport decision${routingProtocols.length === 1 ? "" : "s"}, ${routePolicies.length} route-policy decision${routePolicies.length === 1 ? "" : "s"}, and ${switchingDesign.length} switching design control${switchingDesign.length === 1 ? "" : "s"}.`,
    designTruthModel.summary,
    `The implementation package currently includes ${implementationPhases.length} phased step${implementationPhases.length === 1 ? "" : "s"}, ${cutoverChecklist.length} cutover checklist item${cutoverChecklist.length === 1 ? "" : "s"}, ${rollbackPlan.length} rollback trigger${rollbackPlan.length === 1 ? "" : "s"}, and ${validationPlan.length} validation test${validationPlan.length === 1 ? "" : "s"}.`,
    `SubnetOps now carries ${configurationStandards.length} configuration standard${configurationStandards.length === 1 ? "" : "s"}, ${configurationTemplates.length} reusable template artifact${configurationTemplates.length === 1 ? "" : "s"}, and ${operationsArtifacts.length} operations handoff item${operationsArtifacts.length === 1 ? "" : "s"} so the design can move toward real implementation baselines.`,
    wanLinks.length > 0
      ? `SubnetOps also reserved ${wanReserveBlock || "a transit pool"} for ${wanLinks.length} WAN or cloud-edge link${wanLinks.length === 1 ? "" : "s"}, and each site now carries a loopback identity for routing and monitoring references.`
      : "No dedicated WAN or cloud transit links were required by the current planning scope.",
  ];

  const designReview = [
    ...buildDesignReview({
      profile,
      organizationBlockAssumed: organization.assumed,
      siteHierarchy,
      rows,
      proposedSegments,
      rowsOutsideSiteBlocks,
      missingSiteBlocks,
      wanReserveBlock,
      wanLinks,
      topology,
      sitePlacements,
      servicePlacements,
      securityBoundaries,
      trafficFlows,
      flowCoverage,
      routingPlan,
    }),
    {
      kind: "decision" as const,
      title: "Security zoning and segmentation intent",
      detail: `The logical design now carries ${securityZones.length} explicit security zone${securityZones.length === 1 ? "" : "s"}, ${securityBoundaries.length} site-aware boundary mapping row${securityBoundaries.length === 1 ? "" : "s"}, and ${securityPolicyMatrix.length} policy-intent flow${securityPolicyMatrix.length === 1 ? "" : "s"} so trust boundaries stay visible before implementation.` ,
    },
    {
      kind: "decision" as const,
      title: "Topology-aware placement and flow model",
      detail: `SubnetOps v108 now resolves ${sitePlacements.length} placement object${sitePlacements.length === 1 ? "" : "s"}, ${servicePlacements.length} service placement${servicePlacements.length === 1 ? "" : "s"}, ${trafficFlows.length} explicit traffic flow path${trafficFlows.length === 1 ? "" : "s"}, and ${flowCoverage.filter((item) => item.required && item.status === "ready").length} covered required flow category${flowCoverage.filter((item) => item.required && item.status === "ready").length === 1 ? "" : "ies"} from the saved topology, addressing, and service assumptions.`,
    },
    {
      kind: "decision" as const,
      title: "Unified design truth model",
      detail: designTruthModel.summary,
    },
    ...(segmentationReview.filter((item) => item.severity !== "info").map((item) => ({
      kind: item.severity === "critical" ? "risk" as const : "assumption" as const,
      title: item.title,
      detail: item.detail,
    }))),
    ...(routingSwitchingReview.filter((item) => item.severity !== "info").map((item) => ({
      kind: item.severity === "critical" ? "risk" as const : "assumption" as const,
      title: item.title,
      detail: item.detail,
    }))),
  ];
  let openIssues = buildOpenIssues(rows, siteHierarchy, designReview, wanLinks, routingPlan, [
    ...segmentationReview,
    ...routingSwitchingReview.map((item) => ({
      severity: item.severity,
      title: item.title,
      detail: item.detail,
      affected: item.affected,
    })),
  ]);
  const implementationRisks = buildImplementationRisks({
    profile,
    siteHierarchy,
    openIssues,
    implementationSummary: implementationPlan,
    segmentationReview,
    routingSwitchingReview,
  });
  openIssues = Array.from(new Set([
    ...openIssues,
    ...implementationRisks.filter((item) => item.severity !== "info").map((item) => item.title),
    ...designTruthModel.unresolvedReferences,
  ]));

  const traceability = traceabilityItems(profile, { organizationBlockAssumed: organization.assumed, siteCount: workingSites.length, proposedSegments });

  const designEngineFoundation: DesignEngineFoundation = {
    stageLabel: "v185 Unified Design Foundation",
    summary: `SubnetOps is now resolving explicit design objects from requirements: ${siteHierarchy.length} site hierarchy row${siteHierarchy.length === 1 ? "" : "s"}, ${rows.length} addressing row${rows.length === 1 ? "" : "s"}, ${sitePlacements.length} placement object${sitePlacements.length === 1 ? "" : "s"}, ${servicePlacements.length} service placement${servicePlacements.length === 1 ? "" : "s"}, ${securityBoundaries.length} security boundary row${securityBoundaries.length === 1 ? "" : "s"}, ${trafficFlows.length} traffic flow path${trafficFlows.length === 1 ? "" : "s"}, and ${designTruthModel.siteNodes.length} unified site node${designTruthModel.siteNodes.length === 1 ? "" : "s"}.`,
    objectCounts: {
      siteHierarchy: siteHierarchy.length,
      addressingRows: rows.length,
      topologyPlacements: sitePlacements.length,
      servicePlacements: servicePlacements.length,
      securityBoundaries: securityBoundaries.length,
      trafficFlows: trafficFlows.length,
      routingIdentities: routingPlan.filter((item) => item.loopbackCidr || item.summaryAdvertisement).length,
      wanLinks: wanLinks.length,
      traceabilityItems: traceability.length,
      openIssues: openIssues.length,
    },
    strongestLayer: rows.length > 0 ? "Addressing hierarchy and site block synthesis" : "Requirements intake still needs real addressing anchors",
    nextPriority: designTruthModel.unresolvedReferences.length === 0
      ? "Use the unified truth model as the backbone for diagram, routing, security, and report work so future builds stop drifting into helper-only layers."
      : "Reduce unresolved truth-model references so topology, routing, service placement, security boundaries, and flows all resolve cleanly from one shared model.",
    coverage: [
      {
        label: "Addressing hierarchy",
        status: rows.length > 0 ? "ready" : "pending",
        detail: rows.length > 0
          ? `Organization, site, VLAN, gateway, DHCP, and headroom outputs are now being generated from the working design model.`
          : "No synthesized addressing rows exist yet.",
      },
      {
        label: "Topology and placement",
        status: sitePlacements.length > 0 ? "ready" : "partial",
        detail: sitePlacements.length > 0
          ? `Site roles, breakout posture, and placement objects are now explicit instead of being left to report narrative.`
          : "Topology choices exist, but placement objects are still thin.",
      },
      {
        label: "Security boundaries",
        status: securityBoundaries.length > 0 ? "ready" : "partial",
        detail: securityBoundaries.length > 0
          ? `Zone-to-subnet and control-point mapping is visible for review.`
          : "Security language is present, but boundary mapping still needs more explicit objects.",
      },
      {
        label: "Traffic-flow model",
        status: trafficFlows.length >= 5 ? "ready" : trafficFlows.length > 0 ? "partial" : "pending",
        detail: trafficFlows.length >= 5
          ? `Critical paths such as user-to-internet, branch-to-shared-service, and edge publishing are being synthesized.`
          : trafficFlows.length > 0
            ? `Some explicit flows exist, but the minimum critical-path set is not complete yet.`
            : "No explicit traffic-flow paths have been generated yet.",
      },
      {
        label: "Traceability and open issues",
        status: traceability.length > 0 ? "ready" : "partial",
        detail: traceability.length > 0
          ? `Requirements-to-design reasoning and open design issues are now reviewable before implementation.`
          : "Design decisions are present, but direct requirement traceability needs more coverage.",
      },
    ],
  };

  const implementationNextSteps = [
    "Review the new HLD and LLD outputs first so the architecture, site roles, trust boundaries, and routing model are agreed before anyone starts writing production configs.",
    `Use the implementation workspace to confirm the rollout approach (${implementationPlan.rolloutStrategy.toLowerCase()}), rollback posture, and validation evidence model before the change window opens.`,
    missingSiteBlocks > 0
      ? "Save or confirm the missing site summary blocks so every proposed segment can be anchored inside a parent address block."
      : "Review each site summary block and confirm the organization-to-site hierarchy is final.",
    proposedSegments > 0
      ? "Compare the proposed addressing rows against the intended design, then turn the accepted rows into real site/VLAN records."
      : "Review the configured segments against the synthesized requirements intent and adjust any segments that no longer match the use case.",
    wanLinks.some((link) => link.subnetCidr === "Unassigned")
      ? "Reserve or expand the WAN transit pool so every branch or cloud edge link has a confirmed subnet and endpoint pair."
      : wanLinks.length > 0
        ? "Review the WAN and cloud edge links, then map the proposed endpoint IPs into the routing implementation sequence."
        : "No dedicated WAN transit planning steps are needed for the current scope.",
    rowsOutsideSiteBlocks > 0
      ? "Bring any subnets that sit outside their site summary block back into the site hierarchy before implementation and summarization planning."
      : "Use validation and the diagram stage to verify that the addressing hierarchy and trust boundaries still match the logical topology.",
    routingPlan.some((item) => !item.loopbackCidr)
      ? "Confirm the missing loopback identities so routing, monitoring, and management references stay consistent per site."
      : "Use the routing plan to carry each site summary and loopback into the implementation handoff.",
    routingSwitchingReview.some((item) => item.severity === "critical")
      ? "Resolve the critical routing and switching findings before implementation, especially transport gaps, loopback identity issues, and over-allocated site blocks."
      : "Carry the routing protocols, route-policy decisions, switching controls, and QoS plan into the implementation handoff package.",
    configurationTemplates.length > 0
      ? "Turn the configuration standards workspace into a reviewed baseline pack, then map each template artifact to the devices or platforms that will implement it."
      : "Define baseline configuration standards before the implementation package is considered complete.",
    segmentationReview.some((item) => item.severity === "critical")
      ? "Resolve the critical segmentation findings so guest, management, specialty, and remote-access boundaries are not left ambiguous before implementation."
      : "Carry the proposed security zones, policy matrix, and control recommendations into the detailed implementation review.",
    openIssues.length > 0
      ? "Resolve the remaining open issues on the addressing plan page so the design package becomes implementation-ready."
      : "The synthesized design is clean enough for final technical review and handoff packaging.",
  ];

  return {
    organizationBlock: organization.cidr,
    organizationBlockAssumed: organization.assumed,
    organizationHierarchy: {
      organizationCapacity,
      allocatedSiteAddresses,
      plannedSiteDemandAddresses,
      organizationHeadroom,
      organizationUtilization,
    },
    wanReserveBlock,
    siteSummaries: workingSites.map((site) => ({
      id: site.id,
      name: site.name,
      siteCode: site.siteCode,
      location: site.location,
      source: site.source,
      siteBlockCidr: site.siteBlockCidr,
      summaryPrefix: site.summaryPrefix,
      plannedDemandAddresses: site.plannedDemandAddresses,
      plannedDemandHosts: site.plannedDemandHosts,
      note: site.note,
    })),
    siteHierarchy,
    addressingPlan: rows,
    recommendedSegments,
    segmentModel,
    wanLinks,
    topology,
    sitePlacements,
    servicePlacements,
    securityBoundaries,
    trafficFlows,
    flowCoverage,
    routingPlan,
    logicalDomains,
    securityZones,
    securityControls,
    securityPolicyMatrix,
    segmentationReview,
    routingProtocols,
    routePolicies,
    switchingDesign,
    qosPlan,
    routingSwitchingReview,
    implementationPlan,
    implementationPhases,
    cutoverChecklist,
    rollbackPlan,
    validationPlan,
    implementationRisks,
    configurationStandards,
    configurationTemplates,
    operationsArtifacts,
    highLevelDesign,
    lowLevelDesign,
    traceability,
    designSummary,
    designReview,
    openIssues,
    implementationNextSteps,
    designEngineFoundation,
    designTruthModel,
    stats: {
      configuredSites: workingSites.filter((site) => site.source === "configured").length,
      proposedSites: workingSites.filter((site) => site.source === "proposed").length,
      configuredSegments,
      proposedSegments,
      missingSiteBlocks,
      rowsOutsideSiteBlocks,
    },
  };
}
