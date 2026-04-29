import { createHash } from 'node:crypto';
import {
  containsIp,
  intToIpv4,
  parseCidr,
  type ParsedCidr,
  type SegmentRole,
} from './cidr.js';
import {
  findNextAvailableNetworkDetailed,
  nextBlockSize,
  type UsedRange,
} from './addressAllocator.js';
import {
  findNextAvailableIpv6Prefix,
  ipv6Contains,
  ipv6CidrsOverlap,
  parseIpv6Cidr,
  type Ipv6UsedRange,
  type ParsedIpv6Cidr,
} from './ipv6Cidr.js';

export type AddressFamily = 'ipv4' | 'ipv6';
export type AllocationSourceState = 'configured' | 'proposed' | 'import-required' | 'unsupported';
export type EnterpriseReadiness = 'ready' | 'review' | 'blocked';

export interface EnterpriseAllocatorInputRow {
  id: string;
  siteId: string;
  siteName: string;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  subnetCidr?: string;
  proposedSubnetCidr?: string;
  dhcpEnabled?: boolean;
  estimatedHosts?: number | null;
}

export interface EnterpriseRouteDomainRecord {
  id: string;
  routeDomainKey: string;
  name: string;
  allowOverlappingCidrs?: boolean;
}

export interface EnterprisePoolRecord {
  id: string;
  name: string;
  addressFamily: unknown;
  cidr: string;
  scope?: unknown;
  status?: unknown;
  noAllocate?: boolean;
  reservePercent?: number | null;
  routeDomainId?: string | null;
  siteId?: string | null;
  businessUnit?: string | null;
  ownerLabel?: string | null;
}

export interface EnterpriseAllocationRecord {
  id: string;
  poolId?: string | null;
  routeDomainId?: string | null;
  siteId?: string | null;
  vlanId?: string | null;
  addressFamily: unknown;
  cidr: string;
  gatewayIp?: string | null;
  status?: unknown;
  inputHash?: string | null;
  supersededByAllocationId?: string | null;
  supersessionReason?: string | null;
  purpose?: string | null;
}

export interface EnterpriseDhcpScopeRecord {
  id: string;
  siteId?: string | null;
  vlanId?: string | null;
  routeDomainId?: string | null;
  allocationId?: string | null;
  addressFamily?: unknown;
  scopeCidr: string;
  defaultGateway?: string | null;
  dnsServersJson?: string | null;
  excludedRangesJson?: string | null;
  optionsJson?: string | null;
  relayTargetsJson?: string | null;
  serverLocation?: string | null;
}

export interface EnterpriseReservationRecord {
  id: string;
  siteId?: string | null;
  vlanId?: string | null;
  dhcpScopeId?: string | null;
  allocationId?: string | null;
  addressFamily?: unknown;
  ipAddress: string;
  hostname?: string | null;
  macAddress?: string | null;
  ownerLabel?: string | null;
}

export interface EnterpriseBrownfieldNetworkRecord {
  id: string;
  routeDomainKey?: string | null;
  addressFamily: unknown;
  cidr: string;
  vlanNumber?: number | null;
  siteName?: string | null;
  ownerLabel?: string | null;
  confidence?: string | null;
}

export interface EnterpriseApprovalRecord {
  id: string;
  allocationId: string;
  decision: unknown;
  reviewerLabel?: string | null;
  reason?: string | null;
  designInputHash?: string | null;
}

export interface EnterpriseLedgerRecord {
  id: string;
  allocationId?: string | null;
  action: unknown;
  designInputHash?: string | null;
  summary: string;
}

export interface EnterpriseAllocatorSource {
  routeDomains?: EnterpriseRouteDomainRecord[];
  ipPools?: EnterprisePoolRecord[];
  ipAllocations?: EnterpriseAllocationRecord[];
  dhcpScopes?: EnterpriseDhcpScopeRecord[];
  ipReservations?: EnterpriseReservationRecord[];
  brownfieldNetworks?: EnterpriseBrownfieldNetworkRecord[];
  allocationApprovals?: EnterpriseApprovalRecord[];
  allocationLedger?: EnterpriseLedgerRecord[];
}

export interface EnterpriseAllocationPlanRow {
  family: AddressFamily;
  poolId: string;
  poolName: string;
  routeDomainKey: string;
  target: string;
  siteId?: string;
  vlanId?: number;
  requestedPrefix: number;
  proposedCidr?: string;
  status: 'allocated' | 'blocked' | 'skipped';
  explanation: string;
}

export interface EnterpriseReviewFinding {
  code: string;
  severity: 'info' | 'review' | 'blocked';
  title: string;
  detail: string;
}

