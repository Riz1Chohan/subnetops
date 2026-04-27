import { parseJsonMap, valueAsBoolean, valueAsString } from "./designCore.helpers.js";
import type { DesignTraceabilityItem } from "../designCore.types.js";

type ProjectTraceabilityInput = {
  requirementsJson?: string | null;
  discoveryJson?: string | null;
  platformProfileJson?: string | null;
};

export function buildTraceability(project: ProjectTraceabilityInput): DesignTraceabilityItem[] {
  const requirements = parseJsonMap(project.requirementsJson);
  const discovery = parseJsonMap(project.discoveryJson);
  const platform = parseJsonMap(project.platformProfileJson);
  const traceability: DesignTraceabilityItem[] = [];

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
      confidence,
    });
  };

  addTrace("requirements", "planningFor", "Planning objective", requirements.planningFor, [
    "Architecture pattern selection",
    "Documentation tone and output package",
  ], "high");
  addTrace("requirements", "primaryGoal", "Primary design goal", requirements.primaryGoal, [
    "Validation emphasis",
    "Segmentation and routing tradeoffs",
  ], "high");
  addTrace("requirements", "usersPerSite", "Users per site", requirements.usersPerSite, [
    "Subnet sizing",
    "Growth buffer calculations",
    "Wireless and access-layer assumptions",
  ], "high");
  addTrace("requirements", "remoteAccess", "Remote access requirement", requirements.remoteAccess, [
    "Security architecture",
    "VPN and identity boundary planning",
  ], valueAsBoolean(requirements.remoteAccess) ? "high" : "advisory");
  addTrace("requirements", "guestWifi", "Guest access requirement", requirements.guestWifi, [
    "Guest segmentation",
    "Firewall and policy boundaries",
  ], valueAsBoolean(requirements.guestWifi) ? "high" : "advisory");
  addTrace("requirements", "voice", "Voice requirement", requirements.voice, [
    "Voice VLAN planning",
    "QoS intent",
  ], valueAsBoolean(requirements.voice) ? "high" : "advisory");
  addTrace("requirements", "iot", "IoT / OT requirement", requirements.iot, [
    "Specialty segmentation",
    "Trust boundary hardening",
  ], valueAsBoolean(requirements.iot) ? "high" : "advisory");
  addTrace("requirements", "serverPlacement", "Server placement", requirements.serverPlacement, [
    "Shared services placement",
    "WAN dependency assumptions",
  ], "medium");
  addTrace("requirements", "internetModel", "Internet breakout model", requirements.internetModel, [
    "WAN edge design",
    "Firewall placement intent",
  ], "medium");
  addTrace("requirements", "complianceProfile", "Compliance profile", requirements.complianceProfile, [
    "Security control strictness",
    "Logging and segmentation requirements",
  ], "medium");
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

