import assert from "node:assert/strict";
import {
  buildV1AiDraftHelperControl,
  V1_AI_APPLIED_MARKER,
  V1_AI_AUTHORITY,
  V1_AI_DRAFT_HELPER_CONTRACT,
} from "../services/designCore/designCore.aiDraftHelperControl.js";

function runV1AiDraftHelperSelftest() {
  const clean = buildV1AiDraftHelperControl({
    id: "project-clean",
    name: "Clean Manual Project",
    requirementsJson: JSON.stringify({ planningFor: "Office" }),
    sites: [],
  });

  assert.equal(clean.contract, V1_AI_DRAFT_HELPER_CONTRACT);
  assert.equal(clean.role, "AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY");
  assert.equal(clean.aiAuthority, V1_AI_AUTHORITY);
  assert.equal(clean.overallReadiness, "SAFE_DRAFT_ONLY");
  assert.equal(clean.aiDerivedObjectCount, 0);
  assert.ok(clean.findings.some((finding) => finding.code === "V1_NO_AI_AUTHORITY_RISK"));

  const aiSeeded = buildV1AiDraftHelperControl({
    id: "project-ai",
    name: "AI Seeded Project",
    requirementsJson: JSON.stringify({
      planningFor: "Clinic",
      V1AiDraft: {
        contract: V1_AI_DRAFT_HELPER_CONTRACT,
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
        notes: `AI site note\n${V1_AI_APPLIED_MARKER}`,
        vlans: [
          { id: "vlan-1", vlanId: 10, vlanName: "ADMIN", notes: `AI VLAN note\n${V1_AI_APPLIED_MARKER}` },
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
  assert.ok(aiSeeded.findings.some((finding) => finding.code === "V1_AI_APPLIED_OBJECT_REVIEW_REQUIRED"));
  assert.ok(aiSeeded.proofBoundary.some((line) => line.includes("AI output is never authoritative")));
}

runV1AiDraftHelperSelftest();
console.log("[V1] AI draft/helper selftest passed");
