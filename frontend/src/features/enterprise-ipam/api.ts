import { api } from "../../lib/api";

export type AddressFamily = "IPV4" | "IPV6";
export type IpPoolStatus = "ACTIVE" | "RESERVED" | "DEPRECATED";
export type IpPoolScope = "ORGANIZATION" | "SITE" | "SEGMENT" | "TRANSIT" | "LOOPBACK" | "RESERVED";
export type IpAllocationStatus = "PROPOSED" | "REVIEW_REQUIRED" | "APPROVED" | "REJECTED" | "SUPERSEDED" | "IMPLEMENTED";

export type EnterpriseRouteDomain = {
  id: string;
  routeDomainKey: string;
  name: string;
  vrfName?: string | null;
  allowOverlappingCidrs?: boolean;
};

export type EnterpriseIpPool = {
  id: string;
  name: string;
  addressFamily: AddressFamily;
  scope: IpPoolScope;
  cidr: string;
  status: IpPoolStatus;
  noAllocate?: boolean;
  reservePercent?: number | null;
  routeDomainId?: string | null;
  siteId?: string | null;
  businessUnit?: string | null;
  ownerLabel?: string | null;
};

export type EnterpriseIpAllocation = {
  id: string;
  poolId?: string | null;
  routeDomainId?: string | null;
  siteId?: string | null;
  vlanId?: string | null;
  addressFamily: AddressFamily;
  cidr: string;
  gatewayIp?: string | null;
  purpose?: string | null;
  status: IpAllocationStatus;
  source?: string | null;
  confidence?: string | null;
  inputHash?: string | null;
  supersededByAllocationId?: string | null;
  supersessionReason?: string | null;
  notes?: string | null;
};

export type EnterpriseDhcpScope = {
  id: string;
  siteId?: string | null;
  vlanId?: string | null;
  routeDomainId?: string | null;
  allocationId?: string | null;
  addressFamily: AddressFamily;
  scopeCidr: string;
  defaultGateway?: string | null;
  dnsServersJson?: string | null;
  excludedRangesJson?: string | null;
  optionsJson?: string | null;
  relayTargetsJson?: string | null;
};

export type EnterpriseIpReservation = {
  id: string;
  siteId?: string | null;
  vlanId?: string | null;
  dhcpScopeId?: string | null;
  allocationId?: string | null;
  addressFamily: AddressFamily;
  ipAddress: string;
  macAddress?: string | null;
  hostname?: string | null;
  ownerLabel?: string | null;
};

export type EnterpriseBrownfieldImport = { id: string; sourceType: string; sourceName?: string | null; status?: string; importedAt?: string; notes?: string | null };
export type EnterpriseBrownfieldNetwork = { id: string; routeDomainKey?: string | null; addressFamily: AddressFamily; cidr: string; vlanNumber?: number | null; siteName?: string | null; ownerLabel?: string | null; confidence?: string | null };
export type EnterpriseAllocationApproval = { id: string; allocationId: string; decision: "APPROVED" | "REJECTED" | "NEEDS_CHANGES"; reviewerLabel?: string | null; reason?: string | null; designInputHash?: string | null; createdAt?: string };
export type EnterpriseAllocationLedgerEntry = { id: string; allocationId?: string | null; action: string; actorLabel?: string | null; summary: string; designInputHash?: string | null; createdAt?: string };
export type EnterpriseBrownfieldConflictResolution = { id: string; conflictKey: string; code: string; decision: string; reviewerLabel?: string | null; reason: string; designInputHash?: string | null; supersededAllocationId?: string | null; updatedAt?: string; createdAt?: string };



export type BrownfieldConflict = {
  code: string;
  severity: "info" | "review" | "blocked";
  routeDomainKey: string;
  addressFamily: AddressFamily;
  importedCidr: string;
  proposedCidr?: string | null;
  existingObjectType: string;
  existingObjectId?: string | null;
  existingObjectLabel?: string | null;
  detail: string;
  recommendedAction: string;
  conflictKey?: string;
  resolutionStatus?: "open" | "resolved";
  resolution?: EnterpriseBrownfieldConflictResolution | null;
};

