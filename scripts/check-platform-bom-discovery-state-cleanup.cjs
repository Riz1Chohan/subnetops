#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) { console.error(`[platform-bom-discovery-state-cleanup] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
for (const source of [backendTypes, frontendTypes]) {
  for (const token of [
    'V1PlatformProfileState',
    'NOT_STARTED',
    'ROLE_BASED_ASSUMPTIONS',
    'SAVED_REVIEW_REQUIRED',
    'PROCUREMENT_READY',
    'platformProfileState: V1PlatformProfileState',
    'procurementReadinessReason: string',
    'V1DiscoveryCurrentStateState',
    'NOT_CAPTURED',
    'MANUAL_NOTES_ONLY',
    'IMPORTED_REVIEW_REQUIRED',
    'VERIFIED_CURRENT_STATE',
    'discoveryState: V1DiscoveryCurrentStateState',
    'discoveryReadinessReason: string',
  ]) assert(source.includes(token), `backend/frontend types must expose ${token}`);
}

const bomControl = read('backend/src/services/designCore/designCore.platformBomFoundationControl.ts');
assert(bomControl.includes('function platformProfileState'), 'Platform/BOM control must centralize platformProfileState selection');
assert(bomControl.includes('project.platformProfileJson') && bomControl.includes('ROLE_BASED_ASSUMPTIONS'), 'Platform/BOM control must detect missing saved profile as role-based assumptions');
assert(bomControl.includes('Platform/BOM is not procurement-ready because no saved platform profile exists'), 'Platform/BOM control must explain missing saved profile in engineer-facing terms');
assert(bomControl.includes('platformProfileState: profileState') && bomControl.includes('procurementReadinessReason'), 'Platform/BOM summary must emit state and reason');

const discoveryControl = read('backend/src/services/designCore/designCore.discoveryCurrentStateControl.ts');
assert(discoveryControl.includes('function currentStateState'), 'Discovery control must centralize discoveryState selection');
assert(discoveryControl.includes('NOT_CAPTURED') && discoveryControl.includes('MANUAL_NOTES_ONLY') && discoveryControl.includes('IMPORTED_REVIEW_REQUIRED') && discoveryControl.includes('VERIFIED_CURRENT_STATE'), 'Discovery control must contain all required state buckets');
assert(discoveryControl.includes('Discovery is review-required because current-state inventory is not imported'), 'Discovery control must explain missing current-state inventory');
assert(discoveryControl.includes('discoveryState, discoveryReadinessReason'), 'Discovery summary must emit state and reason');

const report = read('backend/src/services/exportDesignCoreReport.service.ts');
assert(report.includes('Platform profile state') && report.includes('procurementReadinessReason'), 'Design-core report must show platform profile state and reason');
assert(report.includes('Discovery state') && report.includes('discoveryReadinessReason'), 'Design-core report must show discovery state and reason');
assert(report.includes('role-based assumptions, saved review posture, and procurement readiness'), 'Report wording must separate Platform/BOM states');
assert(report.includes('empty inventory, manual notes, imported-review evidence, and verified current state'), 'Report wording must separate discovery states');

const exportService = read('backend/src/services/export.service.ts');
assert(exportService.includes('If no saved platform profile exists, the package is not procurement-ready'), 'Professional report must explain missing platform profile without developer wording');
assert(exportService.includes('platformProfileState') && exportService.includes('procurementReadinessReason'), 'CSV/export evidence must include Platform/BOM state and reason');
assert(exportService.includes('discoveryState') && exportService.includes('discoveryReadinessReason'), 'CSV/export evidence must include discovery state and reason');

const platformPage = read('frontend/src/pages/ProjectPlatformBomPage.tsx');
assert(platformPage.includes('V1PlatformBomFoundation.platformProfileState'), 'Platform/BOM page must display backend platform profile state');
assert(platformPage.includes('V1PlatformBomFoundation.procurementReadinessReason'), 'Platform/BOM page must display backend procurement readiness reason');

const discoveryPage = read('frontend/src/pages/ProjectDiscoveryPage.tsx');
assert(discoveryPage.includes('V1DiscoveryCurrentState.discoveryState'), 'Discovery page must display backend discovery state');
assert(discoveryPage.includes('V1DiscoveryCurrentState.discoveryReadinessReason'), 'Discovery page must display backend discovery readiness reason');

const packageJson = JSON.parse(read('package.json'));
assert(String(packageJson.scripts['check:quality'] || '').includes('check-platform-bom-discovery-state-cleanup.cjs'), 'check:quality must include Platform/BOM discovery state cleanup guard');
const regression = read('scripts/check-regression-kill-switches.cjs');
assert(regression.includes('check-platform-bom-discovery-state-cleanup.cjs'), 'regression kill-switches must include Platform/BOM discovery state cleanup guard');

const readme = read('README.md');
assert(readme.includes('Platform/BOM and discovery state cleanup'), 'README must document Platform/BOM and discovery state cleanup');
assert(readme.includes('check-platform-bom-discovery-state-cleanup.cjs'), 'README must document the Platform/BOM discovery state cleanup guard');

console.log('[platform-bom-discovery-state-cleanup] ok');
