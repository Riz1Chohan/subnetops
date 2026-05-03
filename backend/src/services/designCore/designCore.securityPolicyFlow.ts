// Phase 12 security policy flow control markers: phase12PolicyState, consequenceSummary, reviewReason, SECURITY_NAT_REQUIRED_FLOW_UNCOVERED, SECURITY_RULE_SHADOWED_BY_EARLIER_RULE, SECURITY_IMPLICIT_DENY_NOT_MODELED.
import type {
  NatRule,
  NetworkObjectTruthState,
  PolicyRule,
  RoutingSegmentationModel,
  SecurityNatReview,
  SecurityPolicyFinding,
  SecurityPolicyFlowModel,
  SecurityPolicyMatrixRow,
  SecurityRuleOrderReview,
  SecurityFlowRequirement,
  SecurityServiceGroup,
  SecurityServiceObject,
  SecurityZone,
  SegmentationFlowExpectation,
} from "../designCore.types.js";

type SecurityPolicyNetworkObjectModel = {
  securityZones: SecurityZone[];
  policyRules: PolicyRule[];
  natRules: NatRule[];
};

type SecurityPolicyAction = SecurityFlowRequirement["expectedAction"];
type SecurityFlowState = SecurityFlowRequirement["state"];

type SequencedPolicyRule = PolicyRule & {
  sequence: number;
};

type BaseFlowRequirementInput = {
  id: string;
  name: string;
  sourceZone: SecurityZone;
  destinationZone: SecurityZone;
  expectedAction: SecurityPolicyAction;
  serviceNames: string[];
  natRequired: boolean;
  severityIfMissing: SecurityFlowRequirement["severityIfMissing"];
  rationale: string;
  truthState: NetworkObjectTruthState;
  requirementKeys?: string[];
  notes: string[];
};

const MANAGEMENT_SERVICES = new Set(["ssh", "https", "snmp", "icmp"]);
const USER_EGRESS_SERVICES = new Set(["dns", "http", "https"]);
const HIGH_RISK_SOURCE_ROLES = new Set<SecurityZone["zoneRole"]>(["guest", "wan", "dmz", "iot"]);
const HIGH_VALUE_DESTINATION_ROLES = new Set<SecurityZone["zoneRole"]>(["internal", "management"]);
const TRUSTED_INTERNAL_ROLES = new Set<SecurityZone["zoneRole"]>(["internal", "management"]);
const NAT_EGRESS_ROLES = new Set<SecurityZone["zoneRole"]>(["internal", "guest", "management", "voice", "iot", "dmz"]);

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

function requirementMentions(requirements: RequirementInputMap, key: string, patterns: string[]) {
  const text = requirementText(requirements, key).toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
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

function requirementCountPositive(requirements: RequirementInputMap, key: string) {
  return requirementNumber(requirements, key) > 0;
}

function requirementEnabled(requirements: RequirementInputMap, key: string, patterns: string[] = []) {
  return requirementBool(requirements, key) || requirementMentions(requirements, key, patterns);
}

function dedupeFlowInputs(flowInputs: BaseFlowRequirementInput[]) {
  const byId = new Map<string, BaseFlowRequirementInput>();
  for (const flowInput of flowInputs) {
    const existing = byId.get(flowInput.id);
    if (!existing) {
      byId.set(flowInput.id, flowInput);
      continue;
    }
    const requirementKeys = Array.from(new Set([...(existing.requirementKeys ?? []), ...(flowInput.requirementKeys ?? [])])).sort();
    byId.set(flowInput.id, {
      ...existing,
      requirementKeys,
      notes: Array.from(new Set([...existing.notes, ...flowInput.notes])),
    });
  }
  return Array.from(byId.values());
}

function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unnamed";
}

function normalizeServiceName(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized || "any";
}

function normalizeServiceNames(values: string[]) {
  const services = values.map(normalizeServiceName).filter(Boolean);
  const unique = Array.from(new Set(services));
  return unique.length > 0 ? unique.sort() : ["any"];
}

function findZoneByRole(securityZones: SecurityZone[], zoneRole: SecurityZone["zoneRole"]) {
  return securityZones.find((zone) => zone.zoneRole === zoneRole);
}

function zonePairId(sourceZoneId: string, destinationZoneId: string) {
  return `${sourceZoneId}=>${destinationZoneId}`;
}

function serviceObjectId(serviceName: string) {
  return `security-service-${normalizeIdentifierSegment(serviceName)}`;
}

function serviceGroupId(serviceNames: string[]) {
  return `security-service-group-${normalizeIdentifierSegment(serviceNames.join("-"))}`;
}

function serviceProtocolHint(serviceName: string): SecurityServiceObject["protocolHint"] {
  if (serviceName === "any") return "any";
  if (serviceName === "icmp") return "icmp";
  if (["dns", "snmp"].includes(serviceName)) return "udp";
  if (["http", "https", "ssh"].includes(serviceName)) return "tcp";
  return "application";
}

function servicePortHint(serviceName: string): string | undefined {
  switch (serviceName) {
    case "dns":
      return "53";
    case "http":
      return "80";
    case "https":
      return "443";
    case "ssh":
      return "22";
    case "snmp":
      return "161/162";
    case "icmp":
      return "icmp";
    default:
      return undefined;
  }
}

function servicesOverlap(leftServices: string[], rightServices: string[]) {
  const left = normalizeServiceNames(leftServices);
  const right = normalizeServiceNames(rightServices);
  if (left.includes("any") || right.includes("any")) return true;
  return left.some((serviceName) => right.includes(serviceName));
}

function servicesCoverRule(candidateServices: string[], targetServices: string[]) {
  const candidate = normalizeServiceNames(candidateServices);
  const target = normalizeServiceNames(targetServices);
  if (candidate.includes("any")) return true;
  if (target.includes("any")) return false;
  return target.every((serviceName) => candidate.includes(serviceName));
}

function isBroadServiceList(serviceNames: string[]) {
  const normalized = normalizeServiceNames(serviceNames);
  return normalized.includes("any") || normalized.includes("application-specific") || normalized.length === 0;
}

function isHighRiskBoundary(sourceZone: SecurityZone, destinationZone: SecurityZone) {
  return HIGH_RISK_SOURCE_ROLES.has(sourceZone.zoneRole) && HIGH_VALUE_DESTINATION_ROLES.has(destinationZone.zoneRole);
}

function isManagementBoundary(sourceZone: SecurityZone, destinationZone: SecurityZone, services: string[]) {
  if (destinationZone.zoneRole === "management") return true;
  const normalized = normalizeServiceNames(services);
  return normalized.some((serviceName) => MANAGEMENT_SERVICES.has(serviceName)) && sourceZone.id !== destinationZone.id;
}

function requiresLogging(sourceZone: SecurityZone, destinationZone: SecurityZone, expectedAction: SecurityPolicyAction, services: string[]) {
  return expectedAction === "deny" || isHighRiskBoundary(sourceZone, destinationZone) || isManagementBoundary(sourceZone, destinationZone, services);
}

function implicitDenyExpected(sourceZone: SecurityZone, destinationZone: SecurityZone) {
  if (sourceZone.id === destinationZone.id) return false;
  if (isHighRiskBoundary(sourceZone, destinationZone)) return true;
  if (destinationZone.zoneRole === "management") return true;
  if (sourceZone.zoneRole === "wan" && destinationZone.zoneRole !== "wan") return true;
  if (sourceZone.zoneRole === "guest" && destinationZone.zoneRole !== "wan") return true;
  return false;
}

function defaultZonePairPosture(sourceZone: SecurityZone, destinationZone: SecurityZone): SecurityPolicyMatrixRow["defaultPosture"] {
  if (sourceZone.id === destinationZone.id) return "review";
  if (implicitDenyExpected(sourceZone, destinationZone)) return "deny";
  if (destinationZone.zoneRole === "wan" && NAT_EGRESS_ROLES.has(sourceZone.zoneRole)) return "review";
  if (TRUSTED_INTERNAL_ROLES.has(sourceZone.zoneRole) && destinationZone.zoneRole === "dmz") return "review";
  return "review";
}

