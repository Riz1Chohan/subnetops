function assert(condition: unknown, message = 'assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) throw new Error(message ?? `expected ${String(expected)}, got ${String(actual)}`);
}

import {
  buildSecurityPolicyFlowModel,
  defaultZonePosture,
  matrixRowReadiness,
  natRuleIsComplete,
  policyRuleIsBroadPermit,
  securityReadinessFromFindings,
  serviceIsBroad,
  zoneIsHighRiskSource,
} from './index.js';
import type { NatRule, PolicyRule, SecurityZone, SegmentationFlowExpectation } from './types.js';

const zones: SecurityZone[] = [
  { id: 'zone-internal', name: 'Internal', zoneRole: 'internal', truthState: 'inferred', siteIds: ['site-hq'], vlanIds: [10], subnetCidrs: ['10.10.10.0/24'], routeDomainId: 'route-domain-corporate', isolationExpectation: 'restricted', notes: [] },
  { id: 'zone-guest', name: 'Guest', zoneRole: 'guest', truthState: 'inferred', siteIds: ['site-hq'], vlanIds: [20], subnetCidrs: ['10.10.20.0/24'], routeDomainId: 'route-domain-corporate', isolationExpectation: 'isolated', notes: [] },
  { id: 'zone-wan', name: 'WAN', zoneRole: 'wan', truthState: 'proposed', siteIds: ['site-hq'], vlanIds: [], subnetCidrs: [], routeDomainId: 'route-domain-corporate', isolationExpectation: 'review', notes: [] },
];

const policyRules: PolicyRule[] = [
  { id: 'policy-guest-deny-internal', name: 'Deny guest to internal', sourceZoneId: 'zone-guest', destinationZoneId: 'zone-internal', action: 'deny', services: ['any'], truthState: 'proposed', rationale: 'Guest isolation.', notes: [] },
  { id: 'policy-internal-egress', name: 'Internal egress', sourceZoneId: 'zone-internal', destinationZoneId: 'zone-wan', action: 'allow', services: ['https', 'dns'], truthState: 'proposed', rationale: 'User egress.', notes: [] },
];

const natRules: NatRule[] = [
  { id: 'nat-internal-egress', name: 'Internal PAT', sourceZoneId: 'zone-internal', destinationZoneId: 'zone-wan', sourceSubnetCidrs: ['10.10.10.0/24'], translatedAddressMode: 'interface-overload', truthState: 'proposed', status: 'required', notes: [] },
];

const segmentationExpectations: SegmentationFlowExpectation[] = [
  { id: 'seg-guest-internal', name: 'Guest isolation', sourceZoneId: 'zone-guest', sourceZoneName: 'Guest', destinationZoneId: 'zone-internal', destinationZoneName: 'Internal', expectedAction: 'deny', observedPolicyAction: 'deny', services: ['any'], state: 'satisfied', severityIfMissing: 'ERROR', rationale: 'Guest cannot reach internal.', notes: [] },
  { id: 'seg-internal-wan', name: 'Internal egress', sourceZoneId: 'zone-internal', sourceZoneName: 'Internal', destinationZoneId: 'zone-wan', destinationZoneName: 'WAN', expectedAction: 'allow', observedPolicyAction: 'allow', services: ['https'], state: 'satisfied', severityIfMissing: 'WARNING', rationale: 'User egress.', notes: [] },
];

const policy = buildSecurityPolicyFlowModel({
  networkObjectModel: { securityZones: zones, policyRules, natRules },
  routingSegmentation: {
    summary: { segmentationExpectationCount: segmentationExpectations.length, missingPolicyCount: 0, conflictingPolicyCount: 0, segmentationReadiness: 'ready' },
    segmentationExpectations,
  },
  requirementsJson: JSON.stringify({ guestWifi: true, internetModel: 'central internet egress', securityPosture: 'default deny with logging' }),
});

assert(policy.policyMatrix.length >= 2);
assert(policy.flowRequirements.some((flow) => flow.sourceZoneId === 'zone-guest' && flow.destinationZoneId === 'zone-internal'));
assert(policy.serviceObjects.some((service) => service.name === 'https'));
assertEqual(zoneIsHighRiskSource(zones[1]), true);
assertEqual(defaultZonePosture(zones[1], zones[0]), 'deny');
assertEqual(natRuleIsComplete(natRules[0]), true);
assertEqual(policyRuleIsBroadPermit(policyRules[0]), false);
assertEqual(serviceIsBroad({ name: 'any', broadMatch: false }), true);
assert(['ready', 'review', 'blocked'].includes(matrixRowReadiness(policy.policyMatrix[0])));
assert(['ready', 'review', 'blocked'].includes(securityReadinessFromFindings(policy.findings)));

console.log('security-policy-domain selftest passed');
