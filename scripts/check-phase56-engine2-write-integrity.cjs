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
    throw new Error(`${file} is missing required Phase 56 content: ${needle}`);
  }
}

function assertNotIncludes(file, needle) {
  const content = read(file);
  if (content.includes(needle)) {
    throw new Error(`${file} still contains forbidden Phase 56 content: ${needle}`);
  }
}

assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'ensurePoolWriteIntegrity');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'ensureAllocationWriteIntegrity');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'ensureDhcpScopeWriteIntegrity');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'ensureReservationWriteIntegrity');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'Allocation ${cidr} overlaps active allocation');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'Pool ${cidr} overlaps active pool');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'BROWNFIELD_REVIEWED');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'RESERVE_OVERRIDE');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'RESERVED_POOL_OVERRIDE');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'parseDhcpExcludedRanges');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'Reservation IP ${ipAddress} already exists');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'No silent approve/reject decisions');
assertIncludes('backend/src/services/enterpriseIpam.service.ts', 'Approved allocations must store the current Engine 2 input hash');
assertIncludes('backend/src/lib/enterpriseAddressAllocator.ts', 'ALLOCATION_APPROVAL_HASH_MISSING');
assertIncludes('backend/src/lib/enterpriseAddressAllocator.ts', 'Phase 56 moves critical Engine 2 controls to write time');
assertIncludes('backend/prisma/schema.prisma', 'supersededByAllocationId String?');
assertIncludes('backend/prisma/schema.prisma', 'designInputHash String?');
assertIncludes('backend/prisma/migrations/20260429100000_phase56_engine2_write_integrity/migration.sql', 'DesignIpAllocation_projectId_addressFamily_routeDomainId_idx');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'EnterpriseIpPool');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'EnterpriseIpAllocation');
assertIncludes('frontend/src/features/enterprise-ipam/api.ts', 'EnterpriseDhcpScope');
assertNotIncludes('frontend/src/features/enterprise-ipam/api.ts', 'Array<any>');
assertNotIncludes('frontend/src/features/enterprise-ipam/api.ts', 'api<any>');
assertIncludes('docs/doc/PHASE56-ENGINE2-WRITE-INTEGRITY-CONFLICT-ENFORCEMENT.md', 'Phase 56');

console.log('Phase 56 Engine 2 write-time integrity static check passed.');