function buildServiceGroups(flowInputs: BaseFlowRequirementInput[], policyRules: PolicyRule[]): SecurityServiceGroup[] {
  const grouped = new Map<string, SecurityServiceGroup>();

  const collect = (name: string, serviceNames: string[], notes: string[]) => {
    const normalizedServices = normalizeServiceNames(serviceNames);
    const id = serviceGroupId(normalizedServices);
    if (grouped.has(id)) return;
    const broadMatch = isBroadServiceList(normalizedServices);
    grouped.set(id, {
      id,
      name,
      serviceNames: normalizedServices,
      broadMatch,
      implementationReviewRequired: broadMatch || normalizedServices.some((serviceName) => serviceProtocolHint(serviceName) === "application"),
      notes,
    });
  };

  for (const flowInput of flowInputs) {
    collect(`${flowInput.name} services`, flowInput.serviceNames, [
      "Service group is derived from a backend security-flow requirement and is used for neutral policy review.",
    ]);
  }

  for (const rule of policyRules) {
    collect(`${rule.name} services`, rule.services, [
      "Service group is derived from a modeled policy rule and remains vendor-neutral until implementation translation.",
    ]);
  }

  return Array.from(grouped.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function buildServiceObjects(flowInputs: BaseFlowRequirementInput[], policyRules: PolicyRule[], serviceGroups: SecurityServiceGroup[]): SecurityServiceObject[] {
  const serviceNames = new Set<string>();

  for (const flowInput of flowInputs) {
    for (const serviceName of normalizeServiceNames(flowInput.serviceNames)) serviceNames.add(serviceName);
  }

  for (const rule of policyRules) {
    for (const serviceName of normalizeServiceNames(rule.services)) serviceNames.add(serviceName);
  }

  const serviceGroupIdsByServiceName = new Map<string, string[]>();
  for (const serviceGroup of serviceGroups) {
    for (const serviceName of serviceGroup.serviceNames) {
      const ids = serviceGroupIdsByServiceName.get(serviceName) ?? [];
      ids.push(serviceGroup.id);
      serviceGroupIdsByServiceName.set(serviceName, ids);
    }
  }

  return Array.from(serviceNames)
    .sort((left, right) => left.localeCompare(right))
    .map((serviceName) => {
      const protocolHint = serviceProtocolHint(serviceName);
      const broadMatch = serviceName === "any" || serviceName === "application-specific";
      return {
        id: serviceObjectId(serviceName),
        name: serviceName,
        protocolHint,
        portHint: servicePortHint(serviceName),
        serviceGroupIds: (serviceGroupIdsByServiceName.get(serviceName) ?? []).sort(),
        broadMatch,
        implementationReviewRequired: broadMatch || protocolHint === "application",
        notes: [
          "Service object is neutral backend design intent. Vendor protocol/application mapping still requires engineer review before implementation.",
          broadMatch ? "Broad service matching must not be translated into a vendor rule without explicit engineer approval." : "Service is narrow enough for future vendor translation review.",
        ],
      };
    });
}

function policyRuleMatchesFlow(rule: PolicyRule, flowInput: BaseFlowRequirementInput) {
  if (rule.sourceZoneId !== flowInput.sourceZone.id) return false;
  if (rule.destinationZoneId !== flowInput.destinationZone.id) return false;
  return servicesOverlap(rule.services, flowInput.serviceNames);
}

function natRuleMatchesFlow(natRule: NatRule, flowInput: BaseFlowRequirementInput) {
  if (natRule.sourceZoneId !== flowInput.sourceZone.id) return false;
  if (natRule.destinationZoneId && natRule.destinationZoneId !== flowInput.destinationZone.id) return false;
  if (natRule.status === "not-required") return false;
  return natRule.translatedAddressMode !== "not-required";
}

function chooseObservedPolicyRule(matchedPolicyRules: SequencedPolicyRule[], expectedAction: SecurityPolicyAction) {
  if (expectedAction === "deny") return [...matchedPolicyRules].sort((left, right) => (left.action === "deny" ? 0 : 1) - (right.action === "deny" ? 0 : 1) || left.sequence - right.sequence)[0];
  if (expectedAction === "allow") return [...matchedPolicyRules].sort((left, right) => (left.action === "allow" ? 0 : 1) - (right.action === "allow" ? 0 : 1) || left.sequence - right.sequence)[0];
  return [...matchedPolicyRules].sort((left, right) => (left.action === "review" ? 0 : 1) - (right.action === "review" ? 0 : 1) || left.sequence - right.sequence)[0];
}

function evaluateFlowState(params: {
  expectedAction: SecurityPolicyAction;
  observedPolicyAction?: SecurityPolicyAction;
  natRequired: boolean;
  matchedNatRuleCount: number;
}): SecurityFlowState {
  if (params.expectedAction === "review") return "review";
  if (!params.observedPolicyAction) return "missing-policy";
  if (params.observedPolicyAction === "review") return "review";
  if (params.observedPolicyAction !== params.expectedAction) return "conflict";
  if (params.expectedAction === "allow" && params.natRequired && params.matchedNatRuleCount === 0) return "missing-nat";
  return "satisfied";
}

function createFlowRequirement(params: {
  flowInput: BaseFlowRequirementInput;
  policyRules: SequencedPolicyRule[];
  natRules: NatRule[];
}): SecurityFlowRequirement {
  const matchedPolicyRules = params.policyRules.filter((rule) => policyRuleMatchesFlow(rule, params.flowInput));
  const matchedNatRules = params.natRules.filter((natRule) => natRuleMatchesFlow(natRule, params.flowInput));
  const observedPolicyRule = chooseObservedPolicyRule(matchedPolicyRules, params.flowInput.expectedAction);
  const observedPolicyAction = observedPolicyRule?.action;
  const state = evaluateFlowState({
    expectedAction: params.flowInput.expectedAction,
    observedPolicyAction,
    natRequired: params.flowInput.natRequired,
    matchedNatRuleCount: matchedNatRules.length,
  });
  const ruleOrderSensitive = matchedPolicyRules.length > 1 && new Set(matchedPolicyRules.map((rule) => rule.action)).size > 1;
  const flowImplicitDenyExpected = implicitDenyExpected(params.flowInput.sourceZone, params.flowInput.destinationZone);
  const flowLoggingRequired = requiresLogging(params.flowInput.sourceZone, params.flowInput.destinationZone, params.flowInput.expectedAction, params.flowInput.serviceNames);

  return {
    id: params.flowInput.id,
    name: params.flowInput.name,
    sourceZoneId: params.flowInput.sourceZone.id,
    sourceZoneName: params.flowInput.sourceZone.name,
    destinationZoneId: params.flowInput.destinationZone.id,
    destinationZoneName: params.flowInput.destinationZone.name,
    expectedAction: params.flowInput.expectedAction,
    observedPolicyAction,
    observedPolicyRuleId: observedPolicyRule?.id,
    observedPolicyRuleName: observedPolicyRule?.name,
    serviceNames: normalizeServiceNames(params.flowInput.serviceNames),
    matchedPolicyRuleIds: matchedPolicyRules.map((rule) => rule.id).sort(),
    natRequired: params.flowInput.natRequired,
    matchedNatRuleIds: matchedNatRules.map((rule) => rule.id).sort(),
    state,
    severityIfMissing: params.flowInput.severityIfMissing,
    ruleOrderSensitive,
    implicitDenyExpected: flowImplicitDenyExpected,
    loggingRequired: flowLoggingRequired,
    rationale: params.flowInput.rationale,
    truthState: params.flowInput.truthState,
    requirementKeys: params.flowInput.requirementKeys ?? [],
    notes: [
      ...params.flowInput.notes,
      (params.flowInput.requirementKeys ?? []).length > 0
        ? `Requirement-driven flow evidence: ${(params.flowInput.requirementKeys ?? []).join(", ")}.`
        : "Flow evidence is derived from modeled topology, routing, or baseline security posture.",
      observedPolicyRule
        ? `First matching policy rule is ${observedPolicyRule.name} at sequence ${observedPolicyRule.sequence} with action ${observedPolicyRule.action}.`
        : "No matching policy rule was modeled for this flow requirement.",
      ruleOrderSensitive
        ? "Multiple matching policy actions exist, so rule order is security-significant and must be reviewed before implementation."
        : "No contradictory ordered policy match was detected for this flow.",
      flowLoggingRequired
        ? "Logging/evidence is required for this boundary because it involves denial, management-plane access, or high-risk source traffic."
        : "No special logging requirement was inferred beyond the normal implementation evidence trail.",
      params.flowInput.natRequired
        ? matchedNatRules.length > 0
          ? `NAT coverage exists through ${matchedNatRules.length} modeled NAT rule(s).`
          : "NAT is required for this egress flow but no matching NAT rule was modeled."
        : "NAT is not required for this flow requirement.",
    ],
  };
}

function flowInputFromSegmentationExpectation(expectation: SegmentationFlowExpectation, securityZones: SecurityZone[]): BaseFlowRequirementInput | null {
  const sourceZone = securityZones.find((zone) => zone.id === expectation.sourceZoneId);
  const destinationZone = securityZones.find((zone) => zone.id === expectation.destinationZoneId);
  if (!sourceZone || !destinationZone) return null;

  return {
    id: `security-flow-${normalizeIdentifierSegment(expectation.id)}`,
    name: expectation.name,
    sourceZone,
    destinationZone,
    expectedAction: expectation.expectedAction,
    serviceNames: normalizeServiceNames(expectation.services),
    natRequired: expectation.expectedAction === "allow" && destinationZone.zoneRole === "wan" && sourceZone.zoneRole !== "wan",
    severityIfMissing: expectation.severityIfMissing,
    rationale: expectation.rationale,
    truthState: "proposed",
    requirementKeys: ["routingSegmentation"],
    notes: [
      "Derived from the Phase 28 segmentation expectation so security policy coverage can be evaluated as a first-class flow requirement.",
    ],
  };
}

function pushRequirementFlow(flowInputs: BaseFlowRequirementInput[], flowInput: BaseFlowRequirementInput) {
  if (!flowInputs.some((item) => item.id === flowInput.id)) flowInputs.push(flowInput);
}

function buildRequirementDrivenFlowInputs(model: SecurityPolicyNetworkObjectModel, requirements: RequirementInputMap): BaseFlowRequirementInput[] {
  const flowInputs: BaseFlowRequirementInput[] = [];
  const internalZone = findZoneByRole(model.securityZones, "internal");
  const managementZone = findZoneByRole(model.securityZones, "management");
  const dmzZone = findZoneByRole(model.securityZones, "dmz");
  const guestZone = findZoneByRole(model.securityZones, "guest");
  const wideAreaNetworkZone = findZoneByRole(model.securityZones, "wan");
  const transitZone = findZoneByRole(model.securityZones, "transit");
  const voiceZone = findZoneByRole(model.securityZones, "voice");
  const iotZone = findZoneByRole(model.securityZones, "iot");
  const cloudOrHybrid = requirementEnabled(requirements, "cloudConnected")
    || requirementMentions(requirements, "environmentType", ["cloud", "hybrid"])
    || requirementMentions(requirements, "cloudConnectivity", ["vpn", "express", "direct", "private", "cloud"]);

  if (requirementEnabled(requirements, "guestWifi") && guestZone && internalZone) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-guest-to-internal-default-deny",
      name: "Guest requirement blocks internal reachability",
      sourceZone: guestZone,
      destinationZone: internalZone,
      expectedAction: "deny",
      serviceNames: ["any"],
      natRequired: false,
      severityIfMissing: "ERROR",
      rationale: "The guest Wi-Fi requirement is only trustworthy if guest clients are explicitly isolated from internal user, server, and shared-device networks.",
      truthState: "proposed",
      requirementKeys: ["guestWifi", "guestPolicy", "trustBoundaryModel", "securityPosture"],
      notes: ["This turns the guest checkbox into a concrete deny-flow requirement, not just a guest VLAN label."],
    });
  }

  if (requirementEnabled(requirements, "management") && internalZone && managementZone) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-admin-to-management-plane-review",
      name: "Administrative access to management plane must be explicit",
      sourceZone: internalZone,
      destinationZone: managementZone,
      expectedAction: "review",
      serviceNames: Array.from(MANAGEMENT_SERVICES),
      natRequired: false,
      severityIfMissing: "WARNING",
      rationale: "The management-network requirement needs a deliberate admin-source decision instead of allowing normal user networks to reach device administration surfaces by accident.",
      truthState: "proposed",
      requirementKeys: ["management", "managementAccess", "managementIpPolicy", "adminBoundary", "identityModel"],
      notes: ["Implementation should narrow the source to admin workstations, jump hosts, or identity-aware access paths."],
    });
  }

  if (requirementEnabled(requirements, "remoteAccess") && wideAreaNetworkZone && dmzZone) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-wan-to-remote-access-edge-review",
      name: "Remote-access edge publishing must be explicit",
      sourceZone: wideAreaNetworkZone,
      destinationZone: dmzZone,
      expectedAction: "review",
      serviceNames: ["https", "ssl-vpn", "ipsec"],
      natRequired: false,
      severityIfMissing: "WARNING",
      rationale: "The remote-access requirement should create a reviewed VPN/application edge rather than silently trusting inbound WAN traffic.",
      truthState: "proposed",
      requirementKeys: ["remoteAccess", "remoteAccessMethod", "identityModel", "securityPosture"],
      notes: ["MFA, identity provider, tunnel mode, and permitted destination groups remain implementation review items."],
    });
  }

  if (requirementEnabled(requirements, "remoteAccess") && dmzZone && internalZone) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-remote-access-edge-to-internal-review",
      name: "Remote-access users require scoped internal access",
      sourceZone: dmzZone,
      destinationZone: internalZone,
      expectedAction: "review",
      serviceNames: ["application-specific", "dns", "https"],
      natRequired: false,
      severityIfMissing: "WARNING",
      rationale: "Remote-access users should receive scoped application access, not broad trusted-network reachability.",
      truthState: "proposed",
      requirementKeys: ["remoteAccess", "remoteAccessMethod", "identityModel", "trustBoundaryModel"],
      notes: ["Replace this review flow with application groups and least-privilege destination groups before implementation."],
    });
  }

  if (cloudOrHybrid && internalZone && (transitZone || wideAreaNetworkZone)) {
    const destinationZone = transitZone ?? wideAreaNetworkZone!;
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-internal-to-cloud-edge-review",
      name: "Cloud or hybrid application reachability must be reviewed",
      sourceZone: internalZone,
      destinationZone,
      expectedAction: "review",
      serviceNames: ["application-specific", "dns", "https"],
      natRequired: destinationZone.zoneRole === "wan",
      severityIfMissing: "WARNING",
      rationale: "Cloud-connected and hybrid requirements need an explicit private/public cloud boundary instead of being hidden under generic internet egress.",
      truthState: "proposed",
      requirementKeys: ["cloudConnected", "environmentType", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel", "cloudTrafficBoundary"],
      notes: ["Private route exchange, cloud prefix ownership, DNS, and security inspection must be confirmed before implementation."],
    });
  }

  if ((requirementEnabled(requirements, "voice") || requirementCountPositive(requirements, "phoneCount")) && voiceZone && (internalZone || wideAreaNetworkZone)) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-voice-services-qos-review",
      name: "Voice services require scoped QoS and call-control reachability",
      sourceZone: voiceZone,
      destinationZone: internalZone ?? wideAreaNetworkZone!,
      expectedAction: "review",
      serviceNames: ["sip", "rtp", "dns"],
      natRequired: !internalZone,
      severityIfMissing: "WARNING",
      rationale: "The voice requirement affects policy and QoS; it cannot be treated as only another DHCP VLAN.",
      truthState: "proposed",
      requirementKeys: ["voice", "voiceQos", "phoneCount", "qosModel", "latencySensitivity"],
      notes: ["Call manager, SBC, emergency calling, and QoS marking trust boundaries remain engineer-review items."],
    });
  }

  if ((requirementEnabled(requirements, "iot") || requirementCountPositive(requirements, "iotDeviceCount") || requirementEnabled(requirements, "cameras") || requirementCountPositive(requirements, "cameraCount") || requirementEnabled(requirements, "printers") || requirementCountPositive(requirements, "printerCount")) && iotZone && internalZone) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-shared-device-to-internal-default-deny",
      name: "Shared-device and IoT networks default-deny into trusted internal networks",
      sourceZone: iotZone,
      destinationZone: internalZone,
      expectedAction: "deny",
      serviceNames: ["any"],
      natRequired: false,
      severityIfMissing: "ERROR",
      rationale: "Printers, cameras, and IoT devices should not inherit broad internal network access just because they are inside the building.",
      truthState: "proposed",
      requirementKeys: ["printers", "printerCount", "iot", "iotDeviceCount", "cameras", "cameraCount", "trustBoundaryModel", "securityPosture"],
      notes: ["Allow flows should be modeled from trusted users/services toward these device networks, not broad east-west access from devices to users."],
    });
  }

  if ((requirementEnabled(requirements, "iot") || requirementCountPositive(requirements, "iotDeviceCount") || requirementEnabled(requirements, "cameras") || requirementCountPositive(requirements, "cameraCount") || requirementEnabled(requirements, "printers") || requirementCountPositive(requirements, "printerCount")) && internalZone && iotZone) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-internal-to-shared-device-review",
      name: "Trusted access to shared-device networks must be scoped",
      sourceZone: internalZone,
      destinationZone: iotZone,
      expectedAction: "review",
      serviceNames: ["application-specific", "icmp"],
      natRequired: false,
      severityIfMissing: "WARNING",
      rationale: "Users or services may need to reach printers, cameras, or IoT controllers, but those paths should be intentionally scoped.",
      truthState: "proposed",
      requirementKeys: ["printers", "printerCount", "iot", "iotDeviceCount", "cameras", "cameraCount"],
      notes: ["Replace this review flow with print, camera-management, or IoT-controller service groups before implementation."],
    });
  }

  if ((requirementMentions(requirements, "complianceProfile", ["pci", "hipaa", "sox", "regulated", "compliance"]) || requirementEnabled(requirements, "management") || Boolean(requirementText(requirements, "monitoringModel")) || Boolean(requirementText(requirements, "loggingModel")) || Boolean(requirementText(requirements, "backupPolicy")) || Boolean(requirementText(requirements, "operationsOwnerModel"))) && managementZone && internalZone) {
    pushRequirementFlow(flowInputs, {
      id: "requirement-flow-management-to-internal-operations-review",
      name: "Operations tooling access must be scoped and logged",
      sourceZone: managementZone,
      destinationZone: internalZone,
      expectedAction: "review",
      serviceNames: ["snmp", "ssh", "https", "icmp"],
      natRequired: false,
      severityIfMissing: "WARNING",
      rationale: "Monitoring, logging, backups, and compliance evidence require controlled operations-plane reachability.",
      truthState: "proposed",
      requirementKeys: ["complianceProfile", "monitoringModel", "loggingModel", "backupPolicy", "operationsOwnerModel", "management"],
      notes: ["Logging and evidence collection should be validated with management-plane source restrictions before handoff."],
    });
  }

  return flowInputs;
}

