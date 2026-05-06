function assert(condition: unknown, message = 'assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) throw new Error(message ?? `expected ${String(expected)}, got ${String(actual)}`);
}

import {
  buildRoutingSegmentationModel,
  defaultRouteReadiness,
  hasStaticRouteTo,
  routeDomainReadiness,
  routeIntentCoversDestination,
  routeIntentNeedsReview,
  summarizationReadiness,
} from './index.js';
import type { RouteDomain, RoutingNetworkObjectModel } from './types.js';

const routeDomain: RouteDomain = {
  id: 'route-domain-corporate',
  name: 'Corporate Routing Domain',
  scope: 'project',
  truthState: 'inferred',
  siteIds: ['site-hq', 'site-branch'],
  subnetCidrs: ['10.10.10.0/24', '10.20.10.0/24', '10.255.0.0/30'],
  interfaceIds: ['interface-hq-users', 'interface-branch-users', 'interface-hq-wan'],
  linkIds: ['link-hq-wan'],
  defaultRouteState: 'required',
  summarizationState: 'ready',
  notes: [],
};

const model: RoutingNetworkObjectModel = {
  routeDomains: [routeDomain],
  securityZones: [
    { id: 'zone-internal', name: 'Internal', zoneRole: 'internal', truthState: 'inferred', siteIds: ['site-hq', 'site-branch'], vlanIds: [10], subnetCidrs: ['10.10.10.0/24', '10.20.10.0/24'], routeDomainId: routeDomain.id, isolationExpectation: 'restricted', notes: [] },
    { id: 'zone-wan', name: 'WAN', zoneRole: 'wan', truthState: 'proposed', siteIds: ['site-hq'], vlanIds: [], subnetCidrs: [], routeDomainId: routeDomain.id, isolationExpectation: 'review', notes: [] },
  ],
  devices: [
    { id: 'device-hq-gateway', name: 'HQ Gateway', siteId: 'site-hq', deviceRole: 'core-layer3-switch' },
    { id: 'device-branch-gateway', name: 'Branch Gateway', siteId: 'site-branch', deviceRole: 'branch-edge-router' },
    { id: 'device-firewall', name: 'HQ Firewall', siteId: 'site-hq', deviceRole: 'security-firewall' },
  ],
  interfaces: [
    { id: 'interface-hq-users', name: 'Vlan10', deviceId: 'device-hq-gateway', siteId: 'site-hq', interfaceRole: 'vlan-gateway', truthState: 'configured', subnetCidr: '10.10.10.0/24', routeDomainId: routeDomain.id, securityZoneId: 'zone-internal', notes: [] },
    { id: 'interface-branch-users', name: 'Vlan10', deviceId: 'device-branch-gateway', siteId: 'site-branch', interfaceRole: 'vlan-gateway', truthState: 'configured', subnetCidr: '10.20.10.0/24', routeDomainId: routeDomain.id, securityZoneId: 'zone-internal', notes: [] },
    { id: 'interface-hq-wan', name: 'WAN Transit', deviceId: 'device-hq-gateway', siteId: 'site-hq', interfaceRole: 'wan-transit', truthState: 'proposed', subnetCidr: '10.255.0.0/30', routeDomainId: routeDomain.id, securityZoneId: 'zone-wan', linkId: 'link-hq-wan', notes: [] },
  ],
  links: [
    { id: 'link-hq-wan', name: 'HQ WAN Transit', linkRole: 'site-wan-transit', truthState: 'proposed', status: 'planned', siteIds: ['site-hq'], subnetCidr: '10.255.0.0/30', endpointA: { deviceId: 'device-hq-gateway', interfaceId: 'interface-hq-wan', siteId: 'site-hq', label: 'HQ WAN' }, notes: [] },
  ],
  policyRules: [
    { id: 'policy-internal-deny-wan', name: 'Internal to WAN review guardrail', sourceZoneId: 'zone-internal', destinationZoneId: 'zone-wan', action: 'review', services: ['https'], truthState: 'proposed', rationale: 'Egress requires firewall review.', notes: [] },
  ],
};

const siteSummaries = [
  { siteId: 'site-hq', siteName: 'HQ', currentSiteBlock: '10.10.0.0/16', minimumRequiredSummary: '10.10.0.0/16', status: 'good' as const, coveredSubnetCount: 1, notes: [] },
  { siteId: 'site-branch', siteName: 'Branch', currentSiteBlock: '10.20.0.0/16', minimumRequiredSummary: '10.20.0.0/16', status: 'good' as const, coveredSubnetCount: 1, notes: [] },
];

const routing = buildRoutingSegmentationModel({
  project: { sites: [{ id: 'site-hq', name: 'HQ' }, { id: 'site-branch', name: 'Branch' }] },
  networkObjectModel: model,
  siteSummaries,
  transitPlan: [{ kind: 'proposed', siteId: 'site-hq', siteName: 'HQ', subnetCidr: '10.255.0.0/30', notes: [] }],
});

assert(routing.routeIntents.some((route) => route.routeKind === 'connected' && route.destinationCidr === '10.10.10.0/24'));
assert(routing.routeEntries.length >= routing.routeIntents.length);
assertEqual(summarizationReadiness(siteSummaries), 'ready');
assertEqual(defaultRouteReadiness(routing.routeIntents), 'ready');
assert(['ready', 'review', 'blocked'].includes(routeDomainReadiness(routeDomain, routing.routeIntents)));
assert(routing.routeIntents.some((route) => route.routeKind === 'summary'));
assert(hasStaticRouteTo(routing.routeIntents, '10.20.0.0/16') || routing.routeIntents.some((route) => route.routeKind === 'static'));
const defaultRoute = routing.routeIntents.find((route) => route.destinationCidr === '0.0.0.0/0');
assert(defaultRoute);
assert(routeIntentCoversDestination(defaultRoute, '10.20.10.0/24'));
assertEqual(routeIntentNeedsReview(defaultRoute), false);
assert(routing.routeTables.length === 1);
assert(routing.summary.routeIntentCount === routing.routeIntents.length);

console.log('routing-domain selftest passed');
