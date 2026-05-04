function assert(condition: unknown, message = 'assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}

assert.equal = function equal(actual: unknown, expected: unknown, message = 'values are not equal') {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
};

assert.ok = function ok(condition: unknown, message = 'expected condition to be truthy') {
  if (!condition) throw new Error(message);
};

import {
  assertBackendDiagramRenderModel,
  buildDiagramRenderModel,
  coverageForDiagramEdge,
  coverageForDiagramNode,
  layersForDiagramMode,
} from './index.js';
import type { DiagramNetworkObjectModelInput, DiagramOverlaySummaryInput } from './index.js';

const overlaySummaries: DiagramOverlaySummaryInput[] = [
  { key: 'addressing', label: 'Addressing', readiness: 'ready', detail: 'Addressing rows are anchored.', count: 2 },
  { key: 'routing', label: 'Routing', readiness: 'review', detail: 'Routing intent needs review.', count: 1 },
  { key: 'security', label: 'Security', readiness: 'review', detail: 'Security policy needs review.', count: 1 },
  { key: 'nat', label: 'NAT', readiness: 'review', detail: 'NAT coverage needs review.', count: 1 },
  { key: 'implementation', label: 'Implementation', readiness: 'review', detail: 'Implementation plan exists.', count: 1 },
  { key: 'verification', label: 'Verification', readiness: 'review', detail: 'Verification pending.', count: 1 },
  { key: 'operational-safety', label: 'Operational safety', readiness: 'review', detail: 'Safety gates pending.', count: 1 },
];

const modelInput: DiagramNetworkObjectModelInput = {
  summary: { orphanedAddressRowCount: 0 },
  devices: [
    {
      id: 'dev-hq-fw',
      name: 'HQ Firewall',
      siteId: 'site-hq',
      siteName: 'HQ',
      siteCode: 'HQ',
      deviceRole: 'security-firewall',
      truthState: 'planned',
      routeDomainIds: ['rd-corp'],
      securityZoneIds: ['zone-wan'],
      interfaceIds: [],
      notes: ['Internet edge device from topology model.'],
    },
    {
      id: 'dev-hq-core',
      name: 'HQ Core',
      siteId: 'site-hq',
      siteName: 'HQ',
      siteCode: 'HQ',
      deviceRole: 'core-layer3-switch',
      truthState: 'planned',
      routeDomainIds: ['rd-corp'],
      securityZoneIds: ['zone-internal'],
      interfaceIds: [],
      notes: ['Core gateway.'],
    },
    {
      id: 'dev-branch-edge',
      name: 'Branch Edge',
      siteId: 'site-branch',
      siteName: 'Branch 1',
      siteCode: 'B1',
      deviceRole: 'branch-edge-router',
      truthState: 'planned',
      routeDomainIds: ['rd-corp'],
      securityZoneIds: ['zone-internal'],
      interfaceIds: [],
      notes: ['Branch gateway.'],
    },
  ],
  routeDomains: [
    {
      id: 'rd-corp',
      name: 'Corporate routing domain',
      truthState: 'planned',
      siteIds: ['site-hq', 'site-branch'],
      subnetCidrs: ['10.10.10.0/24'],
      interfaceIds: [],
      linkIds: [],
      summarizationState: 'review',
      notes: ['Route domain from routing model.'],
    },
  ],
  securityZones: [
    {
      id: 'zone-wan',
      name: 'WAN',
      zoneRole: 'wan',
      truthState: 'planned',
      siteIds: ['site-hq'],
      vlanIds: [],
      subnetCidrs: [],
      routeDomainId: 'rd-corp',
      isolationExpectation: 'restricted',
      notes: ['WAN boundary.'],
    },
    {
      id: 'zone-internal',
      name: 'Internal',
      zoneRole: 'internal',
      truthState: 'planned',
      siteIds: ['site-hq', 'site-branch'],
      vlanIds: [10],
      subnetCidrs: ['10.10.10.0/24'],
      routeDomainId: 'rd-corp',
      isolationExpectation: 'restricted',
      notes: ['Internal protected zone.'],
    },
  ],
  policyRules: [
    {
      id: 'policy-internal-wan-review',
      name: 'Review Internal to WAN',
      sourceZoneId: 'zone-internal',
      destinationZoneId: 'zone-wan',
      action: 'review',
      services: ['HTTPS'],
      truthState: 'planned',
      rationale: 'Outbound policy requires review.',
      notes: [],
    },
  ],
  dhcpPools: [
    {
      id: 'dhcp-hq-users',
      name: 'HQ Users DHCP',
      siteId: 'site-hq',
      vlanId: 10,
      subnetCidr: '10.10.10.0/24',
      truthState: 'planned',
      allocationState: 'proposed',
      notes: [],
    },
  ],
  designGraph: {
    nodes: [
      { id: 'graph-site-hq', objectType: 'site', objectId: 'site-hq', label: 'HQ', truthState: 'configured', notes: [] },
      { id: 'graph-site-branch', objectType: 'site', objectId: 'site-branch', label: 'Branch 1', truthState: 'configured', notes: [] },
      { id: 'graph-vlan-users', objectType: 'vlan', objectId: 'site-hq:vlan:10', label: 'HQ VLAN 10 Users', siteId: 'site-hq', truthState: 'planned', notes: [] },
      { id: 'graph-subnet-users', objectType: 'subnet', objectId: '10.10.10.0/24', label: '10.10.10.0/24', siteId: 'site-hq', truthState: 'planned', notes: [] },
    ],
    edges: [
      { id: 'graph-edge-vlan-subnet', relationship: 'vlan-uses-subnet', sourceNodeId: 'graph-vlan-users', targetNodeId: 'graph-subnet-users', truthState: 'planned', required: true, notes: [] },
    ],
    integrityFindings: [],
  },
  routingSegmentation: { reachabilityFindings: [] },
  securityPolicyFlow: { findings: [] },
  implementationPlan: {
    steps: [{ id: 'step-fw', targetObjectId: 'dev-hq-fw', dependencyObjectIds: ['rd-corp'], readiness: 'review' }],
    verificationChecks: [{ id: 'check-route', relatedObjectIds: ['rd-corp'], readiness: 'review' }],
    findings: [],
  },
};

const renderModel = buildDiagramRenderModel({
  networkObjectModel: modelInput,
  overlaySummaries,
  hotspots: [{ title: 'Review outbound policy', detail: 'Internal to WAN is review-gated.', readiness: 'review', scopeLabel: 'Security flow' }],
});

assert.equal(renderModel.summary.backendAuthored, true);
assert.equal(renderModel.summary.truthContract, 'backend-only-render-model');
assert.equal(renderModel.summary.contractId, 'V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT');
assert.ok(renderModel.nodes.length >= 8, 'diagram should produce backend render nodes');
assert.ok(renderModel.edges.length >= 8, 'diagram should produce backend render edges');
assert.equal(renderModel.nodes.filter((node) => !node.objectId).length, 0, 'every node needs backend object identity');
assert.equal(renderModel.edges.filter((edge) => edge.relatedObjectIds.length === 0 && !edge.relationship).length, 0, 'every edge needs relationship/object lineage');

const assertion = assertBackendDiagramRenderModel(renderModel);
assert.equal(assertion.ready, true);
assert.equal(assertion.danglingEdges.length, 0);

const policyNode = renderModel.nodes.find((node) => node.objectId === 'policy-internal-wan-review');
assert.ok(policyNode, 'security policy node should be rendered from backend policy evidence');
assert.equal(policyNode?.sourceEngine, 'security');

const vlanSubnetEdge = renderModel.edges.find((edge) => edge.relationship === 'vlan-uses-subnet');
assert.ok(vlanSubnetEdge, 'VLAN/subnet binding should be rendered from backend graph evidence');
assert.ok(vlanSubnetEdge?.overlayKeys.includes('addressing'));

const nodeCoverage = coverageForDiagramNode(renderModel.nodes[0]);
assert.equal(nodeCoverage.hasBackendIdentity, true);
assert.ok(nodeCoverage.modeImpacts.length > 0);
const edgeCoverage = coverageForDiagramEdge(renderModel.edges[0]);
assert.equal(edgeCoverage.hasBackendIdentity, true);
assert.ok(edgeCoverage.modeImpacts.length > 0);

assert.ok(layersForDiagramMode('physical').includes('device'));
assert.ok(layersForDiagramMode('security').includes('security'));

const brokenInput: DiagramNetworkObjectModelInput = {
  ...modelInput,
  devices: [],
  routeDomains: [],
  securityZones: [],
  policyRules: [],
  dhcpPools: [],
  designGraph: { nodes: [], edges: [], integrityFindings: [] },
};
const blocked = buildDiagramRenderModel({ networkObjectModel: brokenInput, overlaySummaries, hotspots: [] });
assert.ok(blocked.emptyState?.reason.includes('missing'));
assert.equal(blocked.summary.backendAuthored, true);

console.log('Diagram domain selftest passed.');