function buildAdditionalFlowInputs(model: SecurityPolicyNetworkObjectModel): BaseFlowRequirementInput[] {
  const flowInputs: BaseFlowRequirementInput[] = [];
  const internalZone = findZoneByRole(model.securityZones, "internal");
  const managementZone = findZoneByRole(model.securityZones, "management");
  const dmzZone = findZoneByRole(model.securityZones, "dmz");
  const guestZone = findZoneByRole(model.securityZones, "guest");
  const wideAreaNetworkZone = findZoneByRole(model.securityZones, "wan");
  const transitZone = findZoneByRole(model.securityZones, "transit");
  const iotZone = findZoneByRole(model.securityZones, "iot");

  const pushPhase84DenyFlow = (id: string, name: string, sourceZone: SecurityZone | undefined, destinationZone: SecurityZone | undefined, rationale: string) => {
    if (!sourceZone || !destinationZone) return;
    flowInputs.push({
      id,
      name,
      sourceZone,
      destinationZone,
      expectedAction: "deny",
      serviceNames: ["any"],
      natRequired: false,
      severityIfMissing: "ERROR",
      rationale,
      truthState: "proposed",
      notes: ["Phase 84 explicit default-deny policy reconciliation flow."],
    });
  };

  if (internalZone && wideAreaNetworkZone) {
    flowInputs.push({
      id: "security-flow-internal-to-wide-area-network-egress",
      name: "Corporate internal internet egress must be explicit",
      sourceZone: internalZone,
      destinationZone: wideAreaNetworkZone,
      expectedAction: "allow",
      serviceNames: Array.from(USER_EGRESS_SERVICES),
      natRequired: true,
      severityIfMissing: "WARNING",
      rationale: "Internal user and server networks usually need controlled internet egress through an explicit firewall/NAT boundary.",
      truthState: "proposed",
      notes: ["This makes internet egress and NAT expectations visible instead of burying them inside generic routing notes."],
    });
  }

  if (managementZone && wideAreaNetworkZone) {
    flowInputs.push({
      id: "security-flow-management-to-wide-area-network-egress-review",
      name: "Management-plane internet egress must be reviewed",
      sourceZone: managementZone,
      destinationZone: wideAreaNetworkZone,
      expectedAction: "review",
      serviceNames: ["dns", "https"],
      natRequired: true,
      severityIfMissing: "WARNING",
      rationale: "Management networks may need updates, NTP, DNS, or vendor cloud access, but they should not inherit broad user egress by accident.",
      truthState: "proposed",
      notes: ["This forces an explicit management-plane egress decision instead of assuming the management zone behaves like normal user access."],
    });
  }

  if (wideAreaNetworkZone && internalZone) {
    flowInputs.push({
      id: "security-flow-wide-area-network-to-internal-default-deny",
      name: "Untrusted WAN to internal networks should be denied by default",
      sourceZone: wideAreaNetworkZone,
      destinationZone: internalZone,
      expectedAction: "deny",
      serviceNames: ["any"],
      natRequired: false,
      severityIfMissing: "ERROR",
      rationale: "Inbound access from external/WAN networks to trusted internal networks must not be implicitly allowed.",
      truthState: "proposed",
      notes: ["Specific published services should be modeled as DMZ/application flows, not broad WAN-to-internal access."],
    });
  }

  if (wideAreaNetworkZone && dmzZone) {
    flowInputs.push({
      id: "security-flow-wide-area-network-to-dmz-publishing-review",
      name: "WAN to DMZ publishing must be explicit",
      sourceZone: wideAreaNetworkZone,
      destinationZone: dmzZone,
      expectedAction: "review",
      serviceNames: ["http", "https"],
      natRequired: false,
      severityIfMissing: "WARNING",
      rationale: "Public service publishing should terminate in a DMZ or application boundary, not inside trusted internal networks.",
      truthState: "proposed",
      notes: ["Future vendor translation should require destination NAT/static NAT details and application ownership before implementation."],
    });
  }

  if (guestZone && managementZone) {
    flowInputs.push({
      id: "security-flow-guest-to-management-deny",
      name: "Guest networks must not reach the management plane",
      sourceZone: guestZone,
      destinationZone: managementZone,
      expectedAction: "deny",
      serviceNames: Array.from(MANAGEMENT_SERVICES),
      natRequired: false,
      severityIfMissing: "ERROR",
      rationale: "Guest access to device administration surfaces is a critical segmentation failure.",
      truthState: "proposed",
      notes: ["This flow is separated from generic guest-to-internal denial because management-plane exposure deserves its own finding."],
    });
  }

  if (guestZone && wideAreaNetworkZone) {
    flowInputs.push({
      id: "security-flow-guest-to-wide-area-network-egress",
      name: "Guest internet egress must be internet-only and NAT-backed",
      sourceZone: guestZone,
      destinationZone: wideAreaNetworkZone,
      expectedAction: "allow",
      serviceNames: Array.from(USER_EGRESS_SERVICES),
      natRequired: true,
      severityIfMissing: "WARNING",
      rationale: "Guest networks usually need web/DNS access only and should not inherit trusted internal reachability.",
      truthState: "proposed",
      notes: ["Captive portal, DNS filtering, and content policy remain implementation review items."],
    });
  }

  if (dmzZone && wideAreaNetworkZone) {
    flowInputs.push({
      id: "security-flow-dmz-to-wide-area-network-egress-review",
      name: "DMZ internet egress must be reviewed",
      sourceZone: dmzZone,
      destinationZone: wideAreaNetworkZone,
      expectedAction: "review",
      serviceNames: Array.from(USER_EGRESS_SERVICES),
      natRequired: true,
      severityIfMissing: "WARNING",
      rationale: "DMZ systems often need updates or external callbacks, but broad egress should not be assumed safe.",
      truthState: "proposed",
      notes: ["Engineer review is required because DMZ egress depends on the application threat model."],
    });
  }

  pushPhase84DenyFlow("security-flow-phase87-internal-users-to-management-deny", "General internal users must not administer the management plane", internalZone, managementZone, "Normal corporate user networks must not broadly reach device administration; scoped admin/operations access belongs in separate review flows.");
  pushPhase84DenyFlow("security-flow-phase87-guest-to-dmz-deny", "Guest to DMZ must be denied by default", guestZone, dmzZone, "Guest networks must remain internet-only and isolated from published service or remote-access edge segments.");
  pushPhase84DenyFlow("security-flow-phase87-general-wan-to-dmz-deny", "General WAN to DMZ must be denied by default", wideAreaNetworkZone, dmzZone, "General inbound WAN traffic is denied by default; approved published services use separate explicit review/allow flows.");

  pushPhase84DenyFlow("security-flow-phase84-guest-to-iot-deny", "Guest to IoT must be denied by default", guestZone, iotZone, "Guest networks must remain isolated from shared device networks.");
  pushPhase84DenyFlow("security-flow-phase84-guest-to-transit-deny", "Guest to WAN transit must be denied by default", guestZone, transitZone, "Guest networks should only use reviewed internet egress, not direct transit access.");
  pushPhase84DenyFlow("security-flow-phase84-wan-to-management-deny", "WAN to management must be denied by default", wideAreaNetworkZone, managementZone, "Untrusted WAN sources must not reach management-plane services.");
  pushPhase84DenyFlow("security-flow-phase84-wan-to-guest-deny", "WAN to guest must be denied by default", wideAreaNetworkZone, guestZone, "Guest networks are not inbound WAN destinations.");
  pushPhase84DenyFlow("security-flow-phase84-wan-to-iot-deny", "WAN to IoT must be denied by default", wideAreaNetworkZone, iotZone, "Shared device networks must not be externally reachable.");
  pushPhase84DenyFlow("security-flow-phase84-wan-to-transit-deny", "WAN to WAN-transit internals must be denied by default", wideAreaNetworkZone, transitZone, "Transit segments must not accept broad inbound WAN traffic.");
  pushPhase84DenyFlow("security-flow-phase84-dmz-to-internal-deny", "DMZ to internal must be denied by default", dmzZone, internalZone, "DMZ-to-internal access requires exact application exceptions, not broad reachability.");
  pushPhase84DenyFlow("security-flow-phase84-dmz-to-management-deny", "DMZ to management must be denied by default", dmzZone, managementZone, "DMZ workloads must not pivot into management-plane services.");
  pushPhase84DenyFlow("security-flow-phase84-iot-to-management-deny", "IoT to management must be denied by default", iotZone, managementZone, "Shared device networks must not reach network administration services.");
  pushPhase84DenyFlow("security-flow-phase84-transit-to-management-deny", "WAN transit to management must be denied by default", transitZone, managementZone, "WAN/cloud transit segments must not inherit management-plane access.");

  return flowInputs;
}

