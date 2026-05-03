#!/usr/bin/env node
const fs = require('fs'); const path = require('path');
function fail(message) { console.error(`[phase17] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }
function read(file) { return fs.readFileSync(path.join(process.cwd(), file), 'utf8'); }
const pkg = JSON.parse(read('package.json')); const backendPkg = JSON.parse(read('backend/package.json'));
const files = ['backend/src/services/designCore/designCore.phase17PlatformBomFoundationControl.ts','backend/src/services/designCore.types.ts','backend/src/services/designCore.service.ts','backend/src/services/validation.service.ts','backend/src/services/exportDesignCoreReport.service.ts','backend/src/services/export.service.ts','frontend/src/lib/designCoreSnapshot.ts','frontend/src/pages/ProjectPlatformBomPage.tsx','backend/src/lib/phase0EngineInventory.ts','backend/src/lib/phase17PlatformBomFoundation.selftest.ts','docs/doc/PHASE17-PLATFORM-BOM-FOUNDATION.md'];
assert(['0.109.0','0.110.0','0.111.0','0.112.0'].includes(pkg.version), 'package version must be 0.109.0, 0.110.0, or 0.111.0');
assert(pkg.scripts['check:phase17-platform-bom-foundation'] === 'node scripts/check-phase17-platform-bom-foundation.cjs', 'root phase17 check script missing');
assert(pkg.scripts['check:phase17-109-release'] === 'npm run check:phase17-platform-bom-foundation && npm run check:phase16-108-release', 'phase17 release chain missing');
assert(backendPkg.scripts['engine:selftest:phase17-platform-bom'] === 'tsx src/lib/phase17PlatformBomFoundation.selftest.ts', 'backend phase17 selftest script missing');
for (const file of files) assert(read(file).includes('PHASE17_PLATFORM_BOM_FOUNDATION_CONTRACT'), `phase17 marker missing from ${file}`);
const control = read('backend/src/services/designCore/designCore.phase17PlatformBomFoundationControl.ts');
assert(control.includes('BACKEND_CONTROLLED_ADVISORY_BOM_NO_FAKE_SKUS'), 'phase17 role marker missing');
assert(control.includes('ADVISORY_ONLY_NOT_FINAL_SKU'), 'advisory-only procurement authority missing');
assert(control.includes('sourceRequirementIds') && control.includes('calculationBasis') && control.includes('manualReviewNote'), 'BOM row proof fields missing');
assert(control.includes('No vendor model, SKU, price'), 'fake-SKU proof boundary missing');
assert(read('backend/src/services/designCore.types.ts').includes('Phase17PlatformBomFoundationControlSummary'), 'phase17 backend type missing');
assert(read('frontend/src/lib/designCoreSnapshot.ts').includes('phase17PlatformBomFoundation?: Phase17PlatformBomFoundationControlSummary'), 'frontend phase17 snapshot type missing');
assert(read('backend/src/services/designCore.service.ts').includes('buildPhase17PlatformBomFoundationControl') && read('backend/src/services/designCore.service.ts').includes('phase17PlatformBomFoundation,'), 'design-core phase17 wiring missing');
assert(read('backend/src/services/validation.service.ts').includes('PHASE17_PLATFORM_BOM_REVIEW_REQUIRED'), 'validation phase17 wiring missing');
assert(read('backend/src/services/exportDesignCoreReport.service.ts').includes('Phase 17 Platform/BOM Foundation'), 'DOCX/PDF report phase17 section missing');
assert(read('backend/src/services/export.service.ts').includes('Phase 17 Platform/BOM Foundation'), 'CSV export phase17 rows missing');
assert(read('frontend/src/pages/ProjectPlatformBomPage.tsx').includes('Phase 17 Platform/BOM foundation contract'), 'ProjectPlatformBomPage phase17 evidence panel missing');
assert(read('backend/src/lib/phase0EngineInventory.ts').includes('phase17PlatformBomFoundation') && read('backend/src/lib/phase0EngineInventory.ts').includes('backend-computed-advisory-estimate'), 'phase0 inventory phase17 not controlled');
console.log('[phase17] platform/BOM foundation checks passed');
