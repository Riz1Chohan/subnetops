import type { TopologyAddressRowInput, TopologyLink, TopologyTransitPlanInput, TopologyTruthState } from './types.js';
import { normalizeIdentifierSegment } from './sites.js';
import { siteGatewayDeviceId } from './devices.js';
import { gatewayInterfaceId, topologyStatusFromTruthState, transitInterfaceId } from './interfaces.js';

export function vlanGatewayLinkId(addressRowId: string, vlanId: number) {
  return `link-${addressRowId}-vlan-${vlanId}-gateway-binding`;
}

export function transitLinkId(siteId: string, subnetCidr?: string) {
  return `link-${siteId}-wan-transit-${normalizeIdentifierSegment(subnetCidr ?? 'pending')}`;
}

export function createVlanGatewayLink(params: { addressRow: TopologyAddressRowInput; deviceId?: string; interfaceId?: string; subnetCidr?: string }): TopologyLink {
  const { addressRow } = params;
  const linkId = vlanGatewayLinkId(addressRow.id, addressRow.vlanId);
  const interfaceId = params.interfaceId ?? gatewayInterfaceId(addressRow.id, addressRow.vlanId);
  const deviceId = params.deviceId ?? siteGatewayDeviceId(addressRow.siteId);

  return {
    id: linkId,
    name: `${addressRow.siteName} VLAN ${addressRow.vlanId} Gateway Binding`,
    linkRole: 'vlan-gateway-binding',
    truthState: 'inferred',
    status: 'requires_review',
    relationshipSource: 'system_calculated',
    relationshipReason: 'Logical VLAN/subnet-to-gateway binding calculated from the address row. Physical switchport placement remains unknown.',
    siteIds: [addressRow.siteId],
    subnetCidr: params.subnetCidr,
    endpointA: {
      deviceId,
      interfaceId,
      siteId: addressRow.siteId,
      label: `${addressRow.siteName} gateway Vlan${addressRow.vlanId}`,
    },
    sourceObjectIds: [addressRow.id, addressRow.siteId, String(addressRow.vlanId)],
    evidence: [
      {
        source: 'addressing.rows',
        sourceObjectId: addressRow.id,
        sourceObjectType: 'address-row',
        detail: 'The address row provides VLAN, subnet, and gateway context for this logical binding.',
      },
    ],
    reviewReason: 'Physical links and switchport placement are not known yet.',
    notes: ['Logical binding between VLAN/subnet and the layer-3 gateway interface.'],
  };
}

export function createTransitLink(params: { transitRow: TopologyTransitPlanInput; deviceId?: string; interfaceId?: string }): TopologyLink {
  const { transitRow } = params;
  const truthState: TopologyTruthState = transitRow.kind === 'existing' ? 'configured' : 'proposed';
  const interfaceId = params.interfaceId ?? transitInterfaceId(transitRow.siteId, transitRow.subnetCidr);
  const deviceId = params.deviceId ?? siteGatewayDeviceId(transitRow.siteId);

  return {
    id: transitLinkId(transitRow.siteId, transitRow.subnetCidr),
    name: `${transitRow.siteName} WAN Transit`,
    linkRole: 'site-wan-transit',
    truthState,
    status: topologyStatusFromTruthState(truthState),
    relationshipSource: truthState === 'configured' ? 'system_verified' : 'requires_review',
    relationshipReason: truthState === 'configured' ? 'Transit row represents existing topology evidence.' : 'Transit link is planned and needs peer endpoint/provider details.',
    siteIds: [transitRow.siteId],
    subnetCidr: transitRow.subnetCidr,
    endpointA: {
      deviceId,
      interfaceId,
      siteId: transitRow.siteId,
      label: `${transitRow.siteName} WAN transit`,
    },
    sourceObjectIds: [transitRow.siteId, transitRow.subnetCidr, transitRow.gatewayOrEndpoint].filter((value): value is string => Boolean(value)),
    evidence: [
      {
        source: 'transitPlan',
        sourceObjectId: transitRow.siteId,
        sourceObjectType: 'site',
        detail: 'Transit plan supplies the logical routed link context.',
      },
    ],
    reviewReason: truthState === 'configured' ? undefined : 'Add the far-end device/interface, carrier, or hub evidence before implementation.',
    notes: ['WAN transit modeled as a logical routed link; opposite endpoint may remain incomplete until provider/hub data exists.'],
  };
}
