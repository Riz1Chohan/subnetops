import { describeSubnet, intToIpv4, parseCidr, type ParsedCidr, type SegmentRole } from "./cidr.js";

export type GatewayConvention = "first-usable" | "last-usable" | "custom" | "not-applicable";

export interface GatewayPreferenceInput {
  gatewayConvention: GatewayConvention;
}

export interface AllocationCandidate {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  roleSource?: "explicit" | "inferred" | "unknown";
  roleConfidence?: "high" | "medium" | "low";
  roleEvidence?: string;
  recommendedPrefix?: number;
  requiredUsableHosts?: number;
  capacityState: "unknown" | "fits" | "undersized";
  inSiteBlock: boolean | null;
  parsed?: ParsedCidr;
}

export interface UsedRange {
  start: number;
  end: number;
}

export interface FreeRange {
  start: number;
  end: number;
  totalAddresses: number;
  rangeSummary: string;
}

export interface AllocationCapacitySummary {
  parentCidr: string;
  parentTotalAddresses: number;
  usedRangeCount: number;
  freeRangeCount: number;
  usedAddresses: number;
  freeAddresses: number;
  utilizationPercent: number;
  largestFreeRange?: FreeRange;
  requestedPrefix?: number;
  requestedBlockSize?: number;
  canFitRequestedPrefix?: boolean;
  normalizedUsedRanges: UsedRange[];
  freeRanges: FreeRange[];
}

export function normalizeUsedRanges(ranges: UsedRange[]): UsedRange[] {
  const sorted = ranges
    .filter((range) =>
      Number.isInteger(range.start) &&
      Number.isInteger(range.end) &&
      range.start >= 0 &&
      range.end <= 0xffffffff &&
      range.start <= range.end,
    )
    .map((range) => ({ start: range.start >>> 0, end: range.end >>> 0 }))
    .sort((left, right) => left.start - right.start);

  const merged: UsedRange[] = [];
  for (const current of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...current });
      continue;
    }

    if (current.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, current.end) >>> 0;
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

export function clipUsedRangesToParent(parent: ParsedCidr, ranges: UsedRange[]): UsedRange[] {
  const clipped: UsedRange[] = [];
  for (const current of ranges) {
    const start = Math.max(current.start, parent.network) >>> 0;
    const end = Math.min(current.end, parent.broadcast) >>> 0;
    if (start <= end) clipped.push({ start, end });
  }
  return normalizeUsedRanges(clipped);
}

export function summarizeContiguousRange(start: number, end: number): string {
  if (start === end) return `${intToIpv4(start)}/32`;
  return `${intToIpv4(start)} - ${intToIpv4(end)}`;
}

export function calculateFreeRanges(parent: ParsedCidr, ranges: UsedRange[]): FreeRange[] {
  const normalized = clipUsedRangesToParent(parent, ranges);
  const freeRanges: FreeRange[] = [];
  let cursor = parent.network;

  for (const used of normalized) {
    if (cursor < used.start) {
      const start = cursor >>> 0;
      const end = (used.start - 1) >>> 0;
      freeRanges.push({ start, end, totalAddresses: end - start + 1, rangeSummary: summarizeContiguousRange(start, end) });
    }
    cursor = Math.max(cursor, used.end + 1);
  }

  if (cursor <= parent.broadcast) {
    const start = cursor >>> 0;
    const end = parent.broadcast >>> 0;
    freeRanges.push({ start, end, totalAddresses: end - start + 1, rangeSummary: summarizeContiguousRange(start, end) });
  }

  return freeRanges;
}

export interface SiteAllocationCandidate {
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  requiredAddresses: number;
  recommendedPrefix: number;
}

