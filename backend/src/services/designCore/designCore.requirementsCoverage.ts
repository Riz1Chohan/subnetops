import { parseJsonMap, valueAsBoolean, valueAsString } from "./designCore.helpers.js";
import type { RequirementsCoverageArea, RequirementsCoverageSummary } from "../designCore.types.js";

type VlanInput = {
  estimatedHosts?: number | null;
};

type SiteInput = {
  vlans: VlanInput[];
};

type ProjectRequirementsCoverageInput = {
  requirementsJson?: string | null;
  discoveryJson?: string | null;
  platformProfileJson?: string | null;
  sites: SiteInput[];
};

export function buildRequirementsCoverageSummary(project: ProjectRequirementsCoverageInput): RequirementsCoverageSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const discovery = parseJsonMap(project.discoveryJson);
  const platform = parseJsonMap(project.platformProfileJson);
  const sites = project.sites;
  const totalVlans = sites.reduce((sum: number, site: SiteInput) => sum + site.vlans.length, 0);
  const hasUsersPerSite = typeof requirements.usersPerSite === "number" && Number.isFinite(requirements.usersPerSite as number);
  const hasEstimatedHosts = sites.some((site: SiteInput) => site.vlans.some((vlan: VlanInput) => (vlan.estimatedHosts ?? 0) > 0));

  const text = valueAsString;
  const bool = valueAsBoolean;

  const areas: RequirementsCoverageArea[] = [
    {
      id: "site-topology",
      title: "Site and topology model",
      status: sites.length > 0 && text(requirements.planningFor) ? "implemented" : sites.length > 0 ? "partial" : "missing",
      signals: [
        `${sites.length} site${sites.length === 1 ? "" : "s"}`,
        text(requirements.planningFor) ? `planning for: ${text(requirements.planningFor)}` : "",
      ].filter(Boolean),
      notes: sites.length > 0
        ? ["Site records exist, so topology and site-boundary planning can begin."]
        : ["At least one site is required before the engine can produce a real multi-site design."],
    },
    {
      id: "endpoint-demand",
      title: "Users, endpoints, and segment demand",
      status: hasUsersPerSite || hasEstimatedHosts ? "implemented" : totalVlans > 0 ? "partial" : "missing",
      signals: [
        hasUsersPerSite ? `users per site: ${String(requirements.usersPerSite)}` : "",
        hasEstimatedHosts ? "estimated host counts present" : "",
        totalVlans > 0 ? `${totalVlans} VLAN row${totalVlans === 1 ? "" : "s"}` : "",
      ].filter(Boolean),
      notes: ["Demand should be tied to host counts or endpoint estimates so subnet sizing is deterministic."],
    },
    {
      id: "applications-services",
      title: "Applications and service placement",
      status: text(requirements.serverPlacement) && text(requirements.businessApps) ? "implemented" : text(requirements.serverPlacement) ? "partial" : "missing",
      signals: [text(requirements.serverPlacement), text(requirements.businessApps)].filter(Boolean),
      notes: ["Server placement is already used by WAN and security summaries, but application dependency depth still needs improvement."],
    },
    {
      id: "wan-internet",
      title: "WAN and internet design intent",
      status: text(requirements.internetModel) && text(platform.wanPosture) ? "implemented" : text(requirements.internetModel) || text(platform.wanPosture) ? "partial" : "missing",
      signals: [text(requirements.internetModel), text(platform.wanPosture)].filter(Boolean),
      notes: ["WAN and internet breakout choices should materially change edge, transit, and service-centralization decisions."],
    },
    {
      id: "segmentation-security",
      title: "Segmentation and security requirements",
      status: bool(requirements.guestWifi) || bool(requirements.remoteAccess) || bool(requirements.management) || bool(requirements.iot)
        ? "implemented"
        : text(discovery.securityPosture)
          ? "partial"
          : "missing",
      signals: [
        bool(requirements.guestWifi) ? "guest access" : "",
        bool(requirements.remoteAccess) ? "remote access" : "",
        bool(requirements.management) ? "management" : "",
        bool(requirements.iot) ? "IoT" : "",
        text(discovery.securityPosture),
      ].filter(Boolean),
      notes: ["Segmentation and security requirements are core drivers for VLAN, policy, and trust-boundary design."],
    },
    {
      id: "routing-transport",
      title: "Routing and transport posture",
      status: text(platform.routingPosture) && text(discovery.routingTransportBaseline) ? "implemented" : text(platform.routingPosture) || text(discovery.routingTransportBaseline) ? "partial" : "missing",
      signals: [text(platform.routingPosture), text(discovery.routingTransportBaseline)].filter(Boolean),
      notes: ["Routing posture should drive summarization, loopback, transit, and future migration planning."],
    },
    {
      id: "operations-management",
      title: "Operations and management posture",
      status: text(platform.firewallPosture) && text(platform.operationsModel) ? "implemented" : text(platform.firewallPosture) || text(platform.operationsModel) || text(platform.automationReadiness) ? "partial" : "missing",
      signals: [text(platform.firewallPosture), text(platform.operationsModel), text(platform.automationReadiness)].filter(Boolean),
      notes: ["Operations inputs should affect management-plane restrictions, handoff readiness, and long-term support planning."],
    },
    {
      id: "wireless-remote-access",
      title: "Wireless and remote-access scope",
      status: (bool(requirements.wireless) || bool(requirements.guestWifi)) && bool(requirements.remoteAccess)
        ? "implemented"
        : bool(requirements.wireless) || bool(requirements.guestWifi) || bool(requirements.remoteAccess)
          ? "partial"
          : "missing",
      signals: [
        bool(requirements.wireless) ? "wireless" : "",
        bool(requirements.guestWifi) ? "guest Wi‑Fi" : "",
        bool(requirements.remoteAccess) ? "remote access" : "",
      ].filter(Boolean),
      notes: ["Wireless and remote-access scope materially affect edge policy, segmentation, and support assumptions."],
    },
    {
      id: "implementation-constraints",
      title: "Implementation and migration constraints",
      status: text(requirements.cutoverWindow) && (text(requirements.rollbackNeed) || text(requirements.outageTolerance))
        ? "partial"
        : text(requirements.cutoverWindow) || text(requirements.rollbackNeed) || text(requirements.outageTolerance)
          ? "partial"
          : "missing",
      signals: [text(requirements.cutoverWindow), text(requirements.rollbackNeed), text(requirements.outageTolerance)].filter(Boolean),
      notes: ["Constraint capture exists, but deeper implementation-planning synthesis still needs more engine work."],
    },
    {
      id: "brownfield-baseline",
      title: "Brownfield and current-state baseline",
      status: text(discovery.topologyBaseline) && text(discovery.addressingVlanBaseline) ? "implemented" : text(discovery.topologyBaseline) || text(discovery.addressingVlanBaseline) ? "partial" : "missing",
      signals: [text(discovery.topologyBaseline), text(discovery.addressingVlanBaseline)].filter(Boolean),
      notes: ["Current-state baseline quality determines how safely future discovered-state import can be reconciled against proposed design."],
    },
    {
      id: "handoff-reporting",
      title: "Handoff and reporting readiness",
      status: text(requirements.reportAudience) && text(requirements.documentationDepth) ? "implemented" : text(requirements.reportAudience) || text(requirements.documentationDepth) ? "partial" : "missing",
      signals: [text(requirements.reportAudience), text(requirements.documentationDepth)].filter(Boolean),
      notes: ["Export and handoff expectations should be explicit so the output package matches who will consume it."],
    },
  ];

  const implementedCount = areas.filter((area) => area.status === "implemented").length;
  const partialCount = areas.filter((area) => area.status === "partial").length;
  const missingAreaIds = areas.filter((area) => area.status === "missing").map((area) => area.id);
  const missingCount = missingAreaIds.length;

  const notes = [
    "Requirement coverage is reported separately from standards posture so missing planning depth is visible before implementation review.",
    "Areas marked missing should either be captured explicitly or acknowledged as out of scope for the current project.",
  ];
  if (missingCount > 0) {
    notes.push(`The current project is still missing ${missingCount} planning area${missingCount === 1 ? "" : "s"} that normally strengthen design trust.`);
  }
  if (partialCount > 0) {
    notes.push(`Another ${partialCount} planning area${partialCount === 1 ? " is" : "s are"} only partially represented today.`);
  }

  return {
    areas,
    implementedCount,
    partialCount,
    missingCount,
    missingAreaIds,
    notes,
  };
}

