import assert from "node:assert/strict";
import {
  buildPhase19AiDraftHelperControl,
  PHASE19_AI_APPLIED_MARKER,
  PHASE19_AI_AUTHORITY,
  PHASE19_AI_DRAFT_HELPER_CONTRACT,
} from "../services/designCore/designCore.phase19AiDraftHelperControl.js";

function runPhase19AiDraftHelperSelftest() {
  const clean = buildPhase19AiDraftHelperControl({
    id: "project-clean",
    name: "Clean Manual Project",
    requirementsJson: JSON.stringify({ planningFor: "Office" }),
    sites: [],
  });

  assert.equal(clean.contract, PHASE19_AI_DRAFT_HELPER_CONTRACT);
  assert.equal(clean.role, "AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY");
  assert.equal(clean.aiAuthority, PHASE19_AI_AUTHORITY);
  assert.equal(clean.overallReadiness, "SAFE_DRAFT_ONLY");
  assert.equal(clean.aiDerivedObjectCount, 0);
  assert.ok(clean.findings.some((finding) => finding.code === "PHASE19_NO_AI_AUTHORITY_RISK"));

  const aiSeeded = buildPhase19AiDraftHelperControl({
    id: "project-ai",
    name: "AI Seeded Project",
    requirementsJson: JSON.stringify({
      planningFor: "Clinic",
      phase19AiDraft: {
        contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
        state: "AI_DRAFT",
        provider: "local",
        selected: { applyProjectFields: true, applySites: true, applyVlans: true },
        reviewRequired: true,
        notAuthoritative: true,
      },
    }),
    sites: [
      {
        id: "site-1",
        name: "HQ",
        notes: `AI site note\n${PHASE19_AI_APPLIED_MARKER}`,
        vlans: [
          { id: "vlan-1", vlanId: 10, vlanName: "ADMIN", notes: `AI VLAN note\n${PHASE19_AI_APPLIED_MARKER}` },
        ],
      },
    ],
  });

  assert.equal(aiSeeded.overallReadiness, "REVIEW_REQUIRED");
  assert.equal(aiSeeded.hasAiDraftMetadata, true);
  assert.equal(aiSeeded.hasAiAppliedObjects, true);
  assert.equal(aiSeeded.providerMode, "local");
  assert.ok(aiSeeded.draftObjectRows.some((row) => row.objectType === "requirement-profile" && row.state === "AI_DRAFT"));
  assert.ok(aiSeeded.draftObjectRows.some((row) => row.objectType === "site" && row.proofStatus === "REVIEW_REQUIRED"));
  assert.ok(aiSeeded.draftObjectRows.some((row) => row.objectType === "vlan" && row.downstreamAuthority === "NOT_AUTHORITATIVE_UNTIL_REVIEWED"));
  assert.ok(aiSeeded.gateRows.every((row) => row.blocksAuthority));
  assert.ok(aiSeeded.findings.some((finding) => finding.code === "PHASE19_AI_APPLIED_OBJECT_REVIEW_REQUIRED"));
  assert.ok(aiSeeded.proofBoundary.some((line) => line.includes("AI output is never authoritative")));
}

runPhase19AiDraftHelperSelftest();
console.log("[phase19] AI draft/helper selftest passed");
