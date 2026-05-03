import { buildRequirementImpactInventory } from "../requirementsImpactRegistry.js";
import { parseJsonMap } from "./designCore.helpers.js";
import type { RequirementsImpactClosureItem, RequirementsImpactClosureSummary } from "../designCore.types.js";

type VlanLike = {
  vlanName?: string | null;
  purpose?: string | null;
  department?: string | null;
  notes?: string | null;
};

type SiteLike = {
  name?: string | null;
  notes?: string | null;
  vlans: VlanLike[];
};

type NetworkObjectModelLike = {
  securityZones?: Array<{ name?: string; zoneRole?: string; notes?: string[] }>;
  devices?: Array<{ name?: string; deviceRole?: string; role?: string; notes?: string[] }>;
  dhcpPools?: Array<{ name?: string; vlanId?: string | number; subnetCidr?: string; notes?: string[] }>;
  interfaces?: Array<{ name?: string; interfaceRole?: string; purpose?: string; notes?: string[] }>;
  links?: Array<{ name?: string; linkRole?: string; linkType?: string; notes?: string[] }>;
  policyRules?: Array<{ name?: string; services?: string[]; notes?: string[] }>;
  natRules?: Array<{ name?: string; notes?: string[] }>;
  securityPolicyFlow?: {
    flowRequirements?: Array<{ name?: string; requirementKeys?: string[]; notes?: string[] }>;
    findings?: Array<{ code?: string; detail?: string; affectedObjectIds?: string[] }>;
  };
};

type ClosureInput = {
  requirementsJson?: string | null;
  sites: SiteLike[];
  networkObjectModel?: NetworkObjectModelLike;
};

const SITE_DRIVER_KEYS = new Set([
  "planningFor",
  "projectStage",
  "environmentType",
  "siteCount",
  "siteRoleModel",
  "siteIdentityCapture",
  "siteLayoutModel",
  "physicalScope",
  "buildingCount",
  "floorCount",
  "closetModel",
  "edgeFootprint",
]);

const SEGMENT_NAME_BY_REQUIREMENT_KEY: Record<string, string[]> = {
  usersPerSite: ["USERS"],
  wiredWirelessMix: ["USERS", "STAFF-WIFI"],
  serverPlacement: ["SERVICES"],
  serverCount: ["SERVICES"],
  applicationProfile: ["SERVICES"],
  criticalServicesModel: ["SERVICES"],
  guestWifi: ["GUEST"],
  guestPolicy: ["GUEST"],
  wireless: ["STAFF-WIFI"],
  wirelessModel: ["STAFF-WIFI", "GUEST"],
  apCount: ["STAFF-WIFI", "MANAGEMENT"],
  voice: ["VOICE"],
  phoneCount: ["VOICE"],
  voiceQos: ["VOICE"],
  qosModel: ["VOICE"],
  latencySensitivity: ["VOICE"],
  printers: ["PRINTERS"],
  printerCount: ["PRINTERS"],
  iot: ["IOT"],
  iotDeviceCount: ["IOT"],
  cameras: ["CAMERAS"],
  cameraCount: ["CAMERAS"],
  management: ["MANAGEMENT", "OPERATIONS"],
  managementAccess: ["MANAGEMENT"],
  managementIpPolicy: ["MANAGEMENT"],
  adminBoundary: ["MANAGEMENT"],
  remoteAccess: ["REMOTE-ACCESS"],
  remoteAccessMethod: ["REMOTE-ACCESS"],
  cloudConnected: ["CLOUD-EDGE"],
  cloudProvider: ["CLOUD-EDGE"],
  cloudConnectivity: ["CLOUD-EDGE"],
  cloudIdentityBoundary: ["CLOUD-EDGE"],
  cloudTrafficBoundary: ["CLOUD-EDGE"],
  cloudHostingModel: ["CLOUD-EDGE"],
  cloudNetworkModel: ["CLOUD-EDGE"],
  cloudRoutingModel: ["CLOUD-EDGE", "WAN-TRANSIT"],
  internetModel: ["WAN-TRANSIT"],
  dualIsp: ["WAN-TRANSIT"],
  resilienceTarget: ["WAN-TRANSIT"],
  interSiteTrafficModel: ["WAN-TRANSIT"],
  monitoringModel: ["OPERATIONS"],
  loggingModel: ["OPERATIONS"],
  backupPolicy: ["OPERATIONS"],
  operationsOwnerModel: ["OPERATIONS"],
};

const REVIEW_EVIDENCE_KEYS = new Set([
  "complianceProfile",
  "primaryGoal",
  "securityPosture",
  "trustBoundaryModel",
  "identityModel",
  "addressHierarchyModel",
  "siteBlockStrategy",
  "gatewayConvention",
  "growthBufferModel",
  "reservedRangePolicy",
  "namingStandard",
  "deviceNamingConvention",
  "namingTokenPreference",
  "namingHierarchy",
  "customNamingPattern",
  "bandwidthProfile",
  "outageTolerance",
  "growthHorizon",
  "budgetModel",
  "vendorPreference",
  "implementationTimeline",
  "rolloutModel",
  "downtimeConstraint",
  "teamCapability",
  "outputPackage",
  "primaryAudience",
  "customRequirementsNotes",
]);

