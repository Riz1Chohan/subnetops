import type { SynthesizedLogicalDesign, TrafficFlowPath } from "../../lib/designSynthesis.types";
import type { Site, Vlan } from "../../lib/types";
import type { DeviceFocus, DiagramScope, LabelFocus, LinkFocus } from "./diagramTypes";

export interface SiteWithVlans extends Site {
  vlans?: Vlan[];
}

export function siteIdsWithBoundaries(synthesized: SynthesizedLogicalDesign) {
  return new Set(
    synthesized.securityBoundaries
      .map((boundary) => synthesized.siteHierarchy.find((site) => site.name === boundary.siteName)?.id)
      .filter((siteId): siteId is string => Boolean(siteId))
  );
}

export function siteIdsWithWanLinks(synthesized: SynthesizedLogicalDesign) {
  return new Set(
    synthesized.wanLinks.flatMap((link) => [link.endpointASiteId, link.endpointBSiteId]).filter((siteId): siteId is string => Boolean(siteId))
  );
}

export function siteIdsWithCloudOrInternetEdges(synthesized: SynthesizedLogicalDesign) {
  return new Set(
    synthesized.sitePlacements
      .filter((placement) => placement.deviceType === "cloud-edge" || placement.role.toLowerCase().includes("internet") || placement.role.toLowerCase().includes("wan"))
      .map((placement) => placement.siteId)
  );
}

export function flowsForDiagramScope(flows: TrafficFlowPath[], scope: DiagramScope, focusedSiteName?: string) {
  if (scope === "site" && focusedSiteName) {
    return flows.filter((flow) => flow.sourceSite === focusedSiteName || flow.destinationSite === focusedSiteName || flow.path.some((step) => step.includes(focusedSiteName)));
  }
  if (scope === "wan-cloud") {
    return flows.filter((flow) => flow.flowCategory === "site-centralized-service" || flow.flowCategory === "site-cloud-service" || flow.path.length > 2 || flow.path.some((step) => /cloud|internet|vpn|wan/i.test(step)));
  }
  if (scope === "boundaries") {
    return flows.filter((flow) => flow.sourceZone !== flow.destinationZone || flow.controlPoints.length > 0 || /dmz|management|guest/i.test(`${flow.sourceZone} ${flow.destinationZone}`));
  }
  return flows;
}

export function sitesForDiagramScope(sites: SiteWithVlans[], synthesized: SynthesizedLogicalDesign, scope: DiagramScope, focusedSiteId?: string) {
  if (scope === "site" && focusedSiteId) {
    const focused = sites.find((site) => site.id === focusedSiteId);
    return focused ? [focused] : sites.slice(0, 1);
  }
  if (scope === "wan-cloud") {
    const wanIds = siteIdsWithWanLinks(synthesized);
    const edgeIds = siteIdsWithCloudOrInternetEdges(synthesized);
    const primary = synthesized.siteHierarchy.find((site) => site.name === synthesized.topology.primarySiteName)?.id;
    const relevantIds = new Set<string>([...(primary ? [primary] : []), ...wanIds, ...edgeIds]);
    const scoped = sites.filter((site) => relevantIds.has(site.id));
    return scoped.length > 0 ? scoped : sites;
  }
  if (scope === "boundaries") {
    const boundaryIds = siteIdsWithBoundaries(synthesized);
    const scoped = sites.filter((site) => boundaryIds.has(site.id) || synthesized.servicePlacements.some((placement) => placement.siteId === site.id && placement.placementType === "dmz"));
    return scoped.length > 0 ? scoped : sites;
  }
  return sites;
}

export function diagramScopeMeta(scope: DiagramScope, synthesized: SynthesizedLogicalDesign, focusedSite?: SiteWithVlans) {
  if (scope === "site") {
    return {
      title: focusedSite ? `Detailed site topology — ${focusedSite.name}` : "Detailed site topology",
      detail: focusedSite
        ? `This scope keeps the diagram on one site so the edge, switching, boundary, and local service relationships can be reviewed without the rest of the multi-site estate competing for space.`
        : "This scope narrows the diagram to one site so local topology review becomes easier.",
    };
  }
  if (scope === "wan-cloud") {
    return {
      title: "WAN / cloud view",
      detail: `This scope keeps the review on inter-site, internet, and cloud-connected paths so the WAN edge, breakout posture, and centralized-service movement stay visible.`
    };
  }
  if (scope === "boundaries") {
    return {
      title: "Security boundary view",
      detail: `This scope emphasizes the sites carrying concrete boundary objects so trust boundaries, control points, DMZ placement, and cross-zone flows are easier to inspect.`
    };
  }
  return {
    title: "Global multi-site topology",
    detail: `This scope keeps the full multi-site design visible so the overall architecture, topology type, site roles, and major placement decisions can be reviewed together.`
  };
}

