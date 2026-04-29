import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { containsIp, isValidIpv4, parseCidr } from "../lib/cidr.js";
import { ipv6Contains, parseIpv6Cidr } from "../lib/ipv6Cidr.js";
import { ensureCanEditProject, ensureCanViewProject } from "./access.service.js";
import { addChangeLog } from "./changeLog.service.js";
import { buildDesignCoreSnapshot } from "./designCore.service.js";
import { getProjectDesignData } from "./designCore/designCore.repository.js";

const ALLOCATION_REVIEW_STATUSES = new Set(["PROPOSED", "REVIEW_REQUIRED", "APPROVED", "REJECTED", "SUPERSEDED", "IMPLEMENTED"]);

type AddressFamilyInput = "IPV4" | "IPV6" | string | undefined | null;

type PlanMaterializationInput = {
  poolId: string;
  family: "ipv4" | "ipv6" | "IPV4" | "IPV6";
  proposedCidr: string;
  siteId?: string | null;
  vlanNumber?: number | null;
  routeDomainKey?: string | null;
  purpose?: string | null;
  notes?: string | null;
};

type BrownfieldDryRunInput = {
  sourceType?: string | null;
  sourceName?: string | null;
  notes?: string | null;
  networks: Record<string, unknown>[];
};

function asConflictReviewRows(rows: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => (row && typeof row === "object" ? row as Record<string, unknown> : {}));
}

type BrownfieldConflictSeverity = "info" | "review" | "blocked";

type BrownfieldConflict = {
  code: string;
  severity: BrownfieldConflictSeverity;
  routeDomainKey: string;
  addressFamily: "IPV4" | "IPV6";
  importedCidr: string;
  proposedCidr?: string | null;
  existingObjectType: string;
  existingObjectId?: string | null;
  existingObjectLabel?: string | null;
  detail: string;
  recommendedAction: string;
};

type BrownfieldConflictResolutionInput = {
  conflictKey: string;
  code: string;
  routeDomainKey?: string | null;
  addressFamily: "IPV4" | "IPV6";
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

type BrownfieldResolvedConflict = BrownfieldConflict & {
  conflictKey: string;
  resolutionStatus: "open" | "resolved";
  resolution?: Record<string, unknown> | null;
};

type BrownfieldConflictReview = {
  conflicts: BrownfieldResolvedConflict[];
  summary: { blocked: number; review: number; info: number; total: number; resolved: number; unresolved: number };
};

type BrownfieldDryRunRow = {
  rowNumber: number;
  routeDomainKey: string;
  addressFamily: "IPV4" | "IPV6";
  cidr: string;
  siteName?: string | null;
  vlanNumber?: number | null;
  ownerLabel?: string | null;
  status: "valid" | "invalid" | "duplicate" | "conflict";
  findings: string[];
};

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function normalize<T extends Record<string, unknown>>(value: T): T {
  const normalized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    normalized[key] = item === "" ? null : item;
  }
  return compact(normalized as T);
}

function toFamily(value: AddressFamilyInput): "IPV4" | "IPV6" {
  return String(value ?? "IPV4").toUpperCase().includes("6") ? "IPV6" : "IPV4";
}

function cidrFamily(cidr: string): "IPV4" | "IPV6" {
  return cidr.includes(":") ? "IPV6" : "IPV4";
}

function validateCidr(fieldName: string, cidr: unknown, family: AddressFamilyInput) {
  const cidrText = String(cidr ?? "").trim();
  if (!cidrText) throw new ApiError(400, `${fieldName} is required.`);

  const expectedFamily = toFamily(family);
  if (cidrFamily(cidrText) !== expectedFamily) {
    throw new ApiError(400, `${fieldName} address family mismatch. ${cidrText} is not ${expectedFamily}.`);
  }

  try {
    if (expectedFamily === "IPV4") return parseCidr(cidrText);
    return parseIpv6Cidr(cidrText);
  } catch {
    throw new ApiError(400, `${fieldName} must be a valid ${expectedFamily} CIDR.`);
  }
}

function validateIpAddress(fieldName: string, value: unknown, family: AddressFamilyInput) {
  const ip = String(value ?? "").trim();
  if (!ip) return;
  const expectedFamily = toFamily(family);

  if (expectedFamily === "IPV4") {
    if (!isValidIpv4(ip)) throw new ApiError(400, `${fieldName} must be a valid IPv4 address.`);
    return;
  }

  if (ip.includes("/")) throw new ApiError(400, `${fieldName} must be an IPv6 address, not a prefix.`);
  try {
    parseIpv6Cidr(`${ip}/128`);
  } catch {
    throw new ApiError(400, `${fieldName} must be a valid IPv6 address.`);
  }
}

function ensureIpInsideCidr(fieldName: string, ip: unknown, cidr: string, family: AddressFamilyInput) {
  const ipText = String(ip ?? "").trim();
  if (!ipText) return;
  const expectedFamily = toFamily(family);
  validateIpAddress(fieldName, ipText, expectedFamily);

  if (expectedFamily === "IPV4") {
    const parsed = parseCidr(cidr);
    if (!containsIp(parsed, ipText)) {
      throw new ApiError(400, `${fieldName} ${ipText} must be inside ${cidr}.`);
    }
    return;
  }

  const parsed = parseIpv6Cidr(cidr);
  if (!ipv6Contains(parsed, parseIpv6Cidr(`${ipText}/128`))) {
    throw new ApiError(400, `${fieldName} ${ipText} must be inside ${cidr}.`);
  }
}

function ensureCidrInsideParent(childCidr: string, parentCidr: string, family: AddressFamilyInput, childLabel: string, parentLabel: string) {
  const expectedFamily = toFamily(family);
  if (expectedFamily === "IPV4") {
    const child = parseCidr(childCidr);
    const parent = parseCidr(parentCidr);
    if (child.network < parent.network || child.broadcast > parent.broadcast) {
      throw new ApiError(400, `${childLabel} ${childCidr} must fit inside ${parentLabel} ${parentCidr}.`);
    }
    return;
  }

  const child = parseIpv6Cidr(childCidr);
  const parent = parseIpv6Cidr(parentCidr);
  if (!ipv6Contains(parent, child)) {
    throw new ApiError(400, `${childLabel} ${childCidr} must fit inside ${parentLabel} ${parentCidr}.`);
  }
}

type NumericRange = { start: bigint; end: bigint };

function cidrToRange(cidr: string, family: AddressFamilyInput): NumericRange {
  const expectedFamily = toFamily(family);
  if (expectedFamily === "IPV4") {
    const parsed = parseCidr(cidr);
    return { start: BigInt(parsed.network), end: BigInt(parsed.broadcast) };
  }
  const parsed = parseIpv6Cidr(cidr);
  return { start: parsed.network, end: parsed.lastAddress };
}

function rangesOverlap(a: NumericRange, b: NumericRange) {
  return a.start <= b.end && b.start <= a.end;
}

function cidrsOverlap(aCidr: string, bCidr: string, family: AddressFamilyInput) {
  return rangesOverlap(cidrToRange(aCidr, family), cidrToRange(bCidr, family));
}

function normalizeRelationId(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function sameRelationId(a: unknown, b: unknown) {
  return normalizeRelationId(a) === normalizeRelationId(b);
}

function activeAllocationStatus(status: unknown) {
  const normalized = String(status ?? "PROPOSED").toUpperCase();
  return normalized !== "REJECTED" && normalized !== "SUPERSEDED";
}

function requiresExplicitOverride(data: Record<string, unknown>, token: string) {
  const status = String(data.status ?? "").toUpperCase();
  const notes = String(data.notes ?? "");
  return status === "REVIEW_REQUIRED" && notes.includes(token);
}

function poolCanReceiveNewAllocations(pool: Record<string, unknown>, data: Record<string, unknown>) {
  const status = String(pool.status ?? "ACTIVE").toUpperCase();
  if (pool.noAllocate) {
    throw new ApiError(409, `Pool ${pool.name ?? pool.cidr} is marked noAllocate and cannot receive new allocations.`);
  }
  if (status === "DEPRECATED") {
    throw new ApiError(409, `Pool ${pool.name ?? pool.cidr} is DEPRECATED and cannot receive new allocations.`);
  }
  if (status === "RESERVED" && !requiresExplicitOverride(data, "RESERVED_POOL_OVERRIDE")) {
    throw new ApiError(409, `Pool ${pool.name ?? pool.cidr} is RESERVED. Save the allocation as REVIEW_REQUIRED with notes containing RESERVED_POOL_OVERRIDE only after documented review.`);
  }
}

function parsedJsonArray(fieldName: string, value?: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("not array");
    return parsed;
  } catch {
    throw new ApiError(400, `${fieldName} must be valid JSON array text.`);
  }
}

