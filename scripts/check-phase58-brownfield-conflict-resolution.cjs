#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assertIncludes(file, needle, label) {
  const content = read(file);
  if (!content.includes(needle)) {
    console.error(`[phase58] Missing ${label} in ${file}: ${needle}`);
    process.exit(1);
  }
}

assertIncludes('backend/prisma/schema.prisma', 'model DesignBrownfieldConflictResolution', 'Prisma conflict resolution model');
assertIncludes('backend/prisma/schema.prisma', '@@unique([projectId, conflictKey])', 'conflict-key uniqueness');
assertIncludes('backend/prisma/migrations/20260429103000_phase58_brownfield_conflict_resolution/migration.sql', 'CREATE TABLE "DesignBrownfieldConflictResolution"', 'Phase 58 migration');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'function brownfieldConflictKey', 'stable conflict key builder');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'createBrownfieldConflictResolution', 'conflict resolution service');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'SUPERSEDE_PROPOSED', 'supported supersede decision');
assertIncludes('backend/src/controllers/enterpriseIpam.controller.ts', 'brownfieldConflictResolutionCreateSchema', 'controller schema wiring');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', 'brownfield-conflict-resolutions', 'conflict resolution route');
assertIncludes('backend/src/validators/enterpriseIpam.schemas.ts', 'brownfieldConflictResolutionCreateSchema', 'Zod conflict resolution schema');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'EnterpriseBrownfieldConflictResolution', 'frontend conflict resolution type');
assertIncludes('frontend/src/features/enterprise-ipam/hooks.ts', 'createBrownfieldConflictResolution', 'frontend mutation hook');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'resolveBrownfieldConflict', 'frontend conflict decision action');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Phase 58 adds durable conflict decisions', 'UI conflict decision explanation');
assertIncludes('docs/doc/PHASE58-BROWNFIELD-CONFLICT-RESOLUTION-UI-MATURITY.md', 'Phase 58', 'Phase 58 documentation');
console.log('[phase58] Brownfield conflict resolution and UI maturity checks passed.');
