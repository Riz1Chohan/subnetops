#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function fail(message) {
  console.error(`Requirement materialization source-truth check failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} must include: ${needle}`);
}
function assertNotIncludes(text, needle, label) {
  assert(!text.includes(needle), `${label} must not include: ${needle}`);
}

const apply = read('backend/src/domain/requirements/apply.ts');
assertNotIncludes(apply, 'asNumber(requirements.usersPerSite, 50', 'requirement segment materializer');
assertIncludes(apply, 'capacitySignal(requirements, "usersPerSite"', 'requirement segment materializer');
assertIncludes(apply, 'capacitySourceType: users.sourceType', 'requirement segment materializer');
assertIncludes(apply, 'implementationBlocked: typeof users.value !== "number"', 'requirement segment materializer');
assertIncludes(apply, 'estimatedHosts: users.value', 'requirement segment materializer');
assertIncludes(apply, 'dhcpEnabled: typeof users.value === "number"', 'requirement segment materializer');
assertIncludes(apply, 'usersPerSite was not captured', 'requirement segment materializer');

const materialization = read('backend/src/services/requirementsMaterialization.service.ts');
assertIncludes(materialization, 'Source classification: segment=${segment.sourceType}; capacity=${segment.capacitySourceType}', 'requirements materialization service');
assertIncludes(materialization, 'segment.implementationBlocked', 'requirements materialization service');
assertIncludes(materialization, 'return "review-required" as const', 'requirements materialization service');
assertIncludes(materialization, 'DHCP scope is intentionally not implementation-ready', 'requirements materialization service');
assertIncludes(materialization, 'reviewRequiredObjects', 'requirements materialization service');
assertIncludes(materialization, 'blockedImplementationObjects', 'requirements materialization service');

const policy = read('backend/src/domain/requirements/policy.ts');
assertIncludes(policy, 'REVIEW_REQUIRED_WHEN_MISSING', 'requirements materialization policy');
assertIncludes(policy, '["siteCount", "usersPerSite"]', 'requirements materialization policy');
assertIncludes(policy, 'sourceType: RequirementSourceType', 'requirements materialization policy');
assertIncludes(policy, 'implementationBlocked', 'requirements materialization policy');

const domainSelftest = read('backend/src/domain/requirements/requirements-domain.selftest.ts');
assertIncludes(domainSelftest, 'Missing usersPerSite must not silently become 50 users', 'requirements domain selftest');
assertIncludes(domainSelftest, 'requirements:usersPerSite:not-captured', 'requirements domain selftest');

const profile = read('frontend/src/lib/requirementsProfile.ts');
assertIncludes(profile, 'siteCount: ""', 'frontend requirements profile');
assertIncludes(profile, 'usersPerSite: ""', 'frontend requirements profile');
assertIncludes(profile, 'users per site not captured', 'frontend requirements profile');

console.log('Requirement materialization source-truth check passed.');
