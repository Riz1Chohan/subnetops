import assert from "node:assert/strict";
import { CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE, CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE_VERSION } from "./goldenFixtures/clinicNetworkPlan.fixture.js";

const fixture = CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE;

assert.equal(fixture.fixtureVersion, CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE_VERSION);
assert.equal(fixture.purpose, "freeze-known-export-truth-contradiction");
assert.equal(fixture.documentationPolicy.durableDocumentationTarget, "README.md");
assert.equal(fixture.documentationPolicy.forbidAdditionalMarkdownNotes, true);

assert.equal(fixture.reportBoundary.audience, "network-engineer");
assert.equal(fixture.reportBoundary.professionalOnly, true);
assert.equal(fixture.reportBoundary.developerFacingContentAllowed, false);
for (const term of ["developer note", "selftest", "fixture", "repair phase", "chat commentary", "debug dump", "code snippet"]) {
  assert.ok(fixture.reportBoundary.forbiddenReportTerms.includes(term), `professional report boundary must forbid ${term}`);
}

assert.equal(fixture.capturedExport.projectName, "Clinic Network Plan");
assert.equal(fixture.capturedExport.materializedSites, 3);
assert.equal(fixture.capturedExport.requirementSelectedSites, 3);
assert.equal(fixture.capturedExport.addressingRows, 39);
assert.equal(fixture.capturedExport.requirementOutputGaps, 0);
assert.equal(fixture.capturedExport.securityZones, 7);
assert.equal(fixture.capturedExport.reportExportReadiness, "BLOCKED");
assert.equal(fixture.capturedExport.implementationAllowed, false);

assert.equal(fixture.capturedExport.executiveSummaryRootBlockers, 11);
assert.equal(fixture.capturedExport.legacyValidationRollupRootBlockers, 50);
assert.notEqual(
  fixture.capturedExport.executiveSummaryRootBlockers,
  fixture.capturedExport.legacyValidationRollupRootBlockers,
  "The golden fixture must preserve the captured 11-vs-50 blocker-count contradiction until the validation ledger/export repair removes it.",
);

assert.equal(fixture.capturedExport.executiveSummaryWarnings, 174);
assert.equal(fixture.capturedExport.omittedEvidenceRows, 543);
assert.equal(fixture.capturedExport.omittedEvidenceSurfaces, 23);
assert.equal(fixture.capturedExport.hiddenOmittedBlockers, true);
assert.equal(fixture.capturedExport.hiddenOmittedReviewRequired, true);

assert.equal(fixture.capturedExport.ipamCandidateAllocations, 39);
assert.equal(fixture.capturedExport.ipamApprovedAllocations, 0);
assert.equal(fixture.capturedExport.candidateIpamMustNotBeCalledReadyAuthority, true);

const invariants = fixture.expectedCorrectedInvariants;
assert.equal(invariants.validationLedgerIsAuthoritative, true);
assert.equal(invariants.exportLayerMayNotReclassifyFindings, true);
assert.equal(invariants.rootBlockersCountedFromFindingClassOnly, true);
assert.equal(invariants.propagatedBlockersDoNotInflateRootBlockers, true);
assert.equal(invariants.candidateIpamIsReviewRequiredNotApprovedAuthority, true);
assert.equal(invariants.professionalReportContainsNoDeveloperRepairNarrative, true);
assert.equal(invariants.allExportFormatsUseSameEvidenceView, true);
for (const surface of ["executive-summary", "validation-rollup", "json-export", "csv-export", "pdf-export", "docx-export"]) {
  assert.ok(invariants.reportCountSurfaces.includes(surface), `corrected invariant must cover ${surface}`);
}

console.log("[V1] clinic golden export fixture selftest passed");
