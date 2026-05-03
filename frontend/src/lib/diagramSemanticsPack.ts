import type { SynthesizedLogicalDesign } from "./designSynthesis.types";

export interface DiagramRouteDomainReview {
  id: string;
  title: string;
  anchor: string;
  summaries: string[];
  transit: string[];
  defaultBehavior: string;
  reviewNote: string;
}

export interface DiagramServiceExposureReview {
  id: string;
  serviceName: string;
  siteName: string;
  exposurePath: string[];
  controlBoundary: string;
  consumerModel: string;
  reviewNote: string;
}

export interface DiagramOverlayPreset {
  key: string;
  title: string;
  focus: string[];
  verify: string[];
}

export interface DiagramSitePostureReview {
  siteId: string;
  siteName: string;
  placementPosture: string;
  edgePosture: string;
  servicePosture: string;
  controlPosture: string;
  routingPosture: string;
}

export interface DiagramRenderingSemantic {
  id: string;
  title: string;
  lineMeaning: string;
  whenToUse: string;
  expectedVisibleSignal: string;
}

export interface DiagramSemanticsPack {
  routeDomains: DiagramRouteDomainReview[];
  serviceExposure: DiagramServiceExposureReview[];
  overlayPresets: DiagramOverlayPreset[];
  sitePostures: DiagramSitePostureReview[];
  renderingSemantics: DiagramRenderingSemantic[];
}