export interface EnterpriseAllocatorPosture {
  sourceOfTruthReadiness: EnterpriseReadiness;
  dualStackReadiness: EnterpriseReadiness;
  vrfReadiness: EnterpriseReadiness;
  brownfieldReadiness: EnterpriseReadiness;
  dhcpReadiness: EnterpriseReadiness;
  reservePolicyReadiness: EnterpriseReadiness;
  approvalReadiness: EnterpriseReadiness;
  ipv4ConfiguredSubnetCount: number;
  ipv6ConfiguredPrefixCount: number;
  ipv6ReviewFindingCount: number;
  vrfDomainCount: number;
  dhcpScopeCount: number;
  reservationPolicyCount: number;
  brownfieldEvidenceState: AllocationSourceState;
  durablePoolCount: number;
  durableAllocationCount: number;
  durableBrownfieldNetworkCount: number;
  allocationApprovalCount: number;
  allocationLedgerEntryCount: number;
  ipv6AllocationCount: number;
  vrfOverlapFindingCount: number;
  brownfieldConflictCount: number;
  dhcpFindingCount: number;
  reservePolicyFindingCount: number;
  staleAllocationCount: number;
  currentInputHash: string;
  allocationPlanRows: EnterpriseAllocationPlanRow[];
  reviewFindings: EnterpriseReviewFinding[];
  notes: string[];
  reviewQueue: string[];
}

function normalizeFamily(value: unknown): AddressFamily {
  return String(value ?? '').toUpperCase().includes('6') ? 'ipv6' : 'ipv4';
}

function routeDomainKeyForId(source: EnterpriseAllocatorSource, routeDomainId?: string | null): string {
  if (!routeDomainId) return 'default';
  return source.routeDomains?.find((domain) => domain.id === routeDomainId)?.routeDomainKey ?? routeDomainId;
}

function worse(left: EnterpriseReadiness, right: EnterpriseReadiness): EnterpriseReadiness {
  const score: Record<EnterpriseReadiness, number> = { ready: 0, review: 1, blocked: 2 };
  return score[left] >= score[right] ? left : right;
}

function severityToReadiness(severity: EnterpriseReviewFinding['severity']): EnterpriseReadiness {
  if (severity === 'blocked') return 'blocked';
  if (severity === 'review') return 'review';
  return 'ready';
}

function addFinding(findings: EnterpriseReviewFinding[], finding: EnterpriseReviewFinding) {
  findings.push(finding);
}

function parseJsonArray(value?: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function stableHash(input: unknown): string {
  return createHash('sha256').update(stableStringify(input)).digest('hex').slice(0, 16);
}

function canonicalRouteDomainKey(source: EnterpriseAllocatorSource, allocationOrPool: { routeDomainId?: string | null }): string {
  return routeDomainKeyForId(source, allocationOrPool.routeDomainId);
}

function parseIpv4AllocationRanges(items: { cidr: string }[]): UsedRange[] {
  const ranges: UsedRange[] = [];
  for (const item of items) {
    try {
      const parsed = parseCidr(item.cidr);
      ranges.push({ start: parsed.network, end: parsed.broadcast });
    } catch {
      // Invalid durable evidence is reported elsewhere. The allocator should not crash on it.
    }
  }
  return ranges;
}

function parseIpv6AllocationRanges(items: { cidr: string }[]): Ipv6UsedRange[] {
  const ranges: Ipv6UsedRange[] = [];
  for (const item of items) {
    try {
      const parsed = parseIpv6Cidr(item.cidr);
      ranges.push({ start: parsed.network, end: parsed.lastAddress });
    } catch {
      // Invalid durable evidence is reported elsewhere. The allocator should not crash on it.
    }
  }
  return ranges;
}

function requestedIpv6PrefixForRole(role: SegmentRole): number {
  if (role === 'WAN_TRANSIT') return 127;
  if (role === 'LOOPBACK') return 128;
  return 64;
}

function buildInputHash(rows: EnterpriseAllocatorInputRow[], source: EnterpriseAllocatorSource) {
  return stableHash({
    rows: rows.map((row) => ({ id: row.id, siteId: row.siteId, vlanId: row.vlanId, cidr: row.subnetCidr, proposed: row.proposedSubnetCidr, dhcp: row.dhcpEnabled, hosts: row.estimatedHosts })),
    pools: (source.ipPools ?? []).map((pool) => ({ id: pool.id, family: normalizeFamily(pool.addressFamily), cidr: pool.cidr, siteId: pool.siteId, routeDomainId: pool.routeDomainId, reservePercent: pool.reservePercent, noAllocate: pool.noAllocate })),
    allocations: (source.ipAllocations ?? []).map((allocation) => ({ id: allocation.id, family: normalizeFamily(allocation.addressFamily), cidr: allocation.cidr, poolId: allocation.poolId, routeDomainId: allocation.routeDomainId, status: String(allocation.status ?? '') })),
    dhcpScopes: (source.dhcpScopes ?? []).map((scope) => ({ id: scope.id, cidr: scope.scopeCidr, gateway: scope.defaultGateway, dns: scope.dnsServersJson, options: scope.optionsJson })),
    brownfield: (source.brownfieldNetworks ?? []).map((network) => ({ id: network.id, family: normalizeFamily(network.addressFamily), cidr: network.cidr, routeDomainKey: network.routeDomainKey })),
  });
}

function evaluateVrfOverlaps(source: EnterpriseAllocatorSource, findings: EnterpriseReviewFinding[]) {
  const allocations = source.ipAllocations ?? [];
  let overlapFindings = 0;

  for (let leftIndex = 0; leftIndex < allocations.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < allocations.length; rightIndex += 1) {
      const left = allocations[leftIndex];
      const right = allocations[rightIndex];
      if (normalizeFamily(left.addressFamily) !== normalizeFamily(right.addressFamily)) continue;
      const leftDomain = canonicalRouteDomainKey(source, left);
      const rightDomain = canonicalRouteDomainKey(source, right);
      const sameDomain = leftDomain === rightDomain;
      const leftDomainAllowsOverlap = source.routeDomains?.find((domain) => domain.routeDomainKey === leftDomain)?.allowOverlappingCidrs;
      const rightDomainAllowsOverlap = source.routeDomains?.find((domain) => domain.routeDomainKey === rightDomain)?.allowOverlappingCidrs;
      let overlaps = false;
      try {
        if (normalizeFamily(left.addressFamily) === 'ipv4') overlaps = overlapsIpv4(parseCidr(left.cidr), parseCidr(right.cidr));
        else overlaps = ipv6CidrsOverlap(parseIpv6Cidr(left.cidr), parseIpv6Cidr(right.cidr));
      } catch {
        continue;
      }
      if (!overlaps) continue;
      if (sameDomain) {
        overlapFindings += 1;
        addFinding(findings, {
          code: 'VRF_DUPLICATE_IN_DOMAIN',
          severity: 'blocked',
          title: 'Duplicate allocation inside the same route domain',
          detail: `${left.cidr} overlaps ${right.cidr} inside route domain ${leftDomain}. This must be blocked before implementation.`,
        });
      } else if (!leftDomainAllowsOverlap || !rightDomainAllowsOverlap) {
        overlapFindings += 1;
        addFinding(findings, {
          code: 'VRF_OVERLAP_REQUIRES_DOMAIN_APPROVAL',
          severity: 'review',
          title: 'Overlapping allocation across route domains needs explicit approval',
          detail: `${left.cidr} in ${leftDomain} overlaps ${right.cidr} in ${rightDomain}. This can be valid only when both domains explicitly allow overlapping CIDRs and route leaking/NAT boundaries are reviewed.`,
        });
      }
    }
  }
  return overlapFindings;
}

