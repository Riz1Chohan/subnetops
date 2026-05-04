import {
  applyBrownfieldConflictResolutions,
  buildBrownfieldConflictReviewFromData,
  buildEnterpriseAllocatorPosture,
  overallEnterpriseAllocatorReadiness,
  type EnterpriseAllocatorInputRow,
  type EnterpriseAllocatorSource,
} from './index.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const userRow: EnterpriseAllocatorInputRow = {
  id: 'vlan-users-10',
  siteId: 'site-hq',
  siteName: 'HQ',
  vlanId: 10,
  vlanName: 'Users',
  role: 'USER',
  proposedSubnetCidr: '10.20.10.0/24',
  dhcpEnabled: true,
  estimatedHosts: 80,
};

const cleanSource: EnterpriseAllocatorSource = {
  routeDomains: [{ id: 'rd-corp', routeDomainKey: 'corp', name: 'Corp', allowOverlappingCidrs: false }],
  ipPools: [
    { id: 'pool-v4', name: 'HQ IPv4 pool', addressFamily: 'IPV4', cidr: '10.20.0.0/16', routeDomainId: 'rd-corp', status: 'ACTIVE', reservePercent: 20 },
    { id: 'pool-v6', name: 'HQ IPv6 pool', addressFamily: 'IPV6', cidr: '2001:db8:20::/48', routeDomainId: 'rd-corp', status: 'ACTIVE', reservePercent: 10 },
  ],
  ipAllocations: [
    { id: 'alloc-existing', poolId: 'pool-v4', routeDomainId: 'rd-corp', siteId: 'site-hq', vlanId: 'legacy-vlan', addressFamily: 'IPV4', cidr: '10.20.0.0/24', status: 'APPROVED' },
  ],
  dhcpScopes: [
    { id: 'scope-users', siteId: 'site-hq', vlanId: 'vlan-users-10', routeDomainId: 'rd-corp', addressFamily: 'IPV4', scopeCidr: '10.20.10.0/24', defaultGateway: '10.20.10.1', dnsServersJson: '["10.20.0.10"]' },
  ],
  ipReservations: [
    { id: 'reservation-printer', siteId: 'site-hq', vlanId: 'vlan-users-10', dhcpScopeId: 'scope-users', addressFamily: 'IPV4', ipAddress: '10.20.10.20', hostname: 'printer-01' },
  ],
  brownfieldNetworks: [{ id: 'import-users', routeDomainKey: 'default', addressFamily: 'IPV4', cidr: '10.20.10.0/24', ownerLabel: 'current users' }],
  allocationApprovals: [{ id: 'approval-existing', allocationId: 'alloc-existing', decision: 'APPROVED' }],
  allocationLedger: [{ id: 'ledger-existing', allocationId: 'alloc-existing', action: 'APPROVED', summary: 'Approved existing allocation' }],
};

const posture = buildEnterpriseAllocatorPosture([userRow], cleanSource);
assert(posture.allocationPlanRows.some((row) => row.family === 'ipv4' && row.poolId === 'pool-v4' && row.status === 'allocated'), 'Active IPv4 pool should create deterministic allocation plan rows.');
assert(posture.allocationPlanRows.some((row) => row.family === 'ipv6' && row.poolId === 'pool-v6' && row.proposedCidr?.startsWith('2001:db8:20:')), 'Active IPv6 pool should create deterministic dual-stack plan rows.');
assert(posture.brownfieldConflictCount > 0, 'Imported brownfield overlap must produce review/blocking evidence.');
assert(overallEnterpriseAllocatorReadiness(posture) !== 'ready', 'Brownfield evidence and approval gaps should prevent fake ready status.');

const blockedDuplicateSource: EnterpriseAllocatorSource = {
  routeDomains: [{ id: 'rd-corp', routeDomainKey: 'corp', name: 'Corp', allowOverlappingCidrs: false }],
  ipPools: [{ id: 'pool-v4', name: 'HQ IPv4 pool', addressFamily: 'IPV4', cidr: '10.20.0.0/16', routeDomainId: 'rd-corp', status: 'ACTIVE', reservePercent: 20 }],
  ipAllocations: [
    { id: 'alloc-a', routeDomainId: 'rd-corp', addressFamily: 'IPV4', cidr: '10.20.30.0/24', status: 'APPROVED' },
    { id: 'alloc-b', routeDomainId: 'rd-corp', addressFamily: 'IPV4', cidr: '10.20.30.128/25', status: 'APPROVED' },
  ],
  brownfieldNetworks: [{ id: 'import-other', routeDomainKey: 'corp', addressFamily: 'IPV4', cidr: '10.20.200.0/24' }],
};

