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
    throw new Error(`${file} is missing required content: ${needle}`);
  }
}
function assertNotIncludes(file, needle) {
  const content = read(file);
  if (content.includes(needle)) {
    throw new Error(`${file} still contains forbidden content: ${needle}`);
  }
}

assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'validateCidr("Pool CIDR"');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'ensureCidrInsideParent(String(data.cidr), pool.cidr');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'validateDhcpScopeInput');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'validateIpReservationInput');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'createAllocationFromPlan');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'buildDesignCoreSnapshot(project)');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'Materialized allocator plan row');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/ip-allocations/from-plan');
assertIncludes('backend/src/controllers/enterpriseIpam.controller.ts', 'ipAllocationFromPlanSchema');
assertIncludes('backend/src/validators/enterpriseIpam.schemas.ts', 'ipAllocationFromPlanSchema');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'createAllocationFromPlan');
assertIncludes('frontend/src/features/enterprise-ipam/hooks.ts', 'createAllocationFromPlan');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Allocator plan materialization');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'BROWNFIELD_TEMPLATE');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Current Engine 2 input hash');
assertIncludes('docs/doc/PHASE55-ENGINE2-MANAGEMENT-TRUST-HARDENING.md', 'Phase 55');
assertNotIncludes('backend/src/lib/enterpriseAddressAllocator.ts', 'const ranges: Ipv6UsedRange[] = [];\n  const ranges: Ipv6UsedRange[] = [];');

console.log('Phase 55 Engine 2 management hardening static check passed.');
