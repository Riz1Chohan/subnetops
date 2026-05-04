import { parseCidr } from '../addressing/cidr.js';
import { parseIpv6Cidr } from '../addressing/ipv6.js';

export type IpamAddressFamilyInput = 'IPV4' | 'IPV6' | 'ipv4' | 'ipv6' | string | undefined | null;
export type BrownfieldConflictSeverity = 'info' | 'review' | 'blocked';

export type NumericIpRange = { start: bigint; end: bigint };

export type BrownfieldConflict = {
  code: string;
  severity: BrownfieldConflictSeverity;
  routeDomainKey: string;
  addressFamily: 'IPV4' | 'IPV6';
  importedCidr: string;
  proposedCidr?: string | null;
  existingObjectType: string;
  existingObjectId?: string | null;
  existingObjectLabel?: string | null;
  detail: string;
  recommendedAction: string;
};

export type BrownfieldConflictResolutionInput = {
  conflictKey: string;
  code: string;
  routeDomainKey?: string | null;
  addressFamily: 'IPV4' | 'IPV6';
  importedCidr: string;
  proposedCidr?: string | null;
  existingObjectType: string;
  existingObjectId?: string | null;
  decision: string;
  reviewerLabel?: string | null;
  reason?: string | null;
  designInputHash?: string | null;
  applySupersede?: boolean | null;
};

export type BrownfieldResolvedConflict = BrownfieldConflict & {
  conflictKey: string;
  resolutionStatus: 'open' | 'resolved';
  resolution?: Record<string, unknown> | null;
};

export type BrownfieldConflictReview = {
  conflicts: BrownfieldResolvedConflict[];
  summary: { blocked: number; review: number; info: number; total: number; resolved: number; unresolved: number };
};

export type BrownfieldConflictReviewInput = {
  brownfieldNetworks: Record<string, unknown>[];
  ipAllocations: Record<string, unknown>[];
  dhcpScopes: Record<string, unknown>[];
  ipPools: Record<string, unknown>[];
  planRows?: Record<string, unknown>[];
};

export function normalizeIpamFamily(value: IpamAddressFamilyInput): 'IPV4' | 'IPV6' {
  return String(value ?? 'IPV4').toUpperCase().includes('6') ? 'IPV6' : 'IPV4';
}

export function normalizeRouteDomainKey(value: unknown) {
  return String(value ?? 'default').trim() || 'default';
}

export function rowAddressFamily(network: Record<string, unknown>): 'IPV4' | 'IPV6' {
  const cidr = String(network.cidr ?? '').trim();
  if (network.addressFamily) return normalizeIpamFamily(network.addressFamily as IpamAddressFamilyInput);
  return cidr.includes(':') ? 'IPV6' : 'IPV4';
}

export function cidrToIpRange(cidr: string, family: IpamAddressFamilyInput): NumericIpRange {
  const expectedFamily = normalizeIpamFamily(family);
  if (expectedFamily === 'IPV4') {
    const parsed = parseCidr(cidr);
    return { start: BigInt(parsed.network), end: BigInt(parsed.broadcast) };
  }
  const parsed = parseIpv6Cidr(cidr);
  return { start: parsed.network, end: parsed.lastAddress };
}

export function ipRangesOverlap(a: NumericIpRange, b: NumericIpRange) {
  return a.start <= b.end && b.start <= a.end;
}

export function cidrsOverlap(aCidr: string, bCidr: string, family: IpamAddressFamilyInput) {
  return ipRangesOverlap(cidrToIpRange(aCidr, family), cidrToIpRange(bCidr, family));
}

