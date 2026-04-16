import type { SynthesizedLogicalDesign } from "./designSynthesis";

export interface DiagramControlDomainRow {
  id: string;
  siteName: string;
  domainType: "routing" | "security" | "management" | "service" | "edge";
  anchor: string;
  members: string[];
  policyFocus: string;
  evidence: string[];
}

export interface DiagramPathContractRow {
  id: string;
  flowLabel: string;
  source: string;
  destination: string;
  transport: string;
  boundaryCrossings: string[];
  natExpectation: string;
  failureImpact: string;
}

export interface DiagramSiteConsistencyRow {
  siteId: string;
  siteName: string;
  topologyFit: string;
  missingAnchors: string[];
  overAssumedAreas: string[];
  trustScore: number;
}

export interface DiagramPublicationContract {
  id: string;
  serviceName: string;
  ingressAnchor: string;
  enforcementBoundary: string;
  deliveryAnchor: string;
  consumerModel: string;
  contractNote: string;
}

export interface DiagramReviewMilestone {
  id: string;
  title: string;
  objective: string;
  checks: string[];
  evidenceSources: string[];
}

export interface DiagramGovernancePack {
  controlDomains: DiagramControlDomainRow[];
  pathContracts: DiagramPathContractRow[];
  siteConsistency: DiagramSiteConsistencyRow[];
  publicationContracts: DiagramPublicationContract[];
  milestones: DiagramReviewMilestone[];
}

