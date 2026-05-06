import type { SynthesizedLogicalDesign } from "./designSynthesis.types";

type Confidence = "High" | "Medium" | "Low";

export interface ServiceConsumerPathReview { service: string; consumer: string; path: string; boundary: string; confidence: Confidence; note: string; }
export interface DependencyChainReview { name: string; dependsOn: string[]; risk: string; evidence: string; }
export interface OverlayEvidenceLedgerRow { overlay: string; evidence: string[]; confidence: Confidence; nextCheck: string; }
export interface HotspotReviewRow { area: string; site: string; reason: string; impact: string; nextMove: string; }
export interface DiagramScenarioPack {
  serviceConsumerPaths: ServiceConsumerPathReview[];
  dependencyChains: DependencyChainReview[];
  overlayLedger: OverlayEvidenceLedgerRow[];
  hotspots: HotspotReviewRow[];
  scenarioSummary: { pattern: string; primaryRisk: string; strongestEvidence: string };
}

const rank: Record<Confidence, number> = { High: 2, Medium: 1, Low: 0 };
const unique = <T,>(items: T[]) => Array.from(new Set(items.filter(Boolean) as T[]));

export function buildDiagramScenarioPack(design: SynthesizedLogicalDesign): DiagramScenarioPack {
  const services = design.servicePlacements;
  const flows = design.trafficFlows;
  const boundaries = design.securityBoundaries;
  const sites = design.siteHierarchy;

  const serviceConsumerPaths = (services.length ? services : [{ serviceName: 'Shared services', siteName: design.topology.primarySiteName || 'Primary site', zoneName: 'Server zone', placementType: 'centralized', consumers: ['Users'], notes: [] }] as any[]).slice(0,8).map((service, index) => {
    const flow = flows.find((item) => item.destination.includes(service.serviceName) || item.flowLabel.includes(service.serviceName)) || flows[index % Math.max(flows.length, 1)];
    const confidence: Confidence = flow && service.siteName ? 'High' : flow || service.siteName ? 'Medium' : 'Low';
    return {
      service: service.serviceName || `Service ${index+1}`,
      consumer: (service.consumers || ['Users']).join(', '),
      path: flow?.path.join(' → ') || `${service.siteName || 'Primary site'} → ${service.serviceName}`,
      boundary: flow?.controlPoints?.[0] || boundaries.find((b) => b.siteName === service.siteName)?.controlPoint || service.zoneName || 'Primary control boundary',
      confidence,
      note: service.notes?.[0] || 'Keep the service path anchored to an explicit site, zone, and control point.',
    };
  });

  const dependencyChains = sites.slice(0,8).map((site) => ({
    name: `${site.name} dependency chain`,
    dependsOn: unique([
      design.routingPlan.find((item) => item.siteId === site.id)?.summaryAdvertisement || 'Primary uplink',
      services.find((item) => item.siteName === site.name)?.serviceName || 'Shared/core services',
      boundaries.find((item) => item.siteName === site.name)?.zoneName || 'Security boundary',
    ]),
    risk: design.topology.topologyType === 'hub-spoke' && site.id !== design.topology.primarySiteId ? 'Branch path depends on upstream reachability and central services.' : 'Site needs clear edge, service, and routing anchors.',
    evidence: `${design.addressingPlan.filter((row) => row.siteId === site.id).length} addressing rows and ${design.sitePlacements.filter((item) => item.siteId === site.id).length} placement objects.`,
  }));

  const overlayLedger = [
    { overlay: 'Placement', evidence: unique(design.sitePlacements.slice(0,8).map((item) => `${item.siteName}: ${item.deviceType}`)), confidence: design.sitePlacements.length ? 'High' as Confidence : 'Low' as Confidence, nextCheck: 'Confirm each site has believable edge, switching, and service anchors.' },
    { overlay: 'Addressing', evidence: unique(design.addressingPlan.slice(0,8).map((row) => `${row.siteName}: ${row.subnetCidr}`)), confidence: design.addressingPlan.length ? 'High' as Confidence : 'Low' as Confidence, nextCheck: 'Trace key subnets into boundaries and path review.' },
    { overlay: 'Security', evidence: unique(boundaries.slice(0,8).map((row) => `${row.siteName}: ${row.zoneName}`)), confidence: boundaries.length ? 'Medium' as Confidence : 'Low' as Confidence, nextCheck: 'Confirm boundaries are attached to visible control points.' },
    { overlay: 'Flows', evidence: unique(flows.slice(0,8).map((row) => row.flowLabel)), confidence: flows.length >= 3 ? 'High' as Confidence : flows.length ? 'Medium' as Confidence : 'Low' as Confidence, nextCheck: 'Ensure critical user, internet, shared-service, and published paths are explicit.' },
  ];

  const hotspots = sites.slice(0,8).map((site) => {
    const hasEdge = design.sitePlacements.some((item) => item.siteId === site.id && ['firewall','router','cloud-edge'].includes(item.deviceType));
    const hasBoundary = boundaries.some((item) => item.siteName === site.name);
    const hasFlow = flows.some((item) => (item.sourceSite === site.name || item.destinationSite === site.name));
    const reason = !hasEdge ? 'Missing explicit edge anchor' : !hasBoundary ? 'Boundary definition is thin' : !hasFlow ? 'Critical flow evidence is thin' : 'No critical hotspot flagged';
    return {
      area: !hasEdge ? 'Edge posture' : !hasBoundary ? 'Boundary posture' : !hasFlow ? 'Flow posture' : 'General posture',
      site: site.name,
      reason,
      impact: !hasEdge ? 'Ingress/egress posture is not obvious.' : !hasBoundary ? 'Security overlay confidence stays weak.' : !hasFlow ? 'Cross-site or service-consumer path review may feel generic.' : 'This site has baseline anchors across placement, boundary, and flow review.',
      nextMove: !hasEdge ? 'Add or verify the primary edge / firewall / WAN anchor.' : !hasBoundary ? 'Add clearer zone and control-point mapping for this site.' : !hasFlow ? 'Generate or expose more critical flow evidence tied to this site.' : 'Keep validating this site against the selected topology pattern.',
    };
  });

  const strongestEvidence = overlayLedger.slice().sort((a,b) => rank[b.confidence] - rank[a.confidence])[0]?.overlay || 'Placement';
  const primaryRisk = hotspots.find((item) => item.reason !== 'No critical hotspot flagged')?.reason || 'Topology is present, but explicit site/path evidence should keep expanding.';

  return { serviceConsumerPaths, dependencyChains, overlayLedger, hotspots, scenarioSummary: { pattern: design.topology.topologyLabel, primaryRisk, strongestEvidence } };
}
