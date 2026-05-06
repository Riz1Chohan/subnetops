import type { SynthesizedLogicalDesign } from "./designSynthesis.types";

export interface DiagramControlDomainRow {
  site: string;
  domainType: string;
  anchor: string;
  members: string[];
  policyFocus: string;
  evidence: string[];
}

export interface DiagramPathContractRow {
  flow: string;
  source: string;
  destination: string;
  transport: string;
  boundaryCrossings: string[];
  note: string;
}

export interface DiagramPublicationContractRow {
  service: string;
  ingressAnchor: string;
  enforcementBoundary: string;
  deliveryAnchor: string;
  consumerModel: string;
  note: string;
}

export interface DiagramReviewMilestone {
  title: string;
  objective: string;
  checks: string[];
  evidence: string[];
}

export interface DiagramGovernancePack {
  controlDomains: DiagramControlDomainRow[];
  pathContracts: DiagramPathContractRow[];
  publicationContracts: DiagramPublicationContractRow[];
  milestones: DiagramReviewMilestone[];
}

export function buildDiagramGovernancePack(design: SynthesizedLogicalDesign): DiagramGovernancePack {
  const controlDomains = design.siteHierarchy.map((site) => ({
    site: site.name,
    domainType: design.topology.topologyType === 'collapsed-core' ? 'local control domain' : site.id === design.topology.primarySiteId ? 'primary control domain' : 'branch control domain',
    anchor: design.sitePlacements.find((d) => d.siteId === site.id && ['firewall','router','core-switch'].includes(d.deviceType))?.deviceName || 'Control anchor not synthesized',
    members: design.addressingPlan.filter((row) => row.siteId === site.id).slice(0,4).map((row) => row.segmentName),
    policyFocus: design.securityBoundaries.find((b) => b.siteName === site.name)?.controlPoint || 'Boundary / policy point still thin',
    evidence: [
      `${design.addressingPlan.filter((row) => row.siteId === site.id).length} addressing rows`,
      `${design.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id).length} WAN links`,
    ],
  }));

  const pathContracts = design.trafficFlows.slice(0,8).map((flow) => ({
    flow: flow.flowLabel,
    source: flow.source,
    destination: flow.destination,
    transport: flow.routeModel,
    boundaryCrossings: flow.controlPoints,
    note: flow.natBehavior,
  }));

  const publicationContracts = design.servicePlacements
    .filter((servicePlacement) => servicePlacement.publishedExternally || servicePlacement.placementType === 'dmz' || servicePlacement.placementType === 'cloud')
    .slice(0, 6)
    .map((servicePlacement) => ({
      service: servicePlacement.serviceName,
      ingressAnchor: servicePlacement.ingressInterface || servicePlacement.attachedDevice || 'Published ingress not explicit yet',
      enforcementBoundary: design.securityBoundaries.find((boundary) => boundary.siteName === servicePlacement.siteName && boundary.zoneName === servicePlacement.zoneName)?.controlPoint || servicePlacement.zoneName,
      deliveryAnchor: servicePlacement.attachedDevice || servicePlacement.siteName,
      consumerModel: servicePlacement.consumers.join(', ') || 'External / shared consumers',
      note: servicePlacement.notes[0] || 'Review service exposure path and control boundary.',
    }));

  const milestones = [
    { title: 'Placement and anchor confidence', objective: 'Confirm every site has believable edge, switching, and service anchors.', checks: ['Edge / WAN anchor visible', 'Switching layer visible', 'Primary service anchor visible'], evidence: ['Site placements', 'Addressing rows'] },
    { title: 'Boundary and policy confidence', objective: 'Confirm boundaries and control points match visible topology anchors.', checks: ['Boundary mapped to a device', 'Permitted peers are plausible', 'Management path is explicit'], evidence: ['Security boundaries', 'Service placements'] },
    { title: 'Path and transport confidence', objective: 'Confirm critical paths are traceable through the selected topology.', checks: ['Shared-service path is explicit', 'Internet / guest path is explicit', 'Published-service path is explicit'], evidence: ['Traffic flows', 'WAN links'] },
  ];

  return { controlDomains, pathContracts, publicationContracts, milestones };
}