function addressRangeToCidrRange(fieldName: string, value: unknown, family: AddressFamilyInput): NumericRange {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) throw new ApiError(400, `${fieldName} cannot contain an empty range.`);
    if (trimmed.includes("-")) {
      const [start, end] = trimmed.split("-").map((part) => part.trim());
      validateIpAddress(`${fieldName} start`, start, family);
      validateIpAddress(`${fieldName} end`, end, family);
      return {
        start: cidrToRange(`${start}/${toFamily(family) === "IPV4" ? "32" : "128"}`, family).start,
        end: cidrToRange(`${end}/${toFamily(family) === "IPV4" ? "32" : "128"}`, family).end,
      };
    }
    if (trimmed.includes("/")) return cidrToRange(trimmed, family);
    validateIpAddress(fieldName, trimmed, family);
    return cidrToRange(`${trimmed}/${toFamily(family) === "IPV4" ? "32" : "128"}`, family);
  }

  const record = value as Record<string, unknown>;
  if (record && typeof record === "object") {
    if (record.cidr) return cidrToRange(String(record.cidr), family);
    if (record.start && record.end) {
      validateIpAddress(`${fieldName} start`, record.start, family);
      validateIpAddress(`${fieldName} end`, record.end, family);
      return {
        start: cidrToRange(`${record.start}/${toFamily(family) === "IPV4" ? "32" : "128"}`, family).start,
        end: cidrToRange(`${record.end}/${toFamily(family) === "IPV4" ? "32" : "128"}`, family).end,
      };
    }
  }

  throw new ApiError(400, `${fieldName} must be an IP, CIDR, start-end string, or { start, end } object.`);
}

function ensureRangeInsideCidr(fieldName: string, range: NumericRange, cidr: string, family: AddressFamilyInput) {
  const parent = cidrToRange(cidr, family);
  if (range.start > range.end) throw new ApiError(400, `${fieldName} start address must be before end address.`);
  if (range.start < parent.start || range.end > parent.end) {
    throw new ApiError(400, `${fieldName} must stay inside ${cidr}.`);
  }
}

function parseDhcpExcludedRanges(fieldName: string, value: string | null | undefined, scopeCidr: string, family: AddressFamilyInput): NumericRange[] {
  const ranges = parsedJsonArray(fieldName, value);
  return ranges.map((range, index) => {
    const parsed = addressRangeToCidrRange(`${fieldName}[${index}]`, range, family);
    ensureRangeInsideCidr(`${fieldName}[${index}]`, parsed, scopeCidr, family);
    return parsed;
  });
}

function ensureReservationNotInExcludedRanges(ipAddress: unknown, excludedRanges: NumericRange[], family: AddressFamilyInput) {
  const ip = String(ipAddress ?? "").trim();
  if (!ip) return;
  const ipRange = cidrToRange(`${ip}/${toFamily(family) === "IPV4" ? "32" : "128"}`, family);
  for (const range of excludedRanges) {
    if (rangesOverlap(ipRange, range)) {
      throw new ApiError(409, `Reservation IP ${ip} falls inside a DHCP exclusion range.`);
    }
  }
}

async function routeDomainKeyForWrite(routeDomainId: string | null | undefined, projectId: string, tx: any = prisma) {
  if (!routeDomainId) return "default";
  const routeDomain = await tx.designRouteDomain.findFirst({ where: { id: routeDomainId, projectId } });
  if (!routeDomain) throw new ApiError(400, "Route domain does not belong to this project.");
  return String(routeDomain.routeDomainKey ?? "default");
}

async function ensurePoolWriteIntegrity(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  const cidr = String(data.cidr ?? "").trim();
  const routeDomainId = normalizeRelationId(data.routeDomainId);
  const status = String(data.status ?? "ACTIVE").toUpperCase();

  const peers = await tx.designIpPool.findMany({
    where: { projectId, addressFamily: family },
  });

  for (const peer of peers) {
    if (excludeId && peer.id === excludeId) continue;
    if (!sameRelationId(peer.routeDomainId, routeDomainId)) continue;
    if (String(peer.status ?? "ACTIVE").toUpperCase() === "DEPRECATED") continue;

    if (peer.cidr === cidr) {
      throw new ApiError(409, `Pool ${cidr} already exists in this route domain.`);
    }

    if (cidrsOverlap(cidr, peer.cidr, family)) {
      const peerStatus = String(peer.status ?? "ACTIVE").toUpperCase();
      const peerNoAllocate = Boolean(peer.noAllocate);
      const newNoAllocate = Boolean(data.noAllocate);
      const newScope = String(data.scope ?? "SITE").toUpperCase();
      const peerScope = String(peer.scope ?? "SITE").toUpperCase();
      const hierarchyReview =
        status === "RESERVED" ||
        peerStatus === "RESERVED" ||
        newNoAllocate ||
        peerNoAllocate ||
        newScope === "ORGANIZATION" ||
        peerScope === "ORGANIZATION";

      if (!hierarchyReview) {
        throw new ApiError(409, `Pool ${cidr} overlaps active pool ${peer.cidr} in the same route domain. Create an explicit RESERVED/noAllocate hierarchy or split the pools first.`);
      }
    }
  }
}

async function ensureAllocationWriteIntegrity(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  const cidr = String(data.cidr ?? "").trim();
  const pool = await requireModelInProject("designIpPool", data.poolId as string | undefined, projectId, "IP pool", tx) as Record<string, unknown> | null;
  const effectiveRouteDomainId = normalizeRelationId(data.routeDomainId) ?? normalizeRelationId(pool?.routeDomainId);

  if (pool) {
    poolCanReceiveNewAllocations(pool, data);
    if (normalizeRelationId(data.routeDomainId) && normalizeRelationId(pool.routeDomainId) && !sameRelationId(data.routeDomainId, pool.routeDomainId)) {
      throw new ApiError(400, "Allocation route domain must match its selected pool route domain.");
    }
  }

  const peers = await tx.designIpAllocation.findMany({
    where: { projectId, addressFamily: family },
    include: { pool: true },
  });

  for (const peer of peers) {
    if (excludeId && peer.id === excludeId) continue;
    if (!activeAllocationStatus(peer.status)) continue;
    const peerRouteDomainId = normalizeRelationId(peer.routeDomainId) ?? normalizeRelationId(peer.pool?.routeDomainId);
    if (!sameRelationId(peerRouteDomainId, effectiveRouteDomainId)) continue;

    if (peer.cidr === cidr) {
      throw new ApiError(409, `Allocation ${cidr} already exists in this route domain.`);
    }
    if (cidrsOverlap(cidr, peer.cidr, family)) {
      throw new ApiError(409, `Allocation ${cidr} overlaps active allocation ${peer.cidr} in the same route domain.`);
    }
  }

  const routeDomainKey = await routeDomainKeyForWrite(effectiveRouteDomainId, projectId, tx);
  const brownfieldNetworks = await tx.designBrownfieldNetwork.findMany({ where: { projectId, addressFamily: family } });
  for (const network of brownfieldNetworks) {
    const importedDomain = String(network.routeDomainKey ?? "default");
    if (importedDomain !== "default" && importedDomain !== routeDomainKey) continue;
    if (cidrsOverlap(cidr, network.cidr, family) && !requiresExplicitOverride(data, "BROWNFIELD_REVIEWED")) {
      throw new ApiError(409, `Allocation ${cidr} overlaps imported brownfield network ${network.cidr}. Save as REVIEW_REQUIRED with notes containing BROWNFIELD_REVIEWED after reconciliation.`);
    }
  }

  if (pool && Number(pool.reservePercent ?? 0) > 0 && !requiresExplicitOverride(data, "RESERVE_OVERRIDE")) {
    const parent = cidrToRange(String(pool.cidr), family);
    const total = parent.end - parent.start + 1n;
    const existingUsed = (peers as Array<Record<string, any>>)
      .filter((peer: Record<string, any>) => peer.poolId === pool.id && (!excludeId || peer.id !== excludeId) && activeAllocationStatus(peer.status))
      .map((peer: Record<string, any>) => cidrToRange(String(peer.cidr), family))
      .reduce((sum: bigint, range: NumericRange) => sum + (range.end - range.start + 1n), 0n);
    const newUsed = existingUsed + (cidrToRange(cidr, family).end - cidrToRange(cidr, family).start + 1n);
    const remainingScaled = total > 0n ? Number(((total - newUsed) * 10000n) / total) / 100 : 0;
    if (remainingScaled < Number(pool.reservePercent)) {
      throw new ApiError(409, `Allocation ${cidr} would breach pool reserve policy for ${pool.name ?? pool.cidr}. Save as REVIEW_REQUIRED with notes containing RESERVE_OVERRIDE only after capacity review.`);
    }
  }
}

