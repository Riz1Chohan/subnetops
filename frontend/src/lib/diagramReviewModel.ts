import type { SecurityBoundaryDetail, ServicePlacementItem, SitePlacementDevice, SynthesizedLogicalDesign, TopologyBlueprint, TrafficFlowPath, WanLinkPlanRow } from "./designSynthesis";

export interface DiagramSiteReviewCard {
  siteId: string;
  siteName: string;
  siteTier: string;
  topologyRole: string;
  edgeAnchor: string;
  switchingAnchor: string;
  wirelessAnchor: string;
  pathEmphasis: string;
  serviceAnchor: string[];
  trustAnchor: string[];
  overlayFocus: string[];
}

export interface DiagramLinkObject {
  id: string;
  category: "wan" | "service-ingress" | "security-boundary" | "traffic-flow";
  label: string;
  from: string;
  to: string;
  semantics: string;
  reviewHint: string;
}

export interface DiagramOverlayEvidence {
  overlay: "placement" | "addressing" | "security" | "flows";
  count: number;
  evidence: string[];
  reviewQuestion: string;
}

export interface DiagramPatternRule {
  topologyType: TopologyBlueprint["topologyType"];
  title: string;
  signals: string[];
  reviewPriority: string[];
}

export interface DiagramEngineeringPack {
  siteCards: DiagramSiteReviewCard[];
  linkObjects: DiagramLinkObject[];
  overlays: DiagramOverlayEvidence[];
  patternRule: DiagramPatternRule;
  deviceRoleCounts: Array<{ role: string; count: number }>;
}

function firstOfType(devices: SitePlacementDevice[], kinds: SitePlacementDevice["deviceType"][]) {
  return devices.find((device) => kinds.includes(device.deviceType));
}

function pathEmphasis(topology: TopologyBlueprint, siteName: string, primarySiteName?: string) {
  if (topology.topologyType === "collapsed-core") return "Local edge, campus switching, and perimeter segmentation";
  if (topology.topologyType === "hub-spoke") return siteName === primarySiteName ? "Hub concentration, central services, and spoke dependency" : `Spoke attachment back toward ${primarySiteName || "primary hub"}`;
  if (topology.topologyType === "hybrid-cloud") return "On-prem to cloud edge, filtered service reachability, and boundary enforcement";
  return "Inter-site routed adjacency with explicit local edge and service posture";
}

function overlayFocusForSite(devices: SitePlacementDevice[], services: ServicePlacementItem[], boundaries: SecurityBoundaryDetail[], flows: TrafficFlowPath[]) {
  const focus = new Set<string>();
  if (devices.some((device) => ["firewall", "router", "core-switch", "distribution-switch", "access-switch"].includes(device.deviceType))) focus.add("placement");
  if (devices.some((device) => device.connectedSubnets.length > 0) || boundaries.some((boundary) => boundary.subnetCidrs.length > 0)) focus.add("addressing");
  if (boundaries.length > 0 || services.some((service) => service.serviceType === "dmz-service" || service.serviceType === "management-service")) focus.add("security");
  if (flows.length > 0) focus.add("flows");
  return Array.from(focus);
}

function summarizeDeviceRoles(devices: SitePlacementDevice[]) {
  const counts = new Map<string, number>();
  devices.forEach((device) => {
    const key = device.deviceType;
    counts.set(key, (counts.get(key) || 0) + device.quantity || 1);
  });
  return Array.from(counts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role));
}

