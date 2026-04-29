#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertIncludes(file, needle, label = needle) {
  const content = read(file);
  if (!content.includes(needle)) {
    console.error(`[phase59] Missing ${label} in ${file}: ${needle}`);
    process.exit(1);
  }
}

function assertJsonVersion(file, expected) {
  const parsed = JSON.parse(read(file));
  if (parsed.version !== expected) {
    console.error(`[phase59] ${file} expected version ${expected}, found ${parsed.version}`);
    process.exit(1);
  }
}

const patchFunctions = [
  'updateRouteDomain',
  'updateIpPool',
  'updateIpAllocation',
  'updateDhcpScope',
  'updateIpReservation',
  'updateBrownfieldNetwork',
];

for (const fn of patchFunctions) {
  assertIncludes('frontend/src/features/enterprise-ipam/api.ts', `export function ${fn}`, `frontend API ${fn}`);
  assertIncludes('frontend/src/features/enterprise-ipam/hooks.ts', `${fn}: useMutation`, `frontend hook ${fn}`);
  assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', `mutations.${fn}.mutateAsync`, `UI edit wiring for ${fn}`);
}

assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', 'router.patch("/route-domains/:id"', 'route-domain PATCH route');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', 'router.patch("/ip-pools/:id"', 'pool PATCH route');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', 'router.patch("/ip-allocations/:id"', 'allocation PATCH route');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', 'router.patch("/dhcp-scopes/:id"', 'DHCP PATCH route');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', 'router.patch("/reservations/:id"', 'reservation PATCH route');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', 'router.patch("/brownfield-networks/:id"', 'brownfield PATCH route');

assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', '0. Safe edit console', 'Phase 59 safe edit console');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Edit route domains / VRFs', 'route-domain edit section');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Edit IP pools', 'IP-pool edit section');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Edit durable allocations', 'allocation edit section');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Edit DHCP scopes', 'DHCP edit section');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Edit reservations', 'reservation edit section');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Edit brownfield networks', 'brownfield edit section');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Edits still go through Engine 2 write-time guards', 'user-facing trust boundary language');

assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'function asConflictReviewRows', 'typed brownfield plan-row adapter');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'reduce((sum: bigint, range: NumericRange)', 'bigint reserve calculation typing');
assertIncludes('docs/doc/PHASE59-ENGINE2-UI-EDIT-BUILD-PROOF.md', 'Phase 59', 'Phase 59 documentation');
assertIncludes('docs/doc/PHASE59-ENGINE2-UI-EDIT-BUILD-PROOF.md', 'Full backend/frontend build proof remains environment-dependent', 'honest build-proof caveat');
assertJsonVersion('package.json', '0.60.0');
assertIncludes('package.json', 'check:phase59-engine2-ui-edit-build-proof', 'root Phase 59 check script');
assertIncludes('package.json', 'node scripts/check-phase58-brownfield-conflict-resolution.cjs && npm run check:phase59-engine2-ui-edit-build-proof', 'Phase 58 chains into Phase 59');

console.log('[phase59] Engine 2 UI edit maturity and build-proof discipline checks passed.');
