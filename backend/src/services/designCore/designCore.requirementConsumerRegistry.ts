import type { RequirementMaterializationOutcome } from "../designCore.types.js";

export const V1_REQUIREMENT_CONSUMER_REGISTRY_VERSION = "V1_REQUIREMENT_CONSUMER_REGISTRY_WIZARD_CLOSURE" as const;

export type RequirementConsumerId =
  | "requirements.capture"
  | "requirements.normalization"
  | "requirementsMaterialization.policy"
  | "materialized.sourceObject"
  | "designCore.traceability"
  | "designCore.requirementsImpactClosure"
  | "designCore.requirementsScenarioProof"
  | "Engine1.addressing"
  | "Engine2.enterpriseIpamReview"
  | "designCore.routingSegmentation"
  | "designCore.securityPolicyFlow"
  | "designCore.implementationPlan"
  | "validation/readiness"
  | "ProjectOverviewPage.V1Closure"
  | "report/export.requirementEvidence"
  | "diagramTruth.requirementImpact";

export interface RequirementConsumerRegistryEntry {
  version: typeof V1_REQUIREMENT_CONSUMER_REGISTRY_VERSION;
  requirementKey: string;
  requiredConsumers: RequirementConsumerId[];
  reviewOnlyConsumers: RequirementConsumerId[];
  explicitNoOpConsumers: RequirementConsumerId[];
  rationale: string[];
}

const BASE_REQUIRED_CONSUMERS: RequirementConsumerId[] = [
  "requirements.capture",
  "requirements.normalization",
  "requirementsMaterialization.policy",
  "designCore.traceability",
  "designCore.requirementsImpactClosure",
  "validation/readiness",
  "ProjectOverviewPage.V1Closure",
  "report/export.requirementEvidence",
];

const SCENARIO_PROOF_KEYS = new Set([
  "userspersite",
  "wiredwirelessmix",
  "primarygoal",
  "sitecount",
  "internetmodel",
  "intersitetrafficmodel",
  "planningfor",
  "environmenttype",
  "guestwifi",
  "guestpolicy",
  "trustboundarymodel",
  "securityposture",
  "management",
  "managementaccess",
  "managementippolicy",
  "adminboundary",
  "remoteaccess",
  "remoteaccessmethod",
  "identitymodel",
  "cloudconnected",
  "cloudconnectivity",
  "cloudnetworkmodel",
  "cloudroutingmodel",
  "cloudtrafficboundary",
  "voice",
  "phonecount",
  "voiceqos",
  "qosmodel",
  "latencysensitivity",
  "printers",
  "printercount",
  "iot",
  "iotdevicecount",
  "cameras",
  "cameracount",
  "complianceprofile",
  "monitoringmodel",
  "loggingmodel",
  "backuppolicy",
  "operationsownermodel",
  "dualisp",
  "resiliencetarget",
  "outagetolerance",
]);

const ADDRESSING_KEYS = new Set([
  "sitecount",
  "userspersite",
  "wiredwirelessmix",
  "wireless",
  "wirelessmodel",
  "guestwifi",
  "guestpolicy",
  "voice",
  "phonecount",
  "printers",
  "printercount",
  "iot",
  "iotdevicecount",
  "cameras",
  "cameracount",
  "management",
  "managementaccess",
  "managementippolicy",
  "remoteaccess",
  "dualisp",
  "cloudconnected",
  "cloudconnectivity",
  "cloudnetworkmodel",
  "cloudroutingmodel",
  "cloudtrafficboundary",
  "cloudhybrid",
  "addresshierarchymodel",
  "siteblockstrategy",
  "gatewayconvention",
  "growthbuffermodel",
  "reservedrangepolicy",
  "baseprivaterange",
]);

const ROUTING_KEYS = new Set([
  "sitecount",
  "internetmodel",
  "intersitetrafficmodel",
  "dualisp",
  "resiliencetarget",
  "outagetolerance",
  "cloudconnected",
  "cloudconnectivity",
  "cloudnetworkmodel",
  "cloudroutingmodel",
  "cloudtrafficboundary",
  "remoteaccess",
  "serverplacement",
]);

const SECURITY_KEYS = new Set([
  "guestwifi",
  "guestpolicy",
  "trustboundarymodel",
  "securityposture",
  "management",
  "managementaccess",
  "adminboundary",
  "identitymodel",
  "remoteaccess",
  "remoteaccessmethod",
  "cloudconnected",
  "cloudtrafficboundary",
  "voice",
  "printers",
  "iot",
  "cameras",
  "complianceprofile",
  "loggingmodel",
  "reservedrangepolicy",
]);

