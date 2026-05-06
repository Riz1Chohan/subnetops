import assert from "node:assert/strict";
import {
  ipamAuthorityEvidenceLabel,
  isApprovedIpamAllocationStatus,
  isCandidateIpamAllocationStatus,
  sourceTruthForIpamAuthorityState,
} from "./authority-state.js";

assert.equal(isApprovedIpamAllocationStatus("APPROVED"), true, "Approved allocations become authority");
assert.equal(isApprovedIpamAllocationStatus("IMPLEMENTED"), true, "Implemented allocations become authority");
assert.equal(isCandidateIpamAllocationStatus("CANDIDATE_REVIEW"), true, "Candidate review is materialized evidence only");
assert.equal(sourceTruthForIpamAuthorityState("ENGINE2_CANDIDATE_ALLOCATION"), "CANDIDATE_IPAM", "candidate IPAM is not approved authority");
assert.equal(sourceTruthForIpamAuthorityState("ENGINE2_APPROVED_ALLOCATION"), "APPROVED_IPAM", "approved IPAM is authority");
assert.match(ipamAuthorityEvidenceLabel({ cidr: "10.60.0.0/24", status: "CANDIDATE_REVIEW" }), /not implementation authority/, "candidate allocation wording must not overclaim");
assert.match(ipamAuthorityEvidenceLabel({ cidr: "10.60.0.0/24", status: "APPROVED", approvedHashMatches: true }), /approved allocation/, "approved allocation wording must be explicit");

console.log("[authority-state.selftest] ok");