function addFinding(findings: SecurityPolicyFinding[], finding: SecurityPolicyFinding) {
  if (findings.some((item) => item.code === finding.code && item.detail === finding.detail)) return;
  findings.push(finding);
}

function buildPolicyReferenceFindings(model: SecurityPolicyNetworkObjectModel): SecurityPolicyFinding[] {
  const findings: SecurityPolicyFinding[] = [];
  const zoneIds = new Set(model.securityZones.map((zone) => zone.id));

  for (const policyRule of model.policyRules) {
    if (!zoneIds.has(policyRule.sourceZoneId)) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_POLICY_SOURCE_ZONE_MISSING",
        title: "Policy rule references a missing source zone",
        detail: `${policyRule.name} references source zone ${policyRule.sourceZoneId}, but that zone does not exist in the object model.`,
        affectedObjectIds: [policyRule.id, policyRule.sourceZoneId],
        remediation: "Attach every policy rule to a valid source zone before generating implementation guidance.",
      });
    }

    if (!zoneIds.has(policyRule.destinationZoneId)) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_POLICY_DESTINATION_ZONE_MISSING",
        title: "Policy rule references a missing destination zone",
        detail: `${policyRule.name} references destination zone ${policyRule.destinationZoneId}, but that zone does not exist in the object model.`,
        affectedObjectIds: [policyRule.id, policyRule.destinationZoneId],
        remediation: "Attach every policy rule to a valid destination zone before generating implementation guidance.",
      });
    }
  }

  for (const natRule of model.natRules) {
    if (!zoneIds.has(natRule.sourceZoneId)) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_NAT_SOURCE_ZONE_MISSING",
        title: "NAT rule references a missing source zone",
        detail: `${natRule.name} references source zone ${natRule.sourceZoneId}, but that zone does not exist in the object model.`,
        affectedObjectIds: [natRule.id, natRule.sourceZoneId],
        remediation: "Attach NAT intent to a valid source zone before documenting internet egress.",
      });
    }

    if (natRule.destinationZoneId && !zoneIds.has(natRule.destinationZoneId)) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_NAT_DESTINATION_ZONE_MISSING",
        title: "NAT rule references a missing destination zone",
        detail: `${natRule.name} references destination zone ${natRule.destinationZoneId}, but that zone does not exist in the object model.`,
        affectedObjectIds: [natRule.id, natRule.destinationZoneId],
        remediation: "Attach NAT destination intent to a valid zone or leave it unset for review-only NAT posture.",
      });
    }
  }

  return findings;
}

