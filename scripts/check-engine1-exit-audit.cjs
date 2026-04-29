#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function requireIncludes(path, expected, label = expected) {
  const content = read(path);
  if (!content.includes(expected)) {
    throw new Error(`${path} is missing ${label}`);
  }
}

function requireNotIncludes(path, unexpected, label = unexpected) {
  const content = read(path);
  if (content.includes(unexpected)) {
    throw new Error(`${path} still contains ${label}`);
  }
}

requireIncludes('frontend/src/lib/designCoreSnapshot.ts', 'export interface DesignCoreProposalRow', 'typed frontend proposal rows');
requireIncludes('frontend/src/lib/designCoreSnapshot.ts', 'proposedRows: DesignCoreProposalRow[];', 'proposal rows are not unknown[]');
requireNotIncludes('frontend/src/lib/designCoreSnapshot.ts', 'proposedRows: unknown[];', 'untyped proposedRows');
requireIncludes('frontend/src/pages/ProjectAddressingPage.tsx', 'Engine 1 proposal review', 'proposal review UI section');
requireIncludes('frontend/src/pages/ProjectAddressingPage.tsx', 'proposal.allocatorExplanation', 'allocator explanation surfaced in UI');
requireIncludes('frontend/src/pages/ProjectAddressingPage.tsx', 'proposal.proposedCapacityHeadroom', 'proposal headroom surfaced in UI');
requireIncludes('frontend/src/pages/ProjectAddressingPage.tsx', 'proposal.proposedDottedMask', 'proposal mask surfaced in UI');
requireIncludes('backend/prisma/migrations/20260429090000_phase46_engine1_segment_role/migration.sql', '"segmentRole" TEXT', 'segmentRole production migration');
requireIncludes('backend/src/services/project.service.ts', 'segmentRole: vlan.segmentRole', 'duplicate project preserves explicit segment role');
requireIncludes('backend/src/validators/vlan.schemas.ts', '"PRINTER"', 'validator exposes printer role');
requireIncludes('backend/src/validators/vlan.schemas.ts', '"CAMERA"', 'validator exposes camera role');
requireIncludes('frontend/src/features/vlans/components/VlanForm.tsx', 'value: "PRINTER"', 'frontend exposes printer role');
requireIncludes('frontend/src/features/vlans/components/VlanForm.tsx', 'value: "CAMERA"', 'frontend exposes camera role');
requireIncludes('backend/src/services/export.service.ts', 'row.engine1Explanation', 'CSV export carries Engine 1 explanation');
requireIncludes('backend/src/services/export.service.ts', 'row.roleSource', 'CSV export carries role source');
requireIncludes('backend/src/services/exportDesignCoreReport.service.ts', 'Allocator Explanation', 'PDF/DOCX report carries allocator explanation');
requireIncludes('backend/src/services/exportDesignCoreReport.service.ts', 'Role Truth', 'PDF/DOCX report carries role truth');
requireIncludes('docs/doc/PHASE46-ENGINE1-EXIT-AUDIT-TRUST-CLOSURE.md', 'Engine 1 Exit Audit', 'Phase 46 documentation');

console.log('PASS Engine 1 exit audit / trust closure static check.');
