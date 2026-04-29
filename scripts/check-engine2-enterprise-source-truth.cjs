const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function requireContains(file, expected) {
  const content = read(file);
  if (!content.includes(expected)) {
    console.error(`Missing required marker in ${file}: ${expected}`);
    process.exit(1);
  }
}

const requiredMarkers = [
  ['backend/prisma/schema.prisma', 'model DesignRouteDomain'],
  ['backend/prisma/schema.prisma', 'model DesignIpPool'],
  ['backend/prisma/schema.prisma', 'model DesignIpAllocation'],
  ['backend/prisma/schema.prisma', 'model DesignDhcpScope'],
  ['backend/prisma/schema.prisma', 'model DesignIpReservation'],
  ['backend/prisma/schema.prisma', 'model DesignBrownfieldImport'],
  ['backend/prisma/schema.prisma', 'model DesignBrownfieldNetwork'],
  ['backend/prisma/schema.prisma', 'model DesignAllocationApproval'],
  ['backend/prisma/schema.prisma', 'model DesignAllocationLedgerEntry'],
  ['backend/prisma/migrations/20260429093000_phase49_engine2_enterprise_source_of_truth/migration.sql', 'CREATE TABLE IF NOT EXISTS "DesignIpPool"'],
  ['backend/src/lib/ipv6Cidr.ts', 'findNextAvailableIpv6Prefix'],
  ['backend/src/lib/enterpriseAddressAllocator.ts', 'buildDualStackAllocationPlan'],
  ['backend/src/lib/enterpriseAddressAllocator.ts', 'evaluateBrownfieldDiff'],
  ['backend/src/lib/enterpriseAddressAllocator.ts', 'evaluateDhcpAndReservations'],
  ['backend/src/lib/enterpriseAddressAllocator.ts', 'evaluateApprovalLedger'],
  ['backend/src/services/designCore/designCore.repository.ts', 'ipPools: { orderBy'],
  ['backend/src/services/designCore.service.ts', 'extractEnterpriseAllocatorSource(project)'],
  ['backend/src/services/designCore.types.ts', 'sourceOfTruthReadiness'],
  ['frontend/src/lib/designCoreSnapshot.ts', 'allocationPlanRows: EnterpriseAllocatorPlanRowSummary[]'],
  ['frontend/src/pages/ProjectAddressingPage.tsx', 'Source of truth'],
  ['backend/src/services/exportDesignCoreReport.service.ts', 'Phase 50 Dual-Stack Allocation Plan'],
  ['docs/doc/PHASE49-ENGINE2-ENTERPRISE-SOURCE-OF-TRUTH.md', 'Phase 49'],
  ['docs/doc/PHASE50-ENGINE2-REAL-DUALSTACK-ALLOCATOR.md', 'Phase 50'],
  ['docs/doc/PHASE51-ENGINE2-BROWNFIELD-CONFLICT-DIFF.md', 'Phase 51'],
  ['docs/doc/PHASE52-ENGINE2-DHCP-RESERVATION-TRUTH.md', 'Phase 52'],
  ['docs/doc/PHASE53-ENGINE2-APPROVAL-LEDGER.md', 'Phase 53'],
];

for (const [file, marker] of requiredMarkers) requireContains(file, marker);
console.log('Engine 2 enterprise source-of-truth Phase 49-53 static gate passed.');
