import type { SecurityBoundaryDetail, ServicePlacementItem, SitePlacementDevice, SynthesizedLogicalDesign, TrafficFlowPath } from "./designSynthesis";

export interface DiagramDomainObject {
  id: string;
  domainType: "site-domain" | "security-zone" | "service-domain" | "route-domain";
  title: string;
  anchor: string;
  members: string[];
  reviewIntent: string;
}

export interface DiagramAdjacencyReviewRow {
  id: string;
  source: string;
  target: string;
  relationship: string;
  transport: string;
  controlPoint: string;
  expectedBehavior: string;
}

export interface DiagramPublishedEdgePath {
  id: string;
  serviceName: string;
  siteName: string;
  exposureType: string;
  ingressAnchor: string;
  deliveryAnchor: string;
  reviewNote: string;
}

export interface DiagramRenderDirective {
  title: string;
  focus: string[];
  expectedSignals: string[];
}

export interface DiagramReviewSequenceStep {
  step: number;
  title: string;
  whyItMatters: string;
  evidence: string[];
}

export interface DiagramObjectModelPack {
  domains: DiagramDomainObject[];
  adjacencies: DiagramAdjacencyReviewRow[];
  publishedPaths: DiagramPublishedEdgePath[];
  directives: DiagramRenderDirective[];
  sequence: DiagramReviewSequenceStep[];
}

function summarizeSiteDevices(devices: SitePlacementDevice[]) {
  const important = devices
    .map((device) => `${device.deviceName} • ${device.deviceType}`)
    .slice(0, 4);
  return important.length ? important : ["No explicit site devices yet"];
}

function summarizeZoneMembers(boundary: SecurityBoundaryDetail, services: ServicePlacementItem[]) {
  const serviceNames = services
    .filter((service) => service.zoneName === boundary.zoneName && service.siteName === boundary.siteName)
    .map((service) => service.serviceName);
  return [...boundary.subnetCidrs, ...serviceNames].slice(0, 5);
}

function summarizeFlowTargets(flows: TrafficFlowPath[]) {
  return flows.flatMap((flow) => [flow.source, flow.destination]).slice(0, 5);
}