export function sortSiteAllocationCandidates(candidates: SiteAllocationCandidate[]): SiteAllocationCandidate[] {
  return [...candidates].sort((left, right) => {
    if (left.recommendedPrefix !== right.recommendedPrefix) return left.recommendedPrefix - right.recommendedPrefix;
    if (left.requiredAddresses !== right.requiredAddresses) return right.requiredAddresses - left.requiredAddresses;
    const leftSite = `${left.siteCode ?? ""}|${left.siteName}`.toLowerCase();
    const rightSite = `${right.siteCode ?? ""}|${right.siteName}`.toLowerCase();
    if (leftSite !== rightSite) return leftSite.localeCompare(rightSite);
    return left.siteId.localeCompare(right.siteId);
  });
}

export interface AllocatorProposal {
  rowId: string;
  siteId: string;
  vlanId: number;
  proposedSubnetCidr: string;
  proposedGatewayIp?: string;
  preferredGatewayConvention: Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable";
}

export type AllocationFailureReason = "prefix-outside-parent" | "parent-exhausted";

export interface AllocationAttemptResult {
  status: "allocated" | "blocked";
  reason?: AllocationFailureReason;
  proposed?: ParsedCidr;
  normalizedUsedRangeCount: number;
  allocatorExplanation: string;
  capacitySummary: AllocationCapacitySummary;
}

const ROLE_PRIORITY: Record<SegmentRole, number> = {
  WAN_TRANSIT: 1,
  MANAGEMENT: 2,
  SERVER: 3,
  VOICE: 4,
  CAMERA: 5,
  DMZ: 6,
  USER: 7,
  PRINTER: 8,
  IOT: 9,
  GUEST: 10,
  LOOPBACK: 11,
  OTHER: 12,
};

export function nextBlockSize(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error(`Invalid prefix: ${prefix}`);
  return 2 ** (32 - prefix);
}

export function summarizeAllocationCapacity(parent: ParsedCidr, ranges: UsedRange[], requestedPrefix?: number): AllocationCapacitySummary {
  const normalizedUsedRanges = clipUsedRangesToParent(parent, ranges);
  const freeRanges = calculateFreeRanges(parent, normalizedUsedRanges);
  const parentTotalAddresses = parent.broadcast - parent.network + 1;
  const usedAddresses = normalizedUsedRanges.reduce((total, range) => total + (range.end - range.start + 1), 0);
  const freeAddresses = Math.max(0, parentTotalAddresses - usedAddresses);
  const largestFreeRange = [...freeRanges].sort((left, right) => right.totalAddresses - left.totalAddresses)[0];
  const requestedBlockSize = typeof requestedPrefix === "number" && Number.isInteger(requestedPrefix) && requestedPrefix >= 0 && requestedPrefix <= 32
    ? nextBlockSize(requestedPrefix)
    : undefined;

  return {
    parentCidr: `${intToIpv4(parent.network)}/${parent.prefix}`,
    parentTotalAddresses,
    usedRangeCount: normalizedUsedRanges.length,
    freeRangeCount: freeRanges.length,
    usedAddresses,
    freeAddresses,
    utilizationPercent: parentTotalAddresses > 0 ? Math.round((usedAddresses / parentTotalAddresses) * 10000) / 100 : 0,
    largestFreeRange,
    requestedPrefix,
    requestedBlockSize,
    canFitRequestedPrefix: requestedBlockSize ? freeRanges.some((range) => range.totalAddresses >= requestedBlockSize) : undefined,
    normalizedUsedRanges,
    freeRanges,
  };
}

export function chooseSiteGatewayPreference(inputs: GatewayPreferenceInput[]): Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable" {
  const counts = new Map<"first-usable" | "last-usable", number>();
  for (const input of inputs) {
    if (input.gatewayConvention !== "first-usable" && input.gatewayConvention !== "last-usable") continue;
    counts.set(input.gatewayConvention, (counts.get(input.gatewayConvention) ?? 0) + 1);
  }
  return (counts.get("last-usable") ?? 0) > (counts.get("first-usable") ?? 0) ? "last-usable" : "first-usable";
}

