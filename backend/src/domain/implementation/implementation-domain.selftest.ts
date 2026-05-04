function assertOk(value: unknown, message?: string): asserts value {
  if (!value) throw new Error(message ?? 'Assertion failed');
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) throw new Error(message ?? `Expected ${String(expected)}, got ${String(actual)}`);
}

import { buildImplementationPlanModel } from './migration-plan.js';
import { buildVendorNeutralImplementationTemplates } from './templates.js';
import { findRollbackGaps } from './rollback.js';
import { findVerificationGaps } from './verification-commands.js';
import { implementationGateAllowsExecution } from './tasks.js';
import type { ImplementationNetworkObjectModel } from './types.js';

const deviceId = 'device-hq-core';
const interfaceId = 'interface-hq-users-gateway';
const routeIntentId = 'route-default-internet';
const securityFlowId = 'flow-users-to-internet';
const natRuleId = 'nat-users-internet';
const dhcpPoolId = 'dhcp-users';
const sourceZoneId = 'zone-users';
const destinationZoneId = 'zone-internet';

function fixture(): ImplementationNetworkObjectModel {
  return {
    devices: [
      {
        id: deviceId,
        name: 'HQ Core',
        siteId: 'site-hq',
        siteName: 'HQ',
        siteCode: 'HQ',
        deviceRole: 'core-layer3-switch',
        truthState: 'configured',
        managementIp: '10.10.99.10',
        routeDomainIds: ['rd-corp'],
        securityZoneIds: [sourceZoneId, destinationZoneId],
        interfaceIds: [interfaceId],
        notes: [
          'management access verified',
          'configuration snapshot baseline captured',
          'rollback path via console fallback access',
        ],
      },
    ],
    interfaces: [
      {
        id: interfaceId,
        name: 'Vlan10 Users Gateway',
        deviceId,
        siteId: 'site-hq',
        interfaceRole: 'vlan-gateway',
        truthState: 'configured',
        vlanId: 10,
        subnetCidr: '10.10.10.0/24',
        ipAddress: '10.10.10.1',
        routeDomainId: 'rd-corp',
        securityZoneId: sourceZoneId,
        notes: ['Gateway exists for users VLAN.'],
      },
    ],
    securityZones: [
      {
        id: sourceZoneId,
        name: 'Users',
        zoneRole: 'internal',
        truthState: 'configured',
        siteIds: ['site-hq'],
        vlanIds: [10],
        subnetCidrs: ['10.10.10.0/24'],
        routeDomainId: 'rd-corp',
        isolationExpectation: 'restricted',
        notes: [],
      },
      {
        id: destinationZoneId,
        name: 'Internet',
        zoneRole: 'wan',
        truthState: 'configured',
        siteIds: ['site-hq'],
        vlanIds: [],
        subnetCidrs: ['0.0.0.0/0'],
        routeDomainId: 'rd-corp',
        isolationExpectation: 'restricted',
        notes: [],
      },
    ],
    policyRules: [
      {
        id: 'policy-users-internet',
        name: 'Users to Internet HTTPS',
        sourceZoneId,
        destinationZoneId,
        action: 'allow',
        services: ['HTTPS'],
        truthState: 'configured',
        rationale: 'Business internet access.',
        notes: [],
      },
    ],
    natRules: [
      {
        id: natRuleId,
        name: 'Users Internet PAT',
        sourceZoneId,
        destinationZoneId,
        sourceSubnetCidrs: ['10.10.10.0/24'],
        translatedAddressMode: 'interface-overload',
        truthState: 'configured',
        status: 'required',
        notes: [],
      },
    ],
    dhcpPools: [
      {
        id: dhcpPoolId,
        name: 'Users DHCP',
        siteId: 'site-hq',
        vlanId: 10,
        subnetCidr: '10.10.10.0/24',
        gatewayIp: '10.10.10.1',
        truthState: 'configured',
        allocationState: 'configured',
        notes: [],
      },
    ],
    designGraph: {
      nodes: [
        { id: 'node-device', objectType: 'network-device', objectId: deviceId, label: 'HQ Core', siteId: 'site-hq', truthState: 'configured', notes: [] },
        { id: 'node-interface', objectType: 'network-interface', objectId: interfaceId, label: 'Vlan10', siteId: 'site-hq', truthState: 'configured', notes: [] },
        { id: 'node-flow', objectType: 'security-flow', objectId: securityFlowId, label: 'Users to Internet', siteId: 'site-hq', truthState: 'configured', notes: [] },
        { id: 'node-nat', objectType: 'nat-rule', objectId: natRuleId, label: 'Users NAT', siteId: 'site-hq', truthState: 'configured', notes: [] },
      ],
      edges: [
        { id: 'edge-device-interface', relationship: 'device-owns-interface', sourceNodeId: 'node-device', targetNodeId: 'node-interface', truthState: 'configured', required: true, notes: [] },
        { id: 'edge-flow-nat', relationship: 'security-flow-uses-nat-rule', sourceNodeId: 'node-flow', targetNodeId: 'node-nat', truthState: 'configured', required: true, notes: [] },
      ],
      integrityFindings: [],
    },
    routingSegmentation: {
      routeIntents: [
        {
          id: routeIntentId,
          name: 'Default route to Internet edge',
          routeDomainId: 'rd-corp',
          routeDomainName: 'Corporate',
          siteId: 'site-hq',
          routeKind: 'default',
          destinationCidr: '0.0.0.0/0',
          nextHopType: 'connected-interface',
          nextHopObjectId: interfaceId,
          administrativeState: 'present',
          truthState: 'configured',
          routePurpose: 'Internet egress path.',
          evidence: ['Default route intent has concrete next-hop interface.'],
          notes: [],
        },
      ],
      reachabilityFindings: [],
    },
    securityPolicyFlow: {
      natReviews: [
        {
          id: 'nat-review-users-internet',
          natRuleId,
          natRuleName: 'Users Internet PAT',
          sourceZoneId,
          sourceZoneName: 'Users',
          destinationZoneId,
          destinationZoneName: 'Internet',
          translatedAddressMode: 'interface-overload',
          status: 'required',
          coveredFlowRequirementIds: [securityFlowId],
          missingFlowRequirementIds: [],
          state: 'ready',
          notes: [],
        },
      ],
      flowRequirements: [
        {
          id: securityFlowId,
          name: 'Users to Internet HTTPS',
          sourceZoneId,
          sourceZoneName: 'Users',
          destinationZoneId,
          destinationZoneName: 'Internet',
          expectedAction: 'allow',
          observedPolicyAction: 'allow',
          observedPolicyRuleId: 'policy-users-internet',
          observedPolicyRuleName: 'Users to Internet HTTPS',
          serviceNames: ['HTTPS'],
          matchedPolicyRuleIds: ['policy-users-internet'],
          natRequired: true,
          matchedNatRuleIds: [natRuleId],
          state: 'satisfied',
          severityIfMissing: 'ERROR',
          ruleOrderSensitive: true,
          implicitDenyExpected: true,
          loggingRequired: true,
          rationale: 'Business internet access requires outbound HTTPS and NAT.',
          truthState: 'configured',
          requirementKeys: ['internet-access'],
          notes: [],
        },
      ],
      findings: [],
    },
  };
}