async function ensureDhcpScopeWriteIntegrity(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  const scopeCidr = String(data.scopeCidr ?? "").trim();
  const routeDomainId = normalizeRelationId(data.routeDomainId);
  const excludedRanges = parseDhcpExcludedRanges("excludedRangesJson", data.excludedRangesJson as string | undefined | null, scopeCidr, family);

  const scopes = await tx.designDhcpScope.findMany({ where: { projectId, addressFamily: family } });
  for (const scope of scopes) {
    if (excludeId && scope.id === excludeId) continue;
    if (!sameRelationId(scope.routeDomainId, routeDomainId)) continue;
    if (scope.scopeCidr === scopeCidr) {
      throw new ApiError(409, `DHCP scope ${scopeCidr} already exists in this route domain.`);
    }
    if (cidrsOverlap(scopeCidr, scope.scopeCidr, family)) {
      throw new ApiError(409, `DHCP scope ${scopeCidr} overlaps existing DHCP scope ${scope.scopeCidr} in this route domain.`);
    }
  }

  const defaultGateway = String(data.defaultGateway ?? "").trim();
  if (defaultGateway) {
    ensureReservationNotInExcludedRanges(defaultGateway, excludedRanges, family);
  }
}

async function ensureReservationWriteIntegrity(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  const ipAddress = String(data.ipAddress ?? "").trim();
  const peers = await tx.designIpReservation.findMany({ where: { projectId, addressFamily: family } });
  for (const peer of peers) {
    if (excludeId && peer.id === excludeId) continue;
    const sameScope = data.dhcpScopeId && peer.dhcpScopeId === data.dhcpScopeId;
    const sameAllocation = data.allocationId && peer.allocationId === data.allocationId;
    const sameVlanWithoutScope = !data.dhcpScopeId && !data.allocationId && data.vlanId && peer.vlanId === data.vlanId;
    if (peer.ipAddress === ipAddress && (sameScope || sameAllocation || sameVlanWithoutScope)) {
      throw new ApiError(409, `Reservation IP ${ipAddress} already exists in this DHCP/allocation context.`);
    }
  }

  const scope = await requireModelInProject("designDhcpScope", data.dhcpScopeId as string | undefined, projectId, "DHCP scope", tx) as Record<string, unknown> | null;
  if (scope) {
    const excludedRanges = parseDhcpExcludedRanges("excludedRangesJson", scope.excludedRangesJson as string | undefined | null, String(scope.scopeCidr), scope.addressFamily as AddressFamilyInput);
    ensureReservationNotInExcludedRanges(ipAddress, excludedRanges, family);
  }
}

function parseJsonArrayText(fieldName: string, value?: string | null) {
  parsedJsonArray(fieldName, value);
}

async function requireRecord(modelName: string, id: string, userId: string) {
  const model = (prisma as any)[modelName];
  const record = await model.findUnique({ where: { id } });
  if (!record) throw new ApiError(404, "Engine 2 IPAM record not found.");
  await ensureCanEditProject(userId, record.projectId);
  return record;
}

async function requireModelInProject(modelName: string, id: string | null | undefined, projectId: string, label: string, tx: any = prisma) {
  if (!id) return null;
  const model = tx[modelName];
  const record = await model.findFirst({ where: { id, projectId } });
  if (!record) throw new ApiError(400, `${label} does not belong to this project.`);
  return record;
}

async function requireSiteInProject(siteId: string | null | undefined, projectId: string, tx: any = prisma) {
  if (!siteId) return null;
  const site = await tx.site.findFirst({ where: { id: siteId, projectId } });
  if (!site) throw new ApiError(400, "Site does not belong to this project.");
  return site;
}

async function requireVlanInProject(vlanId: string | null | undefined, projectId: string, tx: any = prisma) {
  if (!vlanId) return null;
  const vlan = await tx.vlan.findFirst({ where: { id: vlanId, site: { projectId } } });
  if (!vlan) throw new ApiError(400, "VLAN does not belong to this project.");
  return vlan;
}

async function writeLedger(projectId: string, allocationId: string | null, action: string, summary: string, actorLabel?: string | null, designInputHash?: string | null, tx: any = prisma) {
  return tx.designAllocationLedgerEntry.create({
    data: {
      projectId,
      allocationId: allocationId || undefined,
      action,
      actorLabel: actorLabel || undefined,
      summary,
      designInputHash: designInputHash || undefined,
    },
  });
}

async function validateIpPoolInput(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  validateCidr("Pool CIDR", data.cidr, family);
  await requireModelInProject("designRouteDomain", data.routeDomainId as string | undefined, projectId, "Route domain", tx);
  await requireSiteInProject(data.siteId as string | undefined, projectId, tx);
  await ensurePoolWriteIntegrity(projectId, data, tx, excludeId);
}

async function validateIpAllocationInput(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  validateCidr("Allocation CIDR", data.cidr, family);
  ensureIpInsideCidr("Gateway IP", data.gatewayIp, String(data.cidr), family);

  const pool = await requireModelInProject("designIpPool", data.poolId as string | undefined, projectId, "IP pool", tx);
  await requireModelInProject("designRouteDomain", data.routeDomainId as string | undefined, projectId, "Route domain", tx);
  await requireSiteInProject(data.siteId as string | undefined, projectId, tx);
  await requireVlanInProject(data.vlanId as string | undefined, projectId, tx);

  if (pool) {
    if (toFamily(pool.addressFamily) !== family) {
      throw new ApiError(400, `Allocation family ${family} must match pool family ${pool.addressFamily}.`);
    }
    ensureCidrInsideParent(String(data.cidr), pool.cidr, family, "Allocation", "pool");
  }

  const status = data.status ? String(data.status).toUpperCase() : undefined;
  if (status && !ALLOCATION_REVIEW_STATUSES.has(status)) {
    throw new ApiError(400, `Allocation status ${status} is not supported.`);
  }

  await ensureAllocationWriteIntegrity(projectId, data, tx, excludeId);
}

async function validateDhcpScopeInput(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  validateCidr("DHCP scope CIDR", data.scopeCidr, family);
  ensureIpInsideCidr("Default gateway", data.defaultGateway, String(data.scopeCidr), family);
  parseJsonArrayText("dnsServersJson", data.dnsServersJson as string | undefined | null);
  parseDhcpExcludedRanges("excludedRangesJson", data.excludedRangesJson as string | undefined | null, String(data.scopeCidr), family);
  parseJsonArrayText("optionsJson", data.optionsJson as string | undefined | null);
  parseJsonArrayText("relayTargetsJson", data.relayTargetsJson as string | undefined | null);

  await requireSiteInProject(data.siteId as string | undefined, projectId, tx);
  await requireVlanInProject(data.vlanId as string | undefined, projectId, tx);
  await requireModelInProject("designRouteDomain", data.routeDomainId as string | undefined, projectId, "Route domain", tx);
  const allocation = await requireModelInProject("designIpAllocation", data.allocationId as string | undefined, projectId, "Allocation", tx);

  if (allocation) {
    if (toFamily(allocation.addressFamily) !== family) {
      throw new ApiError(400, `DHCP scope family ${family} must match allocation family ${allocation.addressFamily}.`);
    }
    ensureCidrInsideParent(String(data.scopeCidr), allocation.cidr, family, "DHCP scope", "allocation");
  }

  await ensureDhcpScopeWriteIntegrity(projectId, data, tx, excludeId);
}

