export type DiagramReadiness = 'ready' | 'review' | 'blocked' | 'unknown';

export type DiagramTruthState =
  | 'configured'
  | 'inferred'
  | 'proposed'
  | 'discovered'
  | 'planned'
  | 'materialized'
  | 'durable'
  | 'imported'
  | 'approved'
  | 'review-required'
  | 'blocked';

export type DiagramObjectType =
  | 'site'
  | 'vlan'
  | 'subnet'
  | 'network-device'
  | 'network-interface'
  | 'network-link'
  | 'route-domain'
  | 'security-zone'
  | 'policy-rule'
  | 'nat-rule'
  | 'security-service'
  | 'security-flow'
  | 'implementation-stage'
  | 'implementation-step'
  | 'dhcp-pool'
  | 'ip-reservation'
  | 'route-intent'
  | 'segmentation-flow';

export type DiagramRelationship =
  | 'site-contains-device'
  | 'site-contains-vlan'
  | 'vlan-uses-subnet'
  | 'device-owns-interface'
  | 'interface-uses-subnet'
  | 'interface-binds-link'
  | 'interface-belongs-to-route-domain'
  | 'interface-belongs-to-security-zone'
  | 'route-domain-carries-subnet'
  | 'security-zone-protects-subnet'
  | 'security-zone-applies-policy'
  | 'nat-rule-translates-zone'
  | 'dhcp-pool-serves-subnet'
  | 'ip-reservation-belongs-to-subnet'
  | 'ip-reservation-owned-by-interface'
  | 'network-link-terminates-on-device'
  | 'network-link-terminates-on-interface'
  | 'route-domain-owns-route'
  | 'route-intent-targets-subnet'
  | 'route-intent-exits-interface'
  | 'security-zone-expects-flow'
  | 'security-zone-initiates-security-flow'
  | 'security-flow-targets-security-zone'
  | 'security-flow-covered-by-policy'
  | 'security-flow-uses-nat-rule'
  | 'implementation-stage-contains-step'
  | 'implementation-step-targets-object'
  | 'implementation-step-verifies-flow'
  | 'implementation-step-implements-route'
  | 'implementation-dependency'
  | 'verification-target';

export type DiagramRenderLayer = 'site' | 'device' | 'interface' | 'routing' | 'security' | 'implementation' | 'verification';
export type DiagramOverlayKey = 'addressing' | 'routing' | 'security' | 'nat' | 'implementation' | 'verification' | 'operational-safety';
export type DiagramSourceEngine = 'design-graph' | 'object-model' | 'routing' | 'security' | 'implementation';

export interface DiagramRenderNode {
  id: string;
  objectId: string;
  objectType: DiagramObjectType;
  label: string;
  groupId?: string;
  siteId?: string;
  layer: DiagramRenderLayer;
  readiness: DiagramReadiness;
  truthState: DiagramTruthState;
  x: number;
  y: number;
  sourceEngine: DiagramSourceEngine;
  relatedFindingIds: string[];
  notes: string[];
}

export interface DiagramRenderEdge {
  id: string;
  relationship: DiagramRelationship;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  readiness: DiagramReadiness;
  overlayKeys: DiagramOverlayKey[];
  relatedObjectIds: string[];
  notes: string[];
}

export interface DiagramRenderGroup {
  id: string;
  groupType: 'site' | 'route-domain' | 'security-zone' | 'implementation-stage';
  label: string;
  readiness: DiagramReadiness;
  nodeIds: string[];
  notes: string[];
}

export interface DiagramRenderOverlay {
  key: DiagramOverlayKey;
  label: string;
  readiness: DiagramReadiness;
  nodeIds: string[];
  edgeIds: string[];
  hotspotIndexes: number[];
  detail: string;
}

export interface DiagramRenderModel {
  summary: {
    nodeCount: number;
    edgeCount: number;
    groupCount: number;
    overlayCount: number;
    backendAuthored: true;
    layoutMode: 'backend-deterministic-grid' | 'professional-topology-layout' | 'professional-view-separated-layout' | 'professional-scope-mode-layout' | 'professional-usability-polish-layout' | 'V1-backend-truth-layout-contract';
    contractId?: 'V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT';
    truthContract?: 'backend-only-render-model';
    modeCount?: number;
  };
  nodes: DiagramRenderNode[];
  edges: DiagramRenderEdge[];
  groups: DiagramRenderGroup[];
  overlays: DiagramRenderOverlay[];
  emptyState?: { reason: string; requiredInputs: string[] };
}

export interface DiagramOverlaySummaryInput {
  key: DiagramOverlayKey;
  label: string;
  readiness: DiagramReadiness;
  detail: string;
  count: number;
}