export function buildDiagramGovernancePack(design: SynthesizedLogicalDesign): DiagramGovernancePack {
  const controlDomains: DiagramControlDomainRow[] = design.siteHierarchy.flatMap((site) => {
    const placements = design.sitePlacements.filter((item) => item.siteId === site.id);
    const services = design.servicePlacements.filter((item) => item.siteId === site.id || item.siteName === site.name);
    const boundaries = design.securityBoundaries.filter((item) => item.siteName === site.name);
    const routePlan = (design.routePlan || design.routingPlan).find((item) => item.siteId === site.id);

    const rows: DiagramControlDomainRow[] = [];

    rows.push({
      id: `${site.id}-routing`,
      siteName: site.name,
      domainType: "routing",
      anchor: routePlan?.summaryAdvertisement || routePlan?.loopbackCidr || site.siteBlockCidr || "Routing identity not explicit",
      members: placements.filter((item) => ["router", "firewall", "cloud-edge", "core-switch"].includes(item.deviceType)).slice(0, 4).map((item) => item.deviceName),
      policyFocus: design.topology.topologyType === "hub-spoke"
        ? (site.id === design.topology.primarySiteId ? "Concentrate summaries and shared services at the primary site." : `Prefer upstream routing posture toward ${design.topology.primarySiteName || "the hub"}.`)
        : design.topology.topologyType === "collapsed-core"
          ? "Keep local routing and segmentation posture simple and visible inside the site."
          : "Expose routed-domain posture, transit, and summary behavior clearly.",
      evidence: [routePlan?.summaryAdvertisement, routePlan?.loopbackCidr, ...design.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id).slice(0, 2).map((link) => link.subnetCidr)].filter(Boolean) as string[],
    });

    rows.push({
      id: `${site.id}-security`,
      siteName: site.name,
      domainType: "security",
      anchor: boundaries[0]?.attachedDevice || placements.find((item) => item.deviceType === "firewall")?.deviceName || "Security anchor not explicit",
      members: boundaries.slice(0, 4).map((item) => item.zoneName),
      policyFocus: "Attach zones, peers, and enforcement points to real devices and visible paths.",
      evidence: boundaries.slice(0, 3).flatMap((item) => [item.zoneName, item.controlPoint]).filter(Boolean),
    });

    rows.push({
      id: `${site.id}-service`,
      siteName: site.name,
      domainType: "service",
      anchor: services[0]?.attachedDevice || services[0]?.siteName || "Service anchor not explicit",
      members: services.slice(0, 4).map((item) => item.serviceName),
      policyFocus: "Show where critical services actually land and who consumes them.",
      evidence: services.slice(0, 3).flatMap((item) => [item.serviceName, item.subnetCidr, item.zoneName]).filter(Boolean) as string[],
    });

    if (boundaries.some((item) => /management/i.test(item.zoneName)) || services.some((item) => item.serviceType === "management-service")) {
      rows.push({
        id: `${site.id}-management`,
        siteName: site.name,
        domainType: "management",
        anchor: boundaries.find((item) => /management/i.test(item.zoneName))?.attachedDevice || services.find((item) => item.serviceType === "management-service")?.attachedDevice || "Management anchor not explicit",
        members: [
          ...boundaries.filter((item) => /management/i.test(item.zoneName)).map((item) => item.zoneName),
          ...services.filter((item) => item.serviceType === "management-service").map((item) => item.serviceName),
        ].slice(0, 4),
        policyFocus: "Management paths should read as restricted-control traffic, not broad user reachability.",
        evidence: boundaries.filter((item) => /management/i.test(item.zoneName)).flatMap((item) => [item.managementSource, item.controlPoint]).filter(Boolean),
      });
    }

    if (placements.some((item) => ["firewall", "router", "cloud-edge"].includes(item.deviceType))) {
      rows.push({
        id: `${site.id}-edge`,
        siteName: site.name,
        domainType: "edge",
        anchor: placements.find((item) => ["firewall", "router", "cloud-edge"].includes(item.deviceType))?.deviceName || "Edge not explicit",
        members: placements.filter((item) => ["firewall", "router", "cloud-edge"].includes(item.deviceType)).slice(0, 4).map((item) => item.deviceName),
        policyFocus: "Public ingress, WAN transit, DMZ exposure, and cloud crossing should terminate at the visible edge.",
        evidence: [...design.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id).slice(0, 2).map((link) => link.transport), ...boundaries.slice(0, 2).map((item) => item.natPolicy)].filter(Boolean),
      });
    }

    return rows;
  });

  const pathContracts: DiagramPathContractRow[] = design.trafficFlows.slice(0, 14).map((flow) => ({
    id: flow.id,
    flowLabel: flow.flowLabel,
    source: `${flow.sourceSite || flow.source} • ${flow.sourceZone}`,
    destination: `${flow.destinationSite || flow.destination} • ${flow.destinationZone}`,
    transport: flow.routeModel,
    boundaryCrossings: flow.controlPoints.length ? flow.controlPoints : [flow.enforcementPolicy],
    natExpectation: flow.natBehavior,
    failureImpact: flow.policyNotes[0] || flow.enforcementPolicy,
  }));

  const siteConsistency: DiagramSiteConsistencyRow[] = design.siteHierarchy.map((site) => {
    const placements = design.sitePlacements.filter((item) => item.siteId === site.id);
    const boundaries = design.securityBoundaries.filter((item) => item.siteName === site.name);
    const services = design.servicePlacements.filter((item) => item.siteId === site.id || item.siteName === site.name);
    const hasEdge = placements.some((item) => ["firewall", "router", "cloud-edge"].includes(item.deviceType));
    const hasSwitching = placements.some((item) => ["core-switch", "distribution-switch", "access-switch"].includes(item.deviceType));
    const hasBoundary = boundaries.length > 0;
    const missingAnchors = [
      hasEdge ? null : "Edge device / transit anchor",
      hasSwitching ? null : "Switching hierarchy",
      hasBoundary ? null : "Security boundary",
      services.length > 0 ? null : "Service anchor",
    ].filter(Boolean) as string[];

    const overAssumedAreas: string[] = [];
    if (design.topology.topologyType === "hub-spoke" && site.id !== design.topology.primarySiteId && services.some((item) => item.placementType === "centralized")) {
      overAssumedAreas.push("Branch shows centralized-service posture that should probably remain at the primary site.");
    }
    if (design.topology.topologyType === "collapsed-core" && design.wanLinks.some((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id)) {
      overAssumedAreas.push("Collapsed-core pattern still shows WAN/transit behavior that may be stronger than needed.");
    }
    if (design.topology.cloudConnected && !placements.some((item) => item.deviceType === "cloud-edge") && site.id === design.topology.primarySiteId) {
      overAssumedAreas.push("Cloud-connected design without an obvious cloud-edge anchor at the primary posture site.");
    }

    const topologyFit = site.id === design.topology.primarySiteId
      ? "Primary / shared-service / policy concentration posture"
      : design.topology.topologyType === "hub-spoke"
        ? "Attached branch / upstream-dependent posture"
        : design.topology.topologyType === "collapsed-core"
          ? "Single-site or campus-local posture"
          : "Attached routed-site posture";

    const trustScore = Math.max(25, 100 - missingAnchors.length * 18 - overAssumedAreas.length * 12);
    return { siteId: site.id, siteName: site.name, topologyFit, missingAnchors, overAssumedAreas, trustScore };
  });

  const publicationContracts: DiagramPublicationContract[] = design.servicePlacements
    .filter((item) => item.publishedExternally || item.placementType === "dmz" || item.serviceType === "cloud-service")
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      serviceName: item.serviceName,
      ingressAnchor: item.ingressPath?.[0] || item.ingressInterface || item.attachedDevice || item.siteName,
      enforcementBoundary: item.zoneName,
      deliveryAnchor: item.upstreamDevice || item.attachedDevice || item.siteName,
      consumerModel: item.consumers.length ? item.consumers.slice(0, 3).join(", ") : "Consumers not explicit yet",
      contractNote: item.subnetCidr
        ? `Keep ${item.subnetCidr} behind ${item.zoneName} with visible ingress and enforcement posture.`
        : `Make ${item.serviceName} land behind a visible zone, edge, and delivery anchor.`,
    }));

  const milestones: DiagramReviewMilestone[] = [
    {
      id: "milestone-placement",
      title: "Placement and anchor confidence",
      objective: "Make sure each site has believable edge, switching, service, and control anchors before trusting overlays.",
      checks: [
        "Every site has an edge or transit anchor.",
        "Switching is visible as hierarchy, not implied only by labels.",
        "Primary or hub posture is obvious where required.",
      ],
      evidenceSources: ["site placements", "site consistency rows", "device role counts"],
    },
    {
      id: "milestone-boundaries",
      title: "Boundary and policy confidence",
      objective: "Attach zones, control points, and management posture to real devices and paths.",
      checks: [
        "DMZ, guest, and management stay behind visible boundaries.",
        "Published-service paths terminate at real edge or enforcement anchors.",
        "Management reads as restricted-control traffic.",
      ],
      evidenceSources: ["security boundaries", "publication contracts", "control domains"],
    },
    {
      id: "milestone-paths",
      title: "Path and transport confidence",
      objective: "Review whether flows, route posture, NAT expectations, and transport meaning are consistent with the selected topology.",
      checks: [
        "Critical flows expose boundary crossings and control points.",
        "WAN, cloud, and public ingress behave differently in the review model.",
        "Route-domain behavior matches the topology pattern.",
      ],
      evidenceSources: ["path contracts", "route domains", "rendering semantics"],
    },
  ];

  return { controlDomains, pathContracts, siteConsistency, publicationContracts, milestones };
}
