// V1_ENGINE2_IPAM_AUTHORITY_STATE_CONTRACT
// Engine 1 planned math, Engine 2 candidate records, and Engine 2 approved authority
// are deliberately separate states. Candidate IPAM is materialized evidence, not
// implementation authority.

export type V1IpamAuthorityState =
  | "ENGINE1_PLANNED_ONLY"
  | "ENGINE2_CANDIDATE_ALLOCATION"
  | "ENGINE2_APPROVED_ALLOCATION"
  | "ENGINE2_APPROVED_WITH_REVIEW_NOTES"
  | "ENGINE2_STALE_APPROVAL"
  | "ENGINE2_CONFLICT_BLOCKED"
  | "ENGINE2_IMPORTED_BROWNFIELD_CONFLICT";

export type V1IpamSourceTruth = "ENGINE1_PLANNED" | "CANDIDATE_IPAM" | "APPROVED_IPAM";

export function normalizeAllocationStatus(value: unknown): string {
  return String(value ?? "PROPOSED").trim().toUpperCase() || "PROPOSED";
}

export function isApprovedIpamAllocationStatus(value: unknown): boolean {
  const status = normalizeAllocationStatus(value);
  return status === "APPROVED" || status === "IMPLEMENTED";
}

export function isCandidateIpamAllocationStatus(value: unknown): boolean {
  const status = normalizeAllocationStatus(value);
  return status === "PROPOSED" || status === "CANDIDATE_REVIEW" || status === "REVIEW_REQUIRED";
}

export function isRejectedOrSupersededIpamAllocationStatus(value: unknown): boolean {
  const status = normalizeAllocationStatus(value);
  return status === "REJECTED" || status === "SUPERSEDED";
}

export function sourceTruthForIpamAuthorityState(state: V1IpamAuthorityState): V1IpamSourceTruth {
  if (state === "ENGINE2_APPROVED_ALLOCATION" || state === "ENGINE2_APPROVED_WITH_REVIEW_NOTES") return "APPROVED_IPAM";
  if (state === "ENGINE2_CANDIDATE_ALLOCATION") return "CANDIDATE_IPAM";
  return "ENGINE1_PLANNED";
}

export function ipamAuthorityEvidenceLabel(params: { cidr?: string; status?: unknown; approvedHashMatches?: boolean }): string {
  if (!params.cidr) return "No Engine 2 allocation object exists for this Engine 1 planned row.";
  const status = normalizeAllocationStatus(params.status);
  if (isApprovedIpamAllocationStatus(status)) {
    const hashText = params.approvedHashMatches ? "current input hash matches" : "input hash requires review";
    return `Engine 2 approved allocation ${params.cidr} status ${status}; ${hashText}.`;
  }
  return `Engine 2 candidate allocation ${params.cidr} status ${status}; not implementation authority.`;
}