const IMPLEMENTATION_REVIEW_KEYS = new Set([
  "rolloutmodel",
  "downtimeconstraint",
  "teamcapability",
  "implementationtimeline",
  "outputpackage",
  "primaryaudience",
  "budgetmodel",
  "vendorpreference",
  "dualisp",
  "remoteaccess",
  "cloudconnected",
  "securityposture",
  "complianceprofile",
]);

function normalizeKey(key: string) {
  return String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function valuesForOutcome(outcome: RequirementMaterializationOutcome) {
  return [
    outcome.key,
    outcome.label,
    outcome.category,
    outcome.normalizedSignal,
    outcome.validationImpact,
    outcome.reportImpact,
    outcome.diagramImpact,
    ...outcome.backendDesignCoreInputs,
    ...outcome.affectedEngines,
    ...outcome.frontendImpact,
    ...outcome.createdObjectTypes,
    ...outcome.updatedObjectTypes,
  ].join(" ").toLowerCase();
}

function addUnique(consumers: RequirementConsumerId[], consumer: RequirementConsumerId) {
  if (!consumers.includes(consumer)) consumers.push(consumer);
}

function removeConsumers(consumers: RequirementConsumerId[], toRemove: RequirementConsumerId[]) {
  const blocked = new Set(toRemove);
  return consumers.filter((consumer) => !blocked.has(consumer));
}

export function requirementConsumerRegistryFor(outcome: RequirementMaterializationOutcome): RequirementConsumerRegistryEntry {
  const key = normalizeKey(outcome.key);
  const text = valuesForOutcome(outcome);
  const requiredConsumers = [...BASE_REQUIRED_CONSUMERS];
  const reviewOnlyConsumers: RequirementConsumerId[] = [];
  const explicitNoOpConsumers: RequirementConsumerId[] = [];
  const rationale: string[] = ["Base capture, normalization, materialization-policy, traceability, validation, frontend, and report/export evidence are required for every captured wizard requirement."];

  if (outcome.expectedDisposition === "MATERIALIZED_OBJECT") {
    addUnique(requiredConsumers, "materialized.sourceObject");
    rationale.push("Materialized-object requirements must have a source object or explicit no-op/review state.");
  }

  if (SCENARIO_PROOF_KEYS.has(key)) {
    addUnique(requiredConsumers, "designCore.requirementsScenarioProof");
    rationale.push("This requirement is a selected golden-scenario driver and must be covered by scenario proof.");
  } else {
    addUnique(explicitNoOpConsumers, "designCore.requirementsScenarioProof");
    rationale.push("This requirement is not a golden-scenario driver; scenario proof is explicitly not the mandatory consumer for this key.");
  }

  if (ADDRESSING_KEYS.has(key) || /address|subnet|vlan|segment|host demand|engine1|ipam|dhcp|pool|allocation|reservation/.test(text)) {
    addUnique(requiredConsumers, "Engine1.addressing");
    addUnique(reviewOnlyConsumers, "Engine2.enterpriseIpamReview");
    rationale.push("Address-impact requirements must reach Engine 1; Engine 2 candidate authority is review-required until approved, not a root blocker for greenfield wizard output.");
  }

  if (ROUTING_KEYS.has(key) || /route|wan|cloud|isp|transit|failover|reachability/.test(text)) {
    addUnique(reviewOnlyConsumers, "designCore.routingSegmentation");
    rationale.push("Routing-sensitive requirements need routing/segmentation review evidence; missing approval is review debt unless the route model is contradictory.");
  }

  if (SECURITY_KEYS.has(key) || /security|zone|policy|guest|management|remote|identity|firewall|trust boundary/.test(text)) {
    addUnique(reviewOnlyConsumers, "designCore.securityPolicyFlow");
    rationale.push("Security-sensitive requirements need policy-flow evidence; inferred/default-deny outputs remain review-gated until accepted.");
  }

  if (IMPLEMENTATION_REVIEW_KEYS.has(key) || /implementation|handoff|rollout|downtime|team|review item/.test(text)) {
    addUnique(reviewOnlyConsumers, "designCore.implementationPlan");
    rationale.push("Implementation-related requirements produce planning/review tasks until authority and approvals exist.");
  }

  if (outcome.diagramImpact && !outcome.diagramImpact.toLowerCase().includes("not applicable")) {
    addUnique(reviewOnlyConsumers, "diagramTruth.requirementImpact");
    rationale.push("Diagram impact is review-visible evidence, not a mandatory root blocker for wizard-generated planning output.");
  }

  return {
    version: V1_REQUIREMENT_CONSUMER_REGISTRY_VERSION,
    requirementKey: outcome.key,
    requiredConsumers: removeConsumers(requiredConsumers, explicitNoOpConsumers).sort(),
    reviewOnlyConsumers: Array.from(new Set(reviewOnlyConsumers)).sort(),
    explicitNoOpConsumers: Array.from(new Set(explicitNoOpConsumers)).sort(),
    rationale,
  };
}
