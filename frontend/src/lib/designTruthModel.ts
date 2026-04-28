import type { TopologyBlueprint } from "./designSynthesis.types";

export interface DesignTruthSiteNode {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string;
  topologyRole: string;
  routeDomainId?: string;
  placementIds: string[];
  segmentIds: string[];
  serviceIds: string[];
  boundaryIds: string[];
  wanAdjacencyIds: string[];
  flowIds: string[];
  authorityStatus: "ready" | "partial" | "pending";
  authorityNotes: string[];
  notes: string[];
}

export interface DesignTruthSegmentNode {
  id: string;
  siteId: string;
  siteName: string;
  name: string;
  role: string;
  vlanId?: number;
  subnetCidr: string;
  gatewayIp: string;
  zoneName?: string;
  attachedBoundaryIds: string[];
  attachedServiceIds: string[];
}

export type DesignTruthAuthoritySource = "saved-design" | "discovery-derived" | "backend-unconfirmed" | "inferred";

export interface DesignTruthRouteDomain {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string;
  sourceModel: "explicit" | "inferred";
  authoritySource: DesignTruthAuthoritySource;
  summaryAdvertisement?: string;
  loopbackCidr?: string;
  localSegmentIds: string[];
  transitWanAdjacencyIds: string[];
  flowIds: string[];
  notes: string[];
}

export interface DesignTruthBoundaryDomain {
  id: string;
  siteId?: string;
  siteName: string;
  zoneName: string;
  boundaryName: string;
  sourceModel: "explicit" | "inferred";
  authoritySource: DesignTruthAuthoritySource;
  attachedDevice: string;
  attachedPlacementId?: string;
  upstreamBoundary: string;
  segmentIds: string[];
  serviceIds: string[];
  flowIds: string[];
  permittedPeers: string[];
  controlPoint: string;
  inboundPolicy: string;
  eastWestPolicy: string;
  natPolicy: string;
  notes: string[];
}

export interface DesignTruthServiceDomain {
  id: string;
  siteId?: string;
  siteName: string;
  serviceName: string;
  serviceType: string;
  zoneName: string;
  placementType: string;
  subnetCidr?: string;
  attachedPlacementId?: string;
  boundaryId?: string;
  consumerSites: string[];
  flowIds: string[];
  dependsOn: string[];
  notes: string[];
}

export interface DesignTruthFlowContract {
  id: string;
  flowName: string;
  flowLabel: string;
  source: string;
  destination: string;
  sourceSite?: string;
  destinationSite?: string;
  sourceZone: string;
  destinationZone: string;
  routeDomainIds: string[];
  boundaryIds: string[];
  serviceIds: string[];
  wanAdjacencyIds: string[];
  path: string[];
  controlPoints: string[];
  routeModel: string;
  natBehavior: string;
  enforcementPolicy: string;
  unresolvedRefs: string[];
}

export interface DesignTruthWanAdjacency {
  id: string;
  linkName: string;
  transport: string;
  subnetCidr: string;
  endpointASiteName: string;
  endpointBSiteName: string;
  endpointARouteDomainId?: string;
  endpointBRouteDomainId?: string;
  flowIds?: string[];
  notes: string[];
}

export interface DesignTruthRelationshipEdge {
  id: string;
  edgeType: "site-placement" | "site-route" | "route-wan" | "route-flow" | "site-boundary" | "boundary-service" | "boundary-flow" | "service-flow";
  sourceId: string;
  targetId: string;
  label: string;
}

export interface DesignTruthCoverageItem {
  label: string;
  status: "ready" | "partial" | "pending";
  detail: string;
}

/**
 * Display-model contract for backend design-core truth.
 * This file intentionally contains types only. Browser-side builders that infer
 * route domains, security boundaries, flows, or topology do not belong here.
 */
export interface UnifiedDesignTruthModel {
  summary: string;
  topologyType: TopologyBlueprint["topologyType"];
  topologyLabel: string;
  primarySiteName?: string;
  servicePlacementModel: string;
  internetBreakout: TopologyBlueprint["internetBreakout"];
  siteNodes: DesignTruthSiteNode[];
  segments: DesignTruthSegmentNode[];
  routeDomains: DesignTruthRouteDomain[];
  boundaryDomains: DesignTruthBoundaryDomain[];
  serviceDomains: DesignTruthServiceDomain[];
  flowContracts: DesignTruthFlowContract[];
  wanAdjacencies: DesignTruthWanAdjacency[];
  relationshipEdges: DesignTruthRelationshipEdge[];
  unresolvedReferences: string[];
  coverage: DesignTruthCoverageItem[];
  inferenceSummary: {
    routeDomains: number;
    boundaryDomains: number;
  };
  generationNotes: string[];
}