function buildFlowFindings(flowRequirements: SecurityFlowRequirement[]): SecurityPolicyFinding[] {
  return flowRequirements
    .filter((flowRequirement) => flowRequirement.state !== "satisfied" && flowRequirement.state !== "review")
    .map<SecurityPolicyFinding>((flowRequirement) => {
      const isConflict = flowRequirement.state === "conflict";
      const isMissingNat = flowRequirement.state === "missing-nat";
      const severity = isConflict || flowRequirement.severityIfMissing === "ERROR" ? "ERROR" : "WARNING";

      return {
        severity,
        code: isConflict
          ? "SECURITY_FLOW_POLICY_CONFLICT"
          : isMissingNat
            ? "SECURITY_FLOW_NAT_MISSING"
            : "SECURITY_FLOW_POLICY_MISSING",
        title: isConflict
          ? "Security flow conflicts with modeled policy"
          : isMissingNat
            ? "Security flow is missing NAT coverage"
            : "Security flow is missing explicit policy coverage",
        detail: `${flowRequirement.name}: expected ${flowRequirement.expectedAction} from ${flowRequirement.sourceZoneName} to ${flowRequirement.destinationZoneName}, observed ${flowRequirement.observedPolicyAction ?? "no matching policy"}.`,
        affectedObjectIds: [
          flowRequirement.id,
          flowRequirement.sourceZoneId,
          flowRequirement.destinationZoneId,
          ...flowRequirement.matchedPolicyRuleIds,
          ...flowRequirement.matchedNatRuleIds,
        ],
        remediation: isConflict
          ? "Correct the modeled policy action or change the stated flow requirement before treating the design as implementable."
          : isMissingNat
            ? "Add explicit NAT intent for this allowed egress flow or mark the flow as intentionally non-NAT."
            : "Add an explicit policy rule, or mark the flow as engineer-review/deferred instead of leaving the boundary implicit.",
      };
    });
}

function buildBroadPermitFindings(model: SecurityPolicyNetworkObjectModel): SecurityPolicyFinding[] {
  const findings: SecurityPolicyFinding[] = [];
  const zoneById = new Map(model.securityZones.map((zone) => [zone.id, zone]));

  for (const policyRule of model.policyRules) {
    const sourceZone = zoneById.get(policyRule.sourceZoneId);
    const destinationZone = zoneById.get(policyRule.destinationZoneId);
    if (!sourceZone || !destinationZone) continue;

    const highRiskSource = HIGH_RISK_SOURCE_ROLES.has(sourceZone.zoneRole);
    const highValueDestination = HIGH_VALUE_DESTINATION_ROLES.has(destinationZone.zoneRole);
    const broadlyPermissiveService = isBroadServiceList(policyRule.services);

    if (policyRule.action === "allow" && highRiskSource && highValueDestination && broadlyPermissiveService) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_BROAD_PERMIT_TO_TRUSTED_ZONE",
        title: "Broad permit reaches a trusted zone",
        detail: `${policyRule.name} broadly allows ${sourceZone.name} to reach ${destinationZone.name}.`,
        affectedObjectIds: [policyRule.id, sourceZone.id, destinationZone.id],
        remediation: "Replace broad permits with application-specific allow rules, explicit deny defaults, and logging requirements.",
      });
    }

    if (policyRule.action === "allow" && sourceZone.zoneRole === "wan" && destinationZone.zoneRole !== "dmz") {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_WAN_INBOUND_NOT_DMZ",
        title: "WAN inbound permit bypasses DMZ boundary",
        detail: `${policyRule.name} allows WAN-originated traffic to ${destinationZone.name} instead of a DMZ/review boundary.`,
        affectedObjectIds: [policyRule.id, sourceZone.id, destinationZone.id],
        remediation: "Model inbound publishing through a DMZ/application boundary and attach destination NAT/static publishing details before implementation.",
      });
    }
  }

  return findings;
}

