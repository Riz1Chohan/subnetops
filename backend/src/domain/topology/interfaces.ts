import type { SegmentRole } from '../addressing/cidr.js';
import type { TopologyInterface, TopologyInterfaceRole, TopologyAddressRowInput, TopologyLoopbackPlanInput, TopologyTransitPlanInput, TopologyTruthState } from './types.js';
import { normalizeIdentifierSegment } from './sites.js';
import { siteGatewayDeviceId } from './devices.js';

export function gatewayInterfaceId(addressRowId: string, vlanId: number) {
  return `interface-${addressRowId}-vlan-${vlanId}-gateway`;
}

export function transitInterfaceId(siteId: string, subnetCidr?: string) {
  return `interface-${siteId}-wan-transit-${normalizeIdentifierSegment(subnetCidr ?? 'pending')}`;
}

export function loopbackInterfaceId(siteId: string, endpointIp: string) {
  return `interface-${siteId}-loopback-${normalizeIdentifierSegment(endpointIp)}`;
}

export function interfaceRoleFromSegmentRole(segmentRole: SegmentRole): TopologyInterfaceRole {
  if (segmentRole === 'WAN_TRANSIT') return 'wan-transit';
  if (segmentRole === 'LOOPBACK') return 'loopback';
  return 'vlan-gateway';
}

export function topologyStatusFromTruthState(truthState: TopologyTruthState) {
  if (['configured', 'durable', 'approved'].includes(truthState)) return 'verified' as const;
  if (truthState === 'blocked') return 'incomplete' as const;
  return 'requires_review' as const;
}

export function createVlanGatewayInterface(params: { addressRow: TopologyAddressRowInput; deviceId?: string; routeDomainId: string; securityZoneId: string; linkId: string }): TopologyInterface {
  const { addressRow, routeDomainId, securityZoneId, linkId } = params;
  const subnetCidr = addressRow.canonicalSubnetCidr ?? addressRow.proposedSubnetCidr ?? addressRow.sourceSubnetCidr;
  const ipAddress = addressRow.effectiveGatewayIp ?? addressRow.proposedGatewayIp ?? addressRow.sourceGatewayIp;
  const truthState: TopologyTruthState = addressRow.gatewayState === 'valid' ? 'configured' : 'inferred';
  const interfaceId = gatewayInterfaceId(addressRow.id, addressRow.vlanId);

  return {
    id: interfaceId,
    name: `Vlan${addressRow.vlanId}`,
    deviceId: params.deviceId ?? siteGatewayDeviceId(addressRow.siteId),
    siteId: addressRow.siteId,
    kind: 'logical',
    interfaceRole: interfaceRoleFromSegmentRole(addressRow.role),
    truthState,
    status: topologyStatusFromTruthState(truthState),
    vlanId: addressRow.vlanId,
    subnetCidr,
    ipAddress,
    routeDomainId,
    securityZoneId,
    linkId,
    sourceObjectIds: [addressRow.id, addressRow.siteId, String(addressRow.vlanId)].filter(Boolean),
    evidence: [
      {
        source: 'addressing.rows',
        sourceObjectId: addressRow.id,
        sourceObjectType: 'address-row',
        detail: addressRow.gatewayState === 'valid' ? 'Gateway address is valid for the subnet.' : 'Gateway interface requires review because gateway evidence is missing, invalid, or proposed.',
      },
    ],
    reviewReason: truthState === 'configured' ? undefined : 'Confirm gateway IP, interface owner, and physical placement before implementation.',
    notes: [`Gateway interface modeled from ${addressRow.siteName} VLAN ${addressRow.vlanId} (${addressRow.vlanName}).`],
  };
}

export function createTransitInterface(params: { transitRow: TopologyTransitPlanInput; routeDomainId: string; securityZoneId: string; linkId: string }): TopologyInterface {
  const { transitRow, routeDomainId, securityZoneId, linkId } = params;
  const truthState: TopologyTruthState = transitRow.kind === 'existing' ? 'configured' : 'proposed';
  const interfaceId = transitInterfaceId(transitRow.siteId, transitRow.subnetCidr);

  return {
    id: interfaceId,
    name: `WAN Transit ${transitRow.subnetCidr ?? 'Pending'}`,
    deviceId: siteGatewayDeviceId(transitRow.siteId),
    siteId: transitRow.siteId,
    kind: 'logical',
    interfaceRole: 'wan-transit',
    truthState,
    status: topologyStatusFromTruthState(truthState),
    subnetCidr: transitRow.subnetCidr,
    ipAddress: transitRow.gatewayOrEndpoint,
    routeDomainId,
    securityZoneId,
    linkId,
    sourceObjectIds: [transitRow.siteId, transitRow.subnetCidr, transitRow.gatewayOrEndpoint].filter((value): value is string => Boolean(value)),
    evidence: [
      {
        source: 'transitPlan',
        sourceObjectId: transitRow.siteId,
        sourceObjectType: 'site',
        detail: transitRow.kind === 'existing' ? 'Transit interface comes from existing transit plan evidence.' : 'Transit interface is planned and needs endpoint confirmation.',
      },
    ],
    reviewReason: truthState === 'configured' ? undefined : 'Confirm carrier/provider/hub endpoint before implementation.',
    notes: ['Transit interface modeled from the backend transit plan.', ...(transitRow.notes ?? [])],
  };
}

export function createLoopbackInterface(params: { loopbackRow: TopologyLoopbackPlanInput; routeDomainId: string; securityZoneId: string }): TopologyInterface | null {
  const { loopbackRow, routeDomainId, securityZoneId } = params;
  if (!loopbackRow.endpointIp || !loopbackRow.subnetCidr) return null;
  const truthState: TopologyTruthState = loopbackRow.kind === 'existing' ? 'configured' : 'proposed';

  return {
    id: loopbackInterfaceId(loopbackRow.siteId, loopbackRow.endpointIp),
    name: 'Loopback0',
    deviceId: siteGatewayDeviceId(loopbackRow.siteId),
    siteId: loopbackRow.siteId,
    kind: 'logical',
    interfaceRole: 'loopback',
    truthState,
    status: topologyStatusFromTruthState(truthState),
    subnetCidr: loopbackRow.subnetCidr,
    ipAddress: loopbackRow.endpointIp,
    routeDomainId,
    securityZoneId,
    sourceObjectIds: [loopbackRow.siteId, loopbackRow.subnetCidr, loopbackRow.endpointIp],
    evidence: [
      {
        source: 'loopbackPlan',
        sourceObjectId: loopbackRow.siteId,
        sourceObjectType: 'site',
        detail: 'Loopback interface is modeled as a routing identity and stable management reference.',
      },
    ],
    reviewReason: truthState === 'configured' ? undefined : 'Confirm loopback ownership and routing advertisement before implementation.',
    notes: ['Loopback modeled as a routing identity and stable management reference.', ...(loopbackRow.notes ?? [])],
  };
}
