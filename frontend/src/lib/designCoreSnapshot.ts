import type { SegmentRole } from "./networkValidators";

export type DesignCoreTruthState = "configured" | "inferred" | "proposed";
export type DesignCoreIssueSeverity = "ERROR" | "WARNING" | "INFO";

export interface DesignCoreIssue {
  severity: DesignCoreIssueSeverity;
  code: string;
  title: string;
  detail: string;
  entityType: "PROJECT" | "SITE" | "VLAN";
  entityId?: string;
}

export interface DesignCoreSiteBlock {
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  sourceValue?: string | null;
  canonicalCidr?: string;
  proposedCidr?: string;
  truthState: DesignCoreTruthState;
  validationState: "valid" | "invalid";
  rangeSummary?: string;
  inOrganizationBlock: boolean | null;
  overlapsWithSiteIds: string[];
  notes: string[];
}

export interface DesignCoreAddressRow {
  id: string;
  siteId: string;
  siteName: string;
  siteCode?: string | null;
  vlanId: number;
  vlanName: string;
  role: SegmentRole;
  truthState: DesignCoreTruthState;
  sourceSubnetCidr: string;
  canonicalSubnetCidr?: string;
  proposedSubnetCidr?: string;
  sourceGatewayIp: string;
  effectiveGatewayIp?: string;
  proposedGatewayIp?: string;
  siteBlockCidr?: string | null;
  inSiteBlock: boolean | null;
  estimatedHosts: number | null;
  recommendedPrefix?: number;
  usableHosts?: number;
  capacityState: "unknown" | "fits" | "undersized";
  gatewayState: "valid" | "invalid" | "fallback";
  gatewayConvention: "first-usable" | "last-usable" | "custom" | "not-applicable";
  dhcpEnabled: boolean;
  notes: string[];
}

export interface DesignCoreSnapshot {
  projectId: string;
  projectName: string;
  generatedAt: string;
  authority?: {
    source: "backend-design-core";
    mode: "authoritative";
    generatedAt: string;
    requiresEngineerReview: true;
  };
  organizationBlock?: {
    sourceValue?: string | null;
    canonicalCidr?: string;
    validationState: "valid" | "invalid" | "missing";
    notes: string[];
  };
  summary: {
    siteCount: number;
    vlanCount: number;
    validSiteBlockCount: number;
    validSubnetCount: number;
    issueCount: number;
    proposedSiteBlockCount: number;
    proposalCount: number;
    planningInputNotReflectedCount: number;
    traceabilityCount: number;
    summarizationReviewCount: number;
    transitPlanCount: number;
    loopbackPlanCount: number;
    readyForBackendAuthority: boolean;
    readyForLiveMappingSplit: boolean;
  };
  allocationPolicy?: {
    siteAllocationMode: "configured" | "mixed" | "backend-proposed";
    gatewayMode: "first-usable" | "last-usable" | "mixed" | "custom" | "not-applicable";
    transitMode: "/31-preferred" | "deferred";
    loopbackMode: "/32-per-site" | "deferred";
    notes: string[];
  };
  engineConfidence?: {
    state: "low" | "medium" | "high";
    score: number;
    drivers: string[];
    notes: string[];
  };
  allocatorDeterminism?: {
    state: "high" | "medium" | "low";
    evaluationOrder: string[];
    blockingConditions: string[];
    notes: string[];
  };
  siteBlocks: DesignCoreSiteBlock[];
  addressingRows: DesignCoreAddressRow[];
  proposedRows: unknown[];
  issues: DesignCoreIssue[];
}

export function designCoreAuthorityLabel(snapshot?: DesignCoreSnapshot | null) {
  if (!snapshot) return "Frontend preview";
  if (snapshot.summary.readyForBackendAuthority) return "Backend design-core snapshot";
  return "Backend snapshot with blockers";
}

export function designCoreAuthorityDetail(snapshot?: DesignCoreSnapshot | null) {
  if (!snapshot) return "Using browser-side preview only until the backend design-core snapshot loads; do not treat this as final design truth.";
  const generated = new Date(snapshot.authority?.generatedAt ?? snapshot.generatedAt).toLocaleString();
  const blockerCount = snapshot.issues.filter((issue) => issue.severity === "ERROR").length;
  const reviewNote = snapshot.authority?.requiresEngineerReview ? "engineer review required" : "review required";
  return `${snapshot.summary.vlanCount} address rows • ${snapshot.summary.validSubnetCount} valid subnets • ${blockerCount} blocker${blockerCount === 1 ? "" : "s"} • generated ${generated} • ${reviewNote}`;
}
