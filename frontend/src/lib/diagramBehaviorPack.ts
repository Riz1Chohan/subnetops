import type { SynthesizedLogicalDesign } from "./designSynthesis";

export interface DiagramCrossSitePathContract {
  id: string;
  flowLabel: string;
  sourceSite: string;
  targetSite: string;
  routeExpectation: string;
  serviceAnchor: string;
  boundarySteps: string[];
  reviewPriority: "high" | "medium" | "low";
}

export interface DiagramBoundaryEnforcementReview {
  id: string;
  siteName: string;
  boundaryName: string;
  zoneName: string;
  subnets: string[];
  controlPoint: string;
  allowedPeers: string[];
  deniedIntent: string;
  evidence: string[];
}

export interface DiagramOverlayChoreographyStep {
  id: string;
  title: string;
  sequence: string[];
  lookFor: string[];
  evidence: string[];
}

export interface DiagramSiteAnchorGap {
  siteId: string;
  siteName: string;
  missingAnchors: string[];
  weakSignals: string[];
  nextBestAnchor: string;
}

export interface DiagramRenderIntentRule {
  id: string;
  scenario: string;
  placementRule: string;
  pathRule: string;
  boundaryRule: string;
  iconIntent: string;
}

export interface DiagramBehaviorPack {
  crossSitePaths: DiagramCrossSitePathContract[];
  boundaryEnforcement: DiagramBoundaryEnforcementReview[];
  overlayChoreography: DiagramOverlayChoreographyStep[];
  siteAnchorGaps: DiagramSiteAnchorGap[];
  renderIntentRules: DiagramRenderIntentRule[];
}

