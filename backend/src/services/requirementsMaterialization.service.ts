import { parseCidr } from "../lib/cidr.js";
import { addChangeLog } from "./changeLog.service.js";
import { buildRequirementImpactInventory, REQUIREMENT_FIELD_KEYS } from "./requirementsImpactRegistry.js";

export type RequirementsMaterializationSummary = {
  createdSites: number;
  updatedSites: number;
  createdVlans: number;
  updatedVlans: number;
  consumedFields: string[];
  impactInventoryCount: number;
  directImpactCount: number;
  reviewNotes: string[];
};

type MaterializerTx = {
  project: {
    findUnique: (args: unknown) => Promise<any>;
  };
  site: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  vlan: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
};

type RequirementsInput = Record<string, unknown>;

type SegmentPlan = {
  vlanId: number;
  vlanName: string;
  segmentRole: string;
  purpose: string;
  estimatedHosts: number;
  dhcpEnabled: boolean;
  department: string;
  requiredBy: string[];
  reviewNotes: string[];
};

function asString(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function asNumber(value: unknown, fallback: number, min = 0, max = 10_000) {
  const raw = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

function asBoolean(value: unknown) {
  return value === true || String(value).toLowerCase() === "true";
}

function isNotApplicable(value: unknown) {
  return asString(value).toLowerCase().includes("not applicable");
}

function normalizeToken(value: string, fallback: string) {
  const token = value.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8);
  return token || fallback;
}

function joinNotes(notes: string[]) {
  return notes.filter(Boolean).join("\n").slice(0, 1800);
}

function mergeNotes(existing: string | null | undefined, next: string) {
  if (!existing) return next;
  if (existing.includes(next.slice(0, 80))) return existing;
  return `${existing}\n${next}`.slice(0, 2000);
}

function textIncludes(value: string | null | undefined, fragment: string) {
  return Boolean(value && value.toLowerCase().includes(fragment.toLowerCase()));
}

function isRequirementManagedSite(site: { notes?: string | null }) {
  return textIncludes(site.notes, "Requirement materialization:");
}

function isRequirementManagedVlan(vlan: { vlanName?: string | null; purpose?: string | null; notes?: string | null }, segment: SegmentPlan) {
  return String(vlan.vlanName ?? "").toUpperCase() === segment.vlanName
    || textIncludes(vlan.purpose, "Requirement-derived")
    || textIncludes(vlan.notes, `Requirement materialization for ${segment.vlanName}`);
}

function parseProjectBaseSecondOctet(basePrivateRange?: string | null) {
  if (!basePrivateRange) return 60;
  try {
    const parsed = parseCidr(basePrivateRange);
    const octets = parsed.ip.split(".").map((part) => Number.parseInt(part, 10));
    return Math.max(0, Math.min(240, octets[1] || 60));
  } catch {
    return 60;
  }
}

function buildSiteBlock(projectBaseRange: string | null | undefined, siteIndex: number) {
  const secondOctet = parseProjectBaseSecondOctet(projectBaseRange);
  const siteOctet = Math.max(0, Math.min(254, secondOctet + siteIndex));
  return `10.${siteOctet}.0.0/16`;
}

function buildVlanCidr(projectBaseRange: string | null | undefined, siteIndex: number, vlanId: number) {
  const secondOctet = parseProjectBaseSecondOctet(projectBaseRange);
  const siteOctet = Math.max(0, Math.min(254, secondOctet + siteIndex));
  const subnetOctet = Math.max(1, Math.min(254, vlanId));
  return {
    cidr: `10.${siteOctet}.${subnetOctet}.0/24`,
    gateway: `10.${siteOctet}.${subnetOctet}.1`,
  };
}

function hasText(value: unknown) {
  return Boolean(asString(value)) && !isNotApplicable(value);
}

function pushSegment(segments: SegmentPlan[], segment: SegmentPlan) {
  if (segments.some((item) => item.vlanId === segment.vlanId || item.vlanName === segment.vlanName)) return;
  segments.push(segment);
}

function buildRequirementNotes(requirements: RequirementsInput) {
  const notes = [
    `Project phase: ${asString(requirements.projectPhase, "unspecified")}`,
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

function buildSegments(requirements: RequirementsInput) {
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

function parseRequirementsJson(requirementsJson?: string | null) {
  if (!requirementsJson) return null;
  try {
    const parsed = JSON.parse(requirementsJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as RequirementsInput;
  } catch {
    return null;
  }
}

function consumedRequirementFields(requirements: RequirementsInput) {
  return REQUIREMENT_FIELD_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(requirements, key)).sort();
}

export async function materializeRequirementsForProject(
  tx: MaterializerTx,
  projectId: string,
  actorLabel?: string,
): Promise<RequirementsMaterializationSummary | null> {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { id: true, basePrivateRange: true, requirementsJson: true } });
  const requirements = parseRequirementsJson(project?.requirementsJson);
  if (!project || !requirements) return null;

  const siteCount = asNumber(requirements.siteCount, 1, 1, 500);
  const existingSites = await tx.site.findMany({ where: { projectId }, include: { vlans: true }, orderBy: { createdAt: "asc" } });
  const segments = buildSegments(requirements);
  const impactInventory = buildRequirementImpactInventory(requirements);
  const directImpactCount = impactInventory.filter((item) => item.impact === "direct" && item.captured).length;
  const reviewNotes = [
    "Requirement-derived objects are conservative starting points. They must be reviewed before implementation.",
    `Requirement impact inventory covers ${impactInventory.length} fields and exposes direct/indirect requirement-to-output traceability instead of hiding selections as dead survey text.`,
    `Captured direct-impact requirement fields: ${directImpactCount}.`,
  ];
  let createdSites = 0;
  let updatedSites = 0;
  let createdVlans = 0;
  let updatedVlans = 0;
  const materializedSites: any[] = [...existingSites];

  for (let index = 0; index < siteCount; index += 1) {
    const siteNumber = index + 1;
    const existing = materializedSites[index];
    const isHq = siteNumber === 1;
    const siteName = existing?.name || (isHq ? "Site 1 - HQ" : `Site ${siteNumber}`);
    const siteCode = existing?.siteCode || (isHq ? "HQ" : `S${siteNumber}`);
    const defaultAddressBlock = existing && !isRequirementManagedSite(existing)
      ? existing.defaultAddressBlock || buildSiteBlock(project.basePrivateRange, index)
      : buildSiteBlock(project.basePrivateRange, index);
    const siteNotes = joinNotes([
      `Requirement materialization: ${siteName} exists because requirements requested ${siteCount} site(s).`,
      `Site role model: ${asString(requirements.siteRoleModel, "unspecified")}`,
      `Site identity capture: ${asString(requirements.siteIdentityCapture, "unspecified")}`,
      `Layout: ${asString(requirements.siteLayoutModel, "unspecified")}`,
      `Physical scope: ${asString(requirements.physicalScope, "unspecified")}`,
      `Buildings/floors/closets: ${asString(requirements.buildingCount, "1")} building(s), ${asString(requirements.floorCount, "1")} floor(s), ${asString(requirements.closetModel, "unspecified")}`,
      `Edge footprint: ${asString(requirements.edgeFootprint, "unspecified")}`,
    ]);

    if (existing) {
      const nextSite = await tx.site.update({
        where: { id: existing.id },
        data: {
          siteCode,
          defaultAddressBlock,
          notes: mergeNotes(existing.notes, siteNotes),
        },
        include: { vlans: true },
      });
      materializedSites[index] = nextSite;
      updatedSites += 1;
    } else {
      const created = await tx.site.create({
        data: {
          projectId,
          name: siteName,
          location: siteName,
          siteCode,
          defaultAddressBlock,
          notes: siteNotes,
        },
        include: { vlans: true },
      });
      materializedSites.push(created);
      createdSites += 1;
    }
  }

  for (let index = 0; index < siteCount; index += 1) {
    const site = materializedSites[index];
    if (!site) continue;
    const existingVlans = await tx.vlan.findMany({ where: { siteId: site.id }, orderBy: { vlanId: "asc" } });

    for (const segment of segments) {
      const matching = existingVlans.find((vlan) => vlan.vlanId === segment.vlanId || vlan.vlanName.toUpperCase() === segment.vlanName.toUpperCase());
      const addressing = buildVlanCidr(project.basePrivateRange, index, segment.vlanId);
      const notes = joinNotes([
        `Requirement materialization for ${segment.vlanName}.`,
        `Required by: ${segment.requiredBy.join(", ")}.`,
        ...segment.reviewNotes,
      ]);

      if (matching) {
        await tx.vlan.update({
          where: { id: matching.id },
          data: {
            vlanName: isRequirementManagedVlan(matching, segment) ? segment.vlanName : matching.vlanName || segment.vlanName,
            purpose: isRequirementManagedVlan(matching, segment) ? segment.purpose : matching.purpose || segment.purpose,
            segmentRole: isRequirementManagedVlan(matching, segment) ? segment.segmentRole : matching.segmentRole || segment.segmentRole,
            subnetCidr: isRequirementManagedVlan(matching, segment) ? addressing.cidr : matching.subnetCidr || addressing.cidr,
            gatewayIp: isRequirementManagedVlan(matching, segment) ? addressing.gateway : matching.gatewayIp || addressing.gateway,
            dhcpEnabled: isRequirementManagedVlan(matching, segment) ? segment.dhcpEnabled : matching.dhcpEnabled ?? segment.dhcpEnabled,
            estimatedHosts: isRequirementManagedVlan(matching, segment) ? segment.estimatedHosts : matching.estimatedHosts || segment.estimatedHosts,
            department: isRequirementManagedVlan(matching, segment) ? segment.department : matching.department || segment.department,
            notes: mergeNotes(matching.notes, notes),
          },
        });
        updatedVlans += 1;
      } else {
        await tx.vlan.create({
          data: {
            siteId: site.id,
            vlanId: segment.vlanId,
            vlanName: segment.vlanName,
            purpose: segment.purpose,
            segmentRole: segment.segmentRole,
            subnetCidr: addressing.cidr,
            gatewayIp: addressing.gateway,
            dhcpEnabled: segment.dhcpEnabled,
            estimatedHosts: segment.estimatedHosts,
            department: segment.department,
            notes,
          },
        });
        createdVlans += 1;
      }
    }
  }

  const summary = {
    createdSites,
    updatedSites,
    createdVlans,
    updatedVlans,
    consumedFields: consumedRequirementFields(requirements),
    impactInventoryCount: impactInventory.length,
    directImpactCount,
    reviewNotes,
  };

  if (createdSites || updatedSites || createdVlans || updatedVlans) {
    await addChangeLog(projectId, `Requirements materialized into ${createdSites} new site(s), ${createdVlans} new VLAN(s), and ${updatedVlans} refreshed VLAN(s).`, actorLabel, tx as any);
  }

  return summary;
}
