import type { SynthesizedLogicalDesign } from "./designSynthesis";

export interface ServiceConsumerPathReview {
  service: string;
  consumer: string;
  path: string;
  boundary: string;
  confidence: "High" | "Medium" | "Low";
  note: string;
}

export interface DependencyChainReview {
  name: string;
  dependsOn: string[];
  risk: string;
  evidence: string;
}

export interface OverlayEvidenceLedgerRow {
  overlay: "Placement" | "Addressing" | "Security" | "Flows";
  evidence: string[];
  confidence: "High" | "Medium" | "Low";
  nextCheck: string;
}

export interface HotspotReviewRow {
  area: string;
  site: string;
  reason: string;
  impact: string;
  nextMove: string;
}

export interface DiagramScenarioPack {
  serviceConsumerPaths: ServiceConsumerPathReview[];
  dependencyChains: DependencyChainReview[];
  overlayLedger: OverlayEvidenceLedgerRow[];
  hotspots: HotspotReviewRow[];
  scenarioSummary: {
    pattern: string;
    primaryRisk: string;
    strongestEvidence: string;
  };
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function buildDiagramScenarioPack(design: SynthesizedLogicalDesign): DiagramScenarioPack {
  const topology = design.topology.topologyType || "multi-site";
  const primarySite = design.topology.primarySiteName || design.siteSummaries[0]?.name || "Primary site";

  const services = design.servicePlacements ?? [];
  const flows = design.trafficFlows ?? [];
  const boundaries = design.securityBoundaries ?? [];
  const sites = design.siteSummaries ?? [];

  const serviceConsumerPaths: ServiceConsumerPathReview[] = (services.length ? services.slice(0, 8) : []).map((service, index) => {
    const matchingFlow = flows.find((flow) =>
      flow.destination.toLowerCase().includes(service.serviceName.toLowerCase()) ||
      flow.flowLabel.toLowerCase().includes(service.serviceName.toLowerCase())
    );
    const consumerList = unique(
      (service.consumers && service.consumers.length ? service.consumers : [
        matchingFlow?.source ?? "User segment",
        service.placementType === "dmz" ? "External consumer" : "Internal consumers",
      ]).filter(Boolean)
    );
    const boundary = matchingFlow?.controlPoints?.[0] || boundaries[index % Math.max(boundaries.length, 1)]?.zoneName || "Primary control boundary";
    const path = matchingFlow?.path?.join(" → ") || `${consumerList[0]} → ${service.siteName || primarySite} → ${service.serviceName}`;
    const confidence: "High" | "Medium" | "Low" =
      matchingFlow && service.siteName ? "High" : matchingFlow || service.siteName ? "Medium" : "Low";

    return {
      service: service.serviceName || `Service ${index + 1}`,
      consumer: consumerList.join(", "),
      path,
      boundary,
      confidence,
      note:
        service.placementType === "dmz"
          ? "Published or semi-exposed service path should stay anchored to an edge and explicit control point."
          : "Consumer path should remain traceable through the selected topology and service placement.",
    };
  });

  const dependencyChains: DependencyChainReview[] = sites.slice(0, 8).map((site) => {
    const localServices = services.filter((service) => service.siteId === site.id || service.siteName === site.name);
    const transit = (design.routingIntentModel?.siteRouting || design.routingPlan).find((item) => item.siteId === site.id);
    const dependsOn = unique([
      transit?.summaryAdvertisement || transit?.siteBlockCidr || "Primary uplink",
      localServices[0]?.serviceName || "Core shared services",
      boundaries.filter((b) => b.siteName === site.name)[0]?.zoneName || "Security boundary",
    ]);
    const siteDeviceCount = design.sitePlacements.filter((device) => device.siteId === site.id).length;
    const siteVlanCount = design.addressingPlan.filter((row) => row.siteId === site.id).length;
    const siteRole = site.id === design.topology.primarySiteId ? "primary" : topology === "hub-spoke" ? "branch" : site.source;
    return {
      name: `${site.name} dependency chain`,
      dependsOn,
      risk:
        String(siteRole).toLowerCase().includes("branch")
          ? "Branch path depends on upstream reachability and central services staying available."
          : "Core or primary site depends on clear edge, service, and routing anchors.",
      evidence: `${site.name} carries ${siteVlanCount} synthesized VLAN/subnet rows and ${siteDeviceCount} placement objects.`,
    };
  });

  const overlayLedger: OverlayEvidenceLedgerRow[] = [
    {
      overlay: "Placement",
      evidence: unique(design.sitePlacements.slice(0, 10).map((device) => `${device.siteName}: ${device.deviceName}`)),
      confidence: design.sitePlacements.length ? "High" : "Low",
      nextCheck: "Confirm each site has a visible edge, switching, and service anchor where expected.",
    },
    {
      overlay: "Addressing",
      evidence: unique(design.addressingPlan.slice(0, 10).map((row) => row.subnetCidr || row.segmentName)),
      confidence: design.addressingPlan.some((row) => !!row.subnetCidr) ? "High" : "Low",
      nextCheck: "Trace key subnets into routing and boundary review, not only the addressing table.",
    },
    {
      overlay: "Security",
      evidence: unique(boundaries.slice(0, 8).map((zone) => `${zone.zoneName}: ${zone.controlPoint}`)),
      confidence: boundaries.length ? "Medium" : "Low",
      nextCheck: "Ensure explicit peer/control relationships exist for published and management paths.",
    },
    {
      overlay: "Flows",
      evidence: unique(flows.slice(0, 8).map((flow) => flow.path.join(" → ") || `${flow.source} → ${flow.destination}`)),
      confidence: flows.length >= 3 ? "High" : flows.length ? "Medium" : "Low",
      nextCheck: "Validate that critical user, internet, shared-service, and published paths are all represented.",
    },
  ];

  const hotspots: HotspotReviewRow[] = sites.slice(0, 8).map((site) => {
    const siteDevices = design.sitePlacements.filter((device) => device.siteId === site.id);
    const hasEdge = siteDevices.some((device) => ["firewall", "router", "cloud-edge"].includes(device.deviceType));
    const hasBoundary = boundaries.some((zone) => zone.siteName === site.name);
    const hasFlow = flows.some((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name);
    const weakest = !hasEdge ? "Missing explicit edge anchor" : !hasBoundary ? "Boundary definition is thin" : !hasFlow ? "Critical flow evidence is thin" : "No critical hotspot flagged";
    return {
      area: !hasEdge ? "Edge posture" : !hasBoundary ? "Boundary posture" : !hasFlow ? "Flow posture" : "General posture",
      site: site.name,
      reason: weakest,
      impact: !hasEdge
        ? "Placement and publication review can drift because ingress/egress posture is not obvious."
        : !hasBoundary
          ? "Security overlay confidence stays weaker than the addressing or placement views."
          : !hasFlow
            ? "Cross-site or service-consumer path review may feel generic."
            : "This site has at least baseline anchors across placement, boundary, and path review.",
      nextMove: !hasEdge
        ? "Add or verify the primary edge / firewall / internet handoff anchor."
        : !hasBoundary
          ? "Add clearer zone and control-point mapping for this site."
          : !hasFlow
            ? "Generate or expose more critical flow evidence tied to this site."
            : "Keep validating this site against the selected topology pattern.",
    };
  });

  const primaryRisk =
    hotspots.find((item) => item.reason !== "No critical hotspot flagged")?.reason ||
    "Topology is present, but explicit site/path evidence should keep expanding.";
  const strongestEvidence =
    [...overlayLedger].sort((a, b) => ({High:2, Medium:1, Low:0}[b.confidence]-{High:2, Medium:1, Low:0}[a.confidence]))[0]?.overlay ||
    "Placement";

  return {
    serviceConsumerPaths,
    dependencyChains,
    overlayLedger,
    hotspots,
    scenarioSummary: {
      pattern: topology,
      primaryRisk,
      strongestEvidence,
    },
  };
}