function buildPolicyMatrix(params: {
  securityZones: SecurityZone[];
  policyRules: SequencedPolicyRule[];
  flowRequirements: SecurityFlowRequirement[];
}): SecurityPolicyMatrixRow[] {
  const rows: SecurityPolicyMatrixRow[] = [];

  for (const sourceZone of params.securityZones) {
    for (const destinationZone of params.securityZones) {
      const pairPolicyRules = params.policyRules.filter((rule) => rule.sourceZoneId === sourceZone.id && rule.destinationZoneId === destinationZone.id);
      const pairFlowRequirements = params.flowRequirements.filter((flow) => flow.sourceZoneId === sourceZone.id && flow.destinationZoneId === destinationZone.id);
      const blockedFlow = pairFlowRequirements.some((flow) => flow.state === "conflict" || (flow.state === "missing-policy" && flow.severityIfMissing === "ERROR"));
      const reviewFlow = pairFlowRequirements.some((flow) => flow.state === "missing-policy" || flow.state === "missing-nat" || flow.state === "review");
      const defaultPosture = defaultZonePairPosture(sourceZone, destinationZone);
      const missingExplicitDeny = defaultPosture === "deny" && !pairPolicyRules.some((rule) => rule.action === "deny");

      rows.push({
        id: `security-policy-matrix-${normalizeIdentifierSegment(sourceZone.id)}-to-${normalizeIdentifierSegment(destinationZone.id)}`,
        sourceZoneId: sourceZone.id,
        sourceZoneName: sourceZone.name,
        sourceZoneRole: sourceZone.zoneRole,
        destinationZoneId: destinationZone.id,
        destinationZoneName: destinationZone.name,
        destinationZoneRole: destinationZone.zoneRole,
        defaultPosture,
        explicitPolicyRuleIds: pairPolicyRules.map((rule) => rule.id).sort(),
        requiredFlowIds: pairFlowRequirements.map((flow) => flow.id).sort(),
        natRequiredFlowIds: pairFlowRequirements.filter((flow) => flow.natRequired).map((flow) => flow.id).sort(),
        state: blockedFlow || missingExplicitDeny ? "blocked" : reviewFlow || pairFlowRequirements.length === 0 || pairPolicyRules.length === 0 ? "review" : "ready",
        notes: [
          `Default posture for ${sourceZone.name} to ${destinationZone.name} is ${defaultPosture}.`,
          pairPolicyRules.length > 0
            ? `${pairPolicyRules.length} explicit policy rule(s) model this zone pair.`
            : "No explicit policy rule models this zone pair.",
          pairFlowRequirements.length > 0
            ? `${pairFlowRequirements.length} required flow(s) reference this zone pair.`
            : "No required flow currently references this zone pair; keep this as review rather than implied allow.",
          missingExplicitDeny
            ? "Default-deny posture is expected, but no explicit deny rule is modeled for this zone pair."
            : "No missing explicit-deny gap was detected for this matrix row.",
        ],
      });
    }
  }

  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function buildRuleOrderReviews(params: {
  securityZones: SecurityZone[];
  policyRules: SequencedPolicyRule[];
}): SecurityRuleOrderReview[] {
  const zoneById = new Map(params.securityZones.map((zone) => [zone.id, zone]));
  const reviews: SecurityRuleOrderReview[] = [];

  for (const rule of params.policyRules) {
    const sourceZone = zoneById.get(rule.sourceZoneId);
    const destinationZone = zoneById.get(rule.destinationZoneId);
    if (!sourceZone || !destinationZone) continue;

    const earlierRules = params.policyRules.filter((candidate) => candidate.sequence < rule.sequence && candidate.sourceZoneId === rule.sourceZoneId && candidate.destinationZoneId === rule.destinationZoneId);
    const laterRules = params.policyRules.filter((candidate) => candidate.sequence > rule.sequence && candidate.sourceZoneId === rule.sourceZoneId && candidate.destinationZoneId === rule.destinationZoneId);
    const shadowedByRuleIds = earlierRules
      .filter((candidate) => servicesCoverRule(candidate.services, rule.services) && candidate.action !== rule.action)
      .map((candidate) => candidate.id)
      .sort();
    const shadowsRuleIds = laterRules
      .filter((candidate) => servicesCoverRule(rule.services, candidate.services) && candidate.action !== rule.action)
      .map((candidate) => candidate.id)
      .sort();
    const broadMatch = isBroadServiceList(rule.services);
    const loggingRequired = requiresLogging(sourceZone, destinationZone, rule.action, rule.services);
    const boundaryIsRisky = isHighRiskBoundary(sourceZone, destinationZone) || isManagementBoundary(sourceZone, destinationZone, rule.services);
    const state: SecurityRuleOrderReview["state"] = shadowedByRuleIds.length > 0
      ? "blocked"
      : broadMatch || shadowsRuleIds.length > 0 || loggingRequired || boundaryIsRisky
        ? "review"
        : "ready";

    reviews.push({
      id: `security-rule-order-${normalizeIdentifierSegment(rule.id)}`,
      sequence: rule.sequence,
      ruleId: rule.id,
      ruleName: rule.name,
      sourceZoneId: sourceZone.id,
      sourceZoneName: sourceZone.name,
      destinationZoneId: destinationZone.id,
      destinationZoneName: destinationZone.name,
      action: rule.action,
      services: normalizeServiceNames(rule.services),
      broadMatch,
      shadowsRuleIds,
      shadowedByRuleIds,
      loggingRequired,
      state,
      notes: [
        `Rule is evaluated at neutral sequence ${rule.sequence}; vendor-specific ordering still requires implementation review.`,
        broadMatch ? "Rule uses broad service matching and must not become a blanket vendor permit." : "Rule services are explicitly scoped.",
        shadowedByRuleIds.length > 0
          ? `Rule is shadowed by earlier conflicting rule(s): ${shadowedByRuleIds.join(", ")}.`
          : "No earlier contradictory rule shadows this rule.",
        shadowsRuleIds.length > 0
          ? `Rule may shadow later contradictory rule(s): ${shadowsRuleIds.join(", ")}.`
          : "No later contradictory rule is shadowed by this rule.",
        loggingRequired ? "Logging evidence should be required for this rule boundary." : "No special logging requirement was inferred.",
      ],
    });
  }

  return reviews.sort((left, right) => left.sequence - right.sequence);
}

function natRuleIntendsToCoverFlow(natRule: NatRule, flow: SecurityFlowRequirement) {
  if (flow.sourceZoneId !== natRule.sourceZoneId) return false;
  if (natRule.destinationZoneId && flow.destinationZoneId !== natRule.destinationZoneId) return false;
  return true;
}

function natRuleHasConcreteTranslation(natRule: NatRule) {
  return natRule.translatedAddressMode === "interface-overload" || natRule.translatedAddressMode === "static" || natRule.translatedAddressMode === "pool";
}

function evaluateNatReviewState(params: {
  natRule: NatRule;
  sourceZone?: SecurityZone;
  destinationZone?: SecurityZone;
  coveredFlowCount: number;
}): SecurityNatReview["state"] {
  const { natRule, sourceZone, destinationZone, coveredFlowCount } = params;
  const destinationZoneMissing = Boolean(natRule.destinationZoneId && !destinationZone);

  if (!sourceZone || destinationZoneMissing) return "blocked";

  if (natRule.status === "not-required") {
    return natRule.translatedAddressMode === "not-required" ? "ready" : "review";
  }

  if (natRule.status === "required" && !natRuleHasConcreteTranslation(natRule)) {
    return "blocked";
  }

  if (natRule.status === "required" && coveredFlowCount > 0) return "ready";

  if (natRule.status === "review" || natRule.translatedAddressMode === "review" || coveredFlowCount === 0) return "review";

  return "ready";
}

function buildNatReviews(params: {
  natRules: NatRule[];
  securityZones: SecurityZone[];
  flowRequirements: SecurityFlowRequirement[];
}): SecurityNatReview[] {
  const zoneById = new Map(params.securityZones.map((zone) => [zone.id, zone]));
  const natRequiredFlows = params.flowRequirements.filter((flow) => flow.natRequired);

  return params.natRules
    .map((natRule) => {
      const sourceZone = zoneById.get(natRule.sourceZoneId);
      const destinationZone = natRule.destinationZoneId ? zoneById.get(natRule.destinationZoneId) : undefined;
      const coveredFlows = natRequiredFlows.filter((flow) => flow.matchedNatRuleIds.includes(natRule.id));
      const intendedFlows = natRequiredFlows.filter((flow) => natRuleIntendsToCoverFlow(natRule, flow));
      const missingFlows = intendedFlows.filter((flow) => !flow.matchedNatRuleIds.includes(natRule.id));
      const state = evaluateNatReviewState({
        natRule,
        sourceZone,
        destinationZone,
        coveredFlowCount: coveredFlows.length,
      });

      return {
        id: `security-nat-review-${normalizeIdentifierSegment(natRule.id)}`,
        natRuleId: natRule.id,
        natRuleName: natRule.name,
        sourceZoneId: natRule.sourceZoneId,
        sourceZoneName: sourceZone?.name ?? natRule.sourceZoneId,
        destinationZoneId: natRule.destinationZoneId,
        destinationZoneName: destinationZone?.name,
        translatedAddressMode: natRule.translatedAddressMode,
        status: natRule.status,
        coveredFlowRequirementIds: coveredFlows.map((flow) => flow.id).sort(),
        missingFlowRequirementIds: missingFlows.map((flow) => flow.id).sort(),
        state,
        notes: [
          sourceZone ? `NAT source zone is ${sourceZone.name}.` : "NAT source zone is missing from the object model.",
          destinationZone ? `NAT destination zone is ${destinationZone.name}.` : natRule.destinationZoneId ? "NAT destination zone is missing from the object model." : "NAT destination is intentionally broad and must be reviewed against all NAT-required flows from the source zone.",
          coveredFlows.length > 0
            ? `${coveredFlows.length} NAT-required flow(s) are covered by this rule.`
            : "No NAT-required flow is currently covered by this rule.",
          missingFlows.length > 0
            ? `${missingFlows.length} intended NAT-required flow(s) are still not covered by this rule.`
            : "No intended NAT-required flow gap was detected for this NAT rule.",
          natRule.status === "required" && state === "ready"
            ? "Required NAT is ready because the rule has valid zones, concrete translation mode, and covered NAT-required flow evidence."
            : natRule.status === "required" && state === "blocked"
              ? "Required NAT is blocked because zone references or translation mode are unresolved."
              : natRule.status === "review"
                ? "NAT rule is still in review state and should not be translated as final implementation."
                : `NAT rule status is ${natRule.status}.`,
        ],
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function buildImplicitDenyFindings(params: {
  policyMatrix: SecurityPolicyMatrixRow[];
  policyRules: SequencedPolicyRule[];
}): SecurityPolicyFinding[] {
  const findings: SecurityPolicyFinding[] = [];
  const policyRuleById = new Map(params.policyRules.map((rule) => [rule.id, rule]));

  for (const row of params.policyMatrix) {
    if (row.defaultPosture !== "deny") continue;

    const explicitRules = row.explicitPolicyRuleIds
      .map((ruleId) => policyRuleById.get(ruleId))
      .filter((rule): rule is SequencedPolicyRule => Boolean(rule));
    const explicitDenyRules = explicitRules.filter((rule) => rule.action === "deny");
    const explicitAllowRules = explicitRules.filter((rule) => rule.action === "allow");

    if (explicitDenyRules.length === 0) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_IMPLICIT_DENY_NOT_MODELED",
        title: "Expected default deny is not explicitly modeled",
        detail: explicitRules.length > 0
          ? `${row.sourceZoneName} to ${row.destinationZoneName} expects deny posture and has explicit rule(s), but none of them are deny rules.`
          : `${row.sourceZoneName} to ${row.destinationZoneName} expects deny posture, but no explicit policy rule is modeled.`,
        affectedObjectIds: [row.sourceZoneId, row.destinationZoneId, ...row.requiredFlowIds, ...row.explicitPolicyRuleIds],
        remediation: "Add an explicit deny boundary for this zone pair so future vendor translation cannot accidentally rely on undocumented implicit behavior or permissive allow rules.",
      });
    }

    if (explicitAllowRules.length > 0 && explicitDenyRules.length === 0) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_DEFAULT_DENY_WEAKENED_BY_ALLOW",
        title: "Default-deny boundary is weakened by allow-only policy",
        detail: `${row.sourceZoneName} to ${row.destinationZoneName} expects deny posture, but modeled allow rule(s) exist without an explicit deny guardrail: ${explicitAllowRules.map((rule) => rule.id).join(", ")}.`,
        affectedObjectIds: [row.sourceZoneId, row.destinationZoneId, ...explicitAllowRules.map((rule) => rule.id)],
        remediation: "Replace broad or premature allow rules with scoped flow intent and add an explicit deny guardrail before implementation planning consumes this boundary.",
      });
    }
  }

  return findings;
}

