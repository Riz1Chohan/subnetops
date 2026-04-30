#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function fail(message) { failures.push(message); }
const pkg = JSON.parse(read('package.json'));
const model = read('backend/src/services/designCore/designCore.networkObjectModel.ts');
const flow = read('backend/src/services/designCore/designCore.securityPolicyFlow.ts');
if (!['0.72.0', '0.73.0'].includes(pkg.version)) fail(`Expected root package version 0.72.0 or 0.73.0, found ${pkg.version}.`);
if (!pkg.scripts['check:phase72-policy-routing-cloud-consequences']) fail('Missing check:phase72-policy-routing-cloud-consequences script.');
if (!pkg.scripts['check:phase71-direct-design-drivers']?.includes('check:phase72-policy-routing-cloud-consequences')) {
  fail('Phase 71 check must chain into Phase 72 so direct-driver proof cannot skip policy/cloud consequence proof.');
}
if (!exists('docs/doc/PHASE72-POLICY-ROUTING-CLOUD-CONSEQUENCES.md')) fail('Missing Phase 72 documentation under docs/doc.');
for (const needle of [
  'type RequirementInputMap = Record<string, unknown>',
  'function parseRequirementsJson',
  'function requirementEnabled',
  'function cloudOrHybridRequired',
  'function multiSiteOrWanRequired',
  'function ensureRequirementDrivenZones',
  'Phase 72 requirement-driven zone evidence from:',
  'buildPolicyRules(securityZones: SecurityZone[], requirements: RequirementInputMap)',
  'policy-review-admin-to-management-plane',
  'policy-review-operations-plane-to-internal',
  'policy-review-wan-to-remote-access-edge',
  'policy-review-internal-to-cloud-edge',
  'policy-review-voice-services-qos',
  'policy-deny-shared-devices-to-internal',
  'policy-review-internal-to-shared-devices',
  'routeDomain.notes.push(...phase72RequirementSummary(requirements))',
  'wideAreaNetworkZone.notes.push(...phase72RequirementSummary(requirements))',
  'const policyRules = buildPolicyRules(securityZones, requirements)',
]) {
  if (!model.includes(needle)) fail(`Network object model missing Phase 72 evidence: ${needle}`);
}
for (const needle of [
  'requirement-flow-guest-to-internal-default-deny',
  'requirement-flow-admin-to-management-plane-review',
  'requirement-flow-wan-to-remote-access-edge-review',
  'requirement-flow-internal-to-cloud-edge-review',
  'requirement-flow-voice-services-qos-review',
  'requirement-flow-shared-device-to-internal-default-deny',
  'requirement-flow-management-to-internal-operations-review',
  'Requirement-driven flow evidence:',
]) {
  if (!flow.includes(needle)) fail(`Security policy flow model missing required requirement consequence: ${needle}`);
}
if (!/addRequirementZone\("transit", \["cloudConnected", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel", "internetModel", "interSiteTrafficModel", "dualIsp", "resilienceTarget"\]/.test(model)) {
  fail('Phase 72 must tie cloud, WAN, inter-site, dual ISP, and resilience requirements into transit/cloud-edge zone evidence.');
}
if (!/Requirement keys: cloudConnected, environmentType, cloudProvider, cloudConnectivity, cloudNetworkModel, cloudRoutingModel, cloudTrafficBoundary/.test(model)) {
  fail('Phase 72 cloud policy rule must expose the cloud requirement keys it is based on.');
}
if (failures.length) {
  console.error('Phase 72 policy/routing/cloud consequence check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('Phase 72 policy/routing/cloud consequence check passed.');