function textIncludesKey(value: string | null | undefined, key: string) {
  return Boolean(value && value.toLowerCase().includes(key.toLowerCase()));
}

function segmentEvidenceForKey(key: string, vlans: VlanLike[]) {
  const expectedNames = SEGMENT_NAME_BY_REQUIREMENT_KEY[key] ?? [];
  return vlans.filter((vlan) => {
    const name = (vlan.vlanName ?? "").toUpperCase();
    return expectedNames.includes(name) || textIncludesKey(vlan.notes, key) || textIncludesKey(vlan.purpose, key) || textIncludesKey(vlan.department, key);
  });
}

function flowEvidenceForKey(key: string, networkObjectModel?: NetworkObjectModelLike) {
  return (networkObjectModel?.securityPolicyFlow?.flowRequirements ?? []).filter((flow) => flow.requirementKeys?.includes(key));
}

function isNegativeOrZeroRequirementEvidence(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "not selected"
    || normalized === "0"
    || normalized === "none"
    || normalized.includes("not applicable")
    || normalized.includes("not required")
    || normalized.includes("no ");
}

function networkObjectEvidenceForKey(key: string, networkObjectModel?: NetworkObjectModelLike) {
  const zones = networkObjectModel?.securityZones ?? [];
  const devices = networkObjectModel?.devices ?? [];
  const pools = networkObjectModel?.dhcpPools ?? [];
  const interfaces = networkObjectModel?.interfaces ?? [];
  const links = networkObjectModel?.links ?? [];
  const policies = networkObjectModel?.policyRules ?? [];
  const nats = networkObjectModel?.natRules ?? [];
  const targetNames = SEGMENT_NAME_BY_REQUIREMENT_KEY[key] ?? [];
  const targetText = targetNames.join(" ").toLowerCase();
  const hits: string[] = [];

  if (targetNames.length && zones.some((zone) => targetText.includes(String(zone.zoneRole ?? "").toLowerCase()) || targetNames.some((name) => String(zone.name ?? "").toUpperCase().includes(name)))) hits.push("security zones");
  if (targetNames.length && pools.some((pool) => targetNames.some((name) => String(pool.name ?? "").toUpperCase().includes(name)))) hits.push("DHCP pools");
  const targetVlanIds = targetNames.map((name) => ({ USERS: 10, SERVICES: 20, GUEST: 30, "STAFF-WIFI": 40, VOICE: 50, PRINTERS: 60, IOT: 70, CAMERAS: 80, MANAGEMENT: 90, "REMOTE-ACCESS": 100, "CLOUD-EDGE": 110, "WAN-TRANSIT": 120, OPERATIONS: 130 } as Record<string, number>)[name]).filter((id): id is number => Number.isFinite(id));
  if (targetVlanIds.length && pools.some((pool) => targetVlanIds.includes(Number(pool.vlanId)))) hits.push("durable DHCP scope evidence");
  if ((key === "remoteAccess" || key === "remoteAccessMethod") && devices.some((device) => String(device.role ?? device.name ?? "").toLowerCase().includes("firewall"))) hits.push("remote-access edge placement");
  if ((key === "cloudConnected" || key.startsWith("cloud")) && (links.some((link) => String(link.linkType ?? link.name ?? "").toLowerCase().includes("wan")) || zones.some((zone) => String(zone.zoneRole ?? zone.name ?? "").toLowerCase().includes("wan")))) hits.push("cloud/WAN boundary");
  if ((key === "guestWifi" || key === "guestPolicy") && policies.length > 0) hits.push("guest policy matrix");
  if ((key === "internetModel" || key === "dualIsp") && nats.length > 0) hits.push("internet/NAT posture");
  if ((key === "management" || key === "managementAccess" || key === "managementIpPolicy") && interfaces.some((iface) => Number((iface as any).vlanId) === 90 || String((iface as any).securityZoneId ?? "").toLowerCase().includes("management") || String(iface.purpose ?? iface.name ?? "").toLowerCase().includes("management") || (iface.notes ?? []).some((note) => String(note).toLowerCase().includes("management")))) hits.push("management interface object evidence");

  return Array.from(new Set(hits));
}

