#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertIncludes(file, needle) {
  const content = read(file);
  if (!content.includes(needle)) {
    throw new Error(`${file} is missing required Phase 57 content: ${needle}`);
  }
}

function assertNotIncludes(file, needle) {
  const content = read(file);
  if (content.includes(needle)) {
    throw new Error(`${file} still contains forbidden Phase 57 content: ${needle}`);
  }
}

assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'previewBrownfieldImport');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'getBrownfieldConflictReview');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'buildBrownfieldConflictReviewFromData');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'BROWNFIELD_OVERLAPS_DURABLE_ALLOCATION');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'BROWNFIELD_OVERLAPS_ALLOCATOR_PLAN_ROW');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'canImportWithoutReview');
assertIncludes('backend/src/controllers/enterpriseIpam.controller.ts', 'brownfieldImportDryRunSchema');
assertIncludes('backend/src/controllers/enterpriseIpam.controller.ts', 'previewBrownfieldImport');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/brownfield-imports/dry-run');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/brownfield-conflicts');
assertIncludes('backend/src/validators/enterpriseIpam.schemas.ts', 'brownfieldImportDryRunSchema');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'BrownfieldDryRunResult');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'BrownfieldConflictReview');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'previewBrownfieldImport');
assertIncludes('frontend/src/features/enterprise-ipam/hooks.ts', 'previewBrownfieldImport');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Preview import risk');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Brownfield dry-run preview');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Current vs proposed conflict review');
assertIncludes('docs/doc/PHASE57-BROWNFIELD-IMPORT-DRY-RUN-CONFLICT-REVIEW.md', 'Phase 57');
assertNotIncludes('backend/prisma/schema.prisma', '@@index([designInputHash])\n}\n\nmodel DesignBrownfieldImport');

console.log('Phase 57 brownfield dry-run and conflict-review static check passed.');
