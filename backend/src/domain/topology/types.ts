import type { SegmentRole } from '../addressing/cidr.js';

export type TopologyTruthState =
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

export type TopologyObjectStatus = 'verified' | 'requires_review' | 'incomplete';
export type TopologyFindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type TopologyDeviceRole = 'core-layer3-switch' | 'branch-edge-router' | 'security-firewall' | 'routing-identity' | 'unknown';
export type TopologyInterfaceRole = 'vlan-gateway' | 'wan-transit' | 'loopback' | 'firewall-boundary' | 'routed-uplink' | 'unknown';
export type TopologyLinkRole = 'site-wan-transit' | 'vlan-gateway-binding' | 'firewall-boundary' | 'route-domain-membership' | 'planned';
export type TopologyZoneRole = 'internal' | 'guest' | 'management' | 'dmz' | 'voice' | 'iot' | 'wan' | 'transit' | 'unknown';
export type TopologyIsolationExpectation = 'open' | 'restricted' | 'isolated' | 'review';
export type TopologyRelationshipSource = 'user_provided' | 'system_calculated' | 'system_verified' | 'requires_review' | 'not_available';

export interface TopologyEvidenceRef {
  source: string;
  sourceObjectId?: string;
  sourceObjectType?: string;
  detail?: string;
}

export interface TopologyBaseObject {
  id: string;
  name: string;
  truthState: TopologyTruthState;
  status: TopologyObjectStatus;
  sourceObjectIds: string[];
  evidence: TopologyEvidenceRef[];
  reviewReason?: string;
  notes: string[];
}

export interface TopologySite extends TopologyBaseObject {
  siteCode?: string | null;
  defaultAddressBlock?: string | null;
}

export interface TopologyVlan extends TopologyBaseObject {
  siteId: string;
  vlanId: number;
  role: SegmentRole;
  subnetAttachmentIds: string[];
}

export interface TopologyDevice extends TopologyBaseObject {
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  deviceRole: TopologyDeviceRole;
  routeDomainIds: string[];
  securityZoneIds: string[];
  interfaceIds: string[];
}

export interface TopologyInterface extends TopologyBaseObject {
  deviceId: string;
  siteId: string;
  kind: 'physical' | 'logical';
  interfaceRole: TopologyInterfaceRole;
  vlanId?: number;
  subnetCidr?: string;
  ipAddress?: string;
  routeDomainId?: string;
  securityZoneId?: string;
  linkId?: string;
}

export interface TopologyLinkEndpoint {
  deviceId: string;
  interfaceId?: string;
  siteId: string;
  label: string;
}

export interface TopologyLink extends TopologyBaseObject {
  linkRole: TopologyLinkRole;
  relationshipSource: TopologyRelationshipSource;
  relationshipReason: string;
  siteIds: string[];
  subnetCidr?: string;
  endpointA?: TopologyLinkEndpoint;
  endpointB?: TopologyLinkEndpoint;
}

export interface TopologyZone extends TopologyBaseObject {
  zoneRole: TopologyZoneRole;
  siteIds: string[];
  vlanIds: number[];
  subnetCidrs: string[];
  routeDomainId: string;
  isolationExpectation: TopologyIsolationExpectation;
}

export interface TopologySubnetAttachment extends TopologyBaseObject {
  siteId: string;
  vlanObjectId?: string;
  vlanId?: number;
  subnetCidr: string;
  gatewayInterfaceId?: string;
  securityZoneId?: string;
  routeDomainId: string;
  relationshipSource: TopologyRelationshipSource;
  relationshipReason: string;
}

export interface TopologyRouteDomainMembership extends TopologyBaseObject {
  routeDomainId: string;
  memberObjectId: string;
  memberObjectType: 'site' | 'device' | 'interface' | 'link' | 'subnet' | 'zone';
  relationshipSource: TopologyRelationshipSource;
  relationshipReason: string;
}

export interface TopologyFinding {
  id: string;
  severity: TopologyFindingSeverity;
  title: string;
  detail: string;
  affectedObjectIds: string[];
  recommendedAction?: string;
}

export interface TopologyCoverageSummary {
  siteCount: number;
  vlanCount: number;
  deviceCount: number;
  interfaceCount: number;
  linkCount: number;
  zoneCount: number;
  subnetAttachmentCount: number;
  routeDomainMembershipCount: number;
  verifiedObjectCount: number;
  reviewRequiredObjectCount: number;
  incompleteObjectCount: number;
  findingCount: number;
  blockingFindingCount: number;
  notes: string[];
}

export interface TopologyModel {
  summary: TopologyCoverageSummary;
  sites: TopologySite[];
  vlans: TopologyVlan[];
  devices: TopologyDevice[];
  interfaces: TopologyInterface[];
  links: TopologyLink[];
  zones: TopologyZone[];
  subnetAttachments: TopologySubnetAttachment[];
  routeDomainMemberships: TopologyRouteDomainMembership[];
  findings: TopologyFinding[];
}

export interface TopologyProjectInput {
  id: string;
  name: string;
  sites: Array<{
    id: string;
    name: string;
    siteCode?: string | null;
    defaultAddressBlock?: string | null;
  }>;
}

export interface TopologyAddressRowInput {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  truthState?: TopologyTruthState;
  canonicalSubnetCidr?: string;
  proposedSubnetCidr?: string;
  sourceSubnetCidr?: string;
  effectiveGatewayIp?: string;
  proposedGatewayIp?: string;
  sourceGatewayIp?: string;
  gatewayState?: 'valid' | 'invalid' | 'fallback' | string;
  notes?: string[];
}

export interface TopologyTransitPlanInput {
  siteId: string;
  siteName: string;
  vlanId?: number;
  subnetCidr?: string;
  gatewayOrEndpoint?: string;
  kind?: 'existing' | 'planned' | string;
  notes?: string[];
}

export interface TopologyLoopbackPlanInput {
  siteId: string;
  siteName: string;
  subnetCidr?: string;
  endpointIp?: string;
  kind?: 'existing' | 'planned' | string;
  notes?: string[];
}

export interface BuildTopologyModelInput {
  project: TopologyProjectInput;
  addressingRows: TopologyAddressRowInput[];
  transitPlan?: TopologyTransitPlanInput[];
  loopbackPlan?: TopologyLoopbackPlanInput[];
  routeDomainId?: string;
}
