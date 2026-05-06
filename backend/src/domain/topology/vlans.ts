import type { TopologyAddressRowInput, TopologySubnetAttachment, TopologyVlan } from './types.js';

export function topologyVlanObjectId(siteId: string, vlanId: number) {
  return `vlan-${siteId}-${vlanId}`;
}

export function subnetAttachmentId(addressRowId: string) {
  return `subnet-attachment-${addressRowId}`;
}

export function createTopologyVlan(addressRow: TopologyAddressRowInput, subnetAttachmentIds: string[] = []): TopologyVlan {
  const subnetCidr = addressRow.canonicalSubnetCidr ?? addressRow.proposedSubnetCidr ?? addressRow.sourceSubnetCidr;
  const verified = Boolean(addressRow.canonicalSubnetCidr);

  return {
    id: topologyVlanObjectId(addressRow.siteId, addressRow.vlanId),
    name: `${addressRow.siteName} VLAN ${addressRow.vlanId} ${addressRow.vlanName}`.trim(),
    siteId: addressRow.siteId,
    vlanId: addressRow.vlanId,
    role: addressRow.role,
    truthState: verified ? 'configured' : 'inferred',
    status: verified ? 'verified' : 'requires_review',
    subnetAttachmentIds,
    sourceObjectIds: [addressRow.id, addressRow.siteId, String(addressRow.vlanId)],
    evidence: [
      {
        source: 'addressing.rows',
        sourceObjectId: addressRow.id,
        sourceObjectType: 'address-row',
        detail: subnetCidr ? `VLAN is attached to ${subnetCidr}.` : 'VLAN exists without an authoritative subnet attachment.',
      },
    ],
    reviewReason: verified ? undefined : 'Confirm authoritative subnet and VLAN placement before implementation.',
    notes: ['VLAN topology object is produced from backend address-row data, not frontend synthesis.'],
  };
}

export function createSubnetAttachment(params: { addressRow: TopologyAddressRowInput; vlanObjectId?: string; gatewayInterfaceId?: string; securityZoneId?: string; routeDomainId: string }): TopologySubnetAttachment | null {
  const subnetCidr = params.addressRow.canonicalSubnetCidr ?? params.addressRow.proposedSubnetCidr ?? params.addressRow.sourceSubnetCidr;
  if (!subnetCidr) return null;
  const verified = Boolean(params.addressRow.canonicalSubnetCidr);

  return {
    id: subnetAttachmentId(params.addressRow.id),
    name: `${params.addressRow.siteName} VLAN ${params.addressRow.vlanId} subnet attachment`,
    siteId: params.addressRow.siteId,
    vlanObjectId: params.vlanObjectId,
    vlanId: params.addressRow.vlanId,
    subnetCidr,
    gatewayInterfaceId: params.gatewayInterfaceId,
    securityZoneId: params.securityZoneId,
    routeDomainId: params.routeDomainId,
    relationshipSource: verified ? 'system_verified' : 'system_calculated',
    relationshipReason: verified ? 'Canonical subnet is present in backend addressing data.' : 'Subnet is proposed or fallback-calculated and requires review.',
    truthState: verified ? 'configured' : 'inferred',
    status: verified ? 'verified' : 'requires_review',
    sourceObjectIds: [params.addressRow.id, params.addressRow.siteId, String(params.addressRow.vlanId), subnetCidr],
    evidence: [
      {
        source: 'addressing.rows',
        sourceObjectId: params.addressRow.id,
        sourceObjectType: 'address-row',
        detail: `Subnet ${subnetCidr} is attached to site ${params.addressRow.siteName} VLAN ${params.addressRow.vlanId}.`,
      },
    ],
    reviewReason: verified ? undefined : 'Confirm this subnet before using it as implementation authority.',
    notes: ['Subnet attachment links a subnet to site, VLAN, gateway, zone, and route-domain context.'],
  };
}
