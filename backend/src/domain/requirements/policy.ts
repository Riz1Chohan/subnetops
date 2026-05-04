import {
  REQUIREMENT_IMPACT_REGISTRY,
  requirementValueToString,
  type RequirementImpactRegistryItem,
} from "./impact-registry.js";

export const REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT_VERSION = "V1_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT" as const;

export type RequirementMaterializationDisposition =
  | "MATERIALIZED_OBJECT"
  | "ENGINE_INPUT_SIGNAL"
  | "VALIDATION_BLOCKER"
  | "REVIEW_ITEM"
  | "EXPLICIT_NO_OP"
  | "UNSUPPORTED";

export type RequirementMaterializationStatus =
  | "materialized"
  | "engine-input-signal"
  | "validation-blocker"
  | "review-required"
  | "explicit-no-op"
  | "unsupported"
  | "policy-missing";

export type RequirementMaterializationConfidence = "high" | "medium" | "low" | "advisory";

export type RequirementMaterializationPolicy = {
  key: string;
  label: string;
  category: string;
  expectedDisposition: RequirementMaterializationDisposition;
  normalizedSignal: string;
  createdObjectTypes: string[];
  updatedObjectTypes: string[];
  backendDesignCoreInputs: string[];
  affectedEngines: string[];
  validationImpact: string;
  frontendImpact: string[];
  reportImpact: string;
  diagramImpact: string;
  noOpReason: string;
  reviewRequiredWhen: string[];
  unsupportedReason?: string;
  confidence: RequirementMaterializationConfidence;
};

export type RequirementMaterializationOutcome = RequirementMaterializationPolicy & {
  sourceValue: string;
  captured: boolean;
  active: boolean;
  materializationStatus: RequirementMaterializationStatus;
  evidenceObjectIds: string[];
  actualEvidence: string[];
  reviewReason?: string;
};

export type RequirementMaterializationPolicySummary = {
  contractVersion: typeof REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT_VERSION;
  totalPolicyCount: number;
  capturedFieldCount: number;
  activeFieldCount: number;
  materializedObjectCount: number;
  engineInputSignalCount: number;
  validationBlockerCount: number;
  reviewItemCount: number;
  explicitNoOpCount: number;
  unsupportedCount: number;
  policyMissingCount: number;
  silentDropCount: number;
  silentDropKeys: string[];
  fieldOutcomes: RequirementMaterializationOutcome[];
  notes: string[];
};

type MaterializationEvidence = {
  sites?: Array<{ id?: string; name?: string | null; siteCode?: string | null; defaultAddressBlock?: string | null; vlans?: Array<{ id?: string; vlanId?: number | null; vlanName?: string | null; subnetCidr?: string | null; gatewayIp?: string | null; dhcpEnabled?: boolean | null }> }>;
  dhcpScopes?: Array<{ id?: string; vlanId?: string | null; scopeCidr?: string | null }>;
  addressingRows?: Array<{ id?: string; vlanId?: number; vlanName?: string; canonicalSubnetCidr?: string; sourceSubnetCidr?: string; effectiveGatewayIp?: string; proposedSubnetCidr?: string }>;
};

const MATERIALIZED_SEGMENT_BY_REQUIREMENT: Record<string, string[]> = {
  serverPlacement: ["SERVICES"],
  serverCount: ["SERVICES"],
  criticalServicesModel: ["SERVICES"],
  applicationProfile: ["SERVICES"],
  guestWifi: ["GUEST"],
  guestPolicy: ["GUEST"],
  wireless: ["STAFF-WIFI"],
  wirelessModel: ["STAFF-WIFI"],
  apCount: ["STAFF-WIFI"],
  wiredWirelessMix: ["USERS", "STAFF-WIFI"],
  voice: ["VOICE"],
  phoneCount: ["VOICE"],
  voiceQos: ["VOICE"],
  printers: ["PRINTERS"],
  printerCount: ["PRINTERS"],
  iot: ["IOT"],
  iotDeviceCount: ["IOT"],
  cameras: ["CAMERAS"],
  cameraCount: ["CAMERAS"],
  management: ["MANAGEMENT"],
  managementAccess: ["MANAGEMENT"],
  managementIpPolicy: ["MANAGEMENT"],
  adminBoundary: ["MANAGEMENT"],
  remoteAccess: ["REMOTE-ACCESS"],
  remoteAccessMethod: ["REMOTE-ACCESS"],
  cloudConnected: ["CLOUD-EDGE"],
  environmentType: ["CLOUD-EDGE"],
  cloudProvider: ["CLOUD-EDGE"],
  cloudConnectivity: ["CLOUD-EDGE"],
  cloudHostingModel: ["CLOUD-EDGE"],
  cloudNetworkModel: ["CLOUD-EDGE"],
  cloudRoutingModel: ["CLOUD-EDGE"],
  cloudIdentityBoundary: ["CLOUD-EDGE"],
  cloudTrafficBoundary: ["CLOUD-EDGE"],
  siteCount: ["SITE"],
  usersPerSite: ["USERS"],
  internetModel: ["WAN-TRANSIT"],
  dualIsp: ["WAN-TRANSIT"],
  resilienceTarget: ["WAN-TRANSIT"],
  interSiteTrafficModel: ["WAN-TRANSIT"],
  monitoringModel: ["OPERATIONS"],
  loggingModel: ["OPERATIONS"],
  backupPolicy: ["OPERATIONS"],
  operationsOwnerModel: ["OPERATIONS"],
};

