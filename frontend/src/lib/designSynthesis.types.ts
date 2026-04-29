import type { Site } from "./types";
import type { UnifiedDesignTruthModel } from "./designTruthModel";
import type { SegmentRole } from "./segmentRoles";

export interface PlannedSiteSummary {
  id: string;
  name: string;
  siteCode: string;
  location?: string;
  source: "configured" | "proposed";
  siteBlockCidr?: string;
  summaryPrefix?: number;
  siteBlockTotalAddresses?: number;
  siteBlockUsableAddresses?: number;
  siteBlockNetworkAddress?: string;
  siteBlockBroadcastAddress?: string;
  plannedDemandAddresses: number;
  plannedDemandHosts: number;
  note?: string;
}

export interface AddressingPlanRow {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string;
  siteBlockCidr?: string;
  source: "configured" | "proposed";
  vlanId?: number;
  segmentName: string;
  purpose: string;
  role: SegmentRole;
  roleLabel?: string;
  zoneName?: string;
  subnetCidr: string;
  configuredSubnetCidr?: string;
  proposedSubnetCidr?: string;
  mask: string;
  wildcardMask?: string;
  networkAddress?: string;
  broadcastAddress?: string;
  firstUsableIp?: string | null;
  lastUsableIp?: string | null;
  gatewayIp: string;
  sourceGatewayIp?: string;
  proposedGatewayIp?: string;
  gatewayState?: "valid" | "invalid" | "fallback";
  gatewayConvention?: "first-usable" | "last-usable" | "custom" | "not-applicable";
  dhcpEnabled: boolean;
  dhcpRange?: string;
  staticReserve?: string;
  totalAddresses?: number;
  usableHosts: number;
  estimatedHosts: number;
  requiredUsableHosts?: number;
  recommendedUsableHosts?: number;
  recommendedPrefix?: number;
  bufferMultiplier?: number;
  capacityState?: "unknown" | "fits" | "undersized";
  capacityBasis?: string;
  roleSource?: "explicit" | "inferred" | "unknown";
  roleConfidence?: "high" | "medium" | "low";
  roleEvidence?: string;
  capacityExplanation?: string;
  allocatorExplanation?: string;
  allocatorParentCidr?: string;
  allocatorUsedRangeCount?: number;
  allocatorFreeRangeCount?: number;
  allocatorLargestFreeRange?: string;
  allocatorUtilizationPercent?: number;
  allocatorCanFitRequestedPrefix?: boolean;
  addressFamily?: "ipv4" | "ipv6";
  vrfName?: string;
  brownfieldEvidenceState?: "configured" | "proposed" | "import-required" | "unsupported";
  dhcpScopeReview?: string;
  reservePolicyReview?: string;
  approvalState?: "draft" | "review-required" | "approved";
  allocationReason?: string;
  engine1Explanation?: string;
  headroom: number;
  utilization: number;
  insideSiteBlock: boolean | null;
  notes: string[];
}

export interface TraceabilityItem {
  title: string;
  requirement: string;
  designOutcome: string;
}

export interface SiteHierarchyItem extends PlannedSiteSummary {
  blockCapacity: number;
  allocatedSegmentAddresses: number;
  blockHeadroomAddresses: number;
  blockUtilization: number;
  configuredSegmentCount: number;
  proposedSegmentCount: number;
  summarizationTarget?: string;
}

export interface SegmentModelItem {
  role: SegmentRole;
  label: string;
  vlanId?: number;
  purpose: string;
  dhcpEnabled: boolean;
  siteCount: number;
  configuredCount: number;
  proposedCount: number;
  totalEstimatedHosts: number;
  recommendedPrefix: number;
}

export interface DesignReviewItem {
  kind: "assumption" | "decision" | "risk";
  title: string;
  detail: string;
}

