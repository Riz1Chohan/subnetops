#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`[requirement-consumer-closure-registry] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const registryPath = 'backend/src/services/designCore/designCore.requirementConsumerRegistry.ts';
assert(exists(registryPath), 'missing requirement consumer registry');
const registry = read(registryPath);
for (const token of [
  'V1_REQUIREMENT_CONSUMER_REGISTRY_WIZARD_CLOSURE',
  'requiredConsumers',
  'reviewOnlyConsumers',
  'explicitNoOpConsumers',
  'SCENARIO_PROOF_KEYS',
  'Engine2.enterpriseIpamReview',
  'designCore.requirementsScenarioProof',
]) {
  assert(registry.includes(token), `registry must contain ${token}`);
}
assert(registry.includes('not a golden-scenario driver'), 'registry must explicitly no-op scenario proof for non-scenario keys');
assert(registry.includes('review-required until approved'), 'registry must treat Engine 2 candidate authority as review-required until approved');

const closure = read('backend/src/services/designCore/designCore.requirementsClosureControl.ts');
assert(closure.includes('requirementConsumerRegistryFor'), 'closure control must use the registry');
assert(closure.includes('reviewOnlyConsumersFor'), 'closure rows must expose review-only consumers');
assert(closure.includes('explicitNoOpConsumersFor'), 'closure rows must expose explicit no-op consumers');
assert(!closure.includes('const expected = new Set<string>(['), 'closure control must not hard-code a universal consumer set');

const types = read('backend/src/services/designCore.types.ts');
assert(types.includes('reviewOnlyConsumers: string[]'), 'designCore types must expose review-only consumers');
assert(types.includes('explicitNoOpConsumers: string[]'), 'designCore types must expose explicit no-op consumers');

const pkg = JSON.parse(read('package.json'));
assert(String(pkg.scripts['check:quality'] || '').includes('check-requirement-consumer-closure-registry.cjs'), 'check:quality must include requirement-consumer registry gate');

const regression = read('scripts/check-regression-kill-switches.cjs');
assert(regression.includes('check-requirement-consumer-closure-registry.cjs'), 'regression kill-switch umbrella must include this gate');

const readme = read('README.md');
assert(readme.includes('Requirement-consumer closure registry'), 'README must document the requirement-consumer closure registry');
assert(readme.includes('check-requirement-consumer-closure-registry.cjs'), 'README must document the registry gate');

console.log('[requirement-consumer-closure-registry] ok');