function overlapsIpv4(left: ParsedCidr, right: ParsedCidr): boolean {
  return left.network <= right.broadcast && right.network <= left.broadcast;
}

function buildDualStackAllocationPlan(rows: EnterpriseAllocatorInputRow[], source: EnterpriseAllocatorSource, findings: EnterpriseReviewFinding[]): EnterpriseAllocationPlanRow[] {
  const plan: EnterpriseAllocationPlanRow[] = [];
  const pools = (source.ipPools ?? []).filter((pool) => String(pool.status ?? 'ACTIVE') === 'ACTIVE' && !pool.noAllocate);
  const durableAllocations = source.ipAllocations ?? [];

  for (const pool of pools) {
    const family = normalizeFamily(pool.addressFamily);
    const domainKey = routeDomainKeyForId(source, pool.routeDomainId);
    const targets = rows.filter((row) => !pool.siteId || row.siteId === pool.siteId);

    if (family === 'ipv4') {
      let parent: ParsedCidr | null = null;
      try { parent = parseCidr(pool.cidr); }
      catch {
        addFinding(findings, { code: 'IPV4_POOL_INVALID', severity: 'blocked', title: 'Invalid IPv4 pool', detail: `${pool.name} uses invalid IPv4 CIDR ${pool.cidr}.` });
      }
      if (!parent) continue;
      const usedRanges = parseIpv4AllocationRanges(durableAllocations.filter((allocation) => allocation.poolId === pool.id || (!allocation.poolId && normalizeFamily(allocation.addressFamily) === 'ipv4')));
      for (const row of targets.filter((target) => Boolean(target.proposedSubnetCidr))) {
        const requestedPrefix = Number(row.proposedSubnetCidr?.split('/')[1] ?? 32);
        const result = findNextAvailableNetworkDetailed(parent, requestedPrefix, usedRanges);
        plan.push({
          family,
          poolId: pool.id,
          poolName: pool.name,
          routeDomainKey: domainKey,
          target: `${row.siteName} VLAN ${row.vlanId}`,
          siteId: row.siteId,
          vlanId: row.vlanId,
          requestedPrefix,
          proposedCidr: result.proposed ? `${intToIpv4(result.proposed.network)}/${result.proposed.prefix}` : undefined,
          status: result.status === 'allocated' ? 'allocated' : 'blocked',
          explanation: result.allocatorExplanation,
        });
        if (result.proposed) usedRanges.push({ start: result.proposed.network, end: result.proposed.broadcast });
      }
      continue;
    }

    let parent6: ParsedIpv6Cidr | null = null;
    try { parent6 = parseIpv6Cidr(pool.cidr); }
    catch {
      addFinding(findings, { code: 'IPV6_POOL_INVALID', severity: 'blocked', title: 'Invalid IPv6 pool', detail: `${pool.name} uses invalid IPv6 CIDR ${pool.cidr}.` });
    }
    if (!parent6) continue;
    const used6 = parseIpv6AllocationRanges(durableAllocations.filter((allocation) => allocation.poolId === pool.id || (!allocation.poolId && normalizeFamily(allocation.addressFamily) === 'ipv6')));
    for (const row of targets) {
      const alreadyAllocated = durableAllocations.some((allocation) => normalizeFamily(allocation.addressFamily) === 'ipv6' && allocation.vlanId === row.id);
      if (alreadyAllocated) continue;
      const requestedPrefix = requestedIpv6PrefixForRole(row.role);
      const result = findNextAvailableIpv6Prefix(parent6, requestedPrefix, used6);
      plan.push({
        family,
        poolId: pool.id,
        poolName: pool.name,
        routeDomainKey: domainKey,
        target: `${row.siteName} VLAN ${row.vlanId}`,
        siteId: row.siteId,
        vlanId: row.vlanId,
        requestedPrefix,
        proposedCidr: result.proposed?.canonicalCidr,
        status: result.status === 'allocated' ? 'allocated' : 'blocked',
        explanation: result.allocatorExplanation,
      });
      if (result.proposed) used6.push({ start: result.proposed.network, end: result.proposed.lastAddress });
    }
  }

  return plan;
}