async function validateIpReservationInput(projectId: string, data: Record<string, unknown>, tx: any = prisma, excludeId?: string | null) {
  const family = toFamily(data.addressFamily as AddressFamilyInput);
  validateIpAddress("Reservation IP", data.ipAddress, family);

  await requireSiteInProject(data.siteId as string | undefined, projectId, tx);
  await requireVlanInProject(data.vlanId as string | undefined, projectId, tx);
  const scope = await requireModelInProject("designDhcpScope", data.dhcpScopeId as string | undefined, projectId, "DHCP scope", tx);
  const allocation = await requireModelInProject("designIpAllocation", data.allocationId as string | undefined, projectId, "Allocation", tx);

  if (scope) {
    if (toFamily(scope.addressFamily) !== family) {
      throw new ApiError(400, `Reservation family ${family} must match DHCP scope family ${scope.addressFamily}.`);
    }
    ensureIpInsideCidr("Reservation IP", data.ipAddress, scope.scopeCidr, family);
  }

  if (allocation) {
    if (toFamily(allocation.addressFamily) !== family) {
      throw new ApiError(400, `Reservation family ${family} must match allocation family ${allocation.addressFamily}.`);
    }
    ensureIpInsideCidr("Reservation IP", data.ipAddress, allocation.cidr, family);
  }

  await ensureReservationWriteIntegrity(projectId, data, tx, excludeId);
}

function normalizeRouteDomainKey(value: unknown) {
  return String(value ?? "default").trim() || "default";
}

function rowAddressFamily(network: Record<string, unknown>): "IPV4" | "IPV6" {
  const cidr = String(network.cidr ?? "").trim();
  if (network.addressFamily) return toFamily(network.addressFamily as AddressFamilyInput);
  return cidr.includes(":") ? "IPV6" : "IPV4";
}

