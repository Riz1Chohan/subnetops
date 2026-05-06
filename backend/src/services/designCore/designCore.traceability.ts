import { parseJsonMap, valueAsBoolean, valueAsString } from "./designCore.helpers.js";
import type { DesignTraceabilityItem } from "../designCore.types.js";
import { buildRequirementImpactInventory } from "../requirementsImpactRegistry.js";

type ProjectTraceabilityInput = {
  requirementsJson?: string | null;
  discoveryJson?: string | null;
  platformProfileJson?: string | null;
};

function confidenceForRequirement(impact: "direct" | "indirect" | "evidence", captured: boolean): DesignTraceabilityItem["confidence"] {
  if (!captured) return "advisory";
  if (impact === "direct") return "high";
  if (impact === "indirect") return "medium";
  return "advisory";
}

function sourceRequirementId(sourceArea: DesignTraceabilityItem["sourceArea"], key: string) {
  return `${sourceArea}:${key}`;
}

function lifecycleForCaptured(captured: boolean): DesignTraceabilityItem["propagationLifecycleStatus"] {
  return captured ? "PARTIALLY_PROPAGATED" : "NOT_CAPTURED";
}

function proofStatusForCaptured(captured: boolean): DesignTraceabilityItem["proofStatus"] {
  return captured ? "PARTIAL" : "NOT_DESIGN_DRIVING";
}

export function buildTraceability(project: ProjectTraceabilityInput): DesignTraceabilityItem[] {
  const requirements = parseJsonMap(project.requirementsJson);
  const discovery = parseJsonMap(project.discoveryJson);
  const platform = parseJsonMap(project.platformProfileJson);
  const traceability: DesignTraceabilityItem[] = [];

  for (const item of buildRequirementImpactInventory(requirements)) {
    const sourceId = sourceRequirementId("requirements", item.key);
    traceability.push({
      sourceArea: "requirements",
      sourceKey: item.key,
      sourceLabel: item.label,
      sourceValue: item.sourceValue,
      impacts: item.outputAreas,
      outputAreas: item.outputAreas,
      materializationTargets: item.materializationTargets,
      designConsequence: item.designConsequence,
      validationEvidence: item.validationConsequence,
      diagramEvidence: item.diagramConsequence,
      reportEvidence: item.reportConsequence,
      confidence: confidenceForRequirement(item.impact, item.captured),
      sourceType: item.captured ? "USER_PROVIDED" : "UNSUPPORTED",
      sourceRequirementIds: [sourceId],
      sourceObjectIds: [],
      sourceEngine: "designCore.traceability",
      proofStatus: proofStatusForCaptured(item.captured),
      reviewReason: item.captured
        ? "Captured requirement has a traceability row; V1 closure decides whether it is fully design-driving."
        : "Captured but not currently design-driving: requirement was not provided by the user.",
      consumerPath: ["backend design-core", "frontend traceability", "report/export traceability", "diagram impact when relevant"],
      propagationLifecycleStatus: lifecycleForCaptured(item.captured),
    });
  }

  const addTrace = (
    sourceArea: DesignTraceabilityItem["sourceArea"],
    sourceKey: string,
    sourceLabel: string,
    sourceValue: unknown,
    impacts: string[],
    confidence: DesignTraceabilityItem["confidence"],
  ) => {
    const text = valueAsString(sourceValue);
    if (!text) return;
    const sourceId = sourceRequirementId(sourceArea, sourceKey);
    traceability.push({
      sourceArea,
      sourceKey,
      sourceLabel,
      sourceValue: text,
      impacts,
      outputAreas: impacts,
      materializationTargets: ["Design-core traceability", "Review notes"],
      designConsequence: impacts.join("; "),
      validationEvidence: "Captured outside the requirements workflow and reflected in design review summaries where available.",
      diagramEvidence: "Displayed when the backend render model exposes a matching object or relationship.",
      reportEvidence: "Included in backend design-core traceability and report truth sections.",
      confidence,
      sourceType: sourceArea === "discovery" ? "IMPORTED" : "USER_PROVIDED",
      sourceRequirementIds: [sourceId],
      sourceObjectIds: [],
      sourceEngine: "designCore.traceability",
      proofStatus: "PARTIAL",
      reviewReason: "Requires manual review: this input is captured outside the requirements materializer and needs consumer-specific proof before implementation authority.",
      consumerPath: ["backend design-core", "frontend traceability", "report/export traceability", "diagram impact when relevant"],
      propagationLifecycleStatus: "PARTIALLY_PROPAGATED",
    });
  };

  addTrace("discovery", "topologyBaseline", "Current topology baseline", discovery.topologyBaseline, [
    "Current-state mapping readiness",
    "Brownfield reconciliation",
  ], "medium");
  addTrace("discovery", "addressingVlanBaseline", "Addressing baseline", discovery.addressingVlanBaseline, [
    "Current-state addressing trust",
    "Conflict detection depth",
  ], "medium");
  addTrace("discovery", "routingTransportBaseline", "Routing baseline", discovery.routingTransportBaseline, [
    "Routing design intent",
    "Migration risk analysis",
  ], "medium");
  addTrace("discovery", "securityPosture", "Security posture", discovery.securityPosture, [
    "Firewall and zone design",
    "Management access boundaries",
  ], "medium");
  addTrace("platform", "routingPosture", "Routing posture", platform.routingPosture, [
    "Routing protocol intent",
    "Summarization expectations",
  ], "medium");
  addTrace("platform", "firewallPosture", "Firewall posture", platform.firewallPosture, [
    "Policy baseline",
    "Security design narrative",
  ], "medium");
  addTrace("platform", "wanPosture", "WAN posture", platform.wanPosture, [
    "WAN topology intent",
    "Transit subnet planning",
  ], "medium");
  addTrace("platform", "cloudPosture", "Cloud posture", platform.cloudPosture, [
    "Cloud boundary planning",
    "Hybrid routing assumptions",
  ], "medium");

  return traceability;
}