const REVIEW_ONLY_REQUIREMENTS = new Set([
  "dualIsp",
  "cloudProvider",
  "cloudConnectivity",
  "cloudHostingModel",
  "cloudNetworkModel",
  "cloudRoutingModel",
  "cloudIdentityBoundary",
  "cloudTrafficBoundary",
  "remoteAccessMethod",
  "resilienceTarget",
  "outageTolerance",
  "budgetModel",
  "vendorPreference",
  "implementationTimeline",
  "rolloutModel",
  "downtimeConstraint",
  "teamCapability",
  "customRequirementsNotes",
]);

const VALIDATION_BLOCKER_REQUIREMENTS = new Set([
  "dualIsp",
  "cloudConnected",
  "remoteAccess",
  "reservedRangePolicy",
  "addressHierarchyModel",
  "siteBlockStrategy",
  "gatewayConvention",
  "growthBufferModel",
  "managementIpPolicy",
]);

function isExplicitlyOffOrEmpty(value: unknown) {
  if (typeof value === "boolean") return value === false;
  const text = requirementValueToString(value).trim().toLowerCase();
  return !text
    || text === "not selected"
    || text === "false"
    || text === "none"
    || text === "not applicable"
    || text.includes("not applicable")
    || text === "n/a";
}

function policyDispositionFor(item: RequirementImpactRegistryItem): RequirementMaterializationDisposition {
  if (MATERIALIZED_SEGMENT_BY_REQUIREMENT[item.key]) return "MATERIALIZED_OBJECT";
  if (VALIDATION_BLOCKER_REQUIREMENTS.has(item.key)) return "VALIDATION_BLOCKER";
  if (REVIEW_ONLY_REQUIREMENTS.has(item.key)) return "REVIEW_ITEM";
  if (item.impact === "evidence") return "ENGINE_INPUT_SIGNAL";
  if (item.category === "constraints" || item.category === "handoff") return "REVIEW_ITEM";
  return "ENGINE_INPUT_SIGNAL";
}

function confidenceFor(disposition: RequirementMaterializationDisposition, item: RequirementImpactRegistryItem): RequirementMaterializationConfidence {
  if (disposition === "MATERIALIZED_OBJECT") return "high";
  if (disposition === "VALIDATION_BLOCKER") return "medium";
  if (item.impact === "evidence") return "advisory";
  return "medium";
}

function objectTypesFor(key: string, disposition: RequirementMaterializationDisposition) {
  const segments = MATERIALIZED_SEGMENT_BY_REQUIREMENT[key] ?? [];
  if (segments.includes("SITE")) return ["Site"];
  if (segments.length > 0) {
    const objectTypes = ["VLAN/segment"];
    if (["GUEST", "STAFF-WIFI", "VOICE", "PRINTERS", "IOT", "CAMERAS", "USERS"].some((name) => segments.includes(name))) {
      objectTypes.push("DHCP scope candidate");
    }
    if (["GUEST", "MANAGEMENT", "IOT", "CAMERAS", "REMOTE-ACCESS", "CLOUD-EDGE"].some((name) => segments.includes(name))) {
      objectTypes.push("Security zone intent");
      objectTypes.push("Policy consequence intent");
    }
    if (["WAN-TRANSIT", "CLOUD-EDGE", "REMOTE-ACCESS"].some((name) => segments.includes(name))) {
      objectTypes.push("Routing/reachability review signal");
    }
    return Array.from(new Set(objectTypes));
  }
  if (disposition === "VALIDATION_BLOCKER") return ["Validation blocker/review signal"];
  if (disposition === "REVIEW_ITEM") return ["Review item"];
  return [];
}