function buildSiteCards(design: SynthesizedLogicalDesign): DiagramSiteReviewCard[] {
  return design.siteHierarchy.map((site) => {
    const devices = design.sitePlacements.filter((placement) => placement.siteId === site.id);
    const services = design.servicePlacements.filter((service) => service.siteId === site.id || service.siteName === site.name);
    const boundaries = design.securityBoundaries.filter((boundary) => boundary.siteName === site.name);
    const flows = design.trafficFlows.filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name);
    const edge = firstOfType(devices, ["firewall", "router", "cloud-edge"]);
    const switching = firstOfType(devices, ["core-switch", "distribution-switch", "access-switch"]);
    const wireless = firstOfType(devices, ["wireless-controller", "access-point"]);
    return {
      siteId: site.id,
      siteName: site.name,
      siteTier: design.topology.primarySiteId === site.id ? "primary" : design.topology.topologyType === "collapsed-core" ? "single-site" : "attached",
      topologyRole: pathEmphasis(design.topology, site.name, design.topology.primarySiteName),
      edgeAnchor: edge ? `${edge.deviceName} • ${edge.role}` : "Local edge not yet explicit",
      switchingAnchor: switching ? `${switching.deviceName} • ${switching.role}` : "Switch hierarchy not yet explicit",
      wirelessAnchor: wireless ? `${wireless.deviceName} • ${wireless.role}` : "Wireless layer not yet explicit",
      pathEmphasis: pathEmphasis(design.topology, site.name, design.topology.primarySiteName),
      serviceAnchor: services.slice(0, 3).map((service) => `${service.serviceName} • ${service.placementType}`),
      trustAnchor: boundaries.slice(0, 3).map((boundary) => `${boundary.zoneName} • ${boundary.attachedDevice}`),
      overlayFocus: overlayFocusForSite(devices, services, boundaries, flows),
    };
  });
}

function buildLinkObjects(design: SynthesizedLogicalDesign): DiagramLinkObject[] {
  const wanLinks: DiagramLinkObject[] = design.wanLinks.slice(0, 6).map((link: WanLinkPlanRow) => ({
    id: `wan-${link.id}`,
    category: "wan",
    label: link.linkName,
    from: `${link.endpointASiteName} • ${link.endpointAIp}`,
    to: `${link.endpointBSiteName} • ${link.endpointBIp}`,
    semantics: `${link.transport} routed transport`,
    reviewHint: link.parentBlockCidr ? `Confirm ${link.subnetCidr} stays inside ${link.parentBlockCidr}` : `Confirm ${link.subnetCidr} is visible as explicit transit`,
  }));

  const ingressLinks: DiagramLinkObject[] = design.servicePlacements
    .filter((service) => service.publishedExternally || service.placementType === "dmz" || service.serviceType === "cloud-service")
    .slice(0, 6)
    .map((service) => ({
      id: `svc-${service.id}`,
      category: "service-ingress",
      label: service.serviceName,
      from: service.ingressPath?.[0] || service.attachedDevice || service.siteName,
      to: service.ingressPath?.slice(-1)[0] || service.zoneName,
      semantics: `${service.placementType} service path`,
      reviewHint: service.subnetCidr ? `Confirm ${service.subnetCidr} and ${service.zoneName} appear behind the right device` : `Confirm ${service.zoneName} is attached to the right boundary`,
    }));

  const securityLinks: DiagramLinkObject[] = design.securityBoundaries.slice(0, 6).map((boundary) => ({
    id: `sec-${boundary.siteName}-${boundary.zoneName}`,
    category: "security-boundary",
    label: boundary.zoneName,
    from: boundary.attachedDevice,
    to: boundary.upstreamBoundary,
    semantics: boundary.controlPoint,
    reviewHint: `Check peers ${boundary.permittedPeers.join(', ') || 'none'} and policy anchor ${boundary.attachedInterface || boundary.attachedDevice}`,
  }));

  const flowLinks: DiagramLinkObject[] = design.trafficFlows.slice(0, 6).map((flow) => ({
    id: `flow-${flow.id}`,
    category: "traffic-flow",
    label: flow.flowLabel,
    from: flow.source,
    to: flow.destination,
    semantics: flow.routeModel,
    reviewHint: `Review NAT/policy: ${flow.natBehavior} • ${flow.enforcementPolicy}`,
  }));

  return [...wanLinks, ...ingressLinks, ...securityLinks, ...flowLinks];
}

