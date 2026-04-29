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

export function buildTraceability(project: ProjectTraceabilityInput): DesignTraceabilityItem[] {
  const requirements = parseJsonMap(project.requirementsJson);
  const discovery = parseJsonMap(project.discoveryJson);
  const platform = parseJsonMap(project.platformProfileJson);
  const traceability: DesignTraceabilityItem[] = [];

  for (const item of buildRequirementImpactInventory(requirements)) {
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
