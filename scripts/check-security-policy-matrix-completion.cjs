#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) {
  console.error(`[security-policy-matrix-completion] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const model = read('backend/src/domain/security-policy/security-policy-model.ts');
const networkObjectModel = read('backend/src/services/designCore/designCore.networkObjectModel.ts');
const packageJson = JSON.parse(read('package.json'));
const regression = read('scripts/check-regression-kill-switches.cjs');
const readme = read('README.md');

assert(model.includes('completeBaselineDefaultDenyPolicyRules'), 'security-policy model must complete missing baseline default-deny rules from the zone matrix');
assert(model.includes('generatedDefaultDenyRuleId'), 'security-policy model must generate deterministic default-deny rule ids');
assert(model.includes('implicitDenyExpected(sourceZone, destinationZone)'), 'baseline default-deny completion must use the same implicit-deny rules as validation');
assert(model.includes('truthState: "review-required"'), 'generated baseline deny rules must be review-required planning evidence, not approved implementation truth');
assert(model.includes('const inputPolicyRules = networkObjectModel.policyRules.map<SequencedPolicyRule>'), 'security-policy model must preserve original policy rules before matrix completion');
assert(model.includes('const policyRules = completeBaselineDefaultDenyPolicyRules'), 'security-policy model must evaluate flows, matrix, and findings against completed baseline rules');
assert(model.includes('SECURITY_IMPLICIT_DENY_NOT_MODELED'), 'implicit-deny finding must remain as a regression detector, not be deleted');
assert(model.includes('buildImplicitDenyFindings({ policyMatrix, policyRules })'), 'implicit-deny findings must use completed policy rules after matrix completion');

for (const expected of [
  'policy-deny-guest-to-voice',
  'policy-deny-voice-to-management',
  'policy-deny-wan-to-voice',
  'policy-deny-guest-to-internal',
  'policy-deny-wan-to-corporate-internal',
]) {
  assert(networkObjectModel.includes(expected), `network object model must emit wizard baseline policy ${expected}`);
}

const quality = String(packageJson.scripts['check:quality'] || '');
assert(quality.includes('check-security-policy-matrix-completion.cjs'), 'check:quality must include security policy matrix completion guard');
assert(regression.includes('check-security-policy-matrix-completion.cjs'), 'regression kill-switches must include security policy matrix completion guard');
assert(readme.includes('Security-policy matrix completion'), 'README must document security-policy matrix completion');
assert(readme.includes('check-security-policy-matrix-completion.cjs'), 'README must document the security-policy matrix completion guard');

console.log('[security-policy-matrix-completion] ok');