function buildOverlayEvidence(design: SynthesizedLogicalDesign): DiagramOverlayEvidence[] {
  return [
    {
      overlay: "placement",
      count: design.sitePlacements.length,
      evidence: design.sitePlacements.slice(0, 4).map((placement) => `${placement.siteName} • ${placement.deviceName} • ${placement.role}`),
      reviewQuestion: "Do the placed devices match the chosen topology and site role?",
    },
    {
      overlay: "addressing",
      count: design.addressingPlan.length,
      evidence: design.addressingPlan.slice(0, 4).map((row) => `${row.siteName} • VLAN ${row.vlanId ?? '—'} • ${row.subnetCidr} • GW ${row.gatewayIp}`),
      reviewQuestion: "Can every subnet shown in the topology be traced back to an explicit block and gateway?",
    },
    {
      overlay: "security",
      count: design.securityBoundaries.length,
      evidence: design.securityBoundaries.slice(0, 4).map((boundary) => `${boundary.siteName} • ${boundary.zoneName} • ${boundary.attachedDevice}`),
      reviewQuestion: "Are trust boundaries attached to real devices and real peer relationships?",
    },
    {
      overlay: "flows",
      count: design.trafficFlows.length,
      evidence: design.trafficFlows.slice(0, 4).map((flow) => `${flow.flowLabel} • ${flow.path.join(' → ')}`),
      reviewQuestion: "Does the highlighted path match the expected control points, NAT posture, and route behavior?",
    },
  ];
}

function buildPatternRule(topology: TopologyBlueprint): DiagramPatternRule {
  if (topology.topologyType === "hub-spoke") {
    return {
      topologyType: topology.topologyType,
      title: "Hub-and-spoke review rule",
      signals: [
        `Primary hub should read as ${topology.primarySiteName || "central site"}`,
        "Branches should look dependent on the hub rather than fully standalone",
        "Shared services and DMZ should bias toward the central edge unless explicitly distributed",
      ],
      reviewPriority: ["hub concentration", "branch uplinks", "central breakout", "shared services"],
    };
  }
  if (topology.topologyType === "hybrid-cloud") {
    return {
      topologyType: topology.topologyType,
      title: "Hybrid-cloud review rule",
      signals: [
        "Cloud edge must be visible as a real boundary, not a floating cloud label",
        "Service placement should distinguish cloud-hosted vs on-prem",
        "Flows that cross the cloud boundary should visibly mention control and filtering",
      ],
      reviewPriority: ["cloud edge", "service placement", "cross-boundary flows", "identity/trust"],
    };
  }
  if (topology.topologyType === "multi-site") {
    return {
      topologyType: topology.topologyType,
      title: "Multi-site routed review rule",
      signals: [
        "Sites should read as connected routed domains, not campus closets",
        "Transit and summary behavior should be visible",
        "Local edge posture should still be clear at each site",
      ],
      reviewPriority: ["inter-site routing", "transit links", "local edge", "service anchors"],
    };
  }
  return {
    topologyType: topology.topologyType,
    title: "Collapsed-core review rule",
    signals: [
      "No fake WAN complexity should appear",
      "Core, edge, and segmentation should dominate the visual structure",
      "Local services and security boundaries should stay close to the site edge",
    ],
    reviewPriority: ["core-edge relationship", "switch hierarchy", "local services", "segmentation"],
  };
}

export function buildDiagramEngineeringPack(design: SynthesizedLogicalDesign): DiagramEngineeringPack {
  return {
    siteCards: buildSiteCards(design),
    linkObjects: buildLinkObjects(design),
    overlays: buildOverlayEvidence(design),
    patternRule: buildPatternRule(design.topology),
    deviceRoleCounts: summarizeDeviceRoles(design.sitePlacements),
  };
}
