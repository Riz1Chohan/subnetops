import type { SynthesizedLogicalDesign } from "./designSynthesis";

export interface ReachabilityProofRow {
  id: string;
  serviceName: string;
  consumer: string;
  sourceSite: string;
  targetSite: string;
  pathSummary: string;
  boundarySummary: string;
  confidence: "high" | "medium" | "low";
  note: string;
}

export interface DependencyProofCard {
  id: string;
  siteName: string;
  siteRole: string;
  dependencies: string[];
  evidence: string[];
  trustStatement: string;
}

export interface OverlayAuditRow {
  overlay: string;
  objective: string;
  availableEvidence: string[];
  missingEvidence: string[];
  reviewAction: string;
}

export interface TopologyConsistencyRow {
  id: string;
  siteName: string;
  selectedPattern: string;
  observedPosture: string;
  consistency: "strong" | "partial" | "weak";
  driftRisk: string;
  nextCheck: string;
}

export interface RenderingConfidenceRow {
  area: string;
  currentSignal: string;
  nextUpgrade: string;
}

export interface DiagramProofPack {
  reachability: ReachabilityProofRow[];
  dependencyProofs: DependencyProofCard[];
  overlayAudit: OverlayAuditRow[];
  consistencyRows: TopologyConsistencyRow[];
  renderingConfidence: RenderingConfidenceRow[];
}

