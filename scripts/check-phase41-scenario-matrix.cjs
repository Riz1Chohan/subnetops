#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`Phase 41 scenario matrix check failed: ${message}`);
  process.exit(1);
};
const req = (content, needle, message) => {
  if (!content.includes(needle)) fail(message);
};

const fixtures = read('backend/src/lib/phase41ScenarioMatrix.fixtures.ts');
const selftest = read('backend/src/lib/phase41ScenarioMatrix.selftest.ts');
const backendPackage = read('backend/package.json');
const rootPackage = read('package.json');
const docs = read('docs/doc/PHASE41-SCENARIO-LIBRARY-EDGE-CASE-MATRIX.md');

for (const scenarioId of [
  'small-office-baseline-review-gated',
  'multi-site-guest-dmz-security-boundary',
  'overlapping-site-blocks-hard-blocker',
  'public-organization-range-standards-blocker',
  'undersized-subnet-requires-backend-proposal',
  'invalid-gateway-hardens-addressing-truth',
  'exhausted-site-block-cannot-pretend-to-allocate',
  'empty-site-topology-incomplete',
  'local-overlap-dhcp-conflict-regression-gap',
]) {
  req(fixtures, scenarioId, `missing scenario fixture ${scenarioId}.`);
}

for (const requiredTerm of [
  'SITE_BLOCK_OVERLAP',
  'SUBNET_OVERLAP_LOCAL',
  'SUBNET_UNDERSIZED',
  'GATEWAY_INVALID',
  'GATEWAY_UNUSABLE',
  'IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED',
  'STANDARDS_REQUIRED_RULE_BLOCKER',
  'DESIGN_GRAPH_DEVICE_WITHOUT_INTERFACES',
  'ADDR-PRIVATE-IPV4',
  'knownGaps',
]) {
  req(fixtures, requiredTerm, `fixtures must include ${requiredTerm}.`);
}

for (const requiredAssertion of [
  'buildDesignCoreSnapshot',
  'collectFindingCodes',
  'reportTruth.overallReadiness',
  'diagramTruth.renderModel.summary.backendAuthored',
  'implementationPlan.verificationChecks',
  'implementationPlan.rollbackActions',
  'implementationReviewQueue',
  'requiredOverlayKeys',
  'requiredZoneRoles',
  'requiredStandardsViolations',
]) {
  req(selftest, requiredAssertion, `selftest must assert ${requiredAssertion}.`);
}

req(backendPackage, 'engine:selftest:phase41-scenarios', 'backend package must expose the Phase 41 scenario selftest script.');
req(backendPackage, 'phase41ScenarioMatrix.selftest.ts', 'backend package script must run the Phase 41 selftest file.');
req(backendPackage, 'engine:selftest:all', 'backend package must keep all engine selftests wired.');
req(backendPackage, 'engine:selftest:phase41-scenarios', 'engine:selftest:all should include Phase 41 scenario runner.');
req(rootPackage, 'check:phase41-scenario-matrix', 'root package must expose Phase 41 static gate.');

for (const docTerm of [
  'Phase 41',
  'Scenario Library',
  'Backend decides truth',
  'edge case matrix',
  'known gaps',
  'not implementation-ready',
]) {
  req(docs, docTerm, `Phase 41 docs must include ${docTerm}.`);
}

console.log('Phase 41 scenario matrix check passed.');