export function deviceFocusTitle(focus: DeviceFocus) {
  if (focus === "edge") return "Edge roles";
  if (focus === "switching") return "Switching roles";
  if (focus === "wireless") return "Wireless roles";
  if (focus === "services") return "Service roles";
  return "All device roles";
}

export function linkFocusTitle(focus: LinkFocus) {
  if (focus === "transport") return "Transport semantics";
  if (focus === "access") return "Access / trunk semantics";
  if (focus === "security") return "Security / control semantics";
  if (focus === "flows") return "Critical flow semantics";
  return "All link semantics";
}

export function labelFocusTitle(focus: LabelFocus) {
  if (focus === "topology") return "Topology labels";
  if (focus === "addressing") return "Addressing labels";
  if (focus === "zones") return "Zone / boundary labels";
  if (focus === "transport") return "Transport labels";
  if (focus === "flows") return "Flow labels";
  return "All label families";
}

export function topologyScopeBehaviorSummary(scope: DiagramScope, synthesized: SynthesizedLogicalDesign, focusedSite?: SiteWithVlans) {
  if (scope === "site" && focusedSite) {
    return `${focusedSite.name}: ${siteBreakoutSummary(focusedSite.name, synthesized)} • ${siteRoutingSummary(focusedSite.id, focusedSite.name, synthesized)}`;
  }
  if (synthesized.topology.topologyType === "hub-spoke") {
    return `Hub-and-spoke posture: branches should traverse ${synthesized.topology.primarySiteName || "the primary hub"} unless breakout rules explicitly override that path.`;
  }
  if (synthesized.topology.topologyType === "collapsed-core") {
    return "Collapsed-core posture: local edge, local switching, and local internet/security boundaries should dominate the rendered view.";
  }
  if (synthesized.topology.topologyType === "hybrid-cloud") {
    return "Hybrid-cloud posture: cloud edge, hosted services, and cross-boundary trust/control points should remain explicit in the diagram.";
  }
  return "Routed multi-site posture: attached sites, transit paths, and summarized route domains should remain visible without overloading the view.";
}

export function siteBreakoutSummary(siteName: string, synthesized: SynthesizedLogicalDesign) {
  if (siteName === synthesized.topology.primarySiteName) {
    return synthesized.topology.internetBreakout.toLowerCase().includes("local")
      ? "Primary site carries local breakout"
      : `Primary site anchors ${synthesized.topology.internetBreakout.toLowerCase()}`;
  }

  if (synthesized.topology.topologyType === "hub-spoke") {
    return synthesized.topology.internetBreakout.toLowerCase().includes("distributed") || synthesized.topology.internetBreakout.toLowerCase().includes("local")
      ? "Branch breakout can stay local"
      : `Branch breakout traverses ${synthesized.topology.primarySiteName || "hub"}`;
  }

  if (synthesized.topology.topologyType === "collapsed-core") return "Local breakout at collapsed edge";
  return synthesized.topology.internetBreakout;
}

export function siteRoutingSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const route = (synthesized.routePlan ?? synthesized.routingPlan).find((item) => item.siteId === siteId || item.siteName === siteName);
  if (route?.summaryAdvertisement) return `Summarizes ${route.summaryAdvertisement}`;
  if (route?.transitAdjacencyCount && route.transitAdjacencyCount > 0) return `${route.transitAdjacencyCount} transit adjacencies`;
  if (siteName === synthesized.topology.primarySiteName) return "Shared route / policy anchor";
  if (synthesized.topology.topologyType === "hub-spoke") return `Attached route domain via ${synthesized.topology.primarySiteName || "hub"}`;
  if (synthesized.topology.topologyType === "collapsed-core") return "Local gateway and switching role";
  return "Routed attached site";
}

export function siteTransportSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const links = synthesized.wanLinks.filter((link) => link.endpointASiteId === siteId || link.endpointBSiteId === siteId);
  if (!links.length) {
    if (siteName === synthesized.topology.primarySiteName) return "Primary edge without explicit WAN link rows yet";
    return synthesized.topology.topologyType === "collapsed-core" ? "No WAN transit required" : "Transit relationship still inferred";
  }

  return links
    .slice(0, 2)
    .map((link) => {
      const peer = link.endpointASiteId === siteId ? link.endpointBSiteName : link.endpointASiteName;
      return `${link.linkName} → ${peer}`;
    })
    .join(" • ");
}

export function siteAnchorSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const services = synthesized.servicePlacements.filter((placement) => placement.siteId === siteId || placement.siteName === siteName);
  const boundaries = synthesized.securityBoundaries.filter((boundary) => boundary.siteName === siteName);
  const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === siteId);
  const primaryService = services[0]?.serviceName;
  const primaryBoundary = boundaries[0]?.boundaryName;
  const primaryDevice = placements[0]?.deviceName;
  return [primaryService, primaryBoundary, primaryDevice].filter(Boolean).slice(0, 2).join(" • ") || "Core anchors still inferred";
}