export function chooseGatewayForSubnet(
  parsed: ParsedCidr,
  role: SegmentRole,
  preferredConvention: Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable",
): string | undefined {
  const detail = describeSubnet(parsed, role);
  if (role === "LOOPBACK" || role === "WAN_TRANSIT") return detail.firstUsableIp ?? undefined;
  if (preferredConvention === "last-usable" && detail.lastUsableIp) return detail.lastUsableIp;
  return detail.firstUsableIp ?? undefined;
}

export function sortAllocationCandidates(candidates: AllocationCandidate[]): AllocationCandidate[] {
  return [...candidates].sort((left, right) => {
    const leftPrefix = left.recommendedPrefix ?? 32;
    const rightPrefix = right.recommendedPrefix ?? 32;
    if (leftPrefix !== rightPrefix) return leftPrefix - rightPrefix;
    const leftRole = ROLE_PRIORITY[left.role] ?? 999;
    const rightRole = ROLE_PRIORITY[right.role] ?? 999;
    if (leftRole !== rightRole) return leftRole - rightRole;
    const leftSite = `${left.siteCode ?? ""}|${left.siteName}`.toLowerCase();
    const rightSite = `${right.siteCode ?? ""}|${right.siteName}`.toLowerCase();
    if (leftSite !== rightSite) return leftSite.localeCompare(rightSite);
    if (left.vlanId !== right.vlanId) return left.vlanId - right.vlanId;
    return left.id.localeCompare(right.id);
  });
}

export function findNextAvailableNetworkDetailed(parent: ParsedCidr, prefix: number, usedRanges: UsedRange[]): AllocationAttemptResult {
  const capacitySummary = summarizeAllocationCapacity(parent, usedRanges, prefix);

  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32 || prefix < parent.prefix) {
    return {
      status: "blocked",
      reason: "prefix-outside-parent",
      normalizedUsedRangeCount: capacitySummary.usedRangeCount,
      allocatorExplanation: `Requested /${prefix} cannot fit inside parent ${capacitySummary.parentCidr}. Parent utilization is ${capacitySummary.utilizationPercent}%.`,
      capacitySummary,
    };
  }

  const requestedBlockSize = nextBlockSize(prefix);
  if (requestedBlockSize > nextBlockSize(parent.prefix)) {
    return {
      status: "blocked",
      reason: "prefix-outside-parent",
      normalizedUsedRangeCount: capacitySummary.usedRangeCount,
      allocatorExplanation: `Requested /${prefix} is larger than parent block ${capacitySummary.parentCidr}.`,
      capacitySummary,
    };
  }

  let candidateNetwork = parent.network;
  const normalizedRanges = capacitySummary.normalizedUsedRanges;

  while (candidateNetwork + requestedBlockSize - 1 <= parent.broadcast) {
    const candidateStart = candidateNetwork;
    const candidateEnd = candidateNetwork + requestedBlockSize - 1;
    const overlappingRange = normalizedRanges.find((used) => candidateStart <= used.end && used.start <= candidateEnd);

    if (!overlappingRange) {
      return {
        status: "allocated",
        proposed: parseCidr(`${intToIpv4(candidateNetwork)}/${prefix}`),
        normalizedUsedRangeCount: normalizedRanges.length,
        allocatorExplanation: `Selected first available /${prefix} inside ${capacitySummary.parentCidr} after checking ${normalizedRanges.length} normalized used range(s). Parent utilization before placement: ${capacitySummary.utilizationPercent}%. Largest free range before placement: ${capacitySummary.largestFreeRange?.rangeSummary ?? "none"}.`,
        capacitySummary,
      };
    }

    const nextAlignedNetwork = Math.floor((overlappingRange.end + 1 + requestedBlockSize - 1) / requestedBlockSize) * requestedBlockSize;
    candidateNetwork = Math.max(candidateNetwork + requestedBlockSize, nextAlignedNetwork);
  }

  return {
    status: "blocked",
    reason: "parent-exhausted",
    normalizedUsedRangeCount: normalizedRanges.length,
    allocatorExplanation: `No aligned /${prefix} block remains inside ${capacitySummary.parentCidr} after checking ${normalizedRanges.length} normalized used range(s). Parent utilization is ${capacitySummary.utilizationPercent}%. Largest free range: ${capacitySummary.largestFreeRange?.rangeSummary ?? "none"}.`,
    capacitySummary,
  };
}