function evaluateBrownfieldDiff(rows: EnterpriseAllocatorInputRow[], source: EnterpriseAllocatorSource, planRows: EnterpriseAllocationPlanRow[], findings: EnterpriseReviewFinding[]) {
  const brownfield = source.brownfieldNetworks ?? [];
  let conflictCount = 0;
  const proposedNetworks = [
    ...rows.flatMap((row) => [row.subnetCidr, row.proposedSubnetCidr].filter(Boolean).map((cidr) => ({ cidr: cidr as string, family: cidr!.includes(':') ? 'ipv6' as const : 'ipv4' as const, label: `${row.siteName} VLAN ${row.vlanId}`, routeDomainKey: 'default' }))),
    ...(source.ipAllocations ?? []).map((allocation) => ({ cidr: allocation.cidr, family: normalizeFamily(allocation.addressFamily), label: `durable allocation ${allocation.id}`, routeDomainKey: routeDomainKeyForId(source, allocation.routeDomainId) })),
    ...planRows.filter((row) => row.proposedCidr).map((row) => ({ cidr: row.proposedCidr!, family: row.family, label: row.target, routeDomainKey: row.routeDomainKey })),
  ];

  for (const imported of brownfield) {
    const importedFamily = normalizeFamily(imported.addressFamily);
    const importedDomain = imported.routeDomainKey ?? 'default';
    for (const proposed of proposedNetworks) {
      if (proposed.family !== importedFamily) continue;
      if (proposed.routeDomainKey !== importedDomain) continue;
      let overlaps = false;
      try {
        if (importedFamily === 'ipv4') overlaps = overlapsIpv4(parseCidr(imported.cidr), parseCidr(proposed.cidr));
        else overlaps = ipv6CidrsOverlap(parseIpv6Cidr(imported.cidr), parseIpv6Cidr(proposed.cidr));
      } catch {
        continue;
      }
      if (!overlaps) continue;
      conflictCount += 1;
      addFinding(findings, {
        code: 'BROWNFIELD_PROPOSED_OVERLAP',
        severity: imported.cidr === proposed.cidr ? 'review' : 'blocked',
        title: 'Proposed allocation overlaps imported brownfield state',
        detail: `${proposed.label} ${proposed.cidr} overlaps imported ${imported.cidr}${imported.ownerLabel ? ` owned by ${imported.ownerLabel}` : ''} in route domain ${importedDomain}.`,
      });
    }
  }
  return conflictCount;
}