export function tryCidrToRange(cidr: string, family: IpamAddressFamilyInput) {
  try {
    return { ok: true as const, range: cidrToIpRange(cidr, family) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Invalid CIDR.' };
  }
}

export function sameConflictDomain(importedDomain: string, candidateDomain?: string | null) {
  const normalizedCandidate = normalizeRouteDomainKey(candidateDomain);
  return importedDomain === normalizedCandidate || importedDomain === 'default' || normalizedCandidate === 'default';
}

export function conflictSeverityForOverlap(importedCidr: string, candidateCidr: string, objectType: string): BrownfieldConflictSeverity {
  if (importedCidr === candidateCidr) return 'blocked';
  if (objectType === 'durable allocation' || objectType === 'DHCP scope') return 'blocked';
  return 'review';
}

export function brownfieldConflictKey(conflict: Pick<BrownfieldConflict, 'code' | 'routeDomainKey' | 'addressFamily' | 'importedCidr' | 'proposedCidr' | 'existingObjectType' | 'existingObjectId'>) {
  return [
    conflict.code,
    normalizeRouteDomainKey(conflict.routeDomainKey),
    conflict.addressFamily,
    conflict.importedCidr,
    conflict.proposedCidr ?? '',
    conflict.existingObjectType,
    conflict.existingObjectId ?? '',
  ].join('|');
}

export function attachConflictKeys(conflicts: BrownfieldConflict[]): BrownfieldResolvedConflict[] {
  return conflicts.map((conflict) => ({
    ...conflict,
    conflictKey: brownfieldConflictKey(conflict),
    resolutionStatus: 'open',
    resolution: null,
  }));
}

export function applyBrownfieldConflictResolutions(conflicts: BrownfieldConflict[], resolutions: Record<string, unknown>[] = []): BrownfieldConflictReview {
  const latestByKey = new Map<string, Record<string, unknown>>();
  for (const resolution of resolutions) {
    const key = String(resolution.conflictKey ?? '');
    if (key) latestByKey.set(key, resolution);
  }

  const resolvedConflicts = attachConflictKeys(conflicts).map((conflict) => {
    const resolution = latestByKey.get(conflict.conflictKey) ?? null;
    return resolution ? { ...conflict, resolutionStatus: 'resolved' as const, resolution } : conflict;
  });

  const summaryBase = resolvedConflicts.reduce((acc, conflict) => {
    if (conflict.severity === 'blocked') acc.blocked += 1;
    if (conflict.severity === 'review') acc.review += 1;
    if (conflict.severity === 'info') acc.info += 1;
    acc.total += 1;
    if (conflict.resolutionStatus === 'resolved') acc.resolved += 1;
    return acc;
  }, { blocked: 0, review: 0, info: 0, total: 0, resolved: 0, unresolved: 0 });
  summaryBase.unresolved = summaryBase.total - summaryBase.resolved;
  return { conflicts: resolvedConflicts, summary: summaryBase };
}

export function buildBrownfieldConflictReviewFromData(input: BrownfieldConflictReviewInput): BrownfieldConflictReview {
  const conflicts: BrownfieldConflict[] = [];

  for (const imported of input.brownfieldNetworks) {
    const importedCidr = String(imported.cidr ?? '').trim();
    const family = rowAddressFamily(imported);
    const importedRange = tryCidrToRange(importedCidr, family);
    if (!importedRange.ok) continue;
    const importedDomain = normalizeRouteDomainKey(imported.routeDomainKey);

    for (const allocation of input.ipAllocations) {
      if (normalizeIpamFamily(allocation.addressFamily as IpamAddressFamilyInput) !== family) continue;
      const candidateCidr = String(allocation.cidr ?? '').trim();
      const routeDomainKey = normalizeRouteDomainKey((allocation.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? ((allocation.pool as Record<string, unknown> | undefined)?.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? allocation.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, candidateCidr, family)) continue;
      const severity = conflictSeverityForOverlap(importedCidr, candidateCidr, 'durable allocation');
      conflicts.push({
        code: importedCidr === candidateCidr ? 'BROWNFIELD_DUPLICATES_DURABLE_ALLOCATION' : 'BROWNFIELD_OVERLAPS_DURABLE_ALLOCATION',
        severity,
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr: candidateCidr,
        existingObjectType: 'durable allocation',
        existingObjectId: String(allocation.id ?? ''),
        existingObjectLabel: String(allocation.purpose ?? allocation.cidr ?? 'allocation'),
        detail: `Imported ${importedCidr} overlaps durable allocation ${candidateCidr}.`,
        recommendedAction: severity === 'blocked' ? 'Reconcile ownership before approving or implementing this allocation.' : 'Review whether the imported current-state block should supersede or constrain the proposed allocation.',
      });
    }

    for (const scope of input.dhcpScopes) {
      if (normalizeIpamFamily(scope.addressFamily as IpamAddressFamilyInput) !== family) continue;
      const scopeCidr = String(scope.scopeCidr ?? '').trim();
      const routeDomainKey = normalizeRouteDomainKey((scope.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? scope.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, scopeCidr, family)) continue;
      conflicts.push({
        code: importedCidr === scopeCidr ? 'BROWNFIELD_DUPLICATES_DHCP_SCOPE' : 'BROWNFIELD_OVERLAPS_DHCP_SCOPE',
        severity: 'blocked',
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr: scopeCidr,
        existingObjectType: 'DHCP scope',
        existingObjectId: String(scope.id ?? ''),
        existingObjectLabel: String(scope.serverLocation ?? scope.scopeCidr ?? 'DHCP scope'),
        detail: `Imported ${importedCidr} overlaps DHCP scope ${scopeCidr}.`,
        recommendedAction: 'Confirm whether this imported network is the authoritative scope or whether the proposed DHCP scope needs renumbering.',
      });
    }

    for (const pool of input.ipPools) {
      if (normalizeIpamFamily(pool.addressFamily as IpamAddressFamilyInput) !== family) continue;
      const poolCidr = String(pool.cidr ?? '').trim();
      const routeDomainKey = normalizeRouteDomainKey((pool.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? pool.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, poolCidr, family)) continue;
      conflicts.push({
        code: 'BROWNFIELD_INTERSECTS_POOL',
        severity: Boolean(pool.noAllocate) ? 'review' : 'info',
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr: poolCidr,
        existingObjectType: 'IP pool',
        existingObjectId: String(pool.id ?? ''),
        existingObjectLabel: String(pool.name ?? pool.cidr ?? 'pool'),
        detail: `Imported ${importedCidr} intersects planned pool ${poolCidr}.`,
        recommendedAction: 'Use this as context. Pools may intentionally contain current-state blocks, but allocations must still be reconciled.',
      });
    }

    for (const row of input.planRows ?? []) {
      const rowFamily = normalizeIpamFamily(row.family as IpamAddressFamilyInput);
      if (rowFamily !== family || !row.proposedCidr) continue;
      const proposedCidr = String(row.proposedCidr ?? '').trim();
      const routeDomainKey = normalizeRouteDomainKey(row.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, proposedCidr, family)) continue;
      conflicts.push({
        code: 'BROWNFIELD_OVERLAPS_ALLOCATOR_PLAN_ROW',
        severity: 'review',
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr,
        existingObjectType: 'allocator plan row',
        existingObjectId: String(row.poolId ?? ''),
        existingObjectLabel: String(row.target ?? 'allocator plan row'),
        detail: `Imported ${importedCidr} overlaps proposed allocator row ${proposedCidr}.`,
        recommendedAction: 'Do not materialize this plan row until the brownfield overlap is reviewed or imported ownership is confirmed.',
      });
    }
  }

  return applyBrownfieldConflictResolutions(conflicts);
}
