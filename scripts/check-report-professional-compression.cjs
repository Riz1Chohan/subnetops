#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) { console.error(`[report-professional-compression] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const exportService = read('backend/src/services/export.service.ts');
for (const token of [
  'buildValidationRollupRows',
  'validationBucket',
  'Enterprise IPAM authority',
  'Requirement propagation closure',
  'Security policy / NAT review',
  'Implementation/template readiness',
  'Root blockers:',
  'Review / warning items:',
  'buildOpenReviewBullets',
]) {
  assert(exportService.includes(token), `export service must include ${token}`);
}
assert(!exportService.includes('Validation blockers: ${exportContext.errors.length}'), 'report must stop presenting every error count as generic validation blockers');
assert(!exportService.includes('still contains error-level blockers'), 'report must distinguish root blockers from review-required generated evidence');

const gates = read('backend/src/domain/reporting/export-gates.ts');
for (const token of ['replacementForForbiddenClaim', 'isAlreadyNegated', 'implementation-gated', 'deployment-gated', 'production-gated']) {
  assert(gates.includes(token), `report overclaim rewrite must include ${token}`);
}
assert(gates.includes('not\\s+not\\s+implementation-ready'), 'overclaim rewrite must explicitly collapse double-negative readiness wording');
assert(!/return\s+"not implementation-ready"\s*;/.test(gates), 'forbidden-claim replacement must not blindly insert not implementation-ready and create double negatives');

const pkg = JSON.parse(read('package.json'));
assert(String(pkg.scripts['check:quality'] || '').includes('check-report-professional-compression.cjs'), 'check:quality must include report professional compression guard');

const regression = read('scripts/check-regression-kill-switches.cjs');
assert(regression.includes('check-report-professional-compression.cjs'), 'regression kill-switch umbrella must include report professional compression guard');

const readme = read('README.md');
assert(readme.includes('Report professional compression'), 'README must document report professional compression');
assert(readme.includes('check-report-professional-compression.cjs'), 'README must document the report professional compression guard');

console.log('[report-professional-compression] ok');