function evaluateDhcpAndReservations(rows: EnterpriseAllocatorInputRow[], source: EnterpriseAllocatorSource, findings: EnterpriseReviewFinding[]) {
  let dhcpFindings = 0;
  const scopes = source.dhcpScopes ?? [];
  const reservations = source.ipReservations ?? [];
  const dhcpEnabledRows = rows.filter((row) => row.dhcpEnabled).length;

  if (dhcpEnabledRows > 0 && scopes.length === 0) {
    dhcpFindings += 1;
    addFinding(findings, {
      code: 'DHCP_BOOLEAN_WITHOUT_SCOPE',
      severity: 'review',
      title: 'DHCP enabled without durable scope modeling',
      detail: `${dhcpEnabledRows} VLAN row(s) have DHCP enabled, but no durable DHCP scope objects exist yet. A+ requires scope CIDR, gateway, DNS, exclusions, relay/options, and reservations.`,
    });
  }

  for (const scope of scopes) {
    const family = normalizeFamily(scope.addressFamily ?? (scope.scopeCidr.includes(':') ? 'IPV6' : 'IPV4'));
    const dnsServers = parseJsonArray(scope.dnsServersJson);
    const options = parseJsonArray(scope.optionsJson);
    if (dnsServers.length === 0) {
      dhcpFindings += 1;
      addFinding(findings, { code: 'DHCP_DNS_MISSING', severity: 'review', title: 'DHCP scope missing DNS evidence', detail: `DHCP scope ${scope.scopeCidr} has no DNS server list.` });
    }
    if (options.length === 0) {
      addFinding(findings, { code: 'DHCP_OPTIONS_THIN', severity: 'info', title: 'DHCP options are thin', detail: `DHCP scope ${scope.scopeCidr} has no option model beyond the base fields.` });
    }

    try {
      if (family === 'ipv4') {
        const parsed = parseCidr(scope.scopeCidr);
        if (scope.defaultGateway && !containsIp(parsed, scope.defaultGateway)) {
          dhcpFindings += 1;
          addFinding(findings, { code: 'DHCP_GATEWAY_OUTSIDE_SCOPE', severity: 'blocked', title: 'DHCP gateway outside scope', detail: `Gateway ${scope.defaultGateway} is outside DHCP scope ${scope.scopeCidr}.` });
        }
        const seen = new Set<string>();
        for (const reservation of reservations.filter((item) => item.dhcpScopeId === scope.id || item.vlanId === scope.vlanId)) {
          if (seen.has(reservation.ipAddress)) {
            dhcpFindings += 1;
            addFinding(findings, { code: 'DHCP_DUPLICATE_RESERVATION', severity: 'blocked', title: 'Duplicate DHCP reservation', detail: `${reservation.ipAddress} is reserved more than once in scope ${scope.scopeCidr}.` });
          }
          seen.add(reservation.ipAddress);
          if (!containsIp(parsed, reservation.ipAddress)) {
            dhcpFindings += 1;
            addFinding(findings, { code: 'DHCP_RESERVATION_OUTSIDE_SCOPE', severity: 'blocked', title: 'Reservation outside DHCP scope', detail: `${reservation.ipAddress} is outside DHCP scope ${scope.scopeCidr}.` });
          }
          if (scope.defaultGateway && reservation.ipAddress === scope.defaultGateway) {
            dhcpFindings += 1;
            addFinding(findings, { code: 'DHCP_RESERVATION_GATEWAY_CONFLICT', severity: 'blocked', title: 'Reservation conflicts with gateway', detail: `${reservation.ipAddress} is both a reservation and the default gateway.` });
          }
        }
      } else {
        const parsed = parseIpv6Cidr(scope.scopeCidr);
        if (scope.defaultGateway && !ipv6Contains(parsed, parseIpv6Cidr(`${scope.defaultGateway}/128`))) {
          dhcpFindings += 1;
          addFinding(findings, { code: 'DHCPV6_GATEWAY_OUTSIDE_SCOPE', severity: 'blocked', title: 'DHCPv6 gateway outside prefix', detail: `Gateway ${scope.defaultGateway} is outside DHCPv6 prefix ${scope.scopeCidr}.` });
        }
      }
    } catch {
      dhcpFindings += 1;
      addFinding(findings, { code: 'DHCP_SCOPE_INVALID', severity: 'blocked', title: 'Invalid DHCP scope', detail: `${scope.scopeCidr} could not be parsed as ${family}.` });
    }
  }

  return dhcpFindings;
}