export function findNextAvailableNetwork(parent: ParsedCidr, prefix: number, usedRanges: UsedRange[]): ParsedCidr | null {
  return findNextAvailableNetworkDetailed(parent, prefix, usedRanges).proposed ?? null;
}

export function canChildFitInsideParent(parent: ParsedCidr, childPrefix: number): boolean {
  return childPrefix >= parent.prefix && nextBlockSize(childPrefix) <= nextBlockSize(parent.prefix);
}

export interface BlockAllocationRequest {
  requestId: string;
  prefix: number;
  role?: SegmentRole;
}

export interface BlockAllocationResult {
  requestId: string;
  status: "allocated" | "blocked";
  reason?: AllocationFailureReason;
  proposedSubnetCidr?: string;
  proposedGatewayIp?: string;
  normalizedUsedRangeCount: number;
  allocatorExplanation?: string;
  allocatorParentCidr?: string;
  allocatorUsedRangeCount?: number;
  allocatorFreeRangeCount?: number;
  allocatorLargestFreeRange?: string;
  allocatorUtilizationPercent?: number;
  allocatorCanFitRequestedPrefix?: boolean;
}

export interface BlockAllocationBatchResult {
  results: BlockAllocationResult[];
  finalUsedRanges: UsedRange[];
}

export interface BlockAllocationOptions {
  preferredGatewayConvention?: Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable";
}

function allocationResultTelemetry(attempt: AllocationAttemptResult) {
  return {
    allocatorParentCidr: attempt.capacitySummary.parentCidr,
    allocatorUsedRangeCount: attempt.capacitySummary.usedRangeCount,
    allocatorFreeRangeCount: attempt.capacitySummary.freeRangeCount,
    allocatorLargestFreeRange: attempt.capacitySummary.largestFreeRange?.rangeSummary,
    allocatorUtilizationPercent: attempt.capacitySummary.utilizationPercent,
    allocatorCanFitRequestedPrefix: attempt.capacitySummary.canFitRequestedPrefix,
  };
}

export function allocateRequestedBlocks(
  parent: ParsedCidr,
  usedRanges: UsedRange[],
  requests: BlockAllocationRequest[],
  options: BlockAllocationOptions = {},
): BlockAllocationBatchResult {
  const workingRanges = normalizeUsedRanges([...usedRanges]);
  const results: BlockAllocationResult[] = [];

  for (const request of requests) {
    const attempt = findNextAvailableNetworkDetailed(parent, request.prefix, workingRanges);
    if (attempt.status !== "allocated" || !attempt.proposed) {
      results.push({
        requestId: request.requestId,
        status: "blocked",
        reason: attempt.reason,
        normalizedUsedRangeCount: attempt.normalizedUsedRangeCount,
        allocatorExplanation: attempt.allocatorExplanation,
        ...allocationResultTelemetry(attempt),
      });
      continue;
    }

    const proposedSubnetCidr = `${intToIpv4(attempt.proposed.network)}/${attempt.proposed.prefix}`;
    const proposedGatewayIp = request.role
      ? chooseGatewayForSubnet(attempt.proposed, request.role, options.preferredGatewayConvention ?? "first-usable")
      : undefined;

    results.push({
      requestId: request.requestId,
      status: "allocated",
      proposedSubnetCidr,
      proposedGatewayIp,
      normalizedUsedRangeCount: attempt.normalizedUsedRangeCount,
      allocatorExplanation: attempt.allocatorExplanation,
      ...allocationResultTelemetry(attempt),
    });

    workingRanges.push({ start: attempt.proposed.network, end: attempt.proposed.broadcast });
  }

  return { results, finalUsedRanges: normalizeUsedRanges(workingRanges) };
}
