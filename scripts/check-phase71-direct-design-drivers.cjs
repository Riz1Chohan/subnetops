#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function fail(message) {
  failures.push(message);
}

const materializer = read('backend/src/services/requirementsMaterialization.service.ts');
const registry = read('backend/src/services/requirementsImpactRegistry.ts');
const frontendProfile = read('frontend/src/lib/requirementsProfile.ts');
const projectHooks = read('frontend/src/features/projects/hooks.ts');
const packageJson = JSON.parse(read('package.json'));

if (!['0.71.0', '0.72.0', '0.73.0', '0.74.0', '0.75.0', '0.76.0', '0.77.0'].includes(packageJson.version)) fail(`Expected root package version 0.71.0 or later successor through 0.77.0, found ${packageJson.version}.`);
if (!packageJson.scripts['check:phase71-direct-design-drivers']) fail('Missing check:phase71-direct-design-drivers script.');
if (!packageJson.scripts['check:phase70-requirements-execution-wiring']?.includes('check:phase71-direct-design-drivers')) {
  fail('Phase 70 check must chain into Phase 71 so requirement execution proof cannot skip direct-driver proof.');
}
if (!exists('docs/doc/PHASE71-REQUIREMENTS-DIRECT-DESIGN-DRIVERS.md')) fail('Missing Phase 71 documentation under docs/doc.');

const registryKeys = [...registry.matchAll(/key: "([^"]+)"/g)].map((match) => match[1]);
const profileTypeBody = frontendProfile.split('export type RequirementsProfile = {')[1]?.split('};')[0] ?? '';
const profileKeys = [...profileTypeBody.matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((match) => match[1]);
if (registryKeys.length !== 83) fail(`Expected 83 backend requirement registry keys, found ${registryKeys.length}.`);
if (profileKeys.length !== 83) fail(`Expected 83 frontend requirement profile fields, found ${profileKeys.length}.`);
for (const key of registryKeys) {
  if (!profileKeys.includes(key)) fail(`Backend registry key ${key} is missing from frontend RequirementsProfile.`);
}
for (const key of profileKeys) {
  if (!registryKeys.includes(key)) fail(`Frontend RequirementsProfile key ${key} is missing from backend registry.`);
}

for (const needle of [
  'recommendedCapacityPlanForHosts',
  'allocateRequestedBlocks',
  'type SegmentRole',
  'function buildSegmentAddressingPlans',
  'function gatewayPreferenceFromRequirements',
  'Direct design driver output:',
  'gatewayConvention',
  'siteCount',
  'usersPerSite',
  'guestWifi',
  'management',
  'printers',
  'iot',
  'cameras',
  'wireless',
  'remoteAccess',
  'cloudConnected',
  'dualIsp',
  'WAN-TRANSIT',
  'CLOUD-EDGE',
  'REMOTE-ACCESS',
  'OPERATIONS',
]) {
  if (!materializer.includes(needle)) fail(`Materializer is missing required Phase 71 direct-driver evidence: ${needle}`);
}

if (!/preferredGatewayConvention:\s*gatewayPreferenceFromRequirements\(requirements\)/.test(materializer)) {
  fail('Materializer does not pass requirement-selected gateway convention into the allocator.');
}
if (!/segment\.estimatedHosts/.test(materializer) || !/requiredUsableHosts/.test(materializer) || !/recommendedPrefix/.test(materializer)) {
  fail('Materializer does not record host demand, required usable hosts, and recommended prefix for direct-driver outputs.');
}
if (!projectHooks.includes('useSaveProjectRequirements') || !projectHooks.includes('project-sites') || !projectHooks.includes('project-vlans') || !projectHooks.includes('design-core')) {
  fail('Frontend requirements save hook must continue invalidating project, sites, VLANs, and design-core data.');
}

if (failures.length) {
  console.error('Phase 71 direct design driver check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Phase 71 direct design driver check passed.');