function evaluateReservePolicy(source: EnterpriseAllocatorSource, findings: EnterpriseReviewFinding[]) {
  let reserveFindings = 0;
  for (const pool of source.ipPools ?? []) {
    const family = normalizeFamily(pool.addressFamily);
    const reservePercent = pool.reservePercent ?? 0;
    if (reservePercent <= 0) {
      reserveFindings += 1;
      addFinding(findings, { code: 'RESERVE_POLICY_MISSING', severity: 'review', title: 'Pool has no growth reserve', detail: `${pool.name} has reservePercent ${reservePercent}. Enterprise allocation should keep explicit spare capacity by site/business unit.` });
      continue;
    }
    const allocations = (source.ipAllocations ?? []).filter((allocation) => allocation.poolId === pool.id && normalizeFamily(allocation.addressFamily) === family);
    try {
      if (family === 'ipv4') {
        const parent = parseCidr(pool.cidr);
        const used = parseIpv4AllocationRanges(allocations).reduce((total, range) => total + (range.end - range.start + 1), 0);
        const total = nextBlockSize(parent.prefix);
        const remainingPercent = total > 0 ? ((total - used) / total) * 100 : 0;
        if (remainingPercent < reservePercent) {
          reserveFindings += 1;
          addFinding(findings, { code: 'RESERVE_POLICY_BREACH', severity: 'review', title: 'IPv4 pool reserve is below policy', detail: `${pool.name} has ${Math.round(remainingPercent * 100) / 100}% free, below its ${reservePercent}% reserve policy.` });
        }
      } else {
        const parent = parseIpv6Cidr(pool.cidr);
        const parentSize = parent.lastAddress - parent.network + 1n;
        const used = parseIpv6AllocationRanges(allocations).reduce((total, range) => total + (range.end - range.start + 1n), 0n);
        const remainingScaled = Number(((parentSize - used) * 10000n) / parentSize) / 100;
        if (remainingScaled < reservePercent) {
          reserveFindings += 1;
          addFinding(findings, { code: 'RESERVE_POLICY_BREACH_IPV6', severity: 'review', title: 'IPv6 pool reserve is below policy', detail: `${pool.name} has ${remainingScaled}% free, below its ${reservePercent}% reserve policy.` });
        }
      }
    } catch {
      reserveFindings += 1;
      addFinding(findings, { code: 'RESERVE_POOL_INVALID', severity: 'blocked', title: 'Reserve policy cannot evaluate invalid pool', detail: `${pool.name} uses invalid CIDR ${pool.cidr}.` });
    }
  }
  return reserveFindings;
}

function evaluateApprovalLedger(source: EnterpriseAllocatorSource, currentInputHash: string, findings: EnterpriseReviewFinding[]) {
  let staleAllocationCount = 0;
  const approvalsByAllocation = new Map<string, EnterpriseApprovalRecord[]>();
  for (const approval of source.allocationApprovals ?? []) {
    const list = approvalsByAllocation.get(approval.allocationId) ?? [];
    list.push(approval);
    approvalsByAllocation.set(approval.allocationId, list);
  }

  for (const allocation of source.ipAllocations ?? []) {
    const status = String(allocation.status ?? '').toUpperCase();
    if ((status === 'APPROVED' || status === 'IMPLEMENTED') && allocation.inputHash && allocation.inputHash !== currentInputHash) {
      staleAllocationCount += 1;
      addFinding(findings, {
        code: 'ALLOCATION_APPROVAL_STALE',
        severity: 'blocked',
        title: 'Approved allocation is stale',
        detail: `${allocation.cidr} was approved against input hash ${allocation.inputHash}, but the current Engine 2 input hash is ${currentInputHash}. Re-review is required.`,
      });
    }
    const approvalRecords = approvalsByAllocation.get(allocation.id) ?? [];
    if ((status === 'APPROVED' || status === 'IMPLEMENTED') && approvalRecords.length === 0) {
      addFinding(findings, { code: 'ALLOCATION_APPROVAL_MISSING_LEDGER', severity: 'review', title: 'Approved allocation lacks approval record', detail: `${allocation.cidr} has status ${status}, but no durable approval record was found.` });
    }
    for (const approval of approvalRecords) {
      if (String(approval.decision ?? '').toUpperCase() === 'APPROVED' && !approval.designInputHash) {
        addFinding(findings, { code: 'ALLOCATION_APPROVAL_HASH_MISSING', severity: 'review', title: 'Approval lacks input hash', detail: `${allocation.cidr} has an approval record without the Engine 2 input hash used for review.` });
      }
      if (String(approval.decision ?? '').toUpperCase() === 'APPROVED' && approval.designInputHash && approval.designInputHash !== currentInputHash) {
        addFinding(findings, { code: 'ALLOCATION_APPROVAL_RECORD_STALE', severity: 'blocked', title: 'Approval record is stale', detail: `${allocation.cidr} was approved against ${approval.designInputHash}, but current Engine 2 hash is ${currentInputHash}.` });
      }
    }
  }
  return staleAllocationCount;
}

export function extractEnterpriseAllocatorSource(project: unknown): EnterpriseAllocatorSource {
  const record = project as Record<string, unknown> | null | undefined;
  if (!record) return {};
  return {
    routeDomains: Array.isArray(record.routeDomains) ? record.routeDomains as EnterpriseRouteDomainRecord[] : [],
    ipPools: Array.isArray(record.ipPools) ? record.ipPools as EnterprisePoolRecord[] : [],
    ipAllocations: Array.isArray(record.ipAllocations) ? record.ipAllocations as EnterpriseAllocationRecord[] : [],
    dhcpScopes: Array.isArray(record.dhcpScopes) ? record.dhcpScopes as EnterpriseDhcpScopeRecord[] : [],
    ipReservations: Array.isArray(record.ipReservations) ? record.ipReservations as EnterpriseReservationRecord[] : [],
    brownfieldNetworks: Array.isArray(record.brownfieldNetworks) ? record.brownfieldNetworks as EnterpriseBrownfieldNetworkRecord[] : [],
    allocationApprovals: Array.isArray(record.allocationApprovals) ? record.allocationApprovals as EnterpriseApprovalRecord[] : [],
    allocationLedger: Array.isArray(record.allocationLedger) ? record.allocationLedger as EnterpriseLedgerRecord[] : [],
  };
}

