import {
  DEFAULT_ROUTE_DOMAIN_ID,
  buildTopologyModel,
  gatewayInterfaceId,
  securityZoneIdForRole,
  topologyVlanObjectId,
  zoneRoleFromSegmentContext,
} from './index.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const topology = buildTopologyModel({
  project: {
    id: 'project-demo',
    name: 'Demo Network',
    sites: [
      { id: 'site-hq', name: 'HQ', siteCode: 'HQ', defaultAddressBlock: '10.10.0.0/16' },
      { id: 'site-branch', name: 'Branch', siteCode: 'BR1' },
    ],
  },
  addressingRows: [
    {
      id: 'addr-hq-users',
      siteId: 'site-hq',
      siteName: 'HQ',
      siteCode: 'HQ',
      vlanId: 10,
      vlanName: 'Users',
      role: 'USER',
      canonicalSubnetCidr: '10.10.10.0/24',
      effectiveGatewayIp: '10.10.10.1',
      gatewayState: 'valid',
    },
    {
      id: 'addr-hq-guest',
      siteId: 'site-hq',
      siteName: 'HQ',
      siteCode: 'HQ',
      vlanId: 40,
      vlanName: 'Guest WiFi',
      role: 'GUEST',
      proposedSubnetCidr: '10.10.40.0/24',
      proposedGatewayIp: '10.10.40.1',
      gatewayState: 'fallback',
    },
    {
      id: 'addr-hq-dmz',
      siteId: 'site-hq',
      siteName: 'HQ',
      siteCode: 'HQ',
      vlanId: 50,
      vlanName: 'Public DMZ Web',
      role: 'SERVER',
      canonicalSubnetCidr: '10.10.50.0/24',
      effectiveGatewayIp: '10.10.50.1',
      gatewayState: 'valid',
      notes: ['dmz services'],
    },
  ],
  transitPlan: [
    {
      siteId: 'site-hq',
      siteName: 'HQ',
      subnetCidr: '10.255.0.0/30',
      gatewayOrEndpoint: '10.255.0.1',
      kind: 'planned',
    },
  ],
  loopbackPlan: [
    {
      siteId: 'site-hq',
      siteName: 'HQ',
      subnetCidr: '10.255.255.1/32',
      endpointIp: '10.255.255.1',
      kind: 'existing',
    },
  ],
});

assert(topology.summary.siteCount === 2, 'topology must preserve project sites.');
assert(topology.summary.vlanCount === 3, 'topology must create VLAN objects from address rows.');
assert(topology.summary.subnetAttachmentCount === 3, 'topology must attach subnets to VLAN/site/zone/route-domain context.');
assert(topology.devices.some((device) => device.id === 'device-site-hq-layer3-gateway'), 'site gateway device must be deterministic.');
assert(topology.devices.some((device) => device.deviceRole === 'security-firewall'), 'security boundary device should be proposed as a review object.');
assert(topology.interfaces.some((item) => item.id === gatewayInterfaceId('addr-hq-users', 10) && item.status === 'verified'), 'valid gateway interface must be verified.');
assert(topology.interfaces.some((item) => item.id === gatewayInterfaceId('addr-hq-guest', 40) && item.status === 'requires_review'), 'fallback gateway interface must require review.');
assert(topology.links.every((link) => link.relationshipReason.length > 0), 'every topology link needs a relationship reason.');
assert(topology.subnetAttachments.every((attachment) => attachment.routeDomainId === DEFAULT_ROUTE_DOMAIN_ID), 'subnet attachments must carry route-domain ownership.');
assert(topology.routeDomainMemberships.some((membership) => membership.memberObjectType === 'subnet'), 'route-domain memberships must include subnet attachments.');
assert(topology.zones.some((zone) => zone.id === securityZoneIdForRole('guest') && zone.subnetCidrs.includes('10.10.40.0/24')), 'guest zone must include guest subnet membership.');
assert(topology.zones.some((zone) => zone.id === securityZoneIdForRole('dmz') && zone.subnetCidrs.includes('10.10.50.0/24')), 'DMZ zone must be derived from server + DMZ context.');
assert(topology.vlans.some((vlan) => vlan.id === topologyVlanObjectId('site-hq', 10)), 'VLAN object IDs must be deterministic.');
assert(topology.findings.some((finding) => finding.id === 'site-no-gateway-interface-site-branch'), 'missing site gateway interface must be represented as a finding, not invented topology.');
assert(topology.summary.reviewRequiredObjectCount > 0, 'proposed/inferred topology must remain review-required.');
assert(zoneRoleFromSegmentContext({ role: 'SERVER', vlanName: 'DMZ', notes: [] }) === 'dmz', 'DMZ zone classification should use segment context.');
assert(topology.links.length > 0 && topology.links.every((link) => link.sourceObjectIds.length > 0), 'links must carry source evidence.');

console.log('Topology domain selftest passed');
