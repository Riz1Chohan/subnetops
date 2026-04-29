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

requireIncludes('backend/prisma/schema.prisma', 'segmentRole    String?', 'saved VLAN segmentRole field');
requireIncludes('backend/src/validators/vlan.schemas.ts', 'segmentRoleSchema', 'segment role validator');
requireIncludes('backend/src/services/designCore.service.ts', 'resolveVlanSegmentRole', 'explicit/inferred role resolver');
requireIncludes('backend/src/services/designCore.service.ts', 'roleSource: roleResolution.roleSource', 'role source output');
requireIncludes('backend/src/services/designCore.service.ts', 'buildEngine1Explanation', 'Engine 1 explanation builder');
requireIncludes('backend/src/services/designCore.service.ts', 'SITE_BLOCK_BUFFERED_DEMAND_TIGHT', 'site-block buffered demand warning');
requireIncludes('backend/src/lib/addressAllocator.ts', 'allocatorExplanation', 'allocator explanation output');
requireIncludes('frontend/src/features/designCore/hooks.ts', 'buildDesignCoreInputFingerprint', 'design-core refresh fingerprint');
requireIncludes('frontend/src/features/designCore/hooks.ts', 'segmentRole: vlan.segmentRole', 'segmentRole included in refresh fingerprint');
requireIncludes('frontend/src/pages/ProjectDiagramPage.tsx', 'siteMap', 'merged site source map');
requireIncludes('frontend/src/pages/ProjectDiagramPage.tsx', 'vlanMap', 'merged VLAN source map');
requireIncludes('frontend/src/pages/ProjectDiagramPage.tsx', 'renderer-input problem', 'honest diagram empty-state copy');
requireIncludes('frontend/src/features/vlans/components/VlanForm.tsx', 'SEGMENT_ROLE_OPTIONS', 'frontend explicit role selector');
requireIncludes('frontend/src/features/vlans/components/VlanTable.tsx', 'Explicit role', 'frontend role table column');
requireIncludes('frontend/src/pages/ProjectAddressingPage.tsx', 'Engine 1 Explanation', 'addressing explanation column');
requireIncludes('backend/src/lib/cidr.selftest.ts', 'leading-zero', 'expanded CIDR malformed input selftest');
requireIncludes('backend/src/lib/addressAllocator.selftest.ts', 'allocator explanation is readable', 'allocator explanation selftest');
requireIncludes('docs/doc/ENGINE1-CIDR-ALLOCATOR-TRUTH.md', 'Engine 1 owns', 'Engine 1 truth doc');
requireIncludes('docs/doc/PHASE45-ENGINE1-FINAL-TRUST-PASS.md', 'Phase 45', 'Phase 45 doc');

console.log('Engine 1 final trust static check passed.');