export function buildDiagramSemanticsPack(design: SynthesizedLogicalDesign): DiagramSemanticsPack {
  const routeDomains: DiagramRouteDomainReview[] = design.siteHierarchy.map((site) => {
    const localAddressing = design.addressingPlan.filter((row) => row.siteName === site.name).slice(0, 4).map((row) => `${row.subnetCidr} • ${row.roleLabel || row.zoneName || row.segmentName || 'segment'}`);
    const transit = design.wanLinks.filter((link) => link.endpointASiteName === site.name || link.endpointBSiteName === site.name).slice(0, 3).map((link) => `${link.subnetCidr} • ${link.transport}`);
    const isPrimary = site.id === design.topology.primarySiteId;
    const defaultBehavior = design.topology.topologyType === 'hub-spoke'
      ? (isPrimary ? 'Acts as hub/default-service concentration point' : `Prefers uplink toward ${design.topology.primarySiteName || 'hub'} for shared services`)
      : design.topology.topologyType === 'collapsed-core'
        ? 'Local site carries its own edge and segmentation behavior'
        : design.topology.topologyType === 'hybrid-cloud'
          ? 'Must account for cloud edge and cross-boundary control'
          : 'Participates as a routed domain with explicit uplinks and local posture';
    return {
      id: `route-domain-${site.id}`,
      title: `${site.name} route domain`,
      anchor: isPrimary ? (design.topology.primarySiteName || site.name) : site.name,
      summaries: localAddressing.length ? localAddressing : ['No local subnets synthesized yet'],
      transit: transit.length ? transit : ['No explicit transit links yet'],
      defaultBehavior,
      reviewNote: 'Review whether local subnets, transit links, and default path expectations all match the selected topology pattern.'
    };
  });

  const serviceExposure: DiagramServiceExposureReview[] = design.servicePlacements
    .filter((service) => service.publishedExternally || service.placementType === 'dmz' || service.serviceType === 'cloud-service' || service.serviceType === 'shared-service')
    .slice(0, 10)
    .map((service) => ({
      id: `service-exposure-${service.id}`,
      serviceName: service.serviceName,
      siteName: service.siteName,
      exposurePath: service.ingressPath?.length ? service.ingressPath : [service.attachedDevice || service.siteName, service.zoneName],
      controlBoundary: service.attachedDevice || service.zoneName,
      consumerModel: service.consumers.length ? service.consumers.slice(0, 3).join(', ') : 'Consumer set not yet explicit',
      reviewNote: service.subnetCidr
        ? `Confirm ${service.subnetCidr} stays behind ${service.zoneName} and ${service.attachedDevice || 'the expected boundary'}.`
        : 'Confirm the service lands behind a real device, zone, and ingress path.'
    }));

  const overlayPresets: DiagramOverlayPreset[] = [
    {
      key: 'placement-baseline',
      title: 'Placement baseline',
      focus: ['edge device', 'switching hierarchy', 'service anchors', 'cloud/WAN edge'],
      verify: ['Every site has a believable edge role.', 'Shared services attach to a real domain.']
    },
    {
      key: 'addressing-trace',
      title: 'Addressing trace',
      focus: ['site blocks', 'subnet labels', 'gateway anchors', 'transit subnets'],
      verify: ['Subnets can be traced from the diagram back into the addressing plan.', 'Transit and DMZ ranges are visible when relevant.']
    },
    {
      key: 'security-enforcement',
      title: 'Security enforcement',
      focus: ['zone boundaries', 'peer restrictions', 'management source', 'published ingress'],
      verify: ['Security boundaries attach to real devices.', 'Guest, DMZ, and management posture are not implied only by text.']
    },
    {
      key: 'critical-paths',
      title: 'Critical paths',
      focus: ['user to service', 'branch to hub', 'internet to DMZ', 'cloud crossing'],
      verify: ['Control points appear in the path.', 'NAT and filtering posture read correctly from the topology.']
    }
  ];

  const sitePostures: DiagramSitePostureReview[] = design.siteHierarchy.map((site) => {
    const devices = design.sitePlacements.filter((row) => row.siteId === site.id);
    const services = design.servicePlacements.filter((row) => row.siteId === site.id || row.siteName === site.name);
    const boundaries = design.securityBoundaries.filter((row) => row.siteName === site.name);
    const flows = design.trafficFlows.filter((row) => row.sourceSite === site.name || row.destinationSite === site.name);
    const edgePosture = devices.some((row) => ['firewall','router','cloud-edge'].includes(row.deviceType)) ? 'Edge anchored' : 'Edge not yet explicit';
    const placementPosture = devices.length >= 3 ? 'Multi-role site placement visible' : devices.length > 0 ? 'Basic placement visible' : 'Placement still thin';
    const servicePosture = services.length ? services.slice(0, 2).map((row) => row.serviceName).join(' • ') : 'No local service anchors';
    const controlPosture = boundaries.length ? boundaries.slice(0, 2).map((row) => row.zoneName).join(' • ') : 'Boundary posture weak';
    const routingPosture = flows.length ? flows.slice(0, 2).map((row) => row.flowLabel).join(' • ') : 'No site flows synthesized';
    return { siteId: site.id, siteName: site.name, placementPosture, edgePosture, servicePosture, controlPosture, routingPosture };
  });

  const renderingSemantics: DiagramRenderingSemantic[] = [
    {
      id: 'routed-handoff',
      title: 'Routed handoff',
      lineMeaning: 'Layer-3 adjacency or WAN transit between explicit routing domains',
      whenToUse: 'Use between sites, edges, cloud gateways, or routers carrying transit behavior.',
      expectedVisibleSignal: 'Transit subnet or uplink meaning should be inferable from the review context.'
    },
    {
      id: 'switched-carriage',
      title: 'Switched / trunk carriage',
      lineMeaning: 'Switching-layer or VLAN-bearing connection inside a site or edge domain',
      whenToUse: 'Use for core-to-distribution, distribution-to-access, or edge-to-switch carriage.',
      expectedVisibleSignal: 'Hierarchy should be obvious and not look like arbitrary site-to-site routing.'
    },
    {
      id: 'public-ingress',
      title: 'Public / published ingress',
      lineMeaning: 'Internet-facing access toward DMZ, published service, or controlled cloud edge',
      whenToUse: 'Use where outside users or public paths terminate at a real boundary.',
      expectedVisibleSignal: 'The control point should be visually closer to the edge than the service consumer.'
    },
    {
      id: 'restricted-control',
      title: 'Restricted control or management path',
      lineMeaning: 'Management-only or limited-control adjacency rather than broad user reachability',
      whenToUse: 'Use for management zones, administrative reachability, or limited east-west control.',
      expectedVisibleSignal: 'The path should read as special-purpose, not general user traffic.'
    }
  ];

  return { routeDomains, serviceExposure, overlayPresets, sitePostures, renderingSemantics };
}
