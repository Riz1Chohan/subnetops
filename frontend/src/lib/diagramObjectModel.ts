import type { SynthesizedLogicalDesign } from "./designSynthesis";

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

export interface DiagramAuthorityGap {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  linkedObjects: string[];
}

export interface DiagramOverlaySignal {
  id: string;
  label: string;
  status: "ready" | "partial" | "pending";
  detail: string;
}

export interface DiagramTopologyView {
  id: string;
  label: string;
  status: "ready" | "partial" | "pending";
  detail: string;
}

export interface DiagramObjectModelPack {
  domains: DiagramDomainObject[];
  adjacencies: DiagramAdjacencyReviewRow[];
  publishedPaths: DiagramPublishedEdgePath[];
  directives: DiagramRenderDirective[];
  sequence: DiagramReviewSequenceStep[];
  authorityGaps: DiagramAuthorityGap[];
  overlaySignals: DiagramOverlaySignal[];
  topologyViews: DiagramTopologyView[];
}

function unique(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && `${value}`.trim()))));
}

function statusFromCounts(ready: number, partialHint: boolean) {
  if (ready > 0 && !partialHint) return "ready" as const;
  if (ready > 0 || partialHint) return "partial" as const;
  return "pending" as const;
}

export function buildDiagramObjectModelPack(design: SynthesizedLogicalDesign): DiagramObjectModelPack {
  const truth = design.designTruthModel;
  const placementById = new Map(design.sitePlacements.map((placement) => [placement.id, placement]));

  const domains: DiagramDomainObject[] = [
    ...truth.siteNodes.map((site) => ({
      id: `diagram-${site.id}`,
      domainType: "site-domain" as const,
      title: `${site.siteName} topology domain`,
      anchor: placementById.get(site.placementIds[0] || "")?.deviceName || truth.routeDomains.find((route) => route.id === site.routeDomainId)?.siteName || site.siteName,
      members: unique([
        truth.routeDomains.find((route) => route.id === site.routeDomainId)?.summaryAdvertisement,
        `${site.placementIds.length} placement object${site.placementIds.length === 1 ? "" : "s"}`,
        `${site.segmentIds.length} segment${site.segmentIds.length === 1 ? "" : "s"}`,
        `${site.boundaryIds.length} boundary${site.boundaryIds.length === 1 ? "" : "ies"}`,
      ]),
      reviewIntent: `Confirm ${site.siteName} reads as a real site with visible edge, route, zone, and traffic ownership.`,
    })),
    ...truth.boundaryDomains.slice(0, 12).map((boundary) => ({
      id: `diagram-${boundary.id}`,
      domainType: "security-zone" as const,
      title: `${boundary.siteName} • ${boundary.zoneName}`,
      anchor: boundary.attachedDevice,
      members: unique([
        ...boundary.segmentIds.slice(0, 3),
        ...boundary.permittedPeers.slice(0, 3),
        boundary.controlPoint,
      ]),
      reviewIntent: `Check that ${boundary.zoneName} is visibly attached to ${boundary.attachedDevice} and not floating as unanchored text.`,
    })),
    ...truth.serviceDomains.slice(0, 12).map((service) => ({
      id: `diagram-${service.id}`,
      domainType: "service-domain" as const,
      title: service.serviceName,
      anchor: placementById.get(service.attachedPlacementId || "")?.deviceName || service.siteName,
      members: unique([
        service.placementType,
        service.zoneName,
        service.subnetCidr,
        ...service.consumerSites.slice(0, 2),
      ]),
      reviewIntent: `Confirm ${service.serviceName} appears behind the correct boundary and route domain.`,
    })),
    ...truth.routeDomains.map((route) => ({
      id: `diagram-${route.id}`,
      domainType: "route-domain" as const,
      title: `${route.siteName} route domain`,
      anchor: route.summaryAdvertisement || route.siteName,
      members: unique([
        route.summaryAdvertisement,
        route.loopbackCidr,
        `${route.localSegmentIds.length} local segment${route.localSegmentIds.length === 1 ? "" : "s"}`,
        `${route.transitWanAdjacencyIds.length} WAN link${route.transitWanAdjacencyIds.length === 1 ? "" : "s"}`,
      ]),
      reviewIntent: `Review whether ${route.siteName} visibly owns summaries, transit links, and carried flows.`,
    })),
  ].slice(0, 28);

  const adjacencies: DiagramAdjacencyReviewRow[] = [
    ...truth.wanAdjacencies.map((wan) => ({
      id: `adj-${wan.id}`,
      source: wan.endpointASiteName,
      target: wan.endpointBSiteName,
      relationship: "WAN / routed adjacency",
      transport: wan.transport,
      controlPoint: wan.subnetCidr,
      expectedBehavior: `Expose ${wan.subnetCidr} as an explicit transit network instead of a generic connector.`,
    })),
    ...truth.boundaryDomains.slice(0, 10).map((boundary) => ({
      id: `adj-${boundary.id}`,
      source: boundary.attachedDevice,
      target: boundary.upstreamBoundary,
      relationship: `${boundary.zoneName} boundary`,
      transport: boundary.natPolicy,
      controlPoint: boundary.controlPoint,
      expectedBehavior: `Show ${boundary.zoneName} as a real control boundary with visible peer restrictions.`,
    })),
    ...truth.flowContracts.slice(0, 10).map((flow) => ({
      id: `adj-${flow.id}`,
      source: flow.source,
      target: flow.destination,
      relationship: flow.flowLabel,
      transport: flow.routeModel,
      controlPoint: flow.controlPoints.join(" • ") || "Control point still thin",
      expectedBehavior: `Path should visually support ${flow.natBehavior.toLowerCase()} and ${flow.enforcementPolicy.toLowerCase()}.`,
    })),
  ].slice(0, 24);

  const publishedPaths: DiagramPublishedEdgePath[] = truth.serviceDomains
    .filter((service) => service.placementType === "dmz" || service.serviceType === "cloud-service" || service.zoneName.toLowerCase().includes("dmz") || service.zoneName.toLowerCase().includes("public"))
    .slice(0, 10)
    .map((service) => {
      const serviceFlows = truth.flowContracts.filter((flow) => flow.serviceIds.includes(service.id));
      return {
        id: service.id,
        serviceName: service.serviceName,
        siteName: service.siteName,
        exposureType: service.serviceType === "cloud-service" ? "Cloud exposure" : service.placementType === "dmz" ? "DMZ exposure" : "Published service",
        ingressAnchor: serviceFlows[0]?.controlPoints[0] || placementById.get(service.attachedPlacementId || "")?.deviceName || service.siteName,
        deliveryAnchor: service.zoneName,
        reviewNote: service.subnetCidr
          ? `Confirm ${service.subnetCidr} appears behind the correct boundary and ingress anchor.`
          : `Confirm the service lands behind the correct edge and security domain.`,
      };
    });

  const directives: DiagramRenderDirective[] = [
    {
      title: "Authoritative topology rendering",
      focus: ["site anchor", "route domain", "boundary placement", "service anchor"],
      expectedSignals: [
        "Every major site should show a believable edge and route anchor.",
        "Boundary and service overlays should read from the same truth model, not separate guesses.",
      ],
    },
    {
      title: "Security and path rendering",
      focus: ["zone boundary", "control point", "flow path", "north-south edge"],
      expectedSignals: [
        "DMZ, guest, management, and service boundaries should attach to real devices.",
        "Highlighted flows should make path and enforcement meaning visible, not decorative.",
      ],
    },
    {
      title: "Overlay discipline",
      focus: ["addressing", "services", "flows", "trust boundaries"],
      expectedSignals: [
        "Each overlay should expose a distinct engineering question.",
        "The diagram should stay readable even when overlay evidence grows.",
      ],
    },
  ];

  const authorityGaps: DiagramAuthorityGap[] = unique([
    truth.routeDomains.some((route) => route.sourceModel === "inferred") ? "route-inference" : undefined,
    truth.boundaryDomains.some((boundary) => boundary.sourceModel === "inferred") ? "boundary-inference" : undefined,
    truth.unresolvedReferences.length > 0 ? "unresolved-refs" : undefined,
    truth.flowContracts.some((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0) ? "thin-flow-links" : undefined,
  ]).map((id) => {
    if (id === "route-inference") {
      const inferred = truth.routeDomains.filter((route) => route.sourceModel === "inferred");
      return {
        id,
        severity: inferred.length >= 3 ? "warning" as const : "info" as const,
        title: "Diagram still depends on inferred route domains",
        detail: `${inferred.length} route domain${inferred.length === 1 ? " is" : "s are"} still inferred, so some topology rendering is not yet fully authoritative.`,
        linkedObjects: inferred.map((route) => route.siteName),
      };
    }
    if (id === "boundary-inference") {
      const inferred = truth.boundaryDomains.filter((boundary) => boundary.sourceModel === "inferred");
      return {
        id,
        severity: inferred.length >= 3 ? "warning" as const : "info" as const,
        title: "Diagram still depends on inferred boundary domains",
        detail: `${inferred.length} boundary domain${inferred.length === 1 ? " is" : "s are"} still inferred instead of explicitly generated.`,
        linkedObjects: inferred.map((boundary) => `${boundary.siteName} • ${boundary.zoneName}`),
      };
    }
    if (id === "unresolved-refs") {
      return {
        id,
        severity: truth.unresolvedReferences.length >= 4 ? "critical" as const : "warning" as const,
        title: "Cross-object reference gaps still affect diagram trust",
        detail: `${truth.unresolvedReferences.length} unresolved reference${truth.unresolvedReferences.length === 1 ? " remains" : "s remain"} in the shared model.`,
        linkedObjects: truth.unresolvedReferences.slice(0, 5),
      };
    }
    return {
      id,
      severity: "warning",
      title: "Some flow paths still lack full route or boundary linkage",
      detail: `${truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length} flow contract${truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length === 1 ? " is" : "s are"} still only partly diagram-ready.`,
      linkedObjects: truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).slice(0, 5).map((flow) => flow.flowLabel),
    };
  });

  const overlaySignals: DiagramOverlaySignal[] = [
    {
      id: "overlay-logical",
      label: "Logical topology overlay",
      status: statusFromCounts(truth.siteNodes.length, false),
      detail: `${truth.siteNodes.length} site node${truth.siteNodes.length === 1 ? " is" : "s are"} available for a topology-first review view.`,
    },
    {
      id: "overlay-addressing",
      label: "Addressing overlay",
      status: statusFromCounts(design.addressingPlan.filter((row) => Boolean(row.zoneName)).length, design.addressingPlan.length > 0),
      detail: `${design.addressingPlan.length} subnet row${design.addressingPlan.length === 1 ? " is" : "s are"} available for subnet, gateway, and site mapping overlays.`,
    },
    {
      id: "overlay-security",
      label: "Security boundary overlay",
      status: statusFromCounts(truth.boundaryDomains.length, design.securityBoundaries.length > 0),
      detail: `${truth.boundaryDomains.length} boundary domain${truth.boundaryDomains.length === 1 ? " is" : "s are"} available for zone and control-point overlays.`,
    },
    {
      id: "overlay-flows",
      label: "Traffic-flow overlay",
      status: statusFromCounts(truth.flowContracts.length, design.trafficFlows.length > 0),
      detail: `${truth.flowContracts.length} flow contract${truth.flowContracts.length === 1 ? " is" : "s are"} available for path and enforcement overlays.`,
    },
  ];

  const topologyViews: DiagramTopologyView[] = [
    {
      id: "view-global",
      label: "Global logical topology",
      status: statusFromCounts(truth.siteNodes.length, false),
      detail: `Use this when the review question is architecture, hub placement, breakout, or cross-site dependency.`,
    },
    {
      id: "view-site",
      label: "Per-site topology",
      status: statusFromCounts(design.sitePlacements.length, design.siteHierarchy.length > 0),
      detail: `Use this for edge, switch, AP, service, and local boundary placement by site.`,
    },
    {
      id: "view-security",
      label: "Security boundary view",
      status: statusFromCounts(truth.boundaryDomains.length, design.securityBoundaries.length > 0),
      detail: `Use this for trust boundaries, permitted peers, and north-south enforcement points.`,
    },
    {
      id: "view-flows",
      label: "Traffic path view",
      status: statusFromCounts(truth.flowContracts.length, design.trafficFlows.length > 0),
      detail: `Use this for branch-to-hub, guest internet, published service, and shared-service traversal review.`,
    },
  ];

  const sequence: DiagramReviewSequenceStep[] = [
    {
      step: 1,
      title: "Confirm site and edge anchors",
      whyItMatters: "If site anchors are weak, every later overlay becomes harder to trust.",
      evidence: truth.siteNodes.slice(0, 4).map((site) => `${site.siteName} • ${site.placementIds.length} placements • ${site.boundaryIds.length} boundaries`),
    },
    {
      step: 2,
      title: "Confirm route and WAN posture",
      whyItMatters: "Topology-specific routing should visually differ for hub-spoke, collapsed-core, and hybrid-cloud plans.",
      evidence: truth.routeDomains.slice(0, 4).map((route) => `${route.siteName} • ${route.summaryAdvertisement || "summary pending"} • ${route.transitWanAdjacencyIds.length} WAN`),
    },
    {
      step: 3,
      title: "Confirm boundaries and service exposure",
      whyItMatters: "Security and exposure design should be attached to real devices and real path entry points.",
      evidence: truth.boundaryDomains.slice(0, 4).map((boundary) => `${boundary.siteName} • ${boundary.zoneName} • ${boundary.attachedDevice}`),
    },
    {
      step: 4,
      title: "Confirm flow overlays and enforcement",
      whyItMatters: "The diagram should explain traversal, not merely list source and destination labels.",
      evidence: truth.flowContracts.slice(0, 4).map((flow) => `${flow.flowLabel} • ${flow.controlPoints.join(" • ") || flow.routeModel}`),
    },
  ];

  return {
    domains,
    adjacencies,
    publishedPaths,
    directives,
    sequence,
    authorityGaps,
    overlaySignals,
    topologyViews,
  };
}
