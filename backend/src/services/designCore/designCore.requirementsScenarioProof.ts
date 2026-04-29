import { parseJsonMap } from "./designCore.helpers.js";
import type {
  RequirementsImpactClosureSummary,
  RequirementsScenarioProofSignal,
  RequirementsScenarioProofSummary,
  NetworkObjectModel,
} from "../designCore.types.js";

type ScenarioProofInput = {
  requirementsJson?: string | null;
  siteCount: number;
  vlanCount: number;
  requirementsImpactClosure: RequirementsImpactClosureSummary;
  networkObjectModel?: NetworkObjectModel;
};

function requirementValue(requirements: Record<string, unknown>, key: string) {
  const value = requirements[key];
  if (typeof value === "boolean") return value ? "true" : "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function requirementBoolean(requirements: Record<string, unknown>, key: string) {
  return requirements[key] === true || String(requirements[key] ?? "").toLowerCase() === "true";
}

function requirementNumber(requirements: Record<string, unknown>, key: string) {
  const value = requirements[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mentions(requirements: Record<string, unknown>, key: string, tokens: string[]) {
  const value = requirementValue(requirements, key).toLowerCase();
  return tokens.some((token) => value.includes(token));
}

function fieldOutcomes(closure: RequirementsImpactClosureSummary, keys: string[]) {
  const keySet = new Set(keys);
  return closure.fieldOutcomes.filter((item) => keySet.has(item.key) && item.captured);
}

function evidenceForKeys(closure: RequirementsImpactClosureSummary, keys: string[]) {
  return Array.from(new Set(fieldOutcomes(closure, keys).flatMap((item) => item.concreteOutputs)));
}

function hasEvidence(closure: RequirementsImpactClosureSummary, keys: string[], fragments: string[]) {
  const evidence = evidenceForKeys(closure, keys).map((item) => item.toLowerCase());
  return fragments.some((fragment) => evidence.some((item) => item.includes(fragment.toLowerCase())));
}

function flowCountForKeys(model: NetworkObjectModel | undefined, keys: string[]) {
  const keySet = new Set(keys);
  return (model?.securityPolicyFlow?.flowRequirements ?? []).filter((flow) => flow.requirementKeys?.some((key) => keySet.has(key))).length;
}

function zoneCount(model: NetworkObjectModel | undefined) {
  return model?.securityZones?.length ?? 0;
}

function addSignal(signals: RequirementsScenarioProofSignal[], signal: RequirementsScenarioProofSignal | null) {
  if (signal) signals.push(signal);
}

function buildSignal(
  closure: RequirementsImpactClosureSummary,
  model: NetworkObjectModel | undefined,
  definition: {
    id: string;
    label: string;
    requirementKeys: string[];
    expectedEvidence: string[];
    concreteFragments?: string[];
    flowFragments?: boolean;
    objectCheck?: () => string[];
    severity: RequirementsScenarioProofSignal["severity"];
  },
): RequirementsScenarioProofSignal {
  const evidence = evidenceForKeys(closure, definition.requirementKeys);
  const objectEvidence = definition.objectCheck ? definition.objectCheck() : [];
  const flowHits = definition.flowFragments ? flowCountForKeys(model, definition.requirementKeys) : 0;
  if (flowHits > 0) evidence.push(`${flowHits} security-flow consequence${flowHits === 1 ? "" : "s"}`);
  evidence.push(...objectEvidence);

  const requiredFragments = definition.concreteFragments ?? [];
  const fragmentPass = requiredFragments.length === 0 || hasEvidence(closure, definition.requirementKeys, requiredFragments);
  const flowPass = !definition.flowFragments || flowHits > 0;
  const objectPass = !definition.objectCheck || objectEvidence.length > 0;
  const passed = fragmentPass && flowPass && objectPass;
  const missingEvidence: string[] = [];
  if (!fragmentPass) missingEvidence.push(`Expected one of: ${requiredFragments.join(", ")}`);
  if (!flowPass) missingEvidence.push("Expected requirement-linked security-flow consequence");
  if (!objectPass) missingEvidence.push("Expected object-model evidence");

  return {
    id: definition.id,
    label: definition.label,
    requirementKeys: definition.requirementKeys,
    expectedEvidence: definition.expectedEvidence,
    passed,
    evidence: Array.from(new Set(evidence)),
    missingEvidence,
    severity: definition.severity,
  };
}

export function buildRequirementsScenarioProofSummary(input: ScenarioProofInput): RequirementsScenarioProofSummary {
  const requirements = parseJsonMap(input.requirementsJson);
  const closure = input.requirementsImpactClosure;
  const model = input.networkObjectModel;
  const signals: RequirementsScenarioProofSignal[] = [];
  const siteRequirementCount = Math.max(1, requirementNumber(requirements, "siteCount") || input.siteCount || 1);
  const multiSite = siteRequirementCount > 1;
  const cloudOrHybrid = requirementBoolean(requirements, "cloudConnected")
    || mentions(requirements, "environmentType", ["cloud", "hybrid"])
    || mentions(requirements, "cloudConnectivity", ["vpn", "express", "direct", "private", "cloud"]);
  const sharedDevice = requirementBoolean(requirements, "printers")
    || requirementBoolean(requirements, "iot")
    || requirementBoolean(requirements, "cameras")
    || requirementNumber(requirements, "printerCount") > 0
    || requirementNumber(requirements, "iotDeviceCount") > 0
    || requirementNumber(requirements, "cameraCount") > 0;
  const voice = requirementBoolean(requirements, "voice") || requirementNumber(requirements, "phoneCount") > 0;
  const operations = Boolean(requirementValue(requirements, "monitoringModel"))
    || Boolean(requirementValue(requirements, "loggingModel"))
    || Boolean(requirementValue(requirements, "backupPolicy"))
    || mentions(requirements, "complianceProfile", ["pci", "hipaa", "sox", "regulated", "compliance"]);

  addSignal(signals, buildSignal(closure, model, {
    id: "scenario-proof-user-capacity",
    label: "User population drives a user access segment and addressing row",
    requirementKeys: ["usersPerSite", "wiredWirelessMix", "primaryGoal"],
    expectedEvidence: ["USERS segment", "addressing row", "host demand"],
    concreteFragments: ["VLAN/segment row"],
    severity: "blocker",
  }));

  addSignal(signals, buildSignal(closure, model, {
    id: "scenario-proof-site-count",
    label: multiSite ? "Multi-site requirement creates multiple sites and WAN intent" : "Site requirement creates a concrete site scope",
    requirementKeys: multiSite ? ["siteCount", "internetModel", "interSiteTrafficModel"] : ["siteCount", "planningFor", "environmentType"],
    expectedEvidence: multiSite ? ["materialized site records", "WAN/transit evidence"] : ["materialized site record"],
    concreteFragments: multiSite ? ["materialized site", "VLAN/segment row"] : ["materialized site"],
    objectCheck: multiSite ? () => {
      const routeIntents = model?.routingSegmentation?.routeIntents?.length ?? 0;
      const wanLinks = model?.links?.filter((link) => String(link.linkRole ?? link.name ?? "").toLowerCase().includes("wan")).length ?? 0;
      const hits: string[] = [];
      if (routeIntents > 0) hits.push(`${routeIntents} route intent(s)`);
      if (wanLinks > 0) hits.push(`${wanLinks} WAN link object(s)`);
      return hits;
    } : undefined,
    severity: "blocker",
  }));

  if (requirementBoolean(requirements, "guestWifi")) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-guest-isolation",
      label: "Guest access creates guest segment and default-deny internal policy",
      requirementKeys: ["guestWifi", "guestPolicy", "trustBoundaryModel", "securityPosture"],
      expectedEvidence: ["GUEST segment", "guest-to-internal deny flow"],
      concreteFragments: ["VLAN/segment row"],
      flowFragments: true,
      severity: "blocker",
    }));
  }

  if (requirementBoolean(requirements, "management") || Boolean(requirementValue(requirements, "managementAccess")) || Boolean(requirementValue(requirements, "managementIpPolicy"))) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-management-plane",
      label: "Management requirement creates management segment and scoped admin flow",
      requirementKeys: ["management", "managementAccess", "managementIpPolicy", "adminBoundary"],
      expectedEvidence: ["MANAGEMENT segment", "admin-to-management review flow", "management interfaces"],
      concreteFragments: ["VLAN/segment row"],
      flowFragments: true,
      objectCheck: () => {
        const interfaces = model?.interfaces?.filter((iface) => String(iface.interfaceRole ?? iface.name ?? "").toLowerCase().includes("management")).length ?? 0;
        return interfaces > 0 ? [`${interfaces} management interface object(s)`] : [];
      },
      severity: "blocker",
    }));
  }

  if (requirementBoolean(requirements, "remoteAccess")) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-remote-access",
      label: "Remote access creates a reviewed VPN/edge path instead of broad trust",
      requirementKeys: ["remoteAccess", "remoteAccessMethod", "identityModel", "securityPosture"],
      expectedEvidence: ["REMOTE-ACCESS segment", "WAN-to-remote-edge review flow", "remote-edge-to-internal review flow"],
      concreteFragments: ["VLAN/segment row"],
      flowFragments: true,
      severity: "blocker",
    }));
  }

  if (cloudOrHybrid) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-cloud-boundary",
      label: "Cloud/hybrid requirement creates cloud edge and reviewed cloud reachability",
      requirementKeys: ["cloudConnected", "environmentType", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel", "cloudTrafficBoundary"],
      expectedEvidence: ["CLOUD-EDGE segment", "cloud/WAN boundary", "internal-to-cloud review flow"],
      concreteFragments: ["VLAN/segment row", "cloud/WAN boundary"],
      flowFragments: true,
      severity: "blocker",
    }));
  }

  if (voice) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-voice-qos",
      label: "Voice requirement creates voice segment and QoS/call-control review",
      requirementKeys: ["voice", "phoneCount", "voiceQos", "qosModel", "latencySensitivity"],
      expectedEvidence: ["VOICE segment", "voice services/QoS review flow"],
      concreteFragments: ["VLAN/segment row"],
      flowFragments: true,
      severity: "review",
    }));
  }

  if (sharedDevice) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-shared-device-isolation",
      label: "Printers, cameras, and IoT are treated as restricted shared-device networks",
      requirementKeys: ["printers", "printerCount", "iot", "iotDeviceCount", "cameras", "cameraCount", "trustBoundaryModel", "securityPosture"],
      expectedEvidence: ["shared-device VLAN/segment", "default-deny into trusted internal networks", "scoped trusted-access review"],
      concreteFragments: ["VLAN/segment row"],
      flowFragments: true,
      severity: "blocker",
    }));
  }

  if (operations) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-operations-plane",
      label: "Monitoring, logging, backup, or compliance requirements create operations-plane review evidence",
      requirementKeys: ["complianceProfile", "monitoringModel", "loggingModel", "backupPolicy", "operationsOwnerModel", "management"],
      expectedEvidence: ["OPERATIONS or management evidence", "operations tooling flow", "review/handoff evidence"],
      concreteFragments: ["VLAN/segment row", "Design review evidence"],
      flowFragments: true,
      severity: "review",
    }));
  }

  if (requirementBoolean(requirements, "dualIsp") || Boolean(requirementValue(requirements, "resilienceTarget")) || Boolean(requirementValue(requirements, "outageTolerance"))) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-resilience-wan",
      label: "Dual-ISP/resilience requirement creates WAN/transit or implementation review evidence",
      requirementKeys: ["dualIsp", "resilienceTarget", "outageTolerance", "internetModel"],
      expectedEvidence: ["WAN-TRANSIT segment", "route/WAN evidence", "review notes for failover"],
      concreteFragments: ["VLAN/segment row", "Design review evidence"],
      objectCheck: () => {
        const routeIntents = model?.routingSegmentation?.routeIntents?.length ?? 0;
        return routeIntents > 0 ? [`${routeIntents} route intent(s)`] : [];
      },
      severity: "review",
    }));
  }

  if (mentions(requirements, "primaryGoal", ["security", "segmentation"]) || Boolean(requirementValue(requirements, "securityPosture")) || Boolean(requirementValue(requirements, "trustBoundaryModel"))) {
    addSignal(signals, buildSignal(closure, model, {
      id: "scenario-proof-security-segmentation",
      label: "Security/segmentation goal produces zones and policy-flow consequences",
      requirementKeys: ["primaryGoal", "securityPosture", "trustBoundaryModel", "guestWifi", "management", "remoteAccess"],
      expectedEvidence: ["security zones", "policy/flow consequences", "blocked/review findings"],
      flowFragments: true,
      objectCheck: () => {
        const count = zoneCount(model);
        return count > 0 ? [`${count} security zone object(s)`] : [];
      },
      severity: "blocker",
    }));
  }

  const passedSignalCount = signals.filter((signal) => signal.passed).length;
  const missingSignals = signals.filter((signal) => !signal.passed);
  const blockerCount = missingSignals.filter((signal) => signal.severity === "blocker").length;
  const reviewCount = missingSignals.filter((signal) => signal.severity === "review").length;
  const selectedDrivers = Object.keys(requirements)
    .filter((key) => requirementValue(requirements, key))
    .sort();

  const status: RequirementsScenarioProofSummary["status"] = blockerCount > 0 ? "blocked" : reviewCount > 0 ? "review-required" : "passed";
  const scenarioName = multiSite
    ? cloudOrHybrid
      ? "multi-site hybrid/cloud scenario"
      : "multi-site business scenario"
    : cloudOrHybrid
      ? "single-site hybrid/cloud scenario"
      : "single-site business scenario";

  return {
    status,
    scenarioName,
    selectedDrivers,
    expectedSignalCount: signals.length,
    passedSignalCount,
    missingSignalCount: missingSignals.length,
    blockerCount,
    reviewCount,
    signals,
    notes: [
      "This proof is generated from the actual saved requirement selections and the backend design-core evidence model.",
      "It is intentionally strict: selected high-impact requirements must show up as concrete sites/VLANs, security-flow consequences, or object-model evidence.",
      status === "passed"
        ? "The selected scenario has visible backend evidence for its high-impact requirement drivers."
        : "One or more selected scenario drivers still need stronger concrete evidence before the design can be treated as complete.",
    ],
  };
}