export function buildDiagramObjectModelPack(design: SynthesizedLogicalDesign): DiagramObjectModelPack {
  const domains: DiagramDomainObject[] = [];

  design.siteHierarchy.forEach((site) => {
    const devices = design.sitePlacements.filter((device) => device.siteId === site.id);
    const flows = design.trafficFlows.filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name);
    domains.push({
      id: `site-${site.id}`,
      domainType: "site-domain",
      title: `${site.name} domain`,
      anchor: devices.find((device) => ["firewall", "router", "cloud-edge"].includes(device.deviceType))?.deviceName || "Edge not explicit",
      members: summarizeSiteDevices(devices),
      reviewIntent: flows.length ? `Confirm ${site.name} reads as a real site boundary with visible ingress/egress behavior.` : `Confirm ${site.name} still has visible edge and switching posture.`
    });
  });

  design.securityBoundaries.slice(0, 8).forEach((boundary, index) => {
    domains.push({
      id: `zone-${index}-${boundary.zoneName}`,
      domainType: "security-zone",
      title: `${boundary.siteName} • ${boundary.zoneName}`,
      anchor: boundary.attachedDevice,
      members: summarizeZoneMembers(boundary, design.servicePlacements),
      reviewIntent: `Check that ${boundary.zoneName} is visibly attached to ${boundary.attachedDevice} and not floating as generic text.`
    });
  });

  design.servicePlacements.slice(0, 8).forEach((service) => {
    domains.push({
      id: `service-${service.id}`,
      domainType: "service-domain",
      title: service.serviceName,
      anchor: service.attachedDevice || service.siteName,
      members: [service.placementType, service.zoneName, ...(service.dependsOn || []).slice(0, 3)],
      reviewIntent: `Confirm ${service.serviceName} appears behind the correct edge, zone, and path.`
    });
  });

  design.siteHierarchy.forEach((site) => {
    const flows = design.trafficFlows.filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name);
    domains.push({
      id: `route-${site.id}`,
      domainType: "route-domain",
      title: `${site.name} route domain`,
      anchor: design.topology.topologyType === 'hub-spoke' && site.id !== design.topology.primarySiteId ? (design.topology.primarySiteName || 'central hub') : site.name,
      members: summarizeFlowTargets(flows),
      reviewIntent: `Review whether traffic associated with ${site.name} follows the expected topology pattern and control points.`
    });
  });

  const adjacencies: DiagramAdjacencyReviewRow[] = [
    ...design.wanLinks.map((link) => ({
      id: `adj-wan-${link.id}`,
      source: link.endpointASiteName,
      target: link.endpointBSiteName,
      relationship: "WAN / routed adjacency",
      transport: link.transport,
      controlPoint: `${link.endpointAInterface} ↔ ${link.endpointBInterface}`,
      expectedBehavior: `Expose ${link.subnetCidr} as explicit transit, not as an unlabeled connector.`
    })),
    ...design.securityBoundaries.slice(0, 8).map((boundary, index) => ({
      id: `adj-boundary-${index}`,
      source: boundary.attachedDevice,
      target: boundary.upstreamBoundary,
      relationship: `${boundary.zoneName} boundary`,
      transport: boundary.controlPoint,
      controlPoint: boundary.attachedInterface || boundary.attachedDevice,
      expectedBehavior: `Show ${boundary.zoneName} as attached to a real control point with visible peer restrictions.`
    })),
    ...design.trafficFlows.slice(0, 8).map((flow) => ({
      id: `adj-flow-${flow.id}`,
      source: flow.source,
      target: flow.destination,
      relationship: flow.flowLabel,
      transport: flow.routeModel,
      controlPoint: flow.controlPoints.join(' • ') || 'Control point not explicit',
      expectedBehavior: `Path should visually support ${flow.natBehavior.toLowerCase()} and ${flow.enforcementPolicy.toLowerCase()}.`
    }))
  ].slice(0, 18);

  const publishedPaths: DiagramPublishedEdgePath[] = design.servicePlacements
    .filter((service) => service.publishedExternally || service.placementType === 'dmz' || service.serviceType === 'cloud-service')
    .slice(0, 8)
    .map((service) => ({
      id: service.id,
      serviceName: service.serviceName,
      siteName: service.siteName,
      exposureType: service.serviceType === 'cloud-service' ? 'Cloud exposure' : service.placementType === 'dmz' ? 'DMZ exposure' : 'Published service',
      ingressAnchor: service.ingressPath?.[0] || service.attachedDevice || service.siteName,
      deliveryAnchor: service.ingressPath?.slice(-1)[0] || service.zoneName,
      reviewNote: service.subnetCidr ? `Confirm ${service.subnetCidr} appears behind the right delivery boundary.` : `Confirm the service lands behind the correct zone and attached device.`
    }));

  const directives: DiagramRenderDirective[] = [
    {
      title: 'Placement-first rendering directive',
      focus: ['edge device', 'switch hierarchy', 'wireless layer', 'service anchor'],
      expectedSignals: ['Every site should show a believable edge role.', 'Shared services should not float without an attached domain.']
    },
    {
      title: 'Security-boundary rendering directive',
      focus: ['zone boundary', 'control point', 'management source', 'permitted peers'],
      expectedSignals: ['DMZ, guest, management, and server zones should attach to real devices.', 'Boundary labels should reflect peer restrictions and interface intent.']
    },
    {
      title: 'Traffic-path rendering directive',
      focus: ['flow path', 'route domain', 'NAT posture', 'policy checkpoint'],
      expectedSignals: ['Highlighted flows should explain traversal, not just destination.', 'Cloud or internet crossing should visibly imply control and filtering.']
    }
  ];

  const sequence: DiagramReviewSequenceStep[] = [
    {
      step: 1,
      title: 'Confirm placement and site anchors',
      whyItMatters: 'If device placement is weak, every later overlay becomes harder to trust.',
      evidence: design.sitePlacements.slice(0, 4).map((placement) => `${placement.siteName} • ${placement.deviceName} • ${placement.role}`)
    },
    {
      step: 2,
      title: 'Confirm route and adjacency behavior',
      whyItMatters: 'The topology must read differently for hub-spoke, campus, and cloud-connected designs.',
      evidence: adjacencies.slice(0, 4).map((row) => `${row.source} → ${row.target} • ${row.relationship}`)
    },
    {
      step: 3,
      title: 'Confirm zones and published paths',
      whyItMatters: 'Security and service exposure should be attached to real boundaries and ingress anchors.',
      evidence: publishedPaths.slice(0, 4).map((row) => `${row.serviceName} • ${row.ingressAnchor} → ${row.deliveryAnchor}`)
    },
    {
      step: 4,
      title: 'Confirm overlay evidence and path semantics',
      whyItMatters: 'Overlay toggles should expose real design objects, not decorative labels.',
      evidence: design.trafficFlows.slice(0, 4).map((flow) => `${flow.flowLabel} • ${flow.controlPoints.join(' • ') || flow.routeModel}`)
    }
  ];

  return { domains, adjacencies, publishedPaths, directives, sequence };
}
