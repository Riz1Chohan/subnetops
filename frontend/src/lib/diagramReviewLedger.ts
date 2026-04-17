import type { SynthesizedLogicalDesign } from "./designSynthesis";

export interface DiagramDependencyChain {
  siteName: string;
  chain: string[];
  confidence: "high" | "medium" | "low";
  note: string;
}

export interface BoundaryDriftRow {
  siteName: string;
  boundaryName: string;
  posture: string;
  controlPoint: string;
  driftRisk: "low" | "medium" | "high";
  nextAction: string;
}

export interface FlowCoverageRow {
  flowLabel: string;
  sourceSite: string;
  destinationSite: string;
  pathSteps: number;
  controlSteps: number;
  coverage: "strong" | "partial" | "thin";
  note: string;
}

export interface VisualUpgradeTrack {
  area: string;
  currentState: string;
  nextMove: string;
}

export interface DiagramReviewLedger {
  dependencyChains: DiagramDependencyChain[];
  boundaryDrift: BoundaryDriftRow[];
  flowCoverage: FlowCoverageRow[];
  visualUpgradeTrack: VisualUpgradeTrack[];
}

function confidence(level: number): "high" | "medium" | "low" {
  if (level >= 4) return "high";
  if (level >= 2) return "medium";
  return "low";
}

function coverage(level: number): "strong" | "partial" | "thin" {
  if (level >= 4) return "strong";
  if (level >= 2) return "partial";
  return "thin";
}

export function buildDiagramReviewLedger(synthesized: SynthesizedLogicalDesign): DiagramReviewLedger {
  const dependencyChains = synthesized.siteSummaries.map((site) => {
    const placements = synthesized.sitePlacements.filter((item) => item.siteId === site.id);
    const services = synthesized.servicePlacements.filter((item) => item.siteId === site.id || item.siteName === site.name);
    const flows = synthesized.trafficFlows.filter((item) => item.sourceSite === site.name || item.destinationSite === site.name);
    const chain = new Set<string>();
    placements.forEach((item) => {
      chain.add(item.deviceName);
      if (item.uplinkTarget) chain.add(item.uplinkTarget);
    });
    services.forEach((service) => service.dependsOn.forEach((dep) => chain.add(dep)));
    if (!chain.size) chain.add('Local anchor not explicit yet');
    const score = [placements.length > 0, services.length > 0, flows.length > 0, placements.some((item) => !!item.uplinkTarget)].filter(Boolean).length;
    return {
      siteName: site.name,
      chain: Array.from(chain).slice(0, 6),
      confidence: confidence(score),
      note: score >= 3
        ? 'This site has enough anchors to review upstream and downstream dependency posture.'
        : 'This site still needs clearer uplink, service, or path anchors.',
    };
  });

  const boundaryDrift = synthesized.securityBoundaries.slice(0, 18).map((boundary) => {
    const posture = boundary.permittedPeers.length
      ? `${boundary.zoneName} allows ${boundary.permittedPeers.slice(0, 2).join(', ')}`
      : `${boundary.zoneName} has no explicit peer list`;
    const driftRisk: "low" | "medium" | "high" =
      boundary.permittedPeers.length >= 2 && boundary.controlPoint ? 'low' : boundary.controlPoint ? 'medium' : 'high';
    return {
      siteName: boundary.siteName,
      boundaryName: boundary.boundaryName,
      posture,
      controlPoint: boundary.controlPoint || 'Control point not explicit yet',
      driftRisk,
      nextAction: driftRisk === 'low' ? 'Cross-check against flows and report wording.' : 'Tighten peers, control point, and path evidence for this boundary.',
    };
  });

  const flowCoverage = synthesized.trafficFlows.slice(0, 18).map((flow) => {
    const level = [flow.path.length >= 3, flow.controlPoints.length >= 1, !!flow.sourceSite, !!flow.destinationSite, !!flow.natBehavior].filter(Boolean).length;
    return {
      flowLabel: flow.flowLabel,
      sourceSite: flow.sourceSite || 'Source site not explicit',
      destinationSite: flow.destinationSite || 'Destination site not explicit',
      pathSteps: flow.path.length,
      controlSteps: flow.controlPoints.length,
      coverage: coverage(level),
      note: level >= 4
        ? 'This path is detailed enough to support diagram and report review.'
        : 'This path still needs stronger control, site, or NAT detail.',
    };
  });

  const visualUpgradeTrack: VisualUpgradeTrack[] = [
    {
      area: 'Device symbols',
      currentState: 'Firewall, router, switch, wireless, server, cloud, and internet visuals are differentiated.',
      nextMove: 'Increase icon depth further and align symbols more tightly with professional network-diagram expectations.',
    },
    {
      area: 'Link semantics',
      currentState: 'Routed, public, switched, VPN, HA, and highlighted-flow link meanings are called out.',
      nextMove: 'Bind line appearance more tightly to explicit link objects and adjacency classes.',
    },
    {
      area: 'Topology trust',
      currentState: 'Placement, boundaries, paths, and overlay evidence are now reviewed as separate layers.',
      nextMove: 'Promote those layers into stronger per-object highlighting and export-ready topology evidence.',
    },
  ];

  return { dependencyChains, boundaryDrift, flowCoverage, visualUpgradeTrack };
}