export type BrownfieldConflictReview = {
  conflicts: BrownfieldConflict[];
  summary: { blocked: number; review: number; info: number; total: number; resolved?: number; unresolved?: number };
};

export type BrownfieldDryRunRow = {
  rowNumber: number;
  routeDomainKey: string;
  addressFamily: AddressFamily;
  cidr: string;
  siteName?: string | null;
  vlanNumber?: number | null;
  ownerLabel?: string | null;
  status: "valid" | "invalid" | "duplicate" | "conflict";
  findings: string[];
};

export type BrownfieldDryRunResult = {
  sourceType?: string | null;
  sourceName?: string | null;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    conflictRows: number;
    blockedConflicts: number;
    reviewConflicts: number;
    infoConflicts: number;
  };
  rows: BrownfieldDryRunRow[];
  conflicts: BrownfieldConflict[];
  canImportWithoutReview: boolean;
};

export type EnterpriseAllocatorPlanRow = {
  family: "ipv4" | "ipv6";
  poolId: string;
  poolName: string;
  routeDomainKey: string;
  target: string;
  siteId?: string;
  vlanId?: number;
  requestedPrefix: number;
  proposedCidr?: string;
  status: "allocated" | "blocked" | "skipped";
  explanation: string;
};

export type EnterpriseAllocatorPosture = {
  currentInputHash: string;
  allocationPlanRows: EnterpriseAllocatorPlanRow[];
  reviewFindings: Array<{ code: string; severity: "info" | "review" | "blocked"; title: string; detail: string }>;
  reviewQueue: string[];
};

export type EnterpriseIpamSnapshot = {
  project?: { id: string; name: string; basePrivateRange?: string | null } | null;
  sites: Array<{ id: string; name: string; siteCode?: string | null; defaultAddressBlock?: string | null }>;
  vlans: Array<{ id: string; vlanId: number; vlanName: string; subnetCidr?: string | null; site?: { id: string; name: string; siteCode?: string | null } | null }>;
  routeDomains: EnterpriseRouteDomain[];
  ipPools: EnterpriseIpPool[];
  ipAllocations: EnterpriseIpAllocation[];
  dhcpScopes: EnterpriseDhcpScope[];
  ipReservations: EnterpriseIpReservation[];
  brownfieldImports: EnterpriseBrownfieldImport[];
  brownfieldNetworks: EnterpriseBrownfieldNetwork[];
  brownfieldConflictResolutions: EnterpriseBrownfieldConflictResolution[];
  allocationApprovals: EnterpriseAllocationApproval[];
  allocationLedger: EnterpriseAllocationLedgerEntry[];
  brownfieldConflictReview?: BrownfieldConflictReview;
  allocatorPosture?: EnterpriseAllocatorPosture | null;
  summary: {
    routeDomainCount: number;
    poolCount: number;
    allocationCount: number;
    dhcpScopeCount: number;
    reservationCount: number;
    brownfieldNetworkCount: number;
    approvalCount: number;
    ledgerEntryCount: number;
    currentInputHash?: string | null;
    allocationPlanRowCount?: number;
    brownfieldBlockedConflictCount?: number;
    brownfieldReviewConflictCount?: number;
    brownfieldResolvedConflictCount?: number;
    brownfieldUnresolvedConflictCount?: number;
    hasIpv6Pools: boolean;
    hasBrownfieldEvidence: boolean;
  };
};

export function getEnterpriseIpamSnapshot(projectId: string) {
  return api<EnterpriseIpamSnapshot>(`/enterprise-ipam/projects/${projectId}`);
}
export function createRouteDomain(projectId: string, input: Record<string, unknown>) { return api<EnterpriseRouteDomain>(`/enterprise-ipam/projects/${projectId}/route-domains`, { method: "POST", body: JSON.stringify(input) }); }