export interface WanLinkPlanRow {
  id: string;
  linkName: string;
  source: "proposed" | "configured";
  transport: string;
  parentBlockCidr?: string;
  subnetCidr: string;
  endpointASiteId?: string;
  endpointASiteName: string;
  endpointAIp: string;
  endpointBSiteId?: string;
  endpointBSiteName: string;
  endpointBIp: string;
  notes: string[];
}

export interface RoutePlanItem {
  siteId: string;
  siteName: string;
  siteCode?: string;
  siteBlockCidr?: string;
  summaryAdvertisement?: string;
  loopbackCidr?: string;
  localSegmentCount: number;
  localAddressCount: number;
  transitAdjacencyCount: number;
  notes: string[];
}

export interface SecurityZonePlan {
  zoneName: string;
  zoneType: "trusted" | "restricted" | "untrusted" | "management" | "service" | "transit" | "edge" | "cloud";
  segments: string[];
  trustLevel: string;
  enforcement: string;
  northSouthPolicy: string;
  eastWestPolicy: string;
  identityControl: string;
  monitoringExpectation: string;
  notes: string[];
}

export interface SecurityControlItem {
  control: string;
  status: "required" | "recommended" | "optional";
  rationale: string;
  implementationHint: string;
}

export interface SecurityPolicyMatrixRow {
  sourceZone: string;
  targetZone: string;
  defaultAction: string;
  allowedFlows: string;
  controlPoint: string;
  notes: string[];
}

export interface SegmentationReviewItem {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  affected: string[];
}

export interface LogicalDomainIntent {
  name: string;
  segments: string[];
  purpose: string;
  placement: string;
  policy: string;
}

export interface HighLevelDesignSummary {
  architecturePattern: string;
  layerModel: string;
  wanArchitecture: string;
  cloudArchitecture: string;
  dataCenterArchitecture: string;
  redundancyModel: string;
  routingStrategy: string;
  switchingStrategy: string;
  segmentationStrategy: string;
  securityArchitecture: string;
  wirelessArchitecture: string;
  operationsArchitecture: string;
  rationale: string[];
}

export interface LowLevelSiteDesign {
  siteId: string;
  siteName: string;
  siteCode?: string;
  siteRole: string;
  layerModel: string;
  routingRole: string;
  switchingProfile: string;
  securityBoundary: string;
  localServiceModel: string;
  wirelessModel: string;
  physicalAssumption: string;
  summaryRoute?: string;
  loopbackCidr?: string;
  transitAdjacencyCount: number;
  localSegmentCount: number;
  localSegments: string[];
  authorityStatus: "ready" | "partial" | "pending";
  authorityLabel: string;
  strongestAuthoritySourceLabel: string;
  boundaryNames: string[];
  serviceNames: string[];
  flowNames: string[];
  trustDebt: string[];
  implementationFocus: string[];
  notes: string[];
}

export interface RoutingProtocolPlan {
  protocol: string;
  scope: string;
  purpose: string;
  recommendation: string;
  notes: string[];
}

export interface RoutePolicyPlan {
  policyName: string;
  scope: string;
  intent: string;
  recommendation: string;
  riskIfSkipped: string;
}

export interface SwitchingDesignPlan {
  topic: string;
  recommendation: string;
  implementationHint: string;
  rationale: string;
}

export interface QosPlanItem {
  trafficClass: string;
  treatment: string;
  marking: string;
  scope: string;
  rationale: string;
}

export interface RoutingSwitchingReviewItem {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  affected: string[];
}

export interface ImplementationPlanSummary {
  rolloutStrategy: string;
  migrationStrategy: string;
  downtimePosture: string;
  validationApproach: string;
  rollbackPosture: string;
  teamExecutionModel: string;
  timelineGuidance: string;
  handoffPackage: string;
}

export interface ImplementationPhasePlan {
  phase: string;
  objective: string;
  scope: string;
  dependencies: string[];
  successCriteria: string[];
}

export interface CutoverChecklistItem {
  stage: "pre-check" | "cutover" | "post-check";
  item: string;
  owner: string;
  rationale: string;
}