export function buildRequirementsImpactClosureSummary(input: ClosureInput): RequirementsImpactClosureSummary {
  const requirements = parseJsonMap(input.requirementsJson);
  const inventory = buildRequirementImpactInventory(requirements);
  const vlans = input.sites.flatMap((site) => site.vlans ?? []);

  const fieldOutcomes: RequirementsImpactClosureItem[] = inventory.map((item) => {
    const concreteOutputs: string[] = [];
    const visibleIn = ["Requirements traceability", "Overview traceability table", "Report/export evidence"];
    const missingEvidence: string[] = [];

    if (item.captured) concreteOutputs.push("Backend traceability row");

    if (item.captured && SITE_DRIVER_KEYS.has(item.key) && input.sites.length > 0) {
      concreteOutputs.push(`${input.sites.length} materialized site record${input.sites.length === 1 ? "" : "s"}`);
      visibleIn.push("Sites workspace", "Topology/diagram scope");
    }

    const segmentHits = item.captured ? segmentEvidenceForKey(item.key, vlans) : [];
    if (segmentHits.length > 0) {
      concreteOutputs.push(`${segmentHits.length} VLAN/segment row${segmentHits.length === 1 ? "" : "s"}`);
      visibleIn.push("VLANs workspace", "Addressing plan", "Diagram labels");
    }

    const flowHits = item.captured ? flowEvidenceForKey(item.key, input.networkObjectModel) : [];
    if (flowHits.length > 0) {
      concreteOutputs.push(`${flowHits.length} security-flow consequence${flowHits.length === 1 ? "" : "s"}`);
      visibleIn.push("Security policy flow", "Validation findings", "Diagram flow review");
    }

    const objectHits = item.captured ? networkObjectEvidenceForKey(item.key, input.networkObjectModel) : [];
    concreteOutputs.push(...objectHits);

    const negativeOrZeroEvidence = item.captured && isNegativeOrZeroRequirementEvidence(item.sourceValue);
    if (negativeOrZeroEvidence) {
      concreteOutputs.push("Captured negative/zero requirement evidence");
      visibleIn.push("Requirements workspace", "Report/export evidence");
    }

    if (item.captured && REVIEW_EVIDENCE_KEYS.has(item.key)) {
      concreteOutputs.push("Design review evidence");
      visibleIn.push("Review notes", "Implementation/handoff planning");
    }

    const uniqueOutputs = Array.from(new Set(concreteOutputs));
    const hasConcrete = uniqueOutputs.some((output) => !["Backend traceability row", "Design review evidence", "Captured negative/zero requirement evidence"].includes(output));
    const hasPolicy = flowHits.length > 0;
    const reflectionStatus: RequirementsImpactClosureItem["reflectionStatus"] = !item.captured
      ? "not-captured"
      : hasPolicy
        ? "policy-consequence"
        : hasConcrete
          ? "concrete-output"
          : negativeOrZeroEvidence || REVIEW_EVIDENCE_KEYS.has(item.key) || item.impact !== "direct"
            ? "review-evidence"
            : "traceable-only";

    if (item.captured && item.impact === "direct" && reflectionStatus === "traceable-only") {
      missingEvidence.push("Direct affirmative requirement is captured and traceable, but no concrete site/VLAN/security-flow/object evidence was found yet.");
    }
    if (!item.captured) missingEvidence.push("Requirement field is not captured in the saved requirements JSON.");

    return {
      key: item.key,
      label: item.label,
      category: item.category,
      impact: item.impact,
      sourceValue: item.sourceValue,
      captured: item.captured,
      reflectionStatus,
      concreteOutputs: uniqueOutputs,
      visibleIn: Array.from(new Set(visibleIn)),
      missingEvidence,
    };
  });

  const capturedOutcomes = fieldOutcomes.filter((item) => item.captured);
  const concreteFieldCount = capturedOutcomes.filter((item) => item.reflectionStatus === "concrete-output").length;
  const policyFieldCount = capturedOutcomes.filter((item) => item.reflectionStatus === "policy-consequence").length;
  const reviewEvidenceFieldCount = capturedOutcomes.filter((item) => item.reflectionStatus === "review-evidence").length;
  const traceableOnlyFieldCount = capturedOutcomes.filter((item) => item.reflectionStatus === "traceable-only").length;
  const notCapturedFieldCount = fieldOutcomes.filter((item) => item.reflectionStatus === "not-captured").length;
  const directCapturedTraceableOnly = fieldOutcomes.filter((item) => item.impact === "direct" && item.reflectionStatus === "traceable-only");

  return {
    totalFieldCount: fieldOutcomes.length,
    capturedFieldCount: capturedOutcomes.length,
    concreteFieldCount,
    policyFieldCount,
    reviewEvidenceFieldCount,
    traceableOnlyFieldCount,
    notCapturedFieldCount,
    handledFieldCount: fieldOutcomes.length,
    explicitlyUnusedFieldCount: notCapturedFieldCount,
    explicitlyUnusedKeys: fieldOutcomes.filter((item) => item.reflectionStatus === "not-captured").map((item) => item.key),
    directCapturedTraceableOnlyKeys: directCapturedTraceableOnly.map((item) => item.key),
    completionStatus: notCapturedFieldCount === 0 && directCapturedTraceableOnly.length === 0 ? "complete" : "review-required",
    fieldOutcomes,
    notes: [
      "Every guided requirement field is inventoried and checked against materialized sites/VLANs, security-flow consequences, object-model evidence, or review/handoff evidence.",
      "Direct requirements should land in concrete outputs or explicit policy consequences; indirect/evidence requirements may remain review evidence if they are not supposed to create network objects by themselves.",
      directCapturedTraceableOnly.length > 0
        ? `${directCapturedTraceableOnly.length} captured direct requirement field(s) still need deeper concrete-output wiring.`
        : "Captured direct requirement fields have concrete or policy evidence in the current model.",
    ],
  };
}