export interface DiagramHotspotInput {
  title: string;
  detail: string;
  readiness: DiagramReadiness;
  scopeLabel: string;
}

export interface DiagramDeviceInput {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  deviceRole: 'core-layer3-switch' | 'branch-edge-router' | 'security-firewall' | 'routing-identity' | 'unknown';
  truthState: DiagramTruthState;
  managementIp?: string;
  routeDomainIds: string[];
  securityZoneIds: string[];
  interfaceIds: string[];
  notes: string[];
}

export interface DiagramRouteDomainInput {
  id: string;
  name: string;
  truthState: DiagramTruthState;
  siteIds: string[];
  subnetCidrs: string[];
  interfaceIds: string[];
  linkIds: string[];
  summarizationState: DiagramReadiness | 'ready' | 'review' | 'blocked';
  notes: string[];
}

export interface DiagramSecurityZoneInput {
  id: string;
  name: string;
  zoneRole: 'internal' | 'guest' | 'management' | 'dmz' | 'voice' | 'iot' | 'wan' | 'transit' | 'unknown';
  truthState: DiagramTruthState;
  siteIds: string[];
  vlanIds: number[];
  subnetCidrs: string[];
  routeDomainId: string;
  isolationExpectation: 'open' | 'restricted' | 'isolated' | 'review';
  notes: string[];
}

export interface DiagramPolicyRuleInput {
  id: string;
  name: string;
  sourceZoneId: string;
  destinationZoneId: string;
  action: 'allow' | 'deny' | 'review';
  services: string[];
  truthState: DiagramTruthState;
  rationale: string;
  notes: string[];
}

export interface DiagramDhcpPoolInput {
  id: string;
  name: string;
  siteId: string;
  vlanId: number;
  subnetCidr: string;
  truthState: DiagramTruthState;
  allocationState: 'configured' | 'proposed' | 'review';
  notes: string[];
}

export interface DiagramGraphNodeInput {
  id: string;
  objectType: DiagramObjectType;
  objectId: string;
  label: string;
  siteId?: string;
  truthState: DiagramTruthState;
  notes: string[];
}

export interface DiagramGraphEdgeInput {
  id: string;
  relationship: DiagramRelationship;
  sourceNodeId: string;
  targetNodeId: string;
  truthState: DiagramTruthState;
  required: boolean;
  notes: string[];
}

export interface DiagramFindingInput {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  title: string;
  detail: string;
  affectedObjectIds: string[];
  remediation?: string;
}

export interface DiagramImplementationStepInput {
  id: string;
  targetObjectId?: string;
  dependencyObjectIds: string[];
  readiness: 'ready' | 'review' | 'blocked' | 'deferred';
}

export interface DiagramVerificationCheckInput {
  id: string;
  relatedObjectIds: string[];
  readiness: 'ready' | 'review' | 'blocked';
}

export interface DiagramNetworkObjectModelInput {
  summary: { orphanedAddressRowCount: number };
  devices: DiagramDeviceInput[];
  routeDomains: DiagramRouteDomainInput[];
  securityZones: DiagramSecurityZoneInput[];
  policyRules: DiagramPolicyRuleInput[];
  dhcpPools: DiagramDhcpPoolInput[];
  designGraph: {
    nodes: DiagramGraphNodeInput[];
    edges: DiagramGraphEdgeInput[];
    integrityFindings: DiagramFindingInput[];
  };
  routingSegmentation: {
    reachabilityFindings: DiagramFindingInput[];
  };
  securityPolicyFlow: {
    findings: DiagramFindingInput[];
  };
  implementationPlan: {
    steps: DiagramImplementationStepInput[];
    verificationChecks: DiagramVerificationCheckInput[];
    findings: Array<Omit<DiagramFindingInput, 'affectedObjectIds'> & { affectedStepIds: string[] }>;
  };
}

export interface BuildDiagramRenderModelInput {
  networkObjectModel: DiagramNetworkObjectModelInput;
  overlaySummaries: DiagramOverlaySummaryInput[];
  hotspots: DiagramHotspotInput[];
}

export interface DiagramCoverageRow {
  rowType: 'node' | 'edge';
  renderId: string;
  backendObjectId: string;
  objectType?: DiagramObjectType;
  relationship?: DiagramRelationship;
  truthState?: DiagramTruthState;
  readiness: DiagramReadiness;
  hasBackendIdentity: boolean;
  hasTruthState: boolean;
  hasReadiness: boolean;
  sourceEngine: string;
  relatedFindingIds: string[];
  modeImpacts: Array<'physical' | 'logical' | 'wan-cloud' | 'security' | 'per-site' | 'implementation'>;
}