function confidenceForEvidence(score: number): "high" | "medium" | "low" {
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function buildDiagramProofPack(synthesized: SynthesizedLogicalDesign): DiagramProofPack {
  const reachability = synthesized.servicePlacements.slice(0, 12).map((service) => {
    const matchingFlow = synthesized.trafficFlows.find((flow) => {
      const label = `${flow.destination} ${flow.destinationZone} ${flow.flowLabel}`.toLowerCase();
      return label.includes(service.serviceName.toLowerCase()) || flow.destinationZone.toLowerCase() === service.zoneName.toLowerCase();
    });
    const evidenceScore = [service.attachedDevice, service.ingressPath?.length, matchingFlow?.controlPoints.length, service.subnetCidr].filter(Boolean).length;
    return {
      id: service.id,
      serviceName: service.serviceName,
      consumer: service.consumers[0] || "Shared consumers not stated",
      sourceSite: matchingFlow?.sourceSite || synthesized.topology.primarySiteName || service.siteName,
      targetSite: service.siteName,
      pathSummary: matchingFlow ? matchingFlow.path.join(" → ") : service.ingressPath?.join(" → ") || `${service.zoneName} access path not explicit yet`,
      boundarySummary: matchingFlow ? matchingFlow.controlPoints.join(" • ") : service.attachedDevice || service.zoneName,
      confidence: confidenceForEvidence(evidenceScore),
      note: matchingFlow
        ? `Traffic flow ${matchingFlow.flowLabel} currently supports this reachability path.`
        : "Service placement exists, but a direct supporting flow should be made more explicit.",
    };
  });

  const dependencyProofs = synthesized.siteSummaries.map((site) => {
    const placements = synthesized.sitePlacements.filter((item) => item.siteId === site.id);
    const boundaries = synthesized.securityBoundaries.filter((item) => item.siteName === site.name);
    const flows = synthesized.trafficFlows.filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name);
    const deps = new Set<string>();
    placements.forEach((item) => {
      if (item.uplinkTarget) deps.add(item.uplinkTarget);
    });
    synthesized.servicePlacements
      .filter((svc) => svc.siteName === site.name)
      .forEach((svc) => svc.dependsOn.forEach((dependency) => deps.add(dependency)));

    return {
      id: site.id,
      siteName: site.name,
      siteRole: site.source === "configured" ? "Configured site" : "Planned site",
      dependencies: Array.from(deps).slice(0, 6),
      evidence: [
        `${placements.length} placement objects`,
        `${boundaries.length} boundary objects`,
        `${flows.length} related flow objects`,
      ],
      trustStatement:
        boundaries.length && flows.length
          ? "This site has both boundary and path evidence supporting its role."
          : "This site still needs stronger path or boundary evidence to feel fully anchored.",
    };
  });

  const overlayAudit: OverlayAuditRow[] = [
    {
      overlay: "Placement",
      objective: "Confirm believable site and device anchors before reviewing traffic.",
      availableEvidence: synthesized.sitePlacements.slice(0, 4).map((item) => `${item.siteName}: ${item.deviceName}`),
      missingEvidence: synthesized.sitePlacements.some((item) => item.uplinkTarget) ? [] : ["Explicit uplink targets are still thin in some placements."],
      reviewAction: "Verify edge, switching, and cloud anchors before enabling path overlays.",
    },
    {
      overlay: "Addressing",
      objective: "Trace subnets and zones back into the topology.",
      availableEvidence: synthesized.addressingPlan.slice(0, 4).map((row) => `${row.siteName}: ${row.subnetCidr}`),
      missingEvidence: synthesized.wanLinks.length ? [] : ["No explicit WAN transit rows are present yet."],
      reviewAction: "Cross-check site blocks, transit links, and management/DMZ references.",
    },
    {
      overlay: "Security",
      objective: "Validate that trust boundaries and control points are visible.",
      availableEvidence: synthesized.securityBoundaries.slice(0, 4).map((row) => `${row.siteName}: ${row.boundaryName}`),
      missingEvidence: synthesized.securityBoundaries.length ? [] : ["Security boundary objects are still missing."],
      reviewAction: "Confirm zone attachment, peers, and management-source restrictions.",
    },
    {
      overlay: "Flows",
      objective: "Review service and user paths against control points.",
      availableEvidence: synthesized.trafficFlows.slice(0, 4).map((row) => row.flowLabel),
      missingEvidence: synthesized.trafficFlows.length >= 3 ? [] : ["More path objects are needed for fuller review coverage."],
      reviewAction: "Check route model, NAT behavior, and enforcement points for each critical path.",
    },
  ];

  const consistencyRows = synthesized.siteSummaries.map((site) => {
    const placements = synthesized.sitePlacements.filter((item) => item.siteId === site.id);
    const hasEdge = placements.some((item) => item.deviceType === "firewall" || item.deviceType === "router");
    const hasSwitching = placements.some((item) => item.deviceType.includes("switch"));
    const posture = hasEdge && hasSwitching
      ? "Edge and switching anchors present"
      : hasEdge
        ? "Edge-heavy posture"
        : hasSwitching
          ? "Switching-heavy posture"
          : "Minimal explicit posture";

    let consistency: "strong" | "partial" | "weak";
    if (synthesized.topology.topologyType === "collapsed-core") {
      consistency = hasSwitching ? "strong" : "partial";
    } else if (synthesized.topology.topologyType === "hub-spoke") {
      consistency = hasEdge ? "strong" : "partial";
    } else {
      consistency = hasEdge || hasSwitching ? "strong" : "weak";
    }

    return {
      id: site.id,
      siteName: site.name,
      selectedPattern: synthesized.topology.topologyLabel,
      observedPosture: posture,
      consistency,
      driftRisk:
        consistency === "strong"
          ? "Low drift risk"
          : consistency === "partial"
            ? "Some drift risk between selected pattern and visible anchors"
            : "High drift risk: topology choice is not strongly reflected yet",
      nextCheck: "Confirm device anchors, path evidence, and service placement for this site.",
    };
  });

  const renderingConfidence: RenderingConfidenceRow[] = [
    {
      area: "Device visuals",
      currentSignal: "Firewall, router, switch, wireless, server, cloud, and internet symbols are being differentiated visually.",
      nextUpgrade: "Move toward a fuller reusable icon library with deeper role detail.",
    },
    {
      area: "Connection semantics",
      currentSignal: "Link meaning is increasingly treated as routed, trunk, public, VPN, HA, or flow-specific.",
      nextUpgrade: "Bind line rendering more directly to explicit link objects and path classes.",
    },
    {
      area: "Overlay trust",
      currentSignal: "Overlay review is now supported by evidence cards and audit rows.",
      nextUpgrade: "Tie overlays to stronger per-object highlighting and rendering behavior.",
    },
  ];

  return { reachability, dependencyProofs, overlayAudit, consistencyRows, renderingConfidence };
}