function engineInputsFor(item: RequirementImpactRegistryItem, disposition: RequirementMaterializationDisposition) {
  const inputs = ["designCore.requirementContext", "designCore.traceability"];
  if (disposition === "MATERIALIZED_OBJECT" || item.outputAreas.some((area) => area.toLowerCase().includes("vlan") || area.toLowerCase().includes("segment"))) {
    inputs.push("Engine1.addressingDemand", "designCore.networkObjectModel");
  }
  if (item.category === "security" || item.outputAreas.some((area) => area.toLowerCase().includes("policy") || area.toLowerCase().includes("zone"))) {
    inputs.push("designCore.securityPolicyFlow", "designCore.standardsAlignment");
  }
  if (item.category === "cloud" || item.category === "resilience" || item.outputAreas.some((area) => area.toLowerCase().includes("routing") || area.toLowerCase().includes("wan"))) {
    inputs.push("designCore.routingSegmentation", "designCore.implementationPlan");
  }
  if (item.category === "addressing") inputs.push("Engine2.enterpriseIpamReview", "validation.service");
  return Array.from(new Set(inputs));
}

function frontendConsumersFor(item: RequirementImpactRegistryItem, disposition: RequirementMaterializationDisposition) {
  const consumers = ["ProjectRequirementsPage", "ProjectOverviewPage.traceability"];
  if (disposition === "MATERIALIZED_OBJECT") consumers.push("ProjectAddressingPage", "ProjectCoreModelPage");
  if (item.category === "security") consumers.push("ProjectValidationPage", "ProjectImplementationPage");
  if (item.category === "handoff") consumers.push("ProjectReportPage");
  return Array.from(new Set(consumers));
}

export function buildRequirementMaterializationPolicy(item: RequirementImpactRegistryItem): RequirementMaterializationPolicy {
  const disposition = policyDispositionFor(item);
  const objectTypes = objectTypesFor(item.key, disposition);
  const createdObjectTypes = disposition === "MATERIALIZED_OBJECT" ? objectTypes : [];
  const updatedObjectTypes = disposition === "MATERIALIZED_OBJECT" ? objectTypes : [];
  return {
    key: item.key,
    label: item.label,
    category: item.category,
    expectedDisposition: disposition,
    normalizedSignal: `${item.key}: ${item.designConsequence}`,
    createdObjectTypes,
    updatedObjectTypes,
    backendDesignCoreInputs: engineInputsFor(item, disposition),
    affectedEngines: engineInputsFor(item, disposition).map((name) => name.replace("designCore.", "").replace("Engine1.", "Engine1:").replace("Engine2.", "Engine2:")),
    validationImpact: item.validationConsequence,
    frontendImpact: frontendConsumersFor(item, disposition),
    reportImpact: item.reportConsequence,
    diagramImpact: item.diagramConsequence,
    noOpReason: "Requirement is absent, explicitly disabled, or not applicable; it must be preserved as explicit no-op evidence instead of silently disappearing.",
    reviewRequiredWhen: [
      "The requirement asks for a circuit, cloud route table, identity system, security enforcement, or brownfield fact that has not been imported or explicitly modeled.",
      "The materializer can safely create planning intent but cannot prove a real external object exists.",
    ],
    unsupportedReason: disposition === "UNSUPPORTED" ? "No supported materialization policy exists for this requirement yet." : undefined,
    confidence: confidenceFor(disposition, item),
  };
}

export const REQUIREMENT_MATERIALIZATION_POLICIES: RequirementMaterializationPolicy[] = REQUIREMENT_IMPACT_REGISTRY.map(buildRequirementMaterializationPolicy);

function allVlanEvidence(evidence?: MaterializationEvidence) {
  const siteVlans = (evidence?.sites ?? []).flatMap((site) => (site.vlans ?? []).map((vlan) => ({
    id: vlan.id,
    vlanName: String(vlan.vlanName ?? "").toUpperCase(),
    vlanId: vlan.vlanId,
    cidr: vlan.subnetCidr,
  })));
  const addressingVlans = (evidence?.addressingRows ?? []).map((row) => ({
    id: row.id,
    vlanName: String(row.vlanName ?? "").toUpperCase(),
    vlanId: row.vlanId,
    cidr: row.canonicalSubnetCidr ?? row.sourceSubnetCidr ?? row.proposedSubnetCidr,
  }));
  return [...siteVlans, ...addressingVlans];
}

function evidenceForPolicy(policy: RequirementMaterializationPolicy, evidence?: MaterializationEvidence) {
  const segmentFamilies = MATERIALIZED_SEGMENT_BY_REQUIREMENT[policy.key] ?? [];
  const objectIds: string[] = [];
  const actualEvidence: string[] = [];

  if (segmentFamilies.includes("SITE")) {
    for (const site of evidence?.sites ?? []) {
      if (site.id) objectIds.push(site.id);
      actualEvidence.push(`Site ${site.name ?? site.siteCode ?? site.id ?? "unknown"} exists${site.defaultAddressBlock ? ` with block ${site.defaultAddressBlock}` : ""}.`);
    }
  }

  const vlanRows = allVlanEvidence(evidence);
  for (const family of segmentFamilies.filter((family) => family !== "SITE")) {
    const matches = vlanRows.filter((row) => row.vlanName === family || String(row.vlanName).includes(family));
    for (const match of matches) {
      if (match.id) objectIds.push(match.id);
      actualEvidence.push(`${family} segment exists${match.vlanId ? ` as VLAN ${match.vlanId}` : ""}${match.cidr ? ` with ${match.cidr}` : ""}.`);
    }
  }

  if (policy.createdObjectTypes.includes("DHCP scope candidate")) {
    const dhcpCount = evidence?.dhcpScopes?.length ?? 0;
    if (dhcpCount > 0) actualEvidence.push(`${dhcpCount} DHCP scope row(s) exist for requirement-derived DHCP-capable segments.`);
  }

  return {
    evidenceObjectIds: Array.from(new Set(objectIds)),
    actualEvidence: Array.from(new Set(actualEvidence)),
  };
}

