import { allocateRequestedBlocks, type GatewayConvention } from "../addressing/allocation-fit.js";
import { parseCidr, recommendedCapacityPlanForHosts } from "../addressing/cidr.js";
import { asBoolean, asNumber, asString, hasText } from "./normalize.js";
import type { RequirementsInput, SegmentAddressingPlan, SegmentPlan } from "./types.js";

function pushSegment(segments: SegmentPlan[], segment: SegmentPlan) {
  if (segments.some((item) => item.vlanId === segment.vlanId || item.vlanName === segment.vlanName)) return;
  segments.push(segment);
}

export function buildRequirementNotes(requirements: RequirementsInput) {
  const notes = [
    `Project stage: ${asString(requirements.projectStage, "unspecified")}`,
    `Planning for: ${asString(requirements.planningFor, "unspecified")}`,
    `Environment: ${asString(requirements.environmentType, "unspecified")}`,
    `Compliance/policy context: ${asString(requirements.complianceProfile, "unspecified")}`,
    `Primary goal: ${asString(requirements.primaryGoal, "unspecified")}`,
    `Internet model: ${asString(requirements.internetModel, "unspecified")}`,
    `Server placement: ${asString(requirements.serverPlacement, "unspecified")}`,
    `Security posture: ${asString(requirements.securityPosture, "unspecified")}`,
    `Trust boundaries: ${asString(requirements.trustBoundaryModel, "unspecified")}`,
    `Administrative boundary: ${asString(requirements.adminBoundary, "unspecified")}`,
    `Identity model: ${asString(requirements.identityModel, "unspecified")}`,
    `Address hierarchy: ${asString(requirements.addressHierarchyModel, "unspecified")}`,
    `Site block strategy: ${asString(requirements.siteBlockStrategy, "unspecified")}`,
    `Gateway convention: ${asString(requirements.gatewayConvention, "unspecified")}`,
    `Growth buffer: ${asString(requirements.growthBufferModel, "unspecified")}`,
    `Reserved range policy: ${asString(requirements.reservedRangePolicy, "unspecified")}`,
    `Management IP policy: ${asString(requirements.managementIpPolicy, "unspecified")}`,
    `Naming standard: ${asString(requirements.namingStandard, "unspecified")}`,
    `Device naming convention: ${asString(requirements.deviceNamingConvention, "unspecified")}`,
    `Monitoring model: ${asString(requirements.monitoringModel, "unspecified")}`,
    `Logging model: ${asString(requirements.loggingModel, "unspecified")}`,
    `Backup policy: ${asString(requirements.backupPolicy, "unspecified")}`,
    `Physical scope: ${asString(requirements.physicalScope, "unspecified")}`,
    `Site layout: ${asString(requirements.siteLayoutModel, "unspecified")}`,
    `Building/floor/closet model: ${asString(requirements.buildingCount, "1")} building(s), ${asString(requirements.floorCount, "1")} floor(s), ${asString(requirements.closetModel, "unspecified")}`,
    `Application profile: ${asString(requirements.applicationProfile, "unspecified")}`,
    `Critical services: ${asString(requirements.criticalServicesModel, "unspecified")}`,
    `Inter-site traffic: ${asString(requirements.interSiteTrafficModel, "unspecified")}`,
    `Bandwidth/latency/QoS: ${asString(requirements.bandwidthProfile, "unspecified")}; ${asString(requirements.latencySensitivity, "unspecified")}; ${asString(requirements.qosModel, "unspecified")}`,
    `Outage/growth horizon: ${asString(requirements.outageTolerance, "unspecified")}; ${asString(requirements.growthHorizon, "unspecified")}`,
    `Delivery constraints: ${asString(requirements.budgetModel, "unspecified")}; ${asString(requirements.vendorPreference, "unspecified")}; ${asString(requirements.implementationTimeline, "unspecified")}; ${asString(requirements.rolloutModel, "unspecified")}; ${asString(requirements.downtimeConstraint, "unspecified")}; ${asString(requirements.teamCapability, "unspecified")}`,
    `Output/audience: ${asString(requirements.outputPackage, "unspecified")}; ${asString(requirements.primaryAudience, "unspecified")}`,
  ];
  const custom = asString(requirements.customRequirementsNotes);
  if (custom) notes.push(`Custom notes: ${custom}`);
  return notes;
}

