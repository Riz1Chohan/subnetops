import type { SegmentRole } from '../addressing/cidr.js';
import type { TopologyAddressRowInput, TopologyIsolationExpectation, TopologyZone, TopologyZoneRole } from './types.js';
import { DEFAULT_ROUTE_DOMAIN_ID, WIDE_AREA_NETWORK_ZONE_ID } from './devices.js';

export function securityZoneIdForRole(zoneRole: TopologyZoneRole) {
  return zoneRole === 'wan' ? WIDE_AREA_NETWORK_ZONE_ID : `security-zone-${zoneRole}`;
}

export function securityZoneNameForRole(zoneRole: TopologyZoneRole) {
  switch (zoneRole) {
    case 'guest':
      return 'Guest Access';
    case 'management':
      return 'Management Plane';
    case 'dmz':
      return 'DMZ Services';
    case 'voice':
      return 'Voice Services';
    case 'iot':
      return 'IoT and Operational Technology';
    case 'transit':
      return 'WAN Transit';
    case 'wan':
      return 'Wide Area Network';
    case 'internal':
      return 'Corporate Internal';
    case 'unknown':
    default:
      return 'Unclassified Network';
  }
}

export function isolationExpectationForRole(zoneRole: TopologyZoneRole): TopologyIsolationExpectation {
  switch (zoneRole) {
    case 'guest':
    case 'management':
    case 'dmz':
    case 'iot':
      return 'isolated';
    case 'voice':
    case 'transit':
    case 'internal':
      return 'restricted';
    case 'wan':
    case 'unknown':
    default:
      return 'review';
  }
}

export function zoneRoleFromSegmentRole(segmentRole: SegmentRole, descriptiveText = ''): TopologyZoneRole {
  const text = descriptiveText.toLowerCase();
  if (segmentRole === 'GUEST') return 'guest';
  if (segmentRole === 'MANAGEMENT') return 'management';
  if (segmentRole === 'VOICE') return 'voice';
  if (segmentRole === 'IOT' || segmentRole === 'CAMERA' || segmentRole === 'PRINTER') return 'iot';
  if (segmentRole === 'WAN_TRANSIT') return 'transit';
  if (segmentRole === 'SERVER' && text.includes('dmz')) return 'dmz';
  if (segmentRole === 'LOOPBACK') return 'transit';
  if (segmentRole === 'OTHER') return 'unknown';
  return 'internal';
}

export function zoneRoleFromSegmentContext(addressRow: Pick<TopologyAddressRowInput, 'role' | 'vlanName' | 'notes'>): TopologyZoneRole {
  return zoneRoleFromSegmentRole(addressRow.role, `${addressRow.vlanName ?? ''} ${(addressRow.notes ?? []).join(' ')}`);
}

export function createTopologyZone(zoneRole: TopologyZoneRole, routeDomainId = DEFAULT_ROUTE_DOMAIN_ID, initialNote?: string): TopologyZone {
  return {
    id: securityZoneIdForRole(zoneRole),
    name: securityZoneNameForRole(zoneRole),
    zoneRole,
    truthState: zoneRole === 'wan' ? 'proposed' : 'inferred',
    status: 'requires_review',
    siteIds: [],
    vlanIds: [],
    subnetCidrs: [],
    routeDomainId,
    isolationExpectation: isolationExpectationForRole(zoneRole),
    sourceObjectIds: [],
    evidence: [
      {
        source: 'topology.zone-classification',
        detail: initialNote ?? 'Zone is inferred from segment role, VLAN name, subnet planning metadata, or requirement context.',
      },
    ],
    reviewReason: 'Confirm security-zone boundaries and enforcement point before implementation.',
    notes: [initialNote ?? 'Inferred from VLAN purpose, segment role, and subnet planning metadata.'],
  };
}