function statusFor(policy: RequirementMaterializationPolicy, active: boolean, evidence?: MaterializationEvidence): RequirementMaterializationStatus {
  if (!active) return "explicit-no-op";
  if (policy.expectedDisposition === "UNSUPPORTED") return "unsupported";
  if (policy.expectedDisposition === "ENGINE_INPUT_SIGNAL") return "engine-input-signal";
  if (policy.expectedDisposition === "VALIDATION_BLOCKER") return "validation-blocker";
  if (policy.expectedDisposition === "REVIEW_ITEM") return "review-required";
  const found = evidenceForPolicy(policy, evidence).actualEvidence.length > 0;
  return found ? "materialized" : "review-required";
}

export function buildRequirementMaterializationPolicySummary(
  requirements: Record<string, unknown> | null | undefined,
  evidence?: MaterializationEvidence,
): RequirementMaterializationPolicySummary {
  const safeRequirements = requirements && typeof requirements === "object" && !Array.isArray(requirements) ? requirements : {};
  const fieldOutcomes = REQUIREMENT_MATERIALIZATION_POLICIES.map((policy) => {
    const sourceValue = requirementValueToString(safeRequirements[policy.key]) || "not captured";
    const captured = Object.prototype.hasOwnProperty.call(safeRequirements, policy.key);
    const active = captured && !isExplicitlyOffOrEmpty(safeRequirements[policy.key]);
    const actual = evidenceForPolicy(policy, evidence);
    const materializationStatus = statusFor(policy, active, evidence);
    const reviewReason = materializationStatus === "review-required"
      ? policy.reviewRequiredWhen.join(" ")
      : materializationStatus === "validation-blocker"
        ? "Requirement creates a validation/readiness gate until the downstream engine proves or explicitly reviews the consequence."
        : undefined;
    return {
      ...policy,
      sourceValue,
      captured,
      active,
      materializationStatus,
      evidenceObjectIds: actual.evidenceObjectIds,
      actualEvidence: actual.actualEvidence,
      reviewReason,
    } satisfies RequirementMaterializationOutcome;
  });

  const silentDropKeys = fieldOutcomes
    .filter((item) => item.captured && item.active && item.materializationStatus === "policy-missing")
    .map((item) => item.key)
    .sort();

  return {
    contractVersion: REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT_VERSION,
    totalPolicyCount: fieldOutcomes.length,
    capturedFieldCount: fieldOutcomes.filter((item) => item.captured).length,
    activeFieldCount: fieldOutcomes.filter((item) => item.active).length,
    materializedObjectCount: fieldOutcomes.filter((item) => item.materializationStatus === "materialized").length,
    engineInputSignalCount: fieldOutcomes.filter((item) => item.materializationStatus === "engine-input-signal").length,
    validationBlockerCount: fieldOutcomes.filter((item) => item.materializationStatus === "validation-blocker").length,
    reviewItemCount: fieldOutcomes.filter((item) => item.materializationStatus === "review-required").length,
    explicitNoOpCount: fieldOutcomes.filter((item) => item.materializationStatus === "explicit-no-op").length,
    unsupportedCount: fieldOutcomes.filter((item) => item.materializationStatus === "unsupported").length,
    policyMissingCount: fieldOutcomes.filter((item) => item.materializationStatus === "policy-missing").length,
    silentDropCount: silentDropKeys.length,
    silentDropKeys,
    fieldOutcomes,
    notes: [
      "V1 requires every saved requirement field to become a materialized object, backend engine input signal, validation blocker, review item, explicit no-op, or unsupported item.",
      "Dual ISP, cloud, remote access, and brownfield-sensitive requirements create review/readiness signals; the materializer must not invent real circuits, cloud route tables, VPN gateways, or imported current-state facts.",
      "Frontend, report, and diagram consumers may show these outcomes only as backend-declared materialization evidence; they must not invent engineering facts locally.",
    ],
  };
}

export function parseRequirementsForMaterializationPolicy(requirementsJson?: string | null) {
  if (!requirementsJson) return null;
  try {
    const parsed = JSON.parse(requirementsJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
