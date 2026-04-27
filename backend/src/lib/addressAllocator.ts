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
  recommendedPrefix?: number;
  capacityState: "unknown" | "fits" | "undersized";
  inSiteBlock: boolean | null;
  parsed?: ParsedCidr;
}

export interface UsedRange {
  start: number;
  end: number;
}

export function normalizeUsedRanges(ranges: UsedRange[]): UsedRange[] {
  const sorted = [...ranges].sort((left, right) => left.start - right.start);
  const merged: UsedRange[] = [];

  for (const current of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...current });
      continue;
    }

    if (current.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, current.end);
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}



export function clipUsedRangesToParent(parent: ParsedCidr, ranges: UsedRange[]): UsedRange[] {
  const clipped: UsedRange[] = [];

  for (const current of ranges) {
    const start = Math.max(current.start, parent.network);
    const end = Math.min(current.end, parent.broadcast);

    if (start > end) {
      continue;
    }

    clipped.push({ start, end });
  }

  return normalizeUsedRanges(clipped);
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
}

const ROLE_PRIORITY: Record<SegmentRole, number> = {
  WAN_TRANSIT: 1,
  MANAGEMENT: 2,
  SERVER: 3,
  VOICE: 4,
  CAMERA: 5,
  USER: 6,
  PRINTER: 7,
  IOT: 8,
  GUEST: 9,
  LOOPBACK: 10,
  OTHER: 11,
};

export function nextBlockSize(prefix: number): number {
  return 2 ** (32 - prefix);
}

export function chooseSiteGatewayPreference(inputs: GatewayPreferenceInput[]): Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable" {
  const counts = new Map<"first-usable" | "last-usable", number>();

  for (const input of inputs) {
    if (input.gatewayConvention !== "first-usable" && input.gatewayConvention !== "last-usable") {
      continue;
    }
    counts.set(input.gatewayConvention, (counts.get(input.gatewayConvention) ?? 0) + 1);
  }

  const firstUsableCount = counts.get("first-usable") ?? 0;
  const lastUsableCount = counts.get("last-usable") ?? 0;

  if (lastUsableCount > firstUsableCount) return "last-usable";
  return "first-usable";
}

export function chooseGatewayForSubnet(
  parsed: ParsedCidr,
  role: SegmentRole,
  preferredConvention: Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable",
): string | undefined {
  const detail = describeSubnet(parsed, role);

  if (role === "LOOPBACK") {
    return detail.firstUsableIp ?? undefined;
  }

  if (role === "WAN_TRANSIT") {
    return detail.firstUsableIp ?? undefined;
  }

  if (preferredConvention === "last-usable" && detail.lastUsableIp) {
    return detail.lastUsableIp;
  }

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

export function findNextAvailableNetworkDetailed(
  parent: ParsedCidr,
  prefix: number,
  usedRanges: UsedRange[],
): AllocationAttemptResult {
  if (prefix < parent.prefix) {
    return {
      status: "blocked",
      reason: "prefix-outside-parent",
      normalizedUsedRangeCount: 0,
    };
  }

  const parentBlockSize = nextBlockSize(parent.prefix);
  const requestedBlockSize = nextBlockSize(prefix);
  if (requestedBlockSize > parentBlockSize) {
    return {
      status: "blocked",
      reason: "prefix-outside-parent",
      normalizedUsedRangeCount: 0,
    };
  }

  const blockSize = requestedBlockSize;
  let candidateNetwork = parent.network;
  const normalizedRanges = clipUsedRangesToParent(parent, usedRanges);

  while (candidateNetwork + blockSize - 1 <= parent.broadcast) {
    const candidateStart = candidateNetwork;
    const candidateEnd = candidateNetwork + blockSize - 1;

    const overlappingRange = normalizedRanges.find((used) => candidateStart <= used.end && used.start <= candidateEnd);

    if (!overlappingRange) {
      return {
        status: "allocated",
        proposed: parseCidr(`${intToIpv4(candidateNetwork)}/${prefix}`),
        normalizedUsedRangeCount: normalizedRanges.length,
      };
    }

    const nextAlignedNetwork = Math.floor((overlappingRange.end + 1 + blockSize - 1) / blockSize) * blockSize;
    candidateNetwork = Math.max(candidateNetwork + blockSize, nextAlignedNetwork);
  }

  return {
    status: "blocked",
    reason: "parent-exhausted",
    normalizedUsedRangeCount: normalizedRanges.length,
  };
}

export function findNextAvailableNetwork(
  parent: ParsedCidr,
  prefix: number,
  usedRanges: UsedRange[],
): ParsedCidr | null {
  const result = findNextAvailableNetworkDetailed(parent, prefix, usedRanges);
  return result.proposed ?? null;
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
}

export interface BlockAllocationBatchResult {
  results: BlockAllocationResult[];
  finalUsedRanges: UsedRange[];
}

export interface BlockAllocationOptions {
  preferredGatewayConvention?: Exclude<GatewayConvention, "custom" | "not-applicable"> | "first-usable";
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
      });
      continue;
    }

    const proposedSubnetCidr = `${intToIpv4(attempt.proposed.network)}/${attempt.proposed.prefix}`;
    const proposedGatewayIp = request.role
      ? chooseGatewayForSubnet(
          attempt.proposed,
          request.role,
          options.preferredGatewayConvention ?? "first-usable",
        )
      : undefined;

    results.push({
      requestId: request.requestId,
      status: "allocated",
      proposedSubnetCidr,
      proposedGatewayIp,
      normalizedUsedRangeCount: attempt.normalizedUsedRangeCount,
    });

    workingRanges.push({ start: attempt.proposed.network, end: attempt.proposed.broadcast });
  }

  return {
    results,
    finalUsedRanges: normalizeUsedRanges(workingRanges),
  };
}