export interface RollbackPlanItem {
  trigger: string;
  action: string;
  scope: string;
}

export interface ValidationTestPlanItem {
  stage: string;
  test: string;
  expectedOutcome: string;
  evidence: string;
}

export interface ImplementationRiskItem {
  severity: "critical" | "warning" | "info";
  title: string;
  mitigation: string;
  owner: string;
}

export interface ConfigurationStandardItem {
  topic: string;
  standard: string;
  rationale: string;
}

export interface ConfigurationTemplateArtifact {
  name: string;
  scope: string;
  intent: string;
  includes: string[];
  sampleLines: string[];
  notes: string[];
}

export interface OperationsArtifactItem {
  artifact: string;
  purpose: string;
  owner: string;
  timing: string;
}


export interface TopologyBlueprint {
  topologyType: "collapsed-core" | "hub-spoke" | "multi-site" | "hybrid-cloud" | "backend-unclassified";
  topologyLabel: string;
  primarySiteId?: string;
  primarySiteName?: string;
  internetBreakout: "centralized" | "distributed" | "unknown";
  cloudConnected: boolean;
  redundancyModel: string;
  servicePlacementModel: string;
  notes: string[];
  cloudProvider?: string;
  cloudPattern?: string;
  wanPattern?: string;
  topologyNarrative?: string;
}

export interface SitePlacementDevice {
  id: string;
  siteId: string;
  siteName: string;
  deviceName: string;
  siteTier: "primary" | "branch" | "single-site" | "cloud";
  uplinkTarget?: string;
  deviceType: "firewall" | "router" | "core-switch" | "distribution-switch" | "access-switch" | "wireless-controller" | "access-point" | "server" | "cloud-edge";
  role: string;
  quantity: number;
  placement: string;
  connectedZones: string[];
  connectedSubnets: string[];
  interfaceLabels: string[];
  notes: string[];
}

export interface ServicePlacementItem {
  id: string;
  serviceName: string;
  serviceType: "shared-service" | "dmz-service" | "local-service" | "cloud-service" | "management-service";
  placementType: "local" | "centralized" | "dmz" | "cloud";
  locationModel?: string;
  siteId?: string;
  siteName: string;
  zoneName: string;
  subnetCidr?: string;
  dependsOn: string[];
  consumers: string[];
  publishedExternally?: boolean;
  ingressPath?: string[];
  attachedDevice?: string;
  upstreamDevice?: string;
  ingressInterface?: string;
  notes: string[];
}

export interface SecurityBoundaryDetail {
  zoneName: string;
  siteName: string;
  boundaryName: string;
  subnetCidrs: string[];
  attachedDevice: string;
  attachedInterface?: string;
  upstreamBoundary: string;
  upstreamInterface?: string;
  downstreamAssets: string[];
  permittedPeers: string[];
  controlPoint: string;
  inboundPolicy: string;
  eastWestPolicy: string;
  managementSource: string;
  natPolicy: string;
  routeDomain?: string;
  insideRelationships: string[];
  outsideRelationships: string[];
  publishedServices: string[];
  notes: string[];
}

export interface TrafficFlowPath {
  id: string;
  flowName: string;
  flowLabel: string;
  flowCategory:
    | "user-local-gateway"
    | "user-local-service"
    | "user-internet"
    | "guest-internet"
    | "management-infrastructure"
    | "site-centralized-service"
    | "site-cloud-service"
    | "internet-dmz"
    | "remote-user-internal";
  source: string;
  destination: string;
  sourceSite?: string;
  destinationSite?: string;
  sourceZone: string;
  destinationZone: string;
  sourceSubnetCidr?: string;
  destinationSubnetCidr?: string;
  path: string[];
  controlPoints: string[];
  routeModel: string;
  natBehavior: string;
  enforcementPolicy: string;
  policyNotes: string[];
}

export interface FlowCoverageItem {
  id: string;
  label: string;
  required: boolean;
  status: "ready" | "partial" | "pending";
  detail: string;
  matchedFlowIds: string[];
}