const duplicatePosture = buildEnterpriseAllocatorPosture([userRow], blockedDuplicateSource);
assert(duplicatePosture.vrfOverlapFindingCount === 1, 'Same-route-domain overlapping allocations must be detected.');
assert(duplicatePosture.reviewFindings.some((finding) => finding.code === 'VRF_DUPLICATE_IN_DOMAIN' && finding.severity === 'blocked'), 'Same-route-domain overlap must be blocking.');
assert(duplicatePosture.vrfReadiness === 'blocked', 'VRF readiness must block on same-domain overlap.');

const noAllocateSource: EnterpriseAllocatorSource = {
  routeDomains: [{ id: 'rd-corp', routeDomainKey: 'corp', name: 'Corp' }],
  ipPools: [{ id: 'pool-reserved', name: 'Do not allocate', addressFamily: 'IPV4', cidr: '10.30.0.0/16', routeDomainId: 'rd-corp', status: 'ACTIVE', noAllocate: true, reservePercent: 50 }],
  brownfieldNetworks: [{ id: 'import-empty', routeDomainKey: 'corp', addressFamily: 'IPV4', cidr: '10.99.0.0/24' }],
};
const noAllocatePosture = buildEnterpriseAllocatorPosture([userRow], noAllocateSource);
assert(noAllocatePosture.allocationPlanRows.length === 0, 'noAllocate pools must not create proposed allocations.');

const staleSource: EnterpriseAllocatorSource = {
  routeDomains: [{ id: 'rd-corp', routeDomainKey: 'corp', name: 'Corp' }],
  ipPools: [{ id: 'pool-v4', name: 'HQ IPv4 pool', addressFamily: 'IPV4', cidr: '10.20.0.0/16', routeDomainId: 'rd-corp', status: 'ACTIVE', reservePercent: 20 }],
  ipAllocations: [{ id: 'alloc-stale', routeDomainId: 'rd-corp', addressFamily: 'IPV4', cidr: '10.20.40.0/24', status: 'APPROVED', inputHash: 'old-hash' }],
  allocationApprovals: [{ id: 'approval-stale', allocationId: 'alloc-stale', decision: 'APPROVED', designInputHash: 'old-hash' }],
  brownfieldNetworks: [{ id: 'import-safe', routeDomainKey: 'corp', addressFamily: 'IPV4', cidr: '10.20.200.0/24' }],
};
const stalePosture = buildEnterpriseAllocatorPosture([userRow], staleSource);
assert(stalePosture.staleAllocationCount === 1, 'Stale approved allocations must be counted.');
assert(stalePosture.approvalReadiness === 'blocked', 'Stale approved allocation must block approval readiness.');

const brownfieldReview = buildBrownfieldConflictReviewFromData({
  brownfieldNetworks: [{ id: 'import-users', routeDomainKey: 'corp', addressFamily: 'IPV4', cidr: '10.40.10.0/24' }],
  ipAllocations: [{ id: 'alloc-users', addressFamily: 'IPV4', cidr: '10.40.10.0/24', routeDomainKey: 'corp', purpose: 'Users' }],
  dhcpScopes: [{ id: 'scope-users', addressFamily: 'IPV4', scopeCidr: '10.40.10.0/24', routeDomainKey: 'corp' }],
  ipPools: [{ id: 'pool-users', addressFamily: 'IPV4', cidr: '10.40.0.0/16', routeDomainKey: 'corp', name: 'Users pool' }],
  planRows: [{ family: 'ipv4', proposedCidr: '10.40.20.0/24', routeDomainKey: 'corp', poolId: 'pool-users', target: 'HQ VLAN 20' }],
});
assert(brownfieldReview.summary.blocked === 2, 'Brownfield duplicate allocation and DHCP scope should both block.');
assert(brownfieldReview.summary.info === 1, 'Brownfield pool intersection should remain contextual info.');
const resolved = applyBrownfieldConflictResolutions(brownfieldReview.conflicts, [{ conflictKey: brownfieldReview.conflicts[0].conflictKey, decision: 'accepted_risk' }]);
assert(resolved.summary.resolved === 1 && resolved.summary.unresolved === brownfieldReview.summary.total - 1, 'Conflict resolutions must update brownfield review summary.');

console.log('IPAM domain selftest passed');