function tryCidrToRange(cidr: string, family: AddressFamilyInput) {
  try {
    validateCidr("Brownfield network", cidr, family);
    return { ok: true as const, range: cidrToRange(cidr, family) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Invalid CIDR." };
  }
}

function sameConflictDomain(importedDomain: string, candidateDomain?: string | null) {
  const normalizedCandidate = normalizeRouteDomainKey(candidateDomain);
  return importedDomain === normalizedCandidate || importedDomain === "default" || normalizedCandidate === "default";
}

function conflictSeverityForOverlap(importedCidr: string, candidateCidr: string, objectType: string): BrownfieldConflictSeverity {
  if (importedCidr === candidateCidr) return "blocked";
  if (objectType === "durable allocation" || objectType === "DHCP scope") return "blocked";
  return "review";
}

function brownfieldConflictKey(conflict: Pick<BrownfieldConflict, "code" | "routeDomainKey" | "addressFamily" | "importedCidr" | "proposedCidr" | "existingObjectType" | "existingObjectId">) {
  return [
    conflict.code,
    normalizeRouteDomainKey(conflict.routeDomainKey),
    conflict.addressFamily,
    conflict.importedCidr,
    conflict.proposedCidr ?? "",
    conflict.existingObjectType,
    conflict.existingObjectId ?? "",
  ].join("|");
}

function attachConflictKeys(conflicts: BrownfieldConflict[]): BrownfieldResolvedConflict[] {
  return conflicts.map((conflict) => ({
    ...conflict,
    conflictKey: brownfieldConflictKey(conflict),
    resolutionStatus: "open",
    resolution: null,
  }));
}

function applyBrownfieldConflictResolutions(conflicts: BrownfieldConflict[], resolutions: Record<string, unknown>[] = []): BrownfieldConflictReview {
  const latestByKey = new Map<string, Record<string, unknown>>();
  for (const resolution of resolutions) {
    const key = String(resolution.conflictKey ?? "");
    if (key) latestByKey.set(key, resolution);
  }

  const resolvedConflicts = attachConflictKeys(conflicts).map((conflict) => {
    const resolution = latestByKey.get(conflict.conflictKey) ?? null;
    return resolution ? { ...conflict, resolutionStatus: "resolved" as const, resolution } : conflict;
  });

  const summaryBase = resolvedConflicts.reduce((acc, conflict) => {
    if (conflict.severity === "blocked") acc.blocked += 1;
    if (conflict.severity === "review") acc.review += 1;
    if (conflict.severity === "info") acc.info += 1;
    acc.total += 1;
    if (conflict.resolutionStatus === "resolved") acc.resolved += 1;
    return acc;
  }, { blocked: 0, review: 0, info: 0, total: 0, resolved: 0, unresolved: 0 });
  summaryBase.unresolved = summaryBase.total - summaryBase.resolved;
  return { conflicts: resolvedConflicts, summary: summaryBase };
}

function buildBrownfieldConflictReviewFromData(input: {
  brownfieldNetworks: Record<string, unknown>[];
  ipAllocations: Record<string, unknown>[];
  dhcpScopes: Record<string, unknown>[];
  ipPools: Record<string, unknown>[];
  planRows?: Record<string, unknown>[];
}): BrownfieldConflictReview {
  const conflicts: BrownfieldConflict[] = [];

  for (const imported of input.brownfieldNetworks) {
    const importedCidr = String(imported.cidr ?? "").trim();
    const family = rowAddressFamily(imported);
    const importedRange = tryCidrToRange(importedCidr, family);
    if (!importedRange.ok) continue;
    const importedDomain = normalizeRouteDomainKey(imported.routeDomainKey);

    for (const allocation of input.ipAllocations) {
      if (toFamily(allocation.addressFamily as AddressFamilyInput) !== family) continue;
      const candidateCidr = String(allocation.cidr ?? "").trim();
      const routeDomainKey = normalizeRouteDomainKey((allocation.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? ((allocation.pool as Record<string, unknown> | undefined)?.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? allocation.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, candidateCidr, family)) continue;
      const severity = conflictSeverityForOverlap(importedCidr, candidateCidr, "durable allocation");
      conflicts.push({
        code: importedCidr === candidateCidr ? "BROWNFIELD_DUPLICATES_DURABLE_ALLOCATION" : "BROWNFIELD_OVERLAPS_DURABLE_ALLOCATION",
        severity,
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr: candidateCidr,
        existingObjectType: "durable allocation",
        existingObjectId: String(allocation.id ?? ""),
        existingObjectLabel: String(allocation.purpose ?? allocation.cidr ?? "allocation"),
        detail: `Imported ${importedCidr} overlaps durable allocation ${candidateCidr}.`,
        recommendedAction: severity === "blocked" ? "Reconcile ownership before approving or implementing this allocation." : "Review whether the imported current-state block should supersede or constrain the proposed allocation.",
      });
    }

    for (const scope of input.dhcpScopes) {
      if (toFamily(scope.addressFamily as AddressFamilyInput) !== family) continue;
      const scopeCidr = String(scope.scopeCidr ?? "").trim();
      const routeDomainKey = normalizeRouteDomainKey((scope.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? scope.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, scopeCidr, family)) continue;
      conflicts.push({
        code: importedCidr === scopeCidr ? "BROWNFIELD_DUPLICATES_DHCP_SCOPE" : "BROWNFIELD_OVERLAPS_DHCP_SCOPE",
        severity: "blocked",
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr: scopeCidr,
        existingObjectType: "DHCP scope",
        existingObjectId: String(scope.id ?? ""),
        existingObjectLabel: String(scope.serverLocation ?? scope.scopeCidr ?? "DHCP scope"),
        detail: `Imported ${importedCidr} overlaps DHCP scope ${scopeCidr}.`,
        recommendedAction: "Confirm whether this imported network is the authoritative scope or whether the proposed DHCP scope needs renumbering.",
      });
    }

    for (const pool of input.ipPools) {
      if (toFamily(pool.addressFamily as AddressFamilyInput) !== family) continue;
      const poolCidr = String(pool.cidr ?? "").trim();
      const routeDomainKey = normalizeRouteDomainKey((pool.routeDomain as Record<string, unknown> | undefined)?.routeDomainKey ?? pool.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, poolCidr, family)) continue;
      conflicts.push({
        code: "BROWNFIELD_INTERSECTS_POOL",
        severity: Boolean(pool.noAllocate) ? "review" : "info",
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr: poolCidr,
        existingObjectType: "IP pool",
        existingObjectId: String(pool.id ?? ""),
        existingObjectLabel: String(pool.name ?? pool.cidr ?? "pool"),
        detail: `Imported ${importedCidr} intersects planned pool ${poolCidr}.`,
        recommendedAction: "Use this as context. Pools may intentionally contain current-state blocks, but allocations must still be reconciled.",
      });
    }

    for (const row of input.planRows ?? []) {
      const rowFamily = toFamily(row.family as AddressFamilyInput);
      if (rowFamily !== family || !row.proposedCidr) continue;
      const proposedCidr = String(row.proposedCidr ?? "").trim();
      const routeDomainKey = normalizeRouteDomainKey(row.routeDomainKey);
      if (!sameConflictDomain(importedDomain, routeDomainKey)) continue;
      if (!cidrsOverlap(importedCidr, proposedCidr, family)) continue;
      conflicts.push({
        code: "BROWNFIELD_OVERLAPS_ALLOCATOR_PLAN_ROW",
        severity: "review",
        routeDomainKey: importedDomain,
        addressFamily: family,
        importedCidr,
        proposedCidr,
        existingObjectType: "allocator plan row",
        existingObjectId: String(row.poolId ?? ""),
        existingObjectLabel: String(row.target ?? "allocator plan row"),
        detail: `Imported ${importedCidr} overlaps proposed allocator row ${proposedCidr}.`,
        recommendedAction: "Do not materialize this plan row until the brownfield overlap is reviewed or imported ownership is confirmed.",
      });
    }
  }

  return applyBrownfieldConflictResolutions(conflicts);
}

async function loadBrownfieldReviewData(projectId: string) {
  const designProject = await getProjectDesignData(projectId);
  const designCore = designProject ? buildDesignCoreSnapshot(designProject) : null;
  const [brownfieldNetworks, ipAllocations, dhcpScopes, ipPools, brownfieldConflictResolutions] = await Promise.all([
    (prisma as any).designBrownfieldNetwork.findMany({ where: { projectId }, orderBy: [{ cidr: "asc" }] }),
    (prisma as any).designIpAllocation.findMany({ where: { projectId }, include: { routeDomain: true, pool: { include: { routeDomain: true } } } }),
    (prisma as any).designDhcpScope.findMany({ where: { projectId }, include: { routeDomain: true } }),
    (prisma as any).designIpPool.findMany({ where: { projectId }, include: { routeDomain: true } }),
    (prisma as any).designBrownfieldConflictResolution.findMany({ where: { projectId }, orderBy: [{ updatedAt: "desc" }] }),
  ]);
  return { brownfieldNetworks, ipAllocations, dhcpScopes, ipPools, brownfieldConflictResolutions, planRows: asConflictReviewRows(designCore?.enterpriseAllocatorPosture?.allocationPlanRows ?? []) };
}

function validateBrownfieldNetworks(networks: Record<string, unknown>[]) {
  if (!Array.isArray(networks) || networks.length === 0) {
    throw new ApiError(400, "Brownfield import requires at least one network.");
  }

  for (const [index, network] of networks.entries()) {
    validateCidr(`Brownfield network ${index + 1}`, network.cidr, network.addressFamily as AddressFamilyInput);
  }
}

export async function getEnterpriseIpamSnapshot(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);

  const [project, sites, vlans, routeDomains, ipPools, ipAllocations, dhcpScopes, ipReservations, brownfieldImports, brownfieldNetworks, brownfieldConflictResolutions, allocationApprovals, allocationLedger, designProject] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, basePrivateRange: true } }),
    prisma.site.findMany({ where: { projectId }, orderBy: [{ name: "asc" }] }),
    prisma.vlan.findMany({ where: { site: { projectId } }, include: { site: { select: { id: true, name: true, siteCode: true } } }, orderBy: [{ site: { name: "asc" } }, { vlanId: "asc" }] }),
    (prisma as any).designRouteDomain.findMany({ where: { projectId }, orderBy: [{ routeDomainKey: "asc" }] }),
    (prisma as any).designIpPool.findMany({ where: { projectId }, include: { routeDomain: true, site: true }, orderBy: [{ addressFamily: "asc" }, { name: "asc" }] }),
    (prisma as any).designIpAllocation.findMany({ where: { projectId }, include: { pool: true, routeDomain: true, site: true, vlan: true }, orderBy: [{ addressFamily: "asc" }, { cidr: "asc" }] }),
    (prisma as any).designDhcpScope.findMany({ where: { projectId }, include: { site: true, vlan: true, routeDomain: true, allocation: true }, orderBy: [{ scopeCidr: "asc" }] }),
    (prisma as any).designIpReservation.findMany({ where: { projectId }, include: { site: true, vlan: true, dhcpScope: true, allocation: true }, orderBy: [{ ipAddress: "asc" }] }),
    (prisma as any).designBrownfieldImport.findMany({ where: { projectId }, include: { networks: true }, orderBy: [{ importedAt: "desc" }] }),
    (prisma as any).designBrownfieldNetwork.findMany({ where: { projectId }, orderBy: [{ cidr: "asc" }] }),
    (prisma as any).designBrownfieldConflictResolution.findMany({ where: { projectId }, orderBy: [{ updatedAt: "desc" }] }),
    (prisma as any).designAllocationApproval.findMany({ where: { projectId }, include: { allocation: true }, orderBy: [{ createdAt: "desc" }] }),
    (prisma as any).designAllocationLedgerEntry.findMany({ where: { projectId }, include: { allocation: true }, orderBy: [{ createdAt: "desc" }], take: 100 }),
    getProjectDesignData(projectId),
  ]);

  const designCore = designProject ? buildDesignCoreSnapshot(designProject) : null;
  const allocatorPosture = designCore?.enterpriseAllocatorPosture ?? null;
  const brownfieldConflictReview = buildBrownfieldConflictReviewFromData({
    brownfieldNetworks,
    ipAllocations,
    dhcpScopes,
    ipPools,
    planRows: asConflictReviewRows(allocatorPosture?.allocationPlanRows ?? []),
  });
  const brownfieldConflictReviewWithResolutions = applyBrownfieldConflictResolutions(
    brownfieldConflictReview.conflicts,
    brownfieldConflictResolutions,
  );

  return {
    project,
    sites,
    vlans,
    routeDomains,
    ipPools,
    ipAllocations,
    dhcpScopes,
    ipReservations,
    brownfieldImports,
    brownfieldNetworks,
    brownfieldConflictResolutions,
    allocationApprovals,
    allocationLedger,
    brownfieldConflictReview: brownfieldConflictReviewWithResolutions,
    allocatorPosture,
    summary: {
      routeDomainCount: routeDomains.length,
      poolCount: ipPools.length,
      allocationCount: ipAllocations.length,
      dhcpScopeCount: dhcpScopes.length,
      reservationCount: ipReservations.length,
      brownfieldNetworkCount: brownfieldNetworks.length,
      approvalCount: allocationApprovals.length,
      ledgerEntryCount: allocationLedger.length,
      hasIpv6Pools: ipPools.some((pool: any) => String(pool.addressFamily) === "IPV6"),
      hasBrownfieldEvidence: brownfieldNetworks.length > 0,
      currentInputHash: allocatorPosture?.currentInputHash ?? null,
      allocationPlanRowCount: allocatorPosture?.allocationPlanRows?.length ?? 0,
      brownfieldBlockedConflictCount: brownfieldConflictReviewWithResolutions.summary.blocked,
      brownfieldReviewConflictCount: brownfieldConflictReviewWithResolutions.summary.review,
      brownfieldResolvedConflictCount: brownfieldConflictReviewWithResolutions.summary.resolved,
      brownfieldUnresolvedConflictCount: brownfieldConflictReviewWithResolutions.summary.unresolved,
    },
  };
}