export function buildDiagramBehaviorPack(design: SynthesizedLogicalDesign): DiagramBehaviorPack {
  const crossSitePaths: DiagramCrossSitePathContract[] = design.trafficFlows
    .filter((flow) => flow.sourceSite && flow.destinationSite && flow.sourceSite !== flow.destinationSite)
    .slice(0, 8)
    .map((flow, index) => ({
      id: flow.id || `cross-site-${index}`,
      flowLabel: flow.flowLabel,
      sourceSite: flow.sourceSite || "Source site",
      targetSite: flow.destinationSite || "Target site",
      routeExpectation: flow.routeModel,
      serviceAnchor: flow.controlPoints[0] || flow.path[0] || "Shared service boundary",
      boundarySteps: [...flow.path.slice(0, 3), ...flow.controlPoints.slice(0, 2)].slice(0, 5),
      reviewPriority:
        flow.enforcementPolicy.toLowerCase().includes("deny") || flow.natBehavior.toLowerCase().includes("nat")
          ? "high"
          : flow.routeModel.toLowerCase().includes("hub")
            ? "medium"
            : "low",
    }));

  const boundaryEnforcement: DiagramBoundaryEnforcementReview[] = design.securityBoundaries.slice(0, 10).map((boundary, index) => ({
    id: `${boundary.siteName}-${boundary.zoneName}-${index}`,
    siteName: boundary.siteName,
    boundaryName: boundary.boundaryName,
    zoneName: boundary.zoneName,
    subnets: boundary.subnetCidrs.slice(0, 3),
    controlPoint: boundary.controlPoint || boundary.attachedDevice || "Boundary control not explicit",
    allowedPeers: boundary.permittedPeers.slice(0, 3),
    deniedIntent: boundary.eastWestPolicy || boundary.inboundPolicy || "Default restrictions should be reviewed",
    evidence: [boundary.attachedDevice, boundary.upstreamBoundary, ...(boundary.notes || [])].filter(Boolean).slice(0, 4),
  }));

  const overlayChoreography: DiagramOverlayChoreographyStep[] = [
    {
      id: "placement",
      title: "Placement → Addressing trace",
      sequence: [
        "Confirm primary, branch, and cloud anchor placement first.",
        "Turn on addressing next and trace subnets back to the placed devices.",
        "Check whether WAN and transit links land on the expected site edge.",
      ],
      lookFor: [
        "Site blocks behind the right edge or core objects",
        "Transit or WAN links tied to the intended hubs",
        "Management and DMZ placement separated from user access domains",
      ],
      evidence: ["site placements", "addressing plan", "WAN links"],
    },
    {
      id: "security",
      title: "Security → Flow confirmation",
      sequence: [
        "Read trust boundaries before inspecting any highlighted flow path.",
        "Verify the control point or firewall boundary on every critical crossing.",
        "Confirm guest, management, and published-service paths stay constrained.",
      ],
      lookFor: [
        "Boundary labels match real zones or subnets",
        "Flow overlay crosses the expected control devices",
        "Published or DMZ paths do not bypass perimeter enforcement",
      ],
      evidence: ["security boundaries", "traffic flows", "service placements"],
    },
    {
      id: "handoff",
      title: "Topology → Handoff review",
      sequence: [
        "Review the default topology mode first.",
        "Use overlays to prove the architecture pattern, not replace it.",
        "Capture any missing anchors before using the diagram in reports or handoff.",
      ],
      lookFor: [
        "Hub-spoke versus local-edge behavior is visible",
        "Cloud or internet edge is explicit when required",
        "No generic site appears without a clear role",
      ],
      evidence: ["topology object", "render intent rules", "site anchor gap review"],
    },
  ]

  const siteAnchorGaps: DiagramSiteAnchorGap[] = design.siteHierarchy.map((site) => {
    const placements = design.sitePlacements.filter((item) => item.siteId === site.id);
    const flows = design.trafficFlows.filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name);
    const boundaries = design.securityBoundaries.filter((item) => item.siteName === site.name);
    const missingAnchors: string[] = [];
    if (!placements.some((item) => ["firewall", "router", "cloud-edge"].includes(item.deviceType))) {
      missingAnchors.push("No explicit edge / firewall anchor");
    }
    if (!placements.some((item) => ["core-switch", "distribution-switch", "access-switch"].includes(item.deviceType))) {
      missingAnchors.push("No explicit switching anchor");
    }
    if (!boundaries.length) {
      missingAnchors.push("No explicit boundary object");
    }
    const weakSignals: string[] = [];
    if (!flows.length) weakSignals.push("No cross-site or local critical flow evidence yet");
    if (!design.servicePlacements.some((servicePlacement) => servicePlacement.siteName === site.name)) weakSignals.push("No service anchor recorded for this site");
    return {
      siteId: site.id,
      siteName: site.name,
      missingAnchors,
      weakSignals,
      nextBestAnchor:
        missingAnchors[0]
        || weakSignals[0]
        || "Site anchor set looks usable for diagram review",
    };
  });

  const renderIntentRules: DiagramRenderIntentRule[] = [
    {
      id: "hub-spoke",
      scenario: "Hub-and-spoke / centralized services",
      placementRule: "Hub site should visually dominate shared services, management, and DMZ placement.",
      pathRule: "Branch critical paths should usually converge through the hub before reaching shared services.",
      boundaryRule: "Perimeter and inter-site control should be clearest at the hub edge.",
      iconIntent: "Use stronger central firewall/core symbols and lighter branch-edge emphasis.",
    },
    {
      id: "collapsed-core",
      scenario: "Single-site or collapsed-core campus",
      placementRule: "Keep the local edge, switching, and server/service anchors tightly grouped.",
      pathRule: "Most critical paths should stay local and short unless cloud or remote access is selected.",
      boundaryRule: "Segmentation and internet edge boundaries should dominate over WAN constructs.",
      iconIntent: "Use heavier local switching/core identity and avoid implying fake branch complexity.",
    },
    {
      id: "hybrid-cloud",
      scenario: "Hybrid / cloud-connected topology",
      placementRule: "Cloud edge and hosted service symbols must be explicit, not implied.",
      pathRule: "Shared-service or remote paths should show the cloud boundary as a real step.",
      boundaryRule: "Trust and identity boundaries should visibly account for cloud entry/exit.",
      iconIntent: "Use cloud and edge symbols as first-class objects rather than decorative labels.",
    },
  ];

  return {
    crossSitePaths,
    boundaryEnforcement,
    overlayChoreography,
    siteAnchorGaps,
    renderIntentRules,
  };
}