const plan = buildImplementationPlanModel({ networkObjectModel: fixture() });
assertOk(plan.stages.length >= 6, 'implementation stages should exist');
assertOk(plan.steps.some((step) => step.targetObjectId === interfaceId), 'interface step should be generated');
assertOk(plan.steps.some((step) => step.targetObjectId === routeIntentId), 'route step should be generated');
assertOk(plan.steps.some((step) => step.targetObjectId === securityFlowId), 'security-flow step should be generated');
assertOk(plan.steps.some((step) => step.targetObjectId === natRuleId), 'NAT step should be generated');
assertOk(plan.steps.some((step) => step.targetObjectId === dhcpPoolId), 'DHCP step should be generated');
assertOk(plan.verificationChecks.length > 0, 'verification checks should be generated');
assertOk(plan.rollbackActions.length > 0, 'rollback actions should be generated');
assertOk(plan.dependencyGraph.edgeCount > 0, 'dependency graph should be generated');
assertOk(plan.summary.stepWithRequiredEvidenceCount === plan.steps.length, 'every step should carry required evidence');
assertOk(plan.summary.stepWithRollbackIntentCount === plan.steps.length, 'every step should carry rollback intent');
assertEqual(findVerificationGaps(plan.steps, plan.verificationChecks).length, 0, 'object steps should have verification coverage');
const rollbackGaps = findRollbackGaps(plan.steps, plan.rollbackActions);
assertOk(rollbackGaps.length <= plan.steps.filter((step) => step.riskLevel !== 'high').length, 'high-risk steps should have rollback coverage');
assertEqual(implementationGateAllowsExecution(plan), plan.summary.implementationReadiness === 'ready');

const templateModel = buildVendorNeutralImplementationTemplates({ implementationPlan: plan });
assertEqual(templateModel.summary.commandGenerationAllowed, false, 'vendor-specific command generation must stay disabled');
assertEqual(templateModel.summary.vendorSpecificCommandCount, 0, 'template domain must not emit vendor commands');
assertEqual(templateModel.templates.length, plan.steps.length, 'each step should produce a vendor-neutral template');
assertOk(templateModel.templates.every((template) => template.preChecks.length > 0), 'templates should include pre-checks');
assertOk(templateModel.templates.every((template) => template.neutralActions.length > 0), 'templates should include neutral actions');
assertOk(templateModel.proofBoundary.some((item) => item.includes('Not proven')), 'proof boundary should stay explicit');

console.log('implementation-domain selftest passed');
