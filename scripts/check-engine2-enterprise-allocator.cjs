const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['backend/src/lib/ipv6Cidr.ts', 'export function parseIpv6Cidr'],
  ['backend/src/lib/ipv6Cidr.ts', 'export function ipv6CidrsOverlap'],
  ['backend/src/lib/ipv6Cidr.ts', 'IPv6 LAN segments normally require /64'],
  ['backend/src/lib/enterpriseAddressAllocator.ts', 'export function buildEnterpriseAllocatorPosture'],
  ['backend/src/lib/enterpriseAddressAllocator.ts', 'brownfieldEvidenceState'],
  ['backend/src/services/designCore.service.ts', 'const enterpriseAllocatorPosture = buildEnterpriseAllocatorPosture'],
  ['backend/src/services/designCore.types.ts', 'export interface EnterpriseAllocatorPostureSummary'],
  ['backend/src/services/designCore.types.ts', 'enterpriseAllocatorPosture: EnterpriseAllocatorPostureSummary'],
  ['frontend/src/lib/designCoreSnapshot.ts', 'enterpriseAllocatorPosture?: EnterpriseAllocatorPostureSummary'],
  ['frontend/src/lib/designSynthesis.types.ts', 'addressFamily?: "ipv4" | "ipv6"'],
  ['frontend/src/pages/ProjectAddressingPage.tsx', 'Enterprise allocator readiness'],
  ['backend/src/services/exportDesignCoreReport.service.ts', 'Enterprise Address Allocator Readiness'],
  ['docs/doc/PHASE48-ENGINE2-ENTERPRISE-DUALSTACK-ALLOCATOR.md', 'does not claim live discovery or real IPAM synchronization exists'],
];

const missing = checks.filter(([file, needle]) => !read(file).includes(needle));
if (missing.length > 0) {
  console.error('Engine 2 enterprise allocator check failed:');
  for (const [file, needle] of missing) console.error(`- ${file}: missing ${needle}`);
  process.exit(1);
}
console.log('Engine 2 enterprise allocator check passed.');