export function buildEnterpriseAllocatorPosture(rows: EnterpriseAllocatorInputRow[], source: EnterpriseAllocatorSource = {}): EnterpriseAllocatorPosture {
  const notes: string[] = [];
  const reviewQueue: string[] = [];
  const findings: EnterpriseReviewFinding[] = [];
  let ipv4ConfiguredSubnetCount = 0;
  let ipv6ConfiguredPrefixCount = 0;
  let ipv6ReviewFindingCount = 0;

  for (const row of rows) {
    for (const cidr of [row.proposedSubnetCidr, row.subnetCidr].filter(Boolean) as string[]) {
      if (cidr.includes('.')) {
        try { parseCidr(cidr); ipv4ConfiguredSubnetCount += 1; }
        catch { addFinding(findings, { code: 'IPV4_ROW_INVALID', severity: 'blocked', title: 'Invalid IPv4 row', detail: `${row.siteName} VLAN ${row.vlanId}: IPv4 CIDR is invalid.` }); }
      }
      if (cidr.includes(':')) {
        try {
          const parsed = parseIpv6Cidr(cidr);
          ipv6ConfiguredPrefixCount += 1;
          if (row.role !== 'WAN_TRANSIT' && row.role !== 'LOOPBACK' && parsed.prefix !== 64) {
            ipv6ReviewFindingCount += 1;
            addFinding(findings, { code: 'IPV6_LAN_NOT_64', severity: 'review', title: 'IPv6 LAN is not /64', detail: `${row.siteName} VLAN ${row.vlanId} uses ${parsed.canonicalCidr}. Enterprise IPv6 LANs should normally be /64.` });
          }
          if (row.role === 'WAN_TRANSIT' && parsed.prefix !== 127) {
            ipv6ReviewFindingCount += 1;
            addFinding(findings, { code: 'IPV6_TRANSIT_NOT_127', severity: 'review', title: 'IPv6 transit is not /127', detail: `${row.siteName} VLAN ${row.vlanId} uses ${parsed.canonicalCidr}; point-to-point IPv6 transit should normally be /127.` });
          }
        } catch {
          ipv6ReviewFindingCount += 1;
          addFinding(findings, { code: 'IPV6_ROW_INVALID', severity: 'blocked', title: 'Invalid IPv6 row', detail: `${row.siteName} VLAN ${row.vlanId}: IPv6 CIDR is invalid.` });
        }
      }
    }
  }

  const currentInputHash = buildInputHash(rows, source);
  const allocationPlanRows = buildDualStackAllocationPlan(rows, source, findings);
  const ipv6AllocationCount = (source.ipAllocations ?? []).filter((allocation) => normalizeFamily(allocation.addressFamily) === 'ipv6').length + allocationPlanRows.filter((row) => row.family === 'ipv6' && row.status === 'allocated').length;
  const vrfOverlapFindingCount = evaluateVrfOverlaps(source, findings);
  const brownfieldConflictCount = evaluateBrownfieldDiff(rows, source, allocationPlanRows, findings);
  const dhcpFindingCount = evaluateDhcpAndReservations(rows, source, findings);
  const reservePolicyFindingCount = evaluateReservePolicy(source, findings);
  const staleAllocationCount = evaluateApprovalLedger(source, currentInputHash, findings);

  const routeDomainCount = source.routeDomains?.length ?? 0;
  const durablePoolCount = source.ipPools?.length ?? 0;
  const durableAllocationCount = source.ipAllocations?.length ?? 0;
  const durableBrownfieldNetworkCount = source.brownfieldNetworks?.length ?? 0;
  const dhcpScopeCount = source.dhcpScopes?.length ?? 0;
  const reservationPolicyCount = source.ipReservations?.length ?? 0;
  const allocationApprovalCount = source.allocationApprovals?.length ?? 0;
  const allocationLedgerEntryCount = source.allocationLedger?.length ?? 0;

  if (durablePoolCount === 0) {
    addFinding(findings, { code: 'SOT_POOLS_MISSING', severity: 'review', title: 'No durable IP pools exist', detail: 'Phase 49 source-of-truth models exist, but this project has no durable IPv4/IPv6 pool records yet.' });
  }
  if (routeDomainCount === 0) {
    addFinding(findings, { code: 'VRF_MODEL_MISSING', severity: 'review', title: 'No route domains exist', detail: 'No durable VRF/route-domain objects exist. The allocator is using a default domain only.' });
  }
  if (durableBrownfieldNetworkCount === 0) {
    addFinding(findings, { code: 'BROWNFIELD_IMPORT_MISSING', severity: 'review', title: 'No brownfield import evidence', detail: 'No imported current-state networks exist. Brownfield conflict proof is incomplete.' });
  }
  if (allocationApprovalCount === 0 && durableAllocationCount > 0) {
    addFinding(findings, { code: 'APPROVAL_WORKFLOW_UNUSED', severity: 'review', title: 'Allocations have no approvals', detail: 'Durable allocations exist but no approval records exist yet.' });
  }

  for (const finding of findings) {
    if (finding.severity !== 'info') reviewQueue.push(`${finding.title}: ${finding.detail}`);
  }

  const sourceOfTruthReadiness: EnterpriseReadiness = durablePoolCount > 0 && durableAllocationCount > 0 ? 'ready' : 'review';
  const dualStackReadiness: EnterpriseReadiness = ipv6AllocationCount > 0 && ipv6ReviewFindingCount === 0 ? 'ready' : 'review';
  const vrfReadiness: EnterpriseReadiness = vrfOverlapFindingCount > 0 ? findings.filter((f) => f.code.startsWith('VRF_')).reduce((state, f) => worse(state, severityToReadiness(f.severity)), 'ready' as EnterpriseReadiness) : (routeDomainCount > 0 ? 'ready' : 'review');
  const brownfieldReadiness: EnterpriseReadiness = brownfieldConflictCount > 0 ? findings.filter((f) => f.code.startsWith('BROWNFIELD_')).reduce((state, f) => worse(state, severityToReadiness(f.severity)), 'ready' as EnterpriseReadiness) : (durableBrownfieldNetworkCount > 0 ? 'ready' : 'review');
  const dhcpReadiness: EnterpriseReadiness = dhcpFindingCount > 0 ? findings.filter((f) => f.code.startsWith('DHCP')).reduce((state, f) => worse(state, severityToReadiness(f.severity)), 'ready' as EnterpriseReadiness) : (dhcpScopeCount > 0 || rows.every((row) => !row.dhcpEnabled) ? 'ready' : 'review');
  const reservePolicyReadiness: EnterpriseReadiness = reservePolicyFindingCount > 0 ? findings.filter((f) => f.code.startsWith('RESERVE_')).reduce((state, f) => worse(state, severityToReadiness(f.severity)), 'ready' as EnterpriseReadiness) : (durablePoolCount > 0 ? 'ready' : 'review');
  const approvalReadiness: EnterpriseReadiness = staleAllocationCount > 0 ? 'blocked' : (durableAllocationCount === 0 || allocationApprovalCount === 0 ? 'review' : 'ready');

  notes.push('Phase 49 source-of-truth objects are now first-class: route domains, pools, allocations, DHCP scopes, reservations, brownfield imports, approvals, and ledger entries.');
  notes.push('Phase 50 dual-stack allocation uses durable pools when they exist; it does not fake IPv6 allocations from VLAN text alone.');
  notes.push('Phase 51 brownfield diff compares proposed/durable allocations against imported current-state networks.');
  notes.push('Phase 52 DHCP/reservation truth validates scopes, DNS evidence, gateway placement, duplicate reservations, and scope membership.');
  notes.push('Phase 53 approval ledger detects approved allocations that are stale against the current Engine 2 input hash.');
  notes.push('Phase 56 moves critical Engine 2 controls to write time: pool overlap, allocation overlap, reserve, brownfield, DHCP exclusion, reservation duplicate, and approval-hash enforcement.');

  return {
    sourceOfTruthReadiness,
    dualStackReadiness,
    vrfReadiness,
    brownfieldReadiness,
    dhcpReadiness,
    reservePolicyReadiness,
    approvalReadiness,
    ipv4ConfiguredSubnetCount,
    ipv6ConfiguredPrefixCount,
    ipv6ReviewFindingCount,
    vrfDomainCount: routeDomainCount || 1,
    dhcpScopeCount,
    reservationPolicyCount,
    brownfieldEvidenceState: durableBrownfieldNetworkCount > 0 ? 'configured' : 'import-required',
    durablePoolCount,
    durableAllocationCount,
    durableBrownfieldNetworkCount,
    allocationApprovalCount,
    allocationLedgerEntryCount,
    ipv6AllocationCount,
    vrfOverlapFindingCount,
    brownfieldConflictCount,
    dhcpFindingCount,
    reservePolicyFindingCount,
    staleAllocationCount,
    currentInputHash,
    allocationPlanRows,
    reviewFindings: findings,
    notes,
    reviewQueue,
  };
}

export function overallEnterpriseAllocatorReadiness(posture: EnterpriseAllocatorPosture): EnterpriseReadiness {
  return [
    posture.sourceOfTruthReadiness,
    posture.dualStackReadiness,
    posture.vrfReadiness,
    posture.brownfieldReadiness,
    posture.dhcpReadiness,
    posture.reservePolicyReadiness,
    posture.approvalReadiness,
  ].reduce((current, next) => worse(current, next), 'ready' as EnterpriseReadiness);
}