export async function previewBrownfieldImport(projectId: string, userId: string, data: BrownfieldDryRunInput) {
  await ensureCanViewProject(userId, projectId);

  const networks = Array.isArray(data.networks) ? data.networks : [];
  const seen = new Map<string, number>();
  const rows: BrownfieldDryRunRow[] = [];
  const validNetworks: Record<string, unknown>[] = [];

  networks.forEach((network, index) => {
    const rowNumber = index + 1;
    const family = rowAddressFamily(network);
    const cidr = String(network.cidr ?? "").trim();
    const routeDomainKey = normalizeRouteDomainKey(network.routeDomainKey);
    const findings: string[] = [];
    let status: BrownfieldDryRunRow["status"] = "valid";

    const parsed = tryCidrToRange(cidr, family);
    if (!parsed.ok) {
      status = "invalid";
      findings.push(parsed.error);
    }

    const duplicateKey = `${routeDomainKey}|${family}|${cidr}`;
    if (parsed.ok && seen.has(duplicateKey)) {
      status = "duplicate";
      findings.push(`Duplicates dry-run row ${seen.get(duplicateKey)}.`);
    }
    if (parsed.ok && !seen.has(duplicateKey)) seen.set(duplicateKey, rowNumber);

    const dryRunRow: BrownfieldDryRunRow = {
      rowNumber,
      routeDomainKey,
      addressFamily: family,
      cidr,
      siteName: String(network.siteName ?? "").trim() || null,
      vlanNumber: network.vlanNumber === undefined || network.vlanNumber === null || network.vlanNumber === "" ? null : Number(network.vlanNumber),
      ownerLabel: String(network.ownerLabel ?? "").trim() || null,
      status,
      findings,
    };
    rows.push(dryRunRow);
    if (status === "valid") validNetworks.push({ ...network, routeDomainKey, addressFamily: family, cidr });
  });

  const reviewData = await loadBrownfieldReviewData(projectId);
  const dryRunConflicts = buildBrownfieldConflictReviewFromData({ ...reviewData, brownfieldNetworks: validNetworks });
  const existingBrownfieldKeys = new Set(reviewData.brownfieldNetworks.map((network: Record<string, unknown>) => `${normalizeRouteDomainKey(network.routeDomainKey)}|${rowAddressFamily(network)}|${String(network.cidr ?? "").trim()}`));

  for (const row of rows) {
    if (row.status === "valid" && existingBrownfieldKeys.has(`${row.routeDomainKey}|${row.addressFamily}|${row.cidr}`)) {
      row.status = "duplicate";
      row.findings.push("Already exists in saved brownfield evidence.");
    }
    const rowConflicts = dryRunConflicts.conflicts.filter((conflict) => conflict.importedCidr === row.cidr && conflict.addressFamily === row.addressFamily && sameConflictDomain(conflict.routeDomainKey, row.routeDomainKey));
    if (row.status === "valid" && rowConflicts.some((conflict) => conflict.severity === "blocked" || conflict.severity === "review")) {
      row.status = "conflict";
      row.findings.push(`${rowConflicts.length} current-vs-proposed conflict(s) found.`);
    }
  }

  const summary = rows.reduce((acc, row) => {
    acc.totalRows += 1;
    if (row.status === "valid") acc.validRows += 1;
    if (row.status === "invalid") acc.invalidRows += 1;
    if (row.status === "duplicate") acc.duplicateRows += 1;
    if (row.status === "conflict") acc.conflictRows += 1;
    return acc;
  }, { totalRows: 0, validRows: 0, invalidRows: 0, duplicateRows: 0, conflictRows: 0 });

  return {
    sourceType: data.sourceType ?? "dry-run",
    sourceName: data.sourceName ?? null,
    summary: {
      ...summary,
      blockedConflicts: dryRunConflicts.summary.blocked,
      reviewConflicts: dryRunConflicts.summary.review,
      infoConflicts: dryRunConflicts.summary.info,
    },
    rows,
    conflicts: dryRunConflicts.conflicts,
    canImportWithoutReview: summary.invalidRows === 0 && summary.duplicateRows === 0 && dryRunConflicts.summary.blocked === 0,
  };
}

export async function getBrownfieldConflictReview(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  const reviewData = await loadBrownfieldReviewData(projectId);
  const review = buildBrownfieldConflictReviewFromData(reviewData);
  return applyBrownfieldConflictResolutions(review.conflicts, reviewData.brownfieldConflictResolutions);
}

export async function createBrownfieldConflictResolution(projectId: string, userId: string, data: BrownfieldConflictResolutionInput, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  const reason = String(data.reason ?? "").trim();
  if (!reason) throw new ApiError(400, "Conflict resolution requires a reviewer reason.");

  const reviewData = await loadBrownfieldReviewData(projectId);
  const currentReview = buildBrownfieldConflictReviewFromData(reviewData);
  const currentConflict = currentReview.conflicts.find((conflict) => conflict.conflictKey === data.conflictKey);
  if (!currentConflict) {
    throw new ApiError(409, "This conflict is no longer present in the current Engine 2 review. Refresh before recording a decision.");
  }

  const decision = String(data.decision ?? "").toUpperCase();
  const supportedDecisions = new Set(["ACCEPT_BROWNFIELD", "KEEP_PROPOSED", "IGNORE_NOT_APPLICABLE", "SUPERSEDE_PROPOSED", "SPLIT_REQUIRED", "CHANGE_WINDOW_REQUIRED"]);
  if (!supportedDecisions.has(decision)) throw new ApiError(400, "Conflict decision " + decision + " is not supported.");

  return prisma.$transaction(async (tx: any) => {
    let supersededAllocationId: string | null = null;
    if (decision === "SUPERSEDE_PROPOSED" && data.applySupersede) {
      if (currentConflict.existingObjectType !== "durable allocation" || !currentConflict.existingObjectId) {
        throw new ApiError(400, "Only durable-allocation conflicts can supersede an allocation automatically.");
      }
      const allocation = await tx.designIpAllocation.findFirst({ where: { id: currentConflict.existingObjectId, projectId } });
      if (!allocation) throw new ApiError(404, "The allocation tied to this conflict no longer exists.");
      await tx.designIpAllocation.update({
        where: { id: allocation.id },
        data: { status: "SUPERSEDED", supersessionReason: reason },
      });
      supersededAllocationId = allocation.id;
      await writeLedger(projectId, allocation.id, "SUPERSEDED", "Brownfield conflict resolution superseded " + allocation.cidr + ": " + reason, actorLabel, data.designInputHash ?? allocation.inputHash, tx);
    }

    const record = await tx.designBrownfieldConflictResolution.upsert({
      where: { projectId_conflictKey: { projectId, conflictKey: data.conflictKey } },
      create: {
        projectId,
        conflictKey: data.conflictKey,
        code: currentConflict.code,
        routeDomainKey: currentConflict.routeDomainKey,
        addressFamily: currentConflict.addressFamily,
        importedCidr: currentConflict.importedCidr,
        proposedCidr: currentConflict.proposedCidr ?? undefined,
        existingObjectType: currentConflict.existingObjectType,
        existingObjectId: currentConflict.existingObjectId ?? undefined,
        decision,
        reviewerLabel: data.reviewerLabel ?? actorLabel,
        reason,
        designInputHash: data.designInputHash ?? undefined,
        supersededAllocationId: supersededAllocationId ?? undefined,
      },
      update: {
        decision,
        reviewerLabel: data.reviewerLabel ?? actorLabel,
        reason,
        designInputHash: data.designInputHash ?? undefined,
        supersededAllocationId: supersededAllocationId ?? undefined,
      },
    });
    await writeLedger(projectId, supersededAllocationId, "UPDATED", "Brownfield conflict " + currentConflict.code + " resolved as " + decision + ": " + reason, actorLabel, data.designInputHash ?? null, tx);
    await addChangeLog(projectId, "Engine 2 brownfield conflict decision recorded: " + currentConflict.importedCidr + " -> " + decision, actorLabel, tx);
    return record;
  });
}