function buildRuleOrderFindings(ruleOrderReviews: SecurityRuleOrderReview[]): SecurityPolicyFinding[] {
  const findings: SecurityPolicyFinding[] = [];

  for (const review of ruleOrderReviews) {
    if (review.shadowedByRuleIds.length > 0) {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_RULE_SHADOWED_BY_EARLIER_RULE",
        title: "Policy rule is shadowed by an earlier contradictory rule",
        detail: `${review.ruleName} is shadowed by earlier rule(s): ${review.shadowedByRuleIds.join(", ")}.`,
        affectedObjectIds: [review.ruleId, ...review.shadowedByRuleIds],
        remediation: "Reorder or split the policy rules before producing implementation guidance.",
      });
    }

    if (review.shadowsRuleIds.length > 0) {
      addFinding(findings, {
        severity: "WARNING",
        code: "SECURITY_RULE_SHADOWS_LATER_RULE",
        title: "Policy rule may shadow a later contradictory rule",
        detail: `${review.ruleName} may shadow later rule(s): ${review.shadowsRuleIds.join(", ")}.`,
        affectedObjectIds: [review.ruleId, ...review.shadowsRuleIds],
        remediation: "Review rule ordering and replace broad rules with scoped service/address objects where possible.",
      });
    }

    if (review.broadMatch && review.action === "allow") {
      addFinding(findings, {
        severity: "WARNING",
        code: "SECURITY_RULE_BROAD_ALLOW_REQUIRES_REVIEW",
        title: "Broad allow rule requires implementation review",
        detail: `${review.ruleName} allows broad service matching from ${review.sourceZoneName} to ${review.destinationZoneName}.`,
        affectedObjectIds: [review.ruleId, review.sourceZoneId, review.destinationZoneId],
        remediation: "Replace broad allow rules with explicit service groups and application ownership before vendor translation.",
      });
    }
  }

  return findings;
}

function buildLoggingFindings(flowRequirements: SecurityFlowRequirement[], ruleOrderReviews: SecurityRuleOrderReview[]): SecurityPolicyFinding[] {
  const findings: SecurityPolicyFinding[] = [];

  for (const flow of flowRequirements) {
    if (!flow.loggingRequired) continue;
    if (flow.matchedPolicyRuleIds.length === 0) continue;
    const matchingReview = ruleOrderReviews.find((review) => flow.matchedPolicyRuleIds.includes(review.ruleId) && review.loggingRequired);
    if (matchingReview) continue;

    addFinding(findings, {
      severity: "WARNING",
      code: "SECURITY_LOGGING_EVIDENCE_GAP",
      title: "Security boundary needs logging evidence",
      detail: `${flow.name} is a sensitive boundary but no matching rule review explicitly requires logging evidence.`,
      affectedObjectIds: [flow.id, ...flow.matchedPolicyRuleIds],
      remediation: "Mark the implementation step as requiring policy logging, hit-count validation, or equivalent evidence.",
    });
  }

  return findings;
}

