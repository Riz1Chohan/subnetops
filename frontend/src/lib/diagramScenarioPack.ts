
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
  const topology = design.topologyModel?.topologyType || "multi-site";
  const primarySite = design.siteSummaries?.[0]?.siteName || "Primary site";

  const services = design.servicePlacementModel?.placements ?? [];
  const flows = design.trafficFlowModel?.flows ?? [];
  const boundaries = design.securityBoundaryModel?.zones ?? [];
  const sites = design.siteSummaries ?? [];

  const serviceConsumerPaths: ServiceConsumerPathReview[] =
    (services.length ? services.slice(0, 8) : [
      { serviceName: "Identity / core services", location: primarySite, exposure: "internal", consumers: ["Users", "Admins"] as string[] },
      { serviceName: "Published application", location: primarySite, exposure: "dmz", consumers: ["Internet users"] as string[] },
    ] as any[]).map((service, index) => {
      const matchingFlow = flows.find((flow) =>
        (flow.serviceName && flow.serviceName === service.serviceName) ||
        flow.destination?.toLowerCase().includes(String(service.serviceName || "").toLowerCase()),
      );
      const consumerList = unique(
        (service.consumers && service.consumers.length ? service.consumers : [
          matchingFlow?.source ?? "User segment",
          service.exposure === "dmz" ? "External consumer" : "Internal consumers",
        ]).filter(Boolean),
      );
      const boundary = matchingFlow?.policyPoint || boundaries[index % Math.max(boundaries.length, 1)]?.zoneName || "Primary control boundary";
      const path = matchingFlow?.pathDescription || `${consumerList[0]} → ${service.location || primarySite} → ${service.serviceName}`;
      const confidence: "High" | "Medium" | "Low" =
        matchingFlow && service.location ? "High" : matchingFlow || service.location ? "Medium" : "Low";

      return {
        service: service.serviceName || `Service ${index + 1}`,
        consumer: consumerList.join(", "),
        path,
        boundary,
        confidence,
        note:
          service.exposure === "dmz"
            ? "Published or semi-exposed service path should stay anchored to an edge and explicit control point."
            : "Consumer path should remain traceable through the selected topology and service placement.",
      };
    });

  const dependencyChains: DependencyChainReview[] = sites.slice(0, 8).map((site, index) => {
    const localServices = services.filter((service) => (service.location || "").toLowerCase().includes(site.siteName.toLowerCase()));
    const transit = design.routingIntentModel?.siteRouting?.find((item) => item.siteName === site.siteName);
    const dependsOn = unique([
      transit?.defaultBehavior || "Primary uplink",
      localServices[0]?.serviceName || "Core shared services",
      boundaries[index % Math.max(boundaries.length, 1)]?.zoneName || "Security boundary",
    ]);
    return {
      name: `${site.siteName} dependency chain`,
      dependsOn,
      risk:
        site.siteRole?.toLowerCase().includes("branch")
          ? "Branch path depends on upstream reachability and central services staying available."
          : "Core or primary site depends on clear edge, service, and routing anchors.",
      evidence: `${site.siteName} carries ${site.vlans.length} VLANs and ${site.devices.length} synthesized placement objects.`,
    };
  });

  const overlayLedger: OverlayEvidenceLedgerRow[] = [
    {
      overlay: "Placement",
      evidence: unique(sites.flatMap((site) => [site.siteRole || "Site role", site.devices[0]?.deviceRole || "Placement anchor"]).slice(0, 10)),
      confidence: sites.length ? "High" : "Low",
      nextCheck: "Confirm each site has a visible edge, switching, and service anchor where expected.",
    },
    {
      overlay: "Addressing",
      evidence: unique(sites.flatMap((site) => site.vlans.slice(0, 3).map((vlan) => vlan.subnet || vlan.name)).slice(0, 10)),
      confidence: sites.some((site) => site.vlans.length > 0) ? "High" : "Low",
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
      evidence: unique(flows.slice(0, 8).map((flow) => flow.pathDescription || `${flow.source} → ${flow.destination}`)),
      confidence: flows.length >= 3 ? "High" : flows.length ? "Medium" : "Low",
      nextCheck: "Validate that critical user, internet, shared-service, and published paths are all represented.",
    },
  ];

  const hotspots: HotspotReviewRow[] = sites.slice(0, 8).map((site, index) => {
    const hasEdge = site.devices.some((device) => ["firewall", "router", "cloud-edge"].includes(device.deviceType));
    const hasBoundary = boundaries.some((zone) => zone.siteName === site.siteName);
    const hasFlow = flows.some((flow) => (flow.sourceSite || flow.siteName || "").toLowerCase().includes(site.siteName.toLowerCase()));
    const weakest = !hasEdge ? "Missing explicit edge anchor" : !hasBoundary ? "Boundary definition is thin" : !hasFlow ? "Critical flow evidence is thin" : "No critical hotspot flagged";
    return {
      area: !hasEdge ? "Edge posture" : !hasBoundary ? "Boundary posture" : !hasFlow ? "Flow posture" : "General posture",
      site: site.siteName,
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
    overlayLedger.sort((a, b) => ({High:2, Medium:1, Low:0}[b.confidence]-{High:2, Medium:1, Low:0}[a.confidence]))[0]?.overlay ||
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