export function buildRequirementSegments(requirements: RequirementsInput) {
  const usersPerSite = asNumber(requirements.usersPerSite, 50, 1, 5000);
  const printerCount = asNumber(requirements.printerCount, 0, 0, 2000);
  const phoneCount = asNumber(requirements.phoneCount, 0, 0, 5000);
  const apCount = asNumber(requirements.apCount, 0, 0, 5000);
  const cameraCount = asNumber(requirements.cameraCount, 0, 0, 5000);
  const serverCount = asNumber(requirements.serverCount, 0, 0, 5000);
  const iotDeviceCount = asNumber(requirements.iotDeviceCount, 0, 0, 5000);
  const requirementNotes = buildRequirementNotes(requirements);
  const segments: SegmentPlan[] = [];

  pushSegment(segments, {
    vlanId: 10,
    vlanName: "USERS",
    segmentRole: "USER",
    purpose: `Requirement-derived user access segment for approximately ${usersPerSite} users per site.`,
    estimatedHosts: Math.max(usersPerSite, 10),
    dhcpEnabled: true,
    department: "User Access",
    requiredBy: ["usersPerSite", "wiredWirelessMix", "primaryGoal"],
    reviewNotes: [
      `User access mix: ${asString(requirements.wiredWirelessMix, "unspecified")}`,
      `Primary goal: ${asString(requirements.primaryGoal, "unspecified")}`,
      ...requirementNotes,
    ],
  });

  if (serverCount > 0 || hasText(requirements.serverPlacement) || hasText(requirements.criticalServicesModel)) {
    pushSegment(segments, {
      vlanId: 20,
      vlanName: "SERVICES",
      segmentRole: "SERVER",
      purpose: `Requirement-derived services/server segment for ${serverCount || "review-required"} server/service endpoints.`,
      estimatedHosts: Math.max(serverCount + 10, 20),
      dhcpEnabled: false,
      department: "Services",
      requiredBy: ["serverPlacement", "serverCount", "criticalServicesModel", "applicationProfile"],
      reviewNotes: [
        `Server placement: ${asString(requirements.serverPlacement, "unspecified")}`,
        `Critical services model: ${asString(requirements.criticalServicesModel, "unspecified")}`,
        `Application profile: ${asString(requirements.applicationProfile, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.guestWifi)) {
    pushSegment(segments, {
      vlanId: 30,
      vlanName: "GUEST",
      segmentRole: "GUEST",
      purpose: "Requirement-derived isolated guest access segment.",
      estimatedHosts: Math.max(Math.ceil(usersPerSite * 0.6), 25),
      dhcpEnabled: true,
      department: "Guest Access",
      requiredBy: ["guestWifi", "guestPolicy", "wirelessModel"],
      reviewNotes: [
        `Guest policy: ${asString(requirements.guestPolicy, "unspecified")}`,
        `Wireless model: ${asString(requirements.wirelessModel, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.wireless) || apCount > 0) {
    pushSegment(segments, {
      vlanId: 40,
      vlanName: "STAFF-WIFI",
      segmentRole: "USER",
      purpose: `Requirement-derived staff wireless segment for ${apCount || "review-required"} AP(s).`,
      estimatedHosts: Math.max(Math.ceil(usersPerSite * 0.75), apCount * 20, 25),
      dhcpEnabled: true,
      department: "Wireless",
      requiredBy: ["wireless", "wirelessModel", "apCount", "wiredWirelessMix"],
      reviewNotes: [
        `Wireless model: ${asString(requirements.wirelessModel, "unspecified")}`,
        `AP count: ${asString(requirements.apCount, "0")}`,
      ],
    });
  }

  if (asBoolean(requirements.voice) || phoneCount > 0) {
    pushSegment(segments, {
      vlanId: 50,
      vlanName: "VOICE",
      segmentRole: "VOICE",
      purpose: `Requirement-derived voice segment for ${phoneCount || "review-required"} phone(s).`,
      estimatedHosts: Math.max(phoneCount, Math.ceil(usersPerSite * 0.35), 10),
      dhcpEnabled: true,
      department: "Voice",
      requiredBy: ["voice", "phoneCount", "voiceQos", "qosModel", "latencySensitivity"],
      reviewNotes: [
        `Voice QoS: ${asString(requirements.voiceQos, "unspecified")}`,
        `QoS model: ${asString(requirements.qosModel, "unspecified")}`,
        `Latency sensitivity: ${asString(requirements.latencySensitivity, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.printers) || printerCount > 0) {
    pushSegment(segments, {
      vlanId: 60,
      vlanName: "PRINTERS",
      segmentRole: "PRINTER",
      purpose: `Requirement-derived printer segment for ${printerCount || "review-required"} printer(s).`,
      estimatedHosts: Math.max(printerCount + 5, 10),
      dhcpEnabled: true,
      department: "Shared Devices",
      requiredBy: ["printers", "printerCount"],
      reviewNotes: [`Printer count: ${asString(requirements.printerCount, "0")}`],
    });
  }

  if (asBoolean(requirements.iot) || iotDeviceCount > 0) {
    pushSegment(segments, {
      vlanId: 70,
      vlanName: "IOT",
      segmentRole: "IOT",
      purpose: `Requirement-derived IoT/specialty device segment for ${iotDeviceCount || "review-required"} endpoint(s).`,
      estimatedHosts: Math.max(iotDeviceCount + 10, 20),
      dhcpEnabled: true,
      department: "IoT",
      requiredBy: ["iot", "iotDeviceCount", "securityPosture", "trustBoundaryModel"],
      reviewNotes: [
        `IoT device count: ${asString(requirements.iotDeviceCount, "0")}`,
        `Trust boundary model: ${asString(requirements.trustBoundaryModel, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.cameras) || cameraCount > 0) {
    pushSegment(segments, {
      vlanId: 80,
      vlanName: "CAMERAS",
      segmentRole: "CAMERA",
      purpose: `Requirement-derived camera/security device segment for ${cameraCount || "review-required"} camera(s).`,
      estimatedHosts: Math.max(cameraCount + 10, 20),
      dhcpEnabled: true,
      department: "Physical Security",
      requiredBy: ["cameras", "cameraCount", "securityPosture"],
      reviewNotes: [`Camera count: ${asString(requirements.cameraCount, "0")}`],
    });
  }

  if (asBoolean(requirements.management) || hasText(requirements.managementIpPolicy) || hasText(requirements.managementAccess)) {
    pushSegment(segments, {
      vlanId: 90,
      vlanName: "MANAGEMENT",
      segmentRole: "MANAGEMENT",
      purpose: "Requirement-derived management segment for network infrastructure and administrative access.",
      estimatedHosts: Math.max(apCount + 20, 25),
      dhcpEnabled: false,
      department: "Infrastructure Management",
      requiredBy: ["management", "managementAccess", "managementIpPolicy", "adminBoundary"],
      reviewNotes: [
        `Management access: ${asString(requirements.managementAccess, "unspecified")}`,
        `Management IP policy: ${asString(requirements.managementIpPolicy, "unspecified")}`,
        `Admin boundary: ${asString(requirements.adminBoundary, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.remoteAccess)) {
    pushSegment(segments, {
      vlanId: 100,
      vlanName: "REMOTE-ACCESS",
      segmentRole: "DMZ",
      purpose: "Requirement-derived remote-access/VPN termination segment requiring security review.",
      estimatedHosts: 20,
      dhcpEnabled: false,
      department: "Remote Access",
      requiredBy: ["remoteAccess", "remoteAccessMethod", "identityModel", "securityPosture"],
      reviewNotes: [
        `Remote access method: ${asString(requirements.remoteAccessMethod, "unspecified")}`,
        `Identity model: ${asString(requirements.identityModel, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.cloudConnected) || asString(requirements.environmentType).toLowerCase().includes("cloud") || asString(requirements.environmentType).toLowerCase().includes("hybrid")) {
    pushSegment(segments, {
      vlanId: 110,
      vlanName: "CLOUD-EDGE",
      segmentRole: "WAN_TRANSIT",
      purpose: "Requirement-derived cloud edge / private connectivity segment.",
      estimatedHosts: 8,
      dhcpEnabled: false,
      department: "Cloud Connectivity",
      requiredBy: ["cloudConnected", "environmentType", "cloudProvider", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel"],
      reviewNotes: [
        `Cloud provider: ${asString(requirements.cloudProvider, "unspecified")}`,
        `Cloud connectivity: ${asString(requirements.cloudConnectivity, "unspecified")}`,
        `Cloud hosting: ${asString(requirements.cloudHostingModel, "unspecified")}`,
        `Cloud network: ${asString(requirements.cloudNetworkModel, "unspecified")}`,
        `Cloud routing: ${asString(requirements.cloudRoutingModel, "unspecified")}`,
        `Cloud identity boundary: ${asString(requirements.cloudIdentityBoundary, "unspecified")}`,
        `Cloud traffic boundary: ${asString(requirements.cloudTrafficBoundary, "unspecified")}`,
      ],
    });
  }

  const siteCount = asNumber(requirements.siteCount, 1, 1, 500);
  const multiSite = siteCount > 1 || !asString(requirements.internetModel, "internet at each site").toLowerCase().includes("each site") || asBoolean(requirements.dualIsp);
  if (multiSite) {
    pushSegment(segments, {
      vlanId: 120,
      vlanName: "WAN-TRANSIT",
      segmentRole: "WAN_TRANSIT",
      purpose: "Requirement-derived WAN/transit segment for multi-site connectivity.",
      estimatedHosts: asBoolean(requirements.dualIsp) ? 8 : 4,
      dhcpEnabled: false,
      department: "WAN",
      requiredBy: ["siteCount", "internetModel", "dualIsp", "resilienceTarget", "interSiteTrafficModel"],
      reviewNotes: [
        `Internet model: ${asString(requirements.internetModel, "unspecified")}`,
        `Resilience target: ${asString(requirements.resilienceTarget, "unspecified")}`,
        `Inter-site traffic: ${asString(requirements.interSiteTrafficModel, "unspecified")}`,
      ],
    });
  }

  if (hasText(requirements.monitoringModel) || hasText(requirements.loggingModel) || hasText(requirements.backupPolicy)) {
    pushSegment(segments, {
      vlanId: 130,
      vlanName: "OPERATIONS",
      segmentRole: "MANAGEMENT",
      purpose: "Requirement-derived monitoring/logging/config-backup operations segment.",
      estimatedHosts: 20,
      dhcpEnabled: false,
      department: "Operations",
      requiredBy: ["monitoringModel", "loggingModel", "backupPolicy", "operationsOwnerModel"],
      reviewNotes: [
        `Monitoring: ${asString(requirements.monitoringModel, "unspecified")}`,
        `Logging: ${asString(requirements.loggingModel, "unspecified")}`,
        `Backup: ${asString(requirements.backupPolicy, "unspecified")}`,
        `Operations owner: ${asString(requirements.operationsOwnerModel, "unspecified")}`,
      ],
    });
  }

  return segments.sort((left, right) => left.vlanId - right.vlanId);
}

export function parseProjectBaseSecondOctet(basePrivateRange?: string | null) {
  if (!basePrivateRange) return 60;
  try {
    const parsed = parseCidr(basePrivateRange);
    const octets = parsed.ip.split(".").map((part) => Number.parseInt(part, 10));
    return Math.max(0, Math.min(240, octets[1] || 60));
  } catch {
    return 60;
  }
}

export function buildSiteBlock(projectBaseRange: string | null | undefined, siteIndex: number) {
  const secondOctet = parseProjectBaseSecondOctet(projectBaseRange);
  const siteOctet = Math.max(0, Math.min(254, secondOctet + siteIndex));
  return `10.${siteOctet}.0.0/16`;
}

export function gatewayPreferenceFromRequirements(requirements: RequirementsInput): Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable" {
  const gatewayConvention = asString(requirements.gatewayConvention).toLowerCase();
  if (gatewayConvention.includes("last")) return "last-usable";
  return "first-usable";
}

export function buildVlanCidr(projectBaseRange: string | null | undefined, siteIndex: number, vlanId: number): SegmentAddressingPlan {
  const secondOctet = parseProjectBaseSecondOctet(projectBaseRange);
  const siteOctet = Math.max(0, Math.min(254, secondOctet + siteIndex));
  const subnetOctet = Math.max(1, Math.min(254, vlanId));
  return {
    cidr: `10.${siteOctet}.${subnetOctet}.0/24`,
    gateway: `10.${siteOctet}.${subnetOctet}.1`,
    recommendedPrefix: 24,
    requiredUsableHosts: 2,
    allocatorExplanation: "Fallback /24 segment placement used because the direct design-driver allocator could not allocate this segment.",
  };
}

export function buildSegmentAddressingPlans(
  projectBaseRange: string | null | undefined,
  siteIndex: number,
  segments: SegmentPlan[],
  requirements: RequirementsInput,
) {
  const siteBlockCidr = buildSiteBlock(projectBaseRange, siteIndex);
  const plans = new Map<number, SegmentAddressingPlan>();

  try {
    const parent = parseCidr(siteBlockCidr);
    const segmentCapacity = new Map<number, ReturnType<typeof recommendedCapacityPlanForHosts>>();
    for (const segment of segments) {
      segmentCapacity.set(segment.vlanId, recommendedCapacityPlanForHosts(segment.estimatedHosts, segment.segmentRole));
    }

    const orderedSegments = [...segments].sort((left, right) => {
      const leftPrefix = segmentCapacity.get(left.vlanId)?.recommendedPrefix ?? 24;
      const rightPrefix = segmentCapacity.get(right.vlanId)?.recommendedPrefix ?? 24;
      if (leftPrefix !== rightPrefix) return leftPrefix - rightPrefix;
      return left.vlanId - right.vlanId;
    });

    const allocationResults = allocateRequestedBlocks(
      parent,
      [],
      orderedSegments.map((segment) => ({
        requestId: String(segment.vlanId),
        prefix: segmentCapacity.get(segment.vlanId)?.recommendedPrefix ?? 24,
        role: segment.segmentRole,
      })),
      { preferredGatewayConvention: gatewayPreferenceFromRequirements(requirements) },
    );

    for (const segment of segments) {
      const capacity = segmentCapacity.get(segment.vlanId);
      const allocation = allocationResults.results.find((result) => result.requestId === String(segment.vlanId));
      if (allocation?.status === "allocated" && allocation.proposedSubnetCidr) {
        plans.set(segment.vlanId, {
          cidr: allocation.proposedSubnetCidr,
          gateway: allocation.proposedGatewayIp,
          recommendedPrefix: capacity?.recommendedPrefix ?? 24,
          requiredUsableHosts: capacity?.requiredUsableHosts ?? segment.estimatedHosts,
          allocatorExplanation: allocation.allocatorExplanation,
        });
        continue;
      }

      const fallback = buildVlanCidr(projectBaseRange, siteIndex, segment.vlanId);
      plans.set(segment.vlanId, {
        ...fallback,
        recommendedPrefix: capacity?.recommendedPrefix ?? fallback.recommendedPrefix,
        requiredUsableHosts: capacity?.requiredUsableHosts ?? fallback.requiredUsableHosts,
      });
    }
  } catch {
    for (const segment of segments) {
      plans.set(segment.vlanId, buildVlanCidr(projectBaseRange, siteIndex, segment.vlanId));
    }
  }

  return plans;
}