export interface DesignEngineFoundation {
  stageLabel: string;
  summary: string;
  objectCounts: {
    siteHierarchy: number;
    addressingRows: number;
    topologyPlacements: number;
    servicePlacements: number;
    securityBoundaries: number;
    trafficFlows: number;
    routingIdentities: number;
    wanLinks: number;
    traceabilityItems: number;
    openIssues: number;
  };
  strongestLayer: string;
  nextPriority: string;
  coverage: Array<{
    label: string;
    status: "ready" | "partial" | "pending";
    detail: string;
  }>;
}

export interface SynthesizedLogicalDesign {
  organizationBlock: string;
  organizationBlockAssumed: boolean;
  organizationHierarchy: {
    organizationCapacity: number;
    allocatedSiteAddresses: number;
    plannedSiteDemandAddresses: number;
    organizationHeadroom: number;
    organizationUtilization: number;
  };
  wanReserveBlock?: string;
  siteSummaries: PlannedSiteSummary[];
  siteHierarchy: SiteHierarchyItem[];
  addressingPlan: AddressingPlanRow[];
  recommendedSegments: Array<{ role: SegmentRole; label: string; vlanId?: number; purpose: string }>;
  segmentModel: SegmentModelItem[];
  wanLinks: WanLinkPlanRow[];
  topology: TopologyBlueprint;
  sitePlacements: SitePlacementDevice[];
  servicePlacements: ServicePlacementItem[];
  securityBoundaries: SecurityBoundaryDetail[];
  trafficFlows: TrafficFlowPath[];
  flowCoverage: FlowCoverageItem[];
  routingPlan: RoutePlanItem[];
  routePlan?: RoutePlanItem[];
  topologyModel?: TopologyBlueprint;
  servicePlacementModel?: ServicePlacementItem[];
  securityBoundaryModel?: SecurityBoundaryDetail[];
  trafficFlowModel?: TrafficFlowPath[];
  routingIntentModel?: { siteRouting: RoutePlanItem[] };
  designTruthModel: UnifiedDesignTruthModel;
  logicalDomains: LogicalDomainIntent[];
  securityZones: SecurityZonePlan[];
  securityControls: SecurityControlItem[];
  securityPolicyMatrix: SecurityPolicyMatrixRow[];
  segmentationReview: SegmentationReviewItem[];
  routingProtocols: RoutingProtocolPlan[];
  routePolicies: RoutePolicyPlan[];
  switchingDesign: SwitchingDesignPlan[];
  qosPlan: QosPlanItem[];
  routingSwitchingReview: RoutingSwitchingReviewItem[];
  implementationPlan: ImplementationPlanSummary;
  implementationPhases: ImplementationPhasePlan[];
  cutoverChecklist: CutoverChecklistItem[];
  rollbackPlan: RollbackPlanItem[];
  validationPlan: ValidationTestPlanItem[];
  implementationRisks: ImplementationRiskItem[];
  configurationStandards: ConfigurationStandardItem[];
  configurationTemplates: ConfigurationTemplateArtifact[];
  operationsArtifacts: OperationsArtifactItem[];
  highLevelDesign: HighLevelDesignSummary;
  lowLevelDesign: LowLevelSiteDesign[];
  traceability: TraceabilityItem[];
  designSummary: string[];
  designReview: DesignReviewItem[];
  openIssues: string[];
  implementationNextSteps: string[];
  designEngineFoundation: DesignEngineFoundation;
  stats: {
    configuredSites: number;
    proposedSites: number;
    configuredSegments: number;
    proposedSegments: number;
    missingSiteBlocks: number;
    rowsOutsideSiteBlocks: number;
  };
}

export interface SegmentTemplate {
  role: SegmentRole;
  label: string;
  purpose: string;
  vlanId?: number;
  estimatedHosts: number;
  dhcpEnabled: boolean;
  notes?: string[];
}
