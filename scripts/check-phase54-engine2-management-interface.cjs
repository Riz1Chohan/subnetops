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

assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/route-domains');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/ip-pools');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/ip-allocations');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/dhcp-scopes');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/reservations');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/brownfield-imports');
assertIncludes('backend/src/routes/enterpriseIpam.routes.ts', '/projects/:projectId/allocation-approvals');
assertIncludes('backend/src/app.ts', 'app.use("/api/enterprise-ipam", enterpriseIpamRoutes);');
assertIncludes('backend/src/controllers/enterpriseIpam.controller.ts', 'createAllocationApproval');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'getEnterpriseIpamSnapshot');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'designAllocationLedgerEntry.create');
assertIncludes('backend/src/validators/enterpriseIpam.schemas.ts', 'brownfieldImportCreateSchema');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'getEnterpriseIpamSnapshot');
assertIncludes('frontend/src/features/enterprise-ipam/hooks.ts', 'useEnterpriseIpamMutations');
assertIncludes('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Engine 2 Enterprise IPAM Management');
assertIncludes('frontend/src/router/index.tsx', 'enterprise-ipam');
assertIncludes('frontend/src/layouts/ProjectLayout.tsx', 'Engine 2 IPAM');
assertIncludes('docs/doc/PHASE54-ENGINE2-MANAGEMENT-INTERFACE.md', 'Phase 54');
assertNotIncludes('backend/src/lib/enterpriseAddressAllocator.ts', 'const ranges: Ipv6UsedRange[] = [];\n  const ranges: Ipv6UsedRange[] = [];');

console.log('Phase 54 Engine 2 management interface static check passed.');
