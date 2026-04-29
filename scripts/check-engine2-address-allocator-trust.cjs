const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['backend/src/lib/addressAllocator.ts', 'export function calculateFreeRanges'],
  ['backend/src/lib/addressAllocator.ts', 'export function summarizeAllocationCapacity'],
  ['backend/src/lib/addressAllocator.ts', 'allocatorLargestFreeRange'],
  ['backend/src/lib/addressAllocator.selftest.ts', 'allocator reports free ranges, utilization, and largest available space'],
  ['backend/src/lib/addressAllocator.selftest.ts', 'allocator exposes placement telemetry on batch results'],
  ['backend/src/services/designCore.types.ts', 'allocatorParentCidr?: string'],
  ['backend/src/services/designCore.service.ts', 'row.allocatorParentCidr = assignment.allocatorParentCidr'],
  ['frontend/src/lib/designCoreSnapshot.ts', 'allocatorParentCidr?: string'],
  ['frontend/src/lib/designSynthesis.types.ts', 'allocatorParentCidr?: string'],
  ['frontend/src/lib/designCoreAdapter.ts', 'Allocator proof: parent'],
  ['frontend/src/pages/ProjectAddressingPage.tsx', 'Allocator Proof'],
  ['backend/src/services/exportDesignCoreReport.service.ts', 'Allocator Proof'],
  ['docs/doc/PHASE47-ENGINE2-ADDRESS-ALLOCATOR-TRUST-PASS.md', 'Engine 2 Address Allocator Trust Pass'],
];

const missing = checks.filter(([file, needle]) => !read(file).includes(needle));
if (missing.length > 0) {
  console.error('Engine 2 address allocator trust check failed:');
  for (const [file, needle] of missing) console.error(`- ${file}: missing ${needle}`);
  process.exit(1);
}

console.log('Engine 2 address allocator trust check passed.');
