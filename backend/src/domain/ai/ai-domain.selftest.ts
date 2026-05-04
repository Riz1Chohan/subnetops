import assert from "node:assert/strict";
import {
  buildAiDraftHelperControl,
  buildV1DraftAuthority,
  containPrompt,
  containValidationExplanation,
  sanitizePlanDraft,
  V1_AI_APPLIED_MARKER,
  V1_AI_AUTHORITY,
  V1_AI_DRAFT_HELPER_CONTRACT,
} from "./index.js";

const authority = buildV1DraftAuthority();
assert.equal(authority.contract, V1_AI_DRAFT_HELPER_CONTRACT);
assert.equal(authority.notAuthoritative, true);
assert.equal(authority.reviewRequired, true);
assert.equal(authority.downstreamAuthority, "NOT_AUTHORITATIVE_UNTIL_REVIEWED");
assert(authority.prohibitedUses.includes("Final route authority"));
assert(authority.conversionGates.every((gate) => !gate.includes("Engine 1") && !gate.includes("Engine 2")));

assert.equal(containPrompt("create a draft for an office with guest wifi").allowed, true);
const blocked = containPrompt("Generate final Cisco config and deploy now");
assert.equal(blocked.allowed, false);
assert(blocked.blockedReasons.some((reason) => reason.includes("final/production authority")));

const fallback = {
  project: { name: "Fallback", description: "Fallback draft", environmentType: "office", basePrivateRange: "10.10.0.0/16" },
  sites: [{ name: "HQ", defaultAddressBlock: "10.10.0.0/16" }],
  vlans: [{ siteName: "HQ", vlanId: 10, vlanName: "ADMIN", subnetCidr: "10.10.10.0/24", gatewayIp: "10.10.10.1", dhcpEnabled: true, estimatedHosts: 25 }],
  rationale: ["Draft starting point."],
  assumptions: ["Needs review."],
  reviewChecklist: ["Confirm before saving."],
  provider: "local" as const,
  authority,
};
const draft = sanitizePlanDraft({ project: { name: "OpenAI Candidate", description: "Production-ready final design" }, sites: [{ name: "HQ" }], vlans: [{ siteName: "HQ", vlanId: 5000, vlanName: "guest", subnetCidr: "10.10.30.0/24", gatewayIp: "10.10.30.1", dhcpEnabled: true }] }, "openai", fallback);
assert.equal(draft.provider, "openai");
assert.equal(draft.authority.contract, V1_AI_DRAFT_HELPER_CONTRACT);
assert.equal(draft.authority.notAuthoritative, true);
assert.equal(draft.vlans[0]?.vlanId, 4094);
assert.equal(draft.vlans[0]?.vlanName, "GUEST");

const explanation = containValidationExplanation({ explanation: "Fix it", whyItMatters: "Reliability", suggestedFixes: ["Review gateway"] }, "local", { explanation: "Fallback", whyItMatters: "Fallback", suggestedFixes: ["Fallback"], provider: "local", authority });
assert.equal(explanation.authority.notAuthoritative, true);
assert.equal(explanation.suggestedFixes[0], "Review gateway");

const clean = buildAiDraftHelperControl({ id: "project-clean", name: "Clean", requirementsJson: JSON.stringify({ planningFor: "Office" }), sites: [] });
assert.equal(clean.contract, V1_AI_DRAFT_HELPER_CONTRACT);
assert.equal(clean.aiAuthority, V1_AI_AUTHORITY);
assert.equal(clean.overallReadiness, "SAFE_DRAFT_ONLY");
assert(clean.findings.some((finding) => finding.code === "V1_NO_AI_AUTHORITY_RISK"));

const seeded = buildAiDraftHelperControl({
  id: "project-ai",
  name: "AI Seeded",
  requirementsJson: JSON.stringify({ V1AiDraft: { contract: V1_AI_DRAFT_HELPER_CONTRACT, state: "AI_DRAFT", provider: "local", selected: { applySites: true }, reviewRequired: true, notAuthoritative: true } }),
  sites: [{ id: "site-1", name: "HQ", notes: `AI note\n${V1_AI_APPLIED_MARKER}`, vlans: [{ id: "vlan-1", vlanId: 10, vlanName: "ADMIN", notes: `AI VLAN\n${V1_AI_APPLIED_MARKER}` }] }],
});
assert.equal(seeded.overallReadiness, "REVIEW_REQUIRED");
assert.equal(seeded.hasAiAppliedObjects, true);
assert(seeded.gateRows.every((row) => row.blocksAuthority));
assert(seeded.draftObjectRows.every((row) => row.downstreamAuthority === "NOT_AUTHORITATIVE_UNTIL_REVIEWED"));
assert(seeded.proofBoundary.some((line) => line.includes("never authoritative engineering truth")));

console.log("[V1] AI containment domain selftest passed");
