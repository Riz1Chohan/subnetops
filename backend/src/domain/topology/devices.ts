import type { TopologyDevice, TopologyDeviceRole, TopologyProjectInput } from './types.js';
import { chooseHubSite, normalizeIdentifierSegment, siteDisplayCode } from './sites.js';

export const DEFAULT_ROUTE_DOMAIN_ID = 'route-domain-corporate';
export const WIDE_AREA_NETWORK_ZONE_ID = 'security-zone-wide-area-network';

export function siteGatewayDeviceId(siteId: string) {
  return `device-${siteId}-layer3-gateway`;
}

export function securityBoundaryDeviceId(projectId: string) {
  return `device-${projectId}-security-boundary-firewall`;
}

export function routingIdentityDeviceId(siteId: string, endpointIp: string) {
  return `device-${siteId}-routing-identity-${normalizeIdentifierSegment(endpointIp)}`;
}

export function deviceRoleForSite(site: TopologyProjectInput['sites'][number], projectSiteCount: number): TopologyDeviceRole {
  const isHeadquarters = `${site.name} ${site.siteCode ?? ''}`.toLowerCase().includes('hq');
  return projectSiteCount === 1 || isHeadquarters ? 'core-layer3-switch' : 'branch-edge-router';
}

export function createSiteGatewayDevice(site: TopologyProjectInput['sites'][number], projectSiteCount: number, routeDomainId = DEFAULT_ROUTE_DOMAIN_ID): TopologyDevice {
  const displayCode = siteDisplayCode(site);
  return {
    id: siteGatewayDeviceId(site.id),
    name: `${displayCode} Layer-3 Gateway`,
    siteId: site.id,
    siteName: site.name,
    siteCode: site.siteCode,
    deviceRole: deviceRoleForSite(site, projectSiteCount),
    truthState: 'inferred',
    status: 'requires_review',
    routeDomainIds: [routeDomainId],
    securityZoneIds: [],
    interfaceIds: [],
    sourceObjectIds: [site.id],
    evidence: [
      {
        source: 'topology.project.sites',
        sourceObjectId: site.id,
        sourceObjectType: 'site',
        detail: 'Gateway device is inferred from site ownership of VLAN gateway interfaces.',
      },
    ],
    reviewReason: 'Confirm the actual router, firewall interface, or layer-3 switch before implementation.',
    notes: ['Gateway device is a backend topology object used to anchor logical interfaces and links.'],
  };
}

export function createSecurityBoundaryDevice(project: TopologyProjectInput, routeDomainId = DEFAULT_ROUTE_DOMAIN_ID): TopologyDevice | null {
  const hubSite = chooseHubSite(project);
  if (!hubSite) return null;

  return {
    id: securityBoundaryDeviceId(project.id),
    name: `${siteDisplayCode(hubSite)} Security Boundary Firewall`,
    siteId: hubSite.id,
    siteName: hubSite.name,
    siteCode: hubSite.siteCode,
    deviceRole: 'security-firewall',
    truthState: 'proposed',
    status: 'requires_review',
    routeDomainIds: [routeDomainId],
    securityZoneIds: [WIDE_AREA_NETWORK_ZONE_ID],
    interfaceIds: [],
    sourceObjectIds: [project.id, hubSite.id],
    evidence: [
      {
        source: 'topology.project',
        sourceObjectId: project.id,
        sourceObjectType: 'project',
        detail: 'Security boundary is proposed from project-level internet/WAN/security posture needs.',
      },
    ],
    reviewReason: 'Confirm actual firewall/provider edge placement before treating this as deployable topology.',
    notes: ['Security boundary device is a proposed design object, not discovered hardware.'],
  };
}