export function updateRouteDomain(id: string, input: Record<string, unknown>) { return api<EnterpriseRouteDomain>(`/enterprise-ipam/route-domains/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function updateIpPool(id: string, input: Record<string, unknown>) { return api<EnterpriseIpPool>(`/enterprise-ipam/ip-pools/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function updateIpAllocation(id: string, input: Record<string, unknown>) { return api<EnterpriseIpAllocation>(`/enterprise-ipam/ip-allocations/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function updateDhcpScope(id: string, input: Record<string, unknown>) { return api<EnterpriseDhcpScope>(`/enterprise-ipam/dhcp-scopes/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function updateIpReservation(id: string, input: Record<string, unknown>) { return api<EnterpriseIpReservation>(`/enterprise-ipam/reservations/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function updateBrownfieldNetwork(id: string, input: Record<string, unknown>) { return api<EnterpriseBrownfieldNetwork>(`/enterprise-ipam/brownfield-networks/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }

export function deleteRouteDomain(id: string) { return api<void>(`/enterprise-ipam/route-domains/${id}`, { method: "DELETE" }); }
export function createIpPool(projectId: string, input: Record<string, unknown>) { return api<EnterpriseIpPool>(`/enterprise-ipam/projects/${projectId}/ip-pools`, { method: "POST", body: JSON.stringify(input) }); }
export function deleteIpPool(id: string) { return api<void>(`/enterprise-ipam/ip-pools/${id}`, { method: "DELETE" }); }
export function createIpAllocation(projectId: string, input: Record<string, unknown>) { return api<EnterpriseIpAllocation>(`/enterprise-ipam/projects/${projectId}/ip-allocations`, { method: "POST", body: JSON.stringify(input) }); }
export function createAllocationFromPlan(projectId: string, input: Record<string, unknown>) { return api<EnterpriseIpAllocation>(`/enterprise-ipam/projects/${projectId}/ip-allocations/from-plan`, { method: "POST", body: JSON.stringify(input) }); }
export function updateIpAllocationStatus(id: string, input: { status: IpAllocationStatus; summary?: string; designInputHash?: string }) { return api<EnterpriseIpAllocation>(`/enterprise-ipam/ip-allocations/${id}/status`, { method: "PATCH", body: JSON.stringify(input) }); }
export function deleteIpAllocation(id: string) { return api<void>(`/enterprise-ipam/ip-allocations/${id}`, { method: "DELETE" }); }
export function createDhcpScope(projectId: string, input: Record<string, unknown>) { return api<EnterpriseDhcpScope>(`/enterprise-ipam/projects/${projectId}/dhcp-scopes`, { method: "POST", body: JSON.stringify(input) }); }
export function deleteDhcpScope(id: string) { return api<void>(`/enterprise-ipam/dhcp-scopes/${id}`, { method: "DELETE" }); }
export function createIpReservation(projectId: string, input: Record<string, unknown>) { return api<EnterpriseIpReservation>(`/enterprise-ipam/projects/${projectId}/reservations`, { method: "POST", body: JSON.stringify(input) }); }
export function deleteIpReservation(id: string) { return api<void>(`/enterprise-ipam/reservations/${id}`, { method: "DELETE" }); }
export function previewBrownfieldImport(projectId: string, input: Record<string, unknown>) { return api<BrownfieldDryRunResult>(`/enterprise-ipam/projects/${projectId}/brownfield-imports/dry-run`, { method: "POST", body: JSON.stringify(input) }); }
export function getBrownfieldConflictReview(projectId: string) { return api<BrownfieldConflictReview>(`/enterprise-ipam/projects/${projectId}/brownfield-conflicts`); }
export function createBrownfieldImport(projectId: string, input: Record<string, unknown>) { return api<EnterpriseBrownfieldImport>(`/enterprise-ipam/projects/${projectId}/brownfield-imports`, { method: "POST", body: JSON.stringify(input) }); }
export function deleteBrownfieldNetwork(id: string) { return api<void>(`/enterprise-ipam/brownfield-networks/${id}`, { method: "DELETE" }); }
export function createAllocationApproval(projectId: string, input: Record<string, unknown>) { return api<EnterpriseAllocationApproval>(`/enterprise-ipam/projects/${projectId}/allocation-approvals`, { method: "POST", body: JSON.stringify(input) }); }

export function createBrownfieldConflictResolution(projectId: string, input: Record<string, unknown>) { return api<EnterpriseBrownfieldConflictResolution>(`/enterprise-ipam/projects/${projectId}/brownfield-conflict-resolutions`, { method: "POST", body: JSON.stringify(input) }); }