export async function createRouteDomain(projectId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designRouteDomain.create({ data: { projectId, ...normalize(data) } });
    await addChangeLog(projectId, `Engine 2 route domain created: ${record.routeDomainKey}`, actorLabel, tx);
    return record;
  });
}

export async function updateRouteDomain(id: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const existing = await requireRecord("designRouteDomain", id, userId);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designRouteDomain.update({ where: { id }, data: normalize(data) });
    await addChangeLog(existing.projectId, `Engine 2 route domain updated: ${record.routeDomainKey}`, actorLabel, tx);
    return record;
  });
}

export async function deleteRouteDomain(id: string, userId: string, actorLabel?: string) {
  const existing = await requireRecord("designRouteDomain", id, userId);
  return prisma.$transaction(async (tx: any) => {
    await tx.designRouteDomain.delete({ where: { id } });
    await addChangeLog(existing.projectId, `Engine 2 route domain deleted: ${existing.routeDomainKey}`, actorLabel, tx);
  });
}

export async function createIpPool(projectId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  await validateIpPoolInput(projectId, data);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designIpPool.create({ data: { projectId, ...normalize(data) } });
    await addChangeLog(projectId, `Engine 2 IP pool created: ${record.name} ${record.cidr}`, actorLabel, tx);
    return record;
  });
}

export async function updateIpPool(id: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const existing = await requireRecord("designIpPool", id, userId);
  const merged = { ...existing, ...normalize(data) };
  await validateIpPoolInput(existing.projectId, merged, prisma, id);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designIpPool.update({ where: { id }, data: normalize(data) });
    await addChangeLog(existing.projectId, `Engine 2 IP pool updated: ${record.name} ${record.cidr}`, actorLabel, tx);
    return record;
  });
}

export async function deleteIpPool(id: string, userId: string, actorLabel?: string) {
  const existing = await requireRecord("designIpPool", id, userId);
  return prisma.$transaction(async (tx: any) => {
    await tx.designIpPool.delete({ where: { id } });
    await addChangeLog(existing.projectId, `Engine 2 IP pool deleted: ${existing.name} ${existing.cidr}`, actorLabel, tx);
  });
}

export async function createIpAllocation(projectId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  await validateIpAllocationInput(projectId, data);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designIpAllocation.create({ data: { projectId, ...normalize(data) } });
    await writeLedger(projectId, record.id, "CREATED", `Allocation created: ${record.cidr}`, actorLabel, record.inputHash, tx);
    await addChangeLog(projectId, `Engine 2 allocation created: ${record.cidr}`, actorLabel, tx);
    return record;
  });
}

export async function createAllocationFromPlan(projectId: string, userId: string, data: PlanMaterializationInput, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);

  const project = await getProjectDesignData(projectId);
  if (!project) throw new ApiError(404, "Project not found.");
  const designCore = buildDesignCoreSnapshot(project);
  if (!designCore) throw new ApiError(400, "Engine 2 design-core snapshot is not available for this project.");
  const allocatorPosture = designCore.enterpriseAllocatorPosture;
  if (!allocatorPosture) {
    throw new ApiError(400, "Engine 2 allocator posture is not available for this project.");
  }

  const family = toFamily(data.family);
  const planRow = allocatorPosture.allocationPlanRows.find((row: any) => {
    return row.poolId === data.poolId
      && row.proposedCidr === data.proposedCidr
      && toFamily(row.family) === family
      && (!data.siteId || row.siteId === data.siteId)
      && (data.vlanNumber === undefined || data.vlanNumber === null || Number(row.vlanId) === Number(data.vlanNumber));
  });

  if (!planRow || planRow.status !== "allocated" || !planRow.proposedCidr) {
    throw new ApiError(400, "The requested allocator plan row is no longer valid. Refresh Engine 2 IPAM and try again.");
  }

  const pool = await (prisma as any).designIpPool.findFirst({ where: { id: data.poolId, projectId } });
  if (!pool) throw new ApiError(400, "IP pool does not belong to this project.");
  if (toFamily(pool.addressFamily) !== family) throw new ApiError(400, "Plan row family does not match pool family.");

  const globalBlockingFinding = allocatorPosture.reviewFindings.find((finding: any) => finding.severity === "blocked");
  if (globalBlockingFinding) {
    throw new ApiError(409, `Allocator plan materialization is blocked until this finding is resolved: ${globalBlockingFinding.title}.`);
  }

  const addressingRow = designCore.addressingRows.find((row: any) => row.siteId === planRow.siteId && Number(row.vlanId) === Number(planRow.vlanId));
  const candidateAllocation = {
    poolId: pool.id,
    routeDomainId: pool.routeDomainId || undefined,
    siteId: planRow.siteId || undefined,
    vlanId: addressingRow?.id || undefined,
    addressFamily: family,
    cidr: planRow.proposedCidr,
    purpose: data.purpose || `Materialized Engine 2 plan row for ${planRow.target}`,
    status: "PROPOSED",
    source: "engine2-plan-materialized",
    confidence: "proposed",
    inputHash: allocatorPosture.currentInputHash,
    notes: data.notes || planRow.explanation,
  };
  await validateIpAllocationInput(projectId, candidateAllocation);

  const existing = await (prisma as any).designIpAllocation.findFirst({
    where: { projectId, poolId: data.poolId, cidr: planRow.proposedCidr },
  });
  if (existing) throw new ApiError(409, `Allocation ${planRow.proposedCidr} already exists for this pool.`);

  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designIpAllocation.create({
      data: {
        projectId,
        poolId: pool.id,
        routeDomainId: pool.routeDomainId || undefined,
        siteId: planRow.siteId || undefined,
        vlanId: addressingRow?.id || undefined,
        addressFamily: family,
        cidr: planRow.proposedCidr,
        purpose: data.purpose || `Materialized Engine 2 plan row for ${planRow.target}`,
        status: "PROPOSED",
        source: "engine2-plan-materialized",
        confidence: "proposed",
        inputHash: allocatorPosture.currentInputHash,
        notes: data.notes || planRow.explanation,
      },
    });
    await writeLedger(projectId, record.id, "CREATED", `Materialized allocator plan row: ${record.cidr}`, actorLabel, allocatorPosture.currentInputHash, tx);
    await addChangeLog(projectId, `Engine 2 plan row materialized as durable allocation: ${record.cidr}`, actorLabel, tx);
    return record;
  });
}

export async function updateIpAllocation(id: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const existing = await requireRecord("designIpAllocation", id, userId);
  const merged = { ...existing, ...normalize(data) };
  await validateIpAllocationInput(existing.projectId, merged, prisma, id);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designIpAllocation.update({ where: { id }, data: normalize(data) });
    await writeLedger(existing.projectId, id, "UPDATED", `Allocation updated: ${record.cidr}`, actorLabel, record.inputHash, tx);
    await addChangeLog(existing.projectId, `Engine 2 allocation updated: ${record.cidr}`, actorLabel, tx);
    return record;
  });
}

