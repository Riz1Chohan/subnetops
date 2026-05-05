import {
  allocateRequestedBlocks,
  type GatewayConvention,
} from "../addressing/allocation-fit.js";
import {
  parseCidr,
  recommendedCapacityPlanForHosts,
} from "../addressing/cidr.js";
import {
  asBoolean,
  asNumber,
  asOptionalNumber,
  asString,
  hasCapturedRequirement,
  hasText,
} from "./normalize.js";
import type {
  RequirementSourceType,
  RequirementsInput,
  SegmentAddressingPlan,
  SegmentPlan,
} from "./types.js";

function pushSegment(segments: SegmentPlan[], segment: SegmentPlan) {
  if (
    segments.some(
      (item) =>
        item.vlanId === segment.vlanId || item.vlanName === segment.vlanName,
    )
  )
    return;
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

type SegmentDraft = Omit<
  SegmentPlan,
  | "sourceType"
  | "capacitySourceType"
  | "sourceRefs"
  | "readinessImpact"
  | "implementationBlocked"
  | "capacityReviewReason"
> &
  Partial<
    Pick<
      SegmentPlan,
      | "sourceType"
      | "capacitySourceType"
      | "sourceRefs"
      | "readinessImpact"
      | "implementationBlocked"
      | "capacityReviewReason"
    >
  >;

type CapacitySignal = {
  captured: boolean;
  value: number | null;
  planningFloor: number;
  sourceType: RequirementSourceType;
  reviewReason?: string;
};

function capacitySignal(
  requirements: RequirementsInput,
  key: string,
  planningFloor: number,
  min = 1,
  max = 5000,
): CapacitySignal {
  const captured = hasCapturedRequirement(requirements, key);
  const value = captured ? asOptionalNumber(requirements[key], min, max) : null;
  if (typeof value === "number") {
    return {
      captured,
      value,
      planningFloor: Math.max(value, planningFloor),
      sourceType: "USER_PROVIDED",
    };
  }
  return {
    captured,
    value: null,
    planningFloor,
    sourceType: "REVIEW_REQUIRED",
    reviewReason: captured
      ? `${key} was captured but is not a usable positive number; capacity remains review-required.`
      : `${key} was not captured; capacity remains review-required and must not be replaced by a silent default.`,
  };
}

function hasAnyCaptured(requirements: RequirementsInput, keys: string[]) {
  return keys.some((key) => hasCapturedRequirement(requirements, key));
}

function sourceTypeForRequirementKeys(
  requirements: RequirementsInput,
  keys: string[],
): RequirementSourceType {
  return hasAnyCaptured(requirements, keys)
    ? "DERIVED_FROM_USER_INPUT"
    : "SYSTEM_ASSUMPTION";
}

function finalizeSegment(
  requirements: RequirementsInput,
  draft: SegmentDraft,
): SegmentPlan {
  const capacitySourceType =
    draft.capacitySourceType ??
    (typeof draft.estimatedHosts === "number"
      ? "DERIVED_FROM_USER_INPUT"
      : "REVIEW_REQUIRED");
  const sourceType =
    draft.sourceType ??
    sourceTypeForRequirementKeys(requirements, draft.requiredBy);
  const implementationBlocked =
    draft.implementationBlocked ?? capacitySourceType === "REVIEW_REQUIRED";
  const readinessImpact =
    draft.readinessImpact ?? (implementationBlocked ? "REVIEW" : "NONE");
  const capacityReviewReason =
    draft.capacityReviewReason ??
    (capacitySourceType === "REVIEW_REQUIRED"
      ? `Capacity for ${draft.vlanName} is not captured; prefix sizing, DHCP scope implementation, and final readiness require engineering review.`
      : undefined);
  const sourceRefs =
    draft.sourceRefs ??
    draft.requiredBy.map(
      (key) =>
        `requirements:${key}:${hasCapturedRequirement(requirements, key) ? "captured" : "not-captured"}`,
    );
  return {
    ...draft,
    planningHostFloor: Math.max(
      1,
      draft.planningHostFloor ?? draft.estimatedHosts ?? 10,
    ),
    sourceType,
    capacitySourceType,
    sourceRefs,
    readinessImpact,
    implementationBlocked,
    capacityReviewReason,
  };
}

function pushRequirementSegment(
  requirements: RequirementsInput,
  segments: SegmentPlan[],
  draft: SegmentDraft,
) {
  pushSegment(segments, finalizeSegment(requirements, draft));
}

function maybeDerivedUserCapacity(
  users: CapacitySignal,
  factor: number,
  floor: number,
): {
  estimatedHosts: number | null;
  planningHostFloor: number;
  capacitySourceType: RequirementSourceType;
  capacityReviewReason?: string;
} {
  if (typeof users.value === "number") {
    return {
      estimatedHosts: Math.max(Math.ceil(users.value * factor), floor),
      planningHostFloor: Math.max(Math.ceil(users.value * factor), floor),
      capacitySourceType: "DERIVED_FROM_USER_INPUT",
    };
  }
  return {
    estimatedHosts: null,
    planningHostFloor: floor,
    capacitySourceType: "REVIEW_REQUIRED",
    capacityReviewReason:
      users.reviewReason ??
      "usersPerSite was not captured; derived endpoint capacity requires review.",
  };
}

export function buildRequirementSegments(requirements: RequirementsInput) {
  const users = capacitySignal(requirements, "usersPerSite", 10, 1, 5000);
  const printerCount =
    asOptionalNumber(requirements.printerCount, 0, 2000) ?? 0;
  const phoneCount = asOptionalNumber(requirements.phoneCount, 0, 5000) ?? 0;
  const apCount = asOptionalNumber(requirements.apCount, 0, 5000) ?? 0;
  const cameraCount = asOptionalNumber(requirements.cameraCount, 0, 5000) ?? 0;
  const serverCount = asOptionalNumber(requirements.serverCount, 0, 5000) ?? 0;
  const iotDeviceCount =
    asOptionalNumber(requirements.iotDeviceCount, 0, 5000) ?? 0;
  const requirementNotes = buildRequirementNotes(requirements);
  const segments: SegmentPlan[] = [];

  pushRequirementSegment(requirements, segments, {
    vlanId: 10,
    vlanName: "USERS",
    segmentRole: "USER",
    purpose:
      typeof users.value === "number"
        ? `Requirement-derived user access segment for ${users.value} captured users per site.`
        : "Baseline user access segment; user capacity was not captured and remains review-required.",
    estimatedHosts: users.value,
    planningHostFloor: users.planningFloor,
    dhcpEnabled: typeof users.value === "number",
    department: "User Access",
    requiredBy: ["usersPerSite", "wiredWirelessMix", "primaryGoal"],
    sourceType:
      users.sourceType === "USER_PROVIDED"
        ? "DERIVED_FROM_USER_INPUT"
        : "REVIEW_REQUIRED",
    capacitySourceType: users.sourceType,
    readinessImpact: typeof users.value === "number" ? "NONE" : "REVIEW",
    implementationBlocked: typeof users.value !== "number",
    capacityReviewReason: users.reviewReason,
    sourceRefs: [
      `requirements:usersPerSite:${users.captured ? "captured" : "not-captured"}`,
      `requirements:wiredWirelessMix:${hasCapturedRequirement(requirements, "wiredWirelessMix") ? "captured" : "not-captured"}`,
      `requirements:primaryGoal:${hasCapturedRequirement(requirements, "primaryGoal") ? "captured" : "not-captured"}`,
    ],
    reviewNotes: [
      typeof users.value === "number"
        ? `Users per site captured: ${users.value}.`
        : "Users per site not captured; do not claim capacity or implementation-ready DHCP until confirmed.",
      `User access mix: ${asString(requirements.wiredWirelessMix, "unspecified")}`,
      `Primary goal: ${asString(requirements.primaryGoal, "unspecified")}`,
      ...requirementNotes,
    ],
  });

  if (
    serverCount > 0 ||
    hasText(requirements.serverPlacement) ||
    hasText(requirements.criticalServicesModel)
  ) {
    const capacityKnown = serverCount > 0;
    pushRequirementSegment(requirements, segments, {
      vlanId: 20,
      vlanName: "SERVICES",
      segmentRole: "SERVER",
      purpose: capacityKnown
        ? `Requirement-derived services/server segment for ${serverCount} captured server/service endpoint(s).`
        : "Requirement-derived services/server segment; endpoint count requires review.",
      estimatedHosts: capacityKnown ? Math.max(serverCount + 10, 20) : null,
      planningHostFloor: Math.max(serverCount + 10, 20),
      capacitySourceType: capacityKnown ? "USER_PROVIDED" : "REVIEW_REQUIRED",
      dhcpEnabled: false,
      department: "Services",
      requiredBy: [
        "serverPlacement",
        "serverCount",
        "criticalServicesModel",
        "applicationProfile",
      ],
      reviewNotes: [
        `Server placement: ${asString(requirements.serverPlacement, "unspecified")}`,
        `Critical services model: ${asString(requirements.criticalServicesModel, "unspecified")}`,
        `Application profile: ${asString(requirements.applicationProfile, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.guestWifi)) {
    const guestCapacity = maybeDerivedUserCapacity(users, 0.6, 25);
    pushRequirementSegment(requirements, segments, {
      vlanId: 30,
      vlanName: "GUEST",
      segmentRole: "GUEST",
      purpose: "Requirement-derived isolated guest access segment.",
      ...guestCapacity,
      dhcpEnabled: typeof guestCapacity.estimatedHosts === "number",
      department: "Guest Access",
      requiredBy: ["guestWifi", "guestPolicy", "wirelessModel", "usersPerSite"],
      reviewNotes: [
        `Guest policy: ${asString(requirements.guestPolicy, "unspecified")}`,
        `Wireless model: ${asString(requirements.wirelessModel, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.wireless) || apCount > 0) {
    const staffWifiCapacity =
      typeof users.value === "number"
        ? {
            estimatedHosts: Math.max(
              Math.ceil(users.value * 0.75),
              apCount * 20,
              25,
            ),
            planningHostFloor: Math.max(
              Math.ceil(users.value * 0.75),
              apCount * 20,
              25,
            ),
            capacitySourceType:
              "DERIVED_FROM_USER_INPUT" as RequirementSourceType,
          }
        : {
            estimatedHosts: null,
            planningHostFloor: Math.max(apCount * 20, 25),
            capacitySourceType: "REVIEW_REQUIRED" as RequirementSourceType,
            capacityReviewReason: users.reviewReason,
          };
    pushRequirementSegment(requirements, segments, {
      vlanId: 40,
      vlanName: "STAFF-WIFI",
      segmentRole: "USER",
      purpose:
        apCount > 0
          ? `Requirement-derived staff wireless segment with ${apCount} captured AP(s); client count requires review unless users per site is captured.`
          : "Requirement-derived staff wireless segment; AP/client capacity requires review.",
      ...staffWifiCapacity,
      dhcpEnabled: typeof staffWifiCapacity.estimatedHosts === "number",
      department: "Wireless",
      requiredBy: [
        "wireless",
        "wirelessModel",
        "apCount",
        "wiredWirelessMix",
        "usersPerSite",
      ],
      reviewNotes: [
        `Wireless model: ${asString(requirements.wirelessModel, "unspecified")}`,
        `AP count: ${asString(requirements.apCount, "0")}`,
      ],
    });
  }

  if (asBoolean(requirements.voice) || phoneCount > 0) {
    const voiceKnown = phoneCount > 0 || typeof users.value === "number";
    pushRequirementSegment(requirements, segments, {
      vlanId: 50,
      vlanName: "VOICE",
      segmentRole: "VOICE",
      purpose:
        phoneCount > 0
          ? `Requirement-derived voice segment for ${phoneCount} captured phone(s).`
          : "Requirement-derived voice segment; phone/user capacity requires review.",
      estimatedHosts: voiceKnown
        ? Math.max(
            phoneCount,
            typeof users.value === "number" ? Math.ceil(users.value * 0.35) : 0,
            10,
          )
        : null,
      planningHostFloor: Math.max(
        phoneCount,
        typeof users.value === "number" ? Math.ceil(users.value * 0.35) : 0,
        10,
      ),
      capacitySourceType: voiceKnown
        ? phoneCount > 0
          ? "USER_PROVIDED"
          : "DERIVED_FROM_USER_INPUT"
        : "REVIEW_REQUIRED",
      dhcpEnabled: voiceKnown,
      department: "Voice",
      requiredBy: [
        "voice",
        "phoneCount",
        "voiceQos",
        "qosModel",
        "latencySensitivity",
        "usersPerSite",
      ],
      reviewNotes: [
        `Voice QoS: ${asString(requirements.voiceQos, "unspecified")}`,
        `QoS model: ${asString(requirements.qosModel, "unspecified")}`,
        `Latency sensitivity: ${asString(requirements.latencySensitivity, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.printers) || printerCount > 0) {
    const printerKnown = printerCount > 0;
    pushRequirementSegment(requirements, segments, {
      vlanId: 60,
      vlanName: "PRINTERS",
      segmentRole: "PRINTER",
      purpose: printerKnown
        ? `Requirement-derived printer segment for ${printerCount} captured printer(s).`
        : "Requirement-derived printer segment; printer count requires review.",
      estimatedHosts: printerKnown ? Math.max(printerCount + 5, 10) : null,
      planningHostFloor: Math.max(printerCount + 5, 10),
      capacitySourceType: printerKnown ? "USER_PROVIDED" : "REVIEW_REQUIRED",
      dhcpEnabled: printerKnown,
      department: "Shared Devices",
      requiredBy: ["printers", "printerCount"],
      reviewNotes: [
        `Printer count: ${asString(requirements.printerCount, "not captured")}`,
      ],
    });
  }

  if (asBoolean(requirements.iot) || iotDeviceCount > 0) {
    const iotKnown = iotDeviceCount > 0;
    pushRequirementSegment(requirements, segments, {
      vlanId: 70,
      vlanName: "IOT",
      segmentRole: "IOT",
      purpose: iotKnown
        ? `Requirement-derived IoT/specialty device segment for ${iotDeviceCount} captured endpoint(s).`
        : "Requirement-derived IoT/specialty device segment; endpoint count requires review.",
      estimatedHosts: iotKnown ? Math.max(iotDeviceCount + 10, 20) : null,
      planningHostFloor: Math.max(iotDeviceCount + 10, 20),
      capacitySourceType: iotKnown ? "USER_PROVIDED" : "REVIEW_REQUIRED",
      dhcpEnabled: iotKnown,
      department: "IoT",
      requiredBy: [
        "iot",
        "iotDeviceCount",
        "securityPosture",
        "trustBoundaryModel",
      ],
      reviewNotes: [
        `IoT device count: ${asString(requirements.iotDeviceCount, "not captured")}`,
        `Trust boundary model: ${asString(requirements.trustBoundaryModel, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.cameras) || cameraCount > 0) {
    const cameraKnown = cameraCount > 0;
    pushRequirementSegment(requirements, segments, {
      vlanId: 80,
      vlanName: "CAMERAS",
      segmentRole: "CAMERA",
      purpose: cameraKnown
        ? `Requirement-derived camera/security device segment for ${cameraCount} captured camera(s).`
        : "Requirement-derived camera/security device segment; camera count requires review.",
      estimatedHosts: cameraKnown ? Math.max(cameraCount + 10, 20) : null,
      planningHostFloor: Math.max(cameraCount + 10, 20),
      capacitySourceType: cameraKnown ? "USER_PROVIDED" : "REVIEW_REQUIRED",
      dhcpEnabled: cameraKnown,
      department: "Physical Security",
      requiredBy: ["cameras", "cameraCount", "securityPosture"],
      reviewNotes: [
        `Camera count: ${asString(requirements.cameraCount, "not captured")}`,
      ],
    });
  }

  if (
    asBoolean(requirements.management) ||
    hasText(requirements.managementIpPolicy) ||
    hasText(requirements.managementAccess)
  ) {
    pushRequirementSegment(requirements, segments, {
      vlanId: 90,
      vlanName: "MANAGEMENT",
      segmentRole: "MANAGEMENT",
      purpose:
        "Requirement-derived management segment for network infrastructure and administrative access.",
      estimatedHosts: Math.max(apCount + 20, 25),
      planningHostFloor: Math.max(apCount + 20, 25),
      capacitySourceType: "DERIVED_FROM_USER_INPUT",
      dhcpEnabled: false,
      department: "Infrastructure Management",
      requiredBy: [
        "management",
        "managementAccess",
        "managementIpPolicy",
        "adminBoundary",
        "apCount",
      ],
      reviewNotes: [
        `Management access: ${asString(requirements.managementAccess, "unspecified")}`,
        `Management IP policy: ${asString(requirements.managementIpPolicy, "unspecified")}`,
        `Admin boundary: ${asString(requirements.adminBoundary, "unspecified")}`,
      ],
    });
  }

  if (asBoolean(requirements.remoteAccess)) {
    pushRequirementSegment(requirements, segments, {
      vlanId: 100,
      vlanName: "REMOTE-ACCESS",
      segmentRole: "DMZ",
      purpose:
        "Requirement-derived remote-access/VPN termination segment requiring security review.",
      estimatedHosts: 20,
      planningHostFloor: 20,
      capacitySourceType: "SYSTEM_ASSUMPTION",
      readinessImpact: "REVIEW",
      implementationBlocked: true,
      dhcpEnabled: false,
      department: "Remote Access",
      requiredBy: [
        "remoteAccess",
        "remoteAccessMethod",
        "identityModel",
        "securityPosture",
      ],
      reviewNotes: [
        `Remote access method: ${asString(requirements.remoteAccessMethod, "unspecified")}`,
        `Identity model: ${asString(requirements.identityModel, "unspecified")}`,
      ],
    });
  }

  if (
    asBoolean(requirements.cloudConnected) ||
    asString(requirements.environmentType).toLowerCase().includes("cloud") ||
    asString(requirements.environmentType).toLowerCase().includes("hybrid")
  ) {
    pushRequirementSegment(requirements, segments, {
      vlanId: 110,
      vlanName: "CLOUD-EDGE",
      segmentRole: "WAN_TRANSIT",
      purpose:
        "Requirement-derived cloud edge / private connectivity segment requiring route and provider review.",
      estimatedHosts: 8,
      planningHostFloor: 8,
      capacitySourceType: "SYSTEM_ASSUMPTION",
      readinessImpact: "REVIEW",
      implementationBlocked: true,
      dhcpEnabled: false,
      department: "Cloud Connectivity",
      requiredBy: [
        "cloudConnected",
        "environmentType",
        "cloudProvider",
        "cloudConnectivity",
        "cloudNetworkModel",
        "cloudRoutingModel",
      ],
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
  const multiSite =
    siteCount > 1 ||
    !asString(requirements.internetModel, "internet at each site")
      .toLowerCase()
      .includes("each site") ||
    asBoolean(requirements.dualIsp);
  if (multiSite) {
    pushRequirementSegment(requirements, segments, {
      vlanId: 120,
      vlanName: "WAN-TRANSIT",
      segmentRole: "WAN_TRANSIT",
      purpose:
        "Requirement-derived WAN/transit segment for multi-site connectivity requiring WAN intent review.",
      estimatedHosts: asBoolean(requirements.dualIsp) ? 8 : 4,
      planningHostFloor: asBoolean(requirements.dualIsp) ? 8 : 4,
      capacitySourceType: "DERIVED_FROM_USER_INPUT",
      readinessImpact: "REVIEW",
      implementationBlocked: true,
      dhcpEnabled: false,
      department: "WAN",
      requiredBy: [
        "siteCount",
        "internetModel",
        "dualIsp",
        "resilienceTarget",
        "interSiteTrafficModel",
      ],
      reviewNotes: [
        `Internet model: ${asString(requirements.internetModel, "unspecified")}`,
        `Resilience target: ${asString(requirements.resilienceTarget, "unspecified")}`,
        `Inter-site traffic: ${asString(requirements.interSiteTrafficModel, "unspecified")}`,
      ],
    });
  }

  if (
    hasText(requirements.monitoringModel) ||
    hasText(requirements.loggingModel) ||
    hasText(requirements.backupPolicy)
  ) {
    pushRequirementSegment(requirements, segments, {
      vlanId: 130,
      vlanName: "OPERATIONS",
      segmentRole: "MANAGEMENT",
      purpose:
        "Requirement-derived monitoring/logging/config-backup operations segment.",
      estimatedHosts: 20,
      planningHostFloor: 20,
      capacitySourceType: "SYSTEM_ASSUMPTION",
      dhcpEnabled: false,
      department: "Operations",
      requiredBy: [
        "monitoringModel",
        "loggingModel",
        "backupPolicy",
        "operationsOwnerModel",
      ],
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
    const octets = parsed.ip
      .split(".")
      .map((part) => Number.parseInt(part, 10));
    return Math.max(0, Math.min(240, octets[1] || 60));
  } catch {
    return 60;
  }
}

export function buildSiteBlock(
  projectBaseRange: string | null | undefined,
  siteIndex: number,
) {
  const secondOctet = parseProjectBaseSecondOctet(projectBaseRange);
  const siteOctet = Math.max(0, Math.min(254, secondOctet + siteIndex));
  return `10.${siteOctet}.0.0/16`;
}

export function gatewayPreferenceFromRequirements(
  requirements: RequirementsInput,
): Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable" {
  const gatewayConvention = asString(
    requirements.gatewayConvention,
  ).toLowerCase();
  if (gatewayConvention.includes("last")) return "last-usable";
  return "first-usable";
}

export function buildVlanCidr(
  projectBaseRange: string | null | undefined,
  siteIndex: number,
  vlanId: number,
): SegmentAddressingPlan {
  const secondOctet = parseProjectBaseSecondOctet(projectBaseRange);
  const siteOctet = Math.max(0, Math.min(254, secondOctet + siteIndex));
  const subnetOctet = Math.max(1, Math.min(254, vlanId));
  return {
    cidr: `10.${siteOctet}.${subnetOctet}.0/24`,
    gateway: `10.${siteOctet}.${subnetOctet}.1`,
    recommendedPrefix: 24,
    requiredUsableHosts: 2,
    allocatorExplanation:
      "Fallback /24 segment placement used because the direct design-driver allocator could not allocate this segment.",
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
    const segmentCapacity = new Map<
      number,
      ReturnType<typeof recommendedCapacityPlanForHosts>
    >();
    for (const segment of segments) {
      segmentCapacity.set(
        segment.vlanId,
        recommendedCapacityPlanForHosts(
          segment.estimatedHosts ?? segment.planningHostFloor,
          segment.segmentRole,
        ),
      );
    }

    const orderedSegments = [...segments].sort((left, right) => {
      const leftPrefix =
        segmentCapacity.get(left.vlanId)?.recommendedPrefix ?? 24;
      const rightPrefix =
        segmentCapacity.get(right.vlanId)?.recommendedPrefix ?? 24;
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
      {
        preferredGatewayConvention:
          gatewayPreferenceFromRequirements(requirements),
      },
    );

    for (const segment of segments) {
      const capacity = segmentCapacity.get(segment.vlanId);
      const allocation = allocationResults.results.find(
        (result) => result.requestId === String(segment.vlanId),
      );
      if (allocation?.status === "allocated" && allocation.proposedSubnetCidr) {
        plans.set(segment.vlanId, {
          cidr: allocation.proposedSubnetCidr,
          gateway: allocation.proposedGatewayIp,
          recommendedPrefix: capacity?.recommendedPrefix ?? 24,
          requiredUsableHosts:
            capacity?.requiredUsableHosts ??
            segment.estimatedHosts ??
            segment.planningHostFloor,
          allocatorExplanation: allocation.allocatorExplanation,
        });
        continue;
      }

      const fallback = buildVlanCidr(
        projectBaseRange,
        siteIndex,
        segment.vlanId,
      );
      plans.set(segment.vlanId, {
        ...fallback,
        recommendedPrefix:
          capacity?.recommendedPrefix ?? fallback.recommendedPrefix,
        requiredUsableHosts:
          capacity?.requiredUsableHosts ?? fallback.requiredUsableHosts,
      });
    }
  } catch {
    for (const segment of segments) {
      plans.set(
        segment.vlanId,
        buildVlanCidr(projectBaseRange, siteIndex, segment.vlanId),
      );
    }
  }

  return plans;
}