function buildNatFindings(natReviews: SecurityNatReview[], flowRequirements: SecurityFlowRequirement[]): SecurityPolicyFinding[] {
  const findings: SecurityPolicyFinding[] = [];

  for (const review of natReviews) {
    if (review.state === "blocked") {
      addFinding(findings, {
        severity: "ERROR",
        code: "SECURITY_NAT_REVIEW_BLOCKED",
        title: "NAT review is blocked",
        detail: `${review.natRuleName} cannot be treated as ready because its source/destination zone or required status is unresolved.`,
        affectedObjectIds: [review.natRuleId, review.sourceZoneId, ...(review.destinationZoneId ? [review.destinationZoneId] : [])],
        remediation: "Resolve NAT zone references and decide whether the NAT rule is required, review-only, or not required.",
      });
    }

    if (review.coveredFlowRequirementIds.length === 0 && review.status !== "not-required") {
      addFinding(findings, {
        severity: "WARNING",
        code: "SECURITY_NAT_RULE_WITHOUT_COVERED_FLOW",
        title: "NAT rule has no covered flow requirement",
        detail: `${review.natRuleName} is modeled but no NAT-required security flow currently depends on it.`,
        affectedObjectIds: [review.natRuleId],
        remediation: "Confirm the NAT rule is still needed or remove it from the neutral implementation plan.",
      });
    }
  }

  for (const flow of flowRequirements.filter((item) => item.natRequired && item.matchedNatRuleIds.length === 0)) {
    addFinding(findings, {
      severity: flow.severityIfMissing,
      code: "SECURITY_NAT_REQUIRED_FLOW_UNCOVERED",
      title: "NAT-required flow has no NAT rule",
      detail: `${flow.name} requires NAT from ${flow.sourceZoneName} to ${flow.destinationZoneName}, but no NAT rule covers it.`,
      affectedObjectIds: [flow.id, flow.sourceZoneId, flow.destinationZoneId],
      remediation: "Add NAT intent or mark the flow as deferred/review before implementation guidance is produced.",
    });
  }

  return findings;
}

function buildPolicyReadiness(params: {
  blockingFindingCount: number;
  conflictingPolicyCount: number;
  missingPolicyCount: number;
  missingNatCount: number;
  shadowedRuleCount: number;
  implicitDenyGapCount: number;
}) {
  if (params.blockingFindingCount > 0 || params.conflictingPolicyCount > 0 || params.shadowedRuleCount > 0 || params.implicitDenyGapCount > 0) {
    return "blocked" as const;
  }
  if (params.missingPolicyCount > 0 || params.missingNatCount > 0) return "review" as const;
  return "ready" as const;
}

export function buildSecurityPolicyFlowModel(params: {
  networkObjectModel: SecurityPolicyNetworkObjectModel;
  routingSegmentation: RoutingSegmentationModel;
  requirementsJson?: string | null;
}): SecurityPolicyFlowModel {
  const { networkObjectModel, routingSegmentation } = params;
  const requirements = parseRequirementsJson(params.requirementsJson);
  const policyRules = networkObjectModel.policyRules.map<SequencedPolicyRule>((rule, index) => ({ ...rule, sequence: index + 10 }));
  const baseFlowInputs: BaseFlowRequirementInput[] = [];

  for (const expectation of routingSegmentation.segmentationExpectations) {
    const flowInput = flowInputFromSegmentationExpectation(expectation, networkObjectModel.securityZones);
    if (flowInput) baseFlowInputs.push(flowInput);
  }

  baseFlowInputs.push(...buildAdditionalFlowInputs(networkObjectModel));
  baseFlowInputs.push(...buildRequirementDrivenFlowInputs(networkObjectModel, requirements));

  const dedupedFlowInputs = dedupeFlowInputs(baseFlowInputs);

  const flowRequirements = dedupedFlowInputs
    .map((flowInput) => createFlowRequirement({
      flowInput,
      policyRules,
      natRules: networkObjectModel.natRules,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const serviceGroups = buildServiceGroups(dedupedFlowInputs, networkObjectModel.policyRules);
  const serviceObjects = buildServiceObjects(dedupedFlowInputs, networkObjectModel.policyRules, serviceGroups);
  const policyMatrix = buildPolicyMatrix({
    securityZones: networkObjectModel.securityZones,
    policyRules,
    flowRequirements,
  });
  const ruleOrderReviews = buildRuleOrderReviews({
    securityZones: networkObjectModel.securityZones,
    policyRules,
  });
  const natReviews = buildNatReviews({
    natRules: networkObjectModel.natRules,
    securityZones: networkObjectModel.securityZones,
    flowRequirements,
  });

  const findings = [
    ...buildPolicyReferenceFindings(networkObjectModel),
    ...buildFlowFindings(flowRequirements),
    ...buildBroadPermitFindings(networkObjectModel),
    ...buildImplicitDenyFindings({ policyMatrix, policyRules }),
    ...buildRuleOrderFindings(ruleOrderReviews),
    ...buildLoggingFindings(flowRequirements, ruleOrderReviews),
    ...buildNatFindings(natReviews, flowRequirements),
  ].sort((left, right) => `${left.severity}-${left.code}-${left.detail}`.localeCompare(`${right.severity}-${right.code}-${right.detail}`));

  const missingPolicyCount = flowRequirements.filter((flowRequirement) => flowRequirement.state === "missing-policy").length;
  const conflictingPolicyCount = flowRequirements.filter((flowRequirement) => flowRequirement.state === "conflict").length;
  const missingNatCount = flowRequirements.filter((flowRequirement) => flowRequirement.state === "missing-nat").length;
  const blockingFindingCount = findings.filter((finding) => finding.severity === "ERROR").length;
  const broadPermitFindingCount = findings.filter((finding) => finding.code === "SECURITY_BROAD_PERMIT_TO_TRUSTED_ZONE" || finding.code === "SECURITY_RULE_BROAD_ALLOW_REQUIRES_REVIEW").length;
  const shadowedRuleCount = ruleOrderReviews.filter((review) => review.shadowedByRuleIds.length > 0).length;
  const implicitDenyGapCount = findings.filter((finding) => finding.code === "SECURITY_IMPLICIT_DENY_NOT_MODELED").length;
  const loggingGapCount = findings.filter((finding) => finding.code === "SECURITY_LOGGING_EVIDENCE_GAP").length;
  const policyReadiness = buildPolicyReadiness({
    blockingFindingCount,
    conflictingPolicyCount,
    missingPolicyCount,
    missingNatCount,
    shadowedRuleCount,
    implicitDenyGapCount,
  });

  return {
    summary: {
      serviceObjectCount: serviceObjects.length,
      serviceGroupCount: serviceGroups.length,
      policyMatrixRowCount: policyMatrix.length,
      ruleOrderReviewCount: ruleOrderReviews.length,
      natReviewCount: natReviews.length,
      flowRequirementCount: flowRequirements.length,
      satisfiedFlowCount: flowRequirements.filter((flowRequirement) => flowRequirement.state === "satisfied").length,
      missingPolicyCount,
      conflictingPolicyCount,
      missingNatCount,
      broadPermitFindingCount,
      shadowedRuleCount,
      implicitDenyGapCount,
      loggingGapCount,
      findingCount: findings.length,
      blockingFindingCount,
      policyReadiness,
      natReadiness: missingNatCount > 0 || natReviews.some((review) => review.state === "blocked") ? "blocked" : natReviews.some((review) => review.state === "review") ? "review" : "ready",
      notes: [
        "Captured requirements feed the security-flow model so guest, management, remote access, cloud/hybrid, voice, IoT, camera, printer, monitoring, and compliance selections become reviewable policy consequences.",
        "The engine exposes requirement keys on generated flows, making selected requirements traceable into zone-to-zone policy, NAT, logging, and blocker/review evidence.",
        "This remains vendor-neutral design intent; final firewall syntax and platform-specific command generation still require implementation review.",
      ],
    },
    serviceObjects,
    serviceGroups,
    policyMatrix,
    ruleOrderReviews,
    natReviews,
    flowRequirements,
    findings,
  };
}