export async function updateIpAllocationStatus(id: string, userId: string, data: { status: string; actorLabel?: string | null; summary?: string | null; designInputHash?: string | null }, fallbackActor?: string) {
  const existing = await requireRecord("designIpAllocation", id, userId);
  const nextStatus = String(data.status ?? "").toUpperCase();
  if (!ALLOCATION_REVIEW_STATUSES.has(nextStatus)) throw new ApiError(400, `Allocation status ${nextStatus} is not supported.`);

  const requiresChangeEvidence = nextStatus === "APPROVED" || nextStatus === "IMPLEMENTED" || nextStatus === "REJECTED" || nextStatus === "SUPERSEDED";
  if (requiresChangeEvidence && !String(data.summary ?? "").trim()) {
    throw new ApiError(400, `Changing an allocation to ${nextStatus} requires a reviewer summary.`);
  }
  if ((nextStatus === "APPROVED" || nextStatus === "IMPLEMENTED") && !String(data.designInputHash ?? existing.inputHash ?? "").trim()) {
    throw new ApiError(400, `${nextStatus} allocations must store the current Engine 2 input hash.`);
  }

  return prisma.$transaction(async (tx: any) => {
    if (nextStatus === "APPROVED" || nextStatus === "IMPLEMENTED") {
      await validateIpAllocationInput(existing.projectId, { ...existing, inputHash: data.designInputHash || existing.inputHash, status: nextStatus }, tx, id);
    }

    const dateData = nextStatus === "APPROVED" ? { approvedAt: new Date() } : nextStatus === "IMPLEMENTED" ? { implementedAt: new Date() } : {};
    const record = await tx.designIpAllocation.update({
      where: { id },
      data: { status: nextStatus, inputHash: data.designInputHash || existing.inputHash, ...dateData },
    });
    const action = nextStatus === "APPROVED" ? "APPROVED" : nextStatus === "IMPLEMENTED" ? "IMPLEMENTED" : nextStatus === "REJECTED" ? "REJECTED" : nextStatus === "SUPERSEDED" ? "SUPERSEDED" : "UPDATED";
    await writeLedger(existing.projectId, id, action, data.summary || `Allocation marked ${nextStatus}: ${record.cidr}`, data.actorLabel || fallbackActor, data.designInputHash || record.inputHash, tx);
    await addChangeLog(existing.projectId, `Engine 2 allocation status changed: ${record.cidr} -> ${nextStatus}`, data.actorLabel || fallbackActor, tx);
    return record;
  });
}

export async function deleteIpAllocation(id: string, userId: string, actorLabel?: string) {
  const existing = await requireRecord("designIpAllocation", id, userId);
  return prisma.$transaction(async (tx: any) => {
    await writeLedger(existing.projectId, id, "SUPERSEDED", `Allocation deleted from management interface: ${existing.cidr}`, actorLabel, existing.inputHash, tx);
    await tx.designIpAllocation.delete({ where: { id } });
    await addChangeLog(existing.projectId, `Engine 2 allocation deleted: ${existing.cidr}`, actorLabel, tx);
  });
}

export async function createDhcpScope(projectId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  await validateDhcpScopeInput(projectId, data);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designDhcpScope.create({ data: { projectId, ...normalize(data) } });
    await addChangeLog(projectId, `Engine 2 DHCP scope created: ${record.scopeCidr}`, actorLabel, tx);
    return record;
  });
}

export async function updateDhcpScope(id: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const existing = await requireRecord("designDhcpScope", id, userId);
  const merged = { ...existing, ...normalize(data) };
  await validateDhcpScopeInput(existing.projectId, merged, prisma, id);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designDhcpScope.update({ where: { id }, data: normalize(data) });
    await addChangeLog(existing.projectId, `Engine 2 DHCP scope updated: ${record.scopeCidr}`, actorLabel, tx);
    return record;
  });
}

export async function deleteDhcpScope(id: string, userId: string, actorLabel?: string) {
  const existing = await requireRecord("designDhcpScope", id, userId);
  return prisma.$transaction(async (tx: any) => {
    await tx.designDhcpScope.delete({ where: { id } });
    await addChangeLog(existing.projectId, `Engine 2 DHCP scope deleted: ${existing.scopeCidr}`, actorLabel, tx);
  });
}

export async function createIpReservation(projectId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  await validateIpReservationInput(projectId, data);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designIpReservation.create({ data: { projectId, ...normalize(data) } });
    await addChangeLog(projectId, `Engine 2 reservation created: ${record.ipAddress}`, actorLabel, tx);
    return record;
  });
}

export async function updateIpReservation(id: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const existing = await requireRecord("designIpReservation", id, userId);
  const merged = { ...existing, ...normalize(data) };
  await validateIpReservationInput(existing.projectId, merged, prisma, id);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designIpReservation.update({ where: { id }, data: normalize(data) });
    await addChangeLog(existing.projectId, `Engine 2 reservation updated: ${record.ipAddress}`, actorLabel, tx);
    return record;
  });
}

export async function deleteIpReservation(id: string, userId: string, actorLabel?: string) {
  const existing = await requireRecord("designIpReservation", id, userId);
  return prisma.$transaction(async (tx: any) => {
    await tx.designIpReservation.delete({ where: { id } });
    await addChangeLog(existing.projectId, `Engine 2 reservation deleted: ${existing.ipAddress}`, actorLabel, tx);
  });
}

export async function createBrownfieldImport(projectId: string, userId: string, data: { sourceType: string; sourceName?: string | null; notes?: string | null; networks: Record<string, unknown>[] }, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  validateBrownfieldNetworks(data.networks);

  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designBrownfieldImport.create({
      data: {
        projectId,
        sourceType: data.sourceType,
        sourceName: data.sourceName || undefined,
        notes: data.notes || undefined,
        networks: { create: data.networks.map((network) => ({ projectId, ...normalize(network) })) },
      },
      include: { networks: true },
    });
    await writeLedger(projectId, null, "IMPORTED", `Brownfield import created with ${record.networks.length} networks`, actorLabel, null, tx);
    await addChangeLog(projectId, `Engine 2 brownfield import created: ${record.sourceType} (${record.networks.length} networks)`, actorLabel, tx);
    return record;
  });
}

export async function updateBrownfieldNetwork(id: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const existing = await requireRecord("designBrownfieldNetwork", id, userId);
  const merged = { ...existing, ...normalize(data) };
  validateCidr("Brownfield network", merged.cidr, merged.addressFamily as AddressFamilyInput);
  return prisma.$transaction(async (tx: any) => {
    const record = await tx.designBrownfieldNetwork.update({ where: { id }, data: normalize(data) });
    await addChangeLog(existing.projectId, `Engine 2 brownfield network updated: ${record.cidr}`, actorLabel, tx);
    return record;
  });
}

export async function deleteBrownfieldNetwork(id: string, userId: string, actorLabel?: string) {
  const existing = await requireRecord("designBrownfieldNetwork", id, userId);
  return prisma.$transaction(async (tx: any) => {
    await tx.designBrownfieldNetwork.delete({ where: { id } });
    await addChangeLog(existing.projectId, `Engine 2 brownfield network deleted: ${existing.cidr}`, actorLabel, tx);
  });
}

export async function createAllocationApproval(projectId: string, userId: string, data: { allocationId: string; decision: string; reviewerLabel?: string | null; reason?: string | null; designInputHash?: string | null }, actorLabel?: string) {
  await ensureCanEditProject(userId, projectId);
  const allocation = await (prisma as any).designIpAllocation.findFirst({ where: { id: data.allocationId, projectId } });
  if (!allocation) throw new ApiError(404, "Allocation not found for this project.");

  const decision = String(data.decision).toUpperCase();
  const nextStatus = decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "REVIEW_REQUIRED";
  const action = decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "UPDATED";
  const reason = String(data.reason ?? "").trim();
  const designInputHash = String(data.designInputHash ?? allocation.inputHash ?? "").trim();

  if (!reason) {
    throw new ApiError(400, "Approval decisions require a reviewer reason. No silent approve/reject decisions.");
  }
  if (decision === "APPROVED" && !designInputHash) {
    throw new ApiError(400, "Approved allocations must store the current Engine 2 input hash.");
  }

  return prisma.$transaction(async (tx: any) => {
    if (decision === "APPROVED") {
      await validateIpAllocationInput(projectId, { ...allocation, status: "APPROVED", inputHash: designInputHash }, tx, data.allocationId);
    }

    const approval = await tx.designAllocationApproval.create({
      data: {
        projectId,
        allocationId: data.allocationId,
        decision,
        reviewerLabel: data.reviewerLabel || actorLabel || undefined,
        reason,
        designInputHash: designInputHash || undefined,
      },
    });
    await tx.designIpAllocation.update({
      where: { id: data.allocationId },
      data: {
        status: nextStatus,
        inputHash: designInputHash || allocation.inputHash,
        approvedAt: nextStatus === "APPROVED" ? new Date() : allocation.approvedAt,
      },
    });
    await writeLedger(projectId, data.allocationId, action, `${decision}: ${reason}`, data.reviewerLabel || actorLabel, designInputHash || allocation.inputHash, tx);
    await addChangeLog(projectId, `Engine 2 allocation approval recorded: ${allocation.cidr} -> ${decision}`, data.reviewerLabel || actorLabel, tx);
    return approval;
  });
}
