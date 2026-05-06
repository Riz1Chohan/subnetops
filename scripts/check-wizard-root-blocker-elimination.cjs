#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (msg) => { console.error(`[wizard-root-blocker-elimination] ${msg}`); process.exit(1); };
const ipam = read('backend/src/domain/ipam/enterprise-ipam.ts');
const designCore = read('backend/src/services/designCore.service.ts');
const graph = read('backend/src/services/designCore/designCore.graph.ts');
const graphControl = read('backend/src/services/designCore/designCore.designGraphControl.ts');
const networkObjectModel = read('backend/src/services/designCore/designCore.networkObjectModel.ts');
const securityPolicy = read('backend/src/domain/security-policy/security-policy-model.ts');
if (!ipam.includes('materializeWizardGeneratedIpamCandidates')) fail('missing wizard-generated IPAM candidate materializer');
for (const marker of ['WIZARD_CANDIDATE_MATERIALIZED', 'CANDIDATE_REVIEW', 'wizard-generated-gateway-reservation']) {
  if (!ipam.includes(marker)) fail(`IPAM candidate materializer missing ${marker}`);
}
if (!designCore.includes('materializeWizardGeneratedIpamCandidates(enterpriseAllocatorRows')) fail('design-core is not using wizard-generated IPAM candidates before posture/proof');
const closure = read('backend/src/services/designCore/designCore.requirementsClosureControl.ts');
if (!closure.includes('enterpriseIpamCandidateCount')) fail('requirements closure does not consume Engine 2 candidate evidence');
if (!closure.includes('actual.add("Engine2.enterpriseIpamReview")')) fail('requirements closure cannot mark Engine 2 consumer evidence as present');
for (const field of ['siteBlockCidr: row.siteBlockCidr', 'gatewayIp: row.effectiveGatewayIp ?? row.proposedGatewayIp']) {
  if (!designCore.includes(field)) fail(`design-core allocator rows missing ${field}`);
}
for (const policyId of ['policy-deny-guest-to-voice', 'policy-deny-voice-to-management', 'policy-deny-wan-to-voice']) {
  if (!networkObjectModel.includes(policyId)) fail(`network object model missing explicit default-deny policy ${policyId}`);
}
for (const flowId of ['security-flow-V1-guest-to-voice-deny', 'security-flow-V1-voice-to-management-deny', 'security-flow-V1-wan-to-voice-deny']) {
  if (!securityPolicy.includes(flowId)) fail(`security policy flow missing explicit default-deny reconciliation flow ${flowId}`);
}
if (!graph.includes('security-flow-uses-service')) fail('design graph does not connect security service objects to security flows');
if (!graphControl.includes('item.relationship.startsWith("implementation-")')) fail('design graph control still ignores implementation stage dependency edges');
if (graphControl.includes('Pretty garbage is still garbage')) fail('client/report-facing graph wording still contains unprofessional text');
console.log('[wizard-root-blocker-elimination] ok');
