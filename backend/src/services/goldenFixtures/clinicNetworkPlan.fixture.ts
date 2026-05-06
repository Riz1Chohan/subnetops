export const CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE_VERSION = "V1_CLINIC_GOLDEN_EXPORT_FIXTURE" as const;

export type ClinicGoldenExportReadiness = "BLOCKED" | "REVIEW_REQUIRED" | "READY";

export interface ClinicGoldenExportFixture {
  fixtureVersion: typeof CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE_VERSION;
  purpose: "freeze-known-export-truth-contradiction";
  documentationPolicy: {
    durableDocumentationTarget: "README.md";
    forbidAdditionalMarkdownNotes: true;
  };
  reportBoundary: {
    audience: "network-engineer";
    professionalOnly: true;
    developerFacingContentAllowed: false;
    forbiddenReportTerms: string[];
  };
  capturedExport: {
    projectName: "Clinic Network Plan";
    organization: "Rizwan's Clinic";
    environment: "Hybrid";
    generatedAt: "2026-05-05T09:57:36.000-04:00";
    reportExportReadiness: ClinicGoldenExportReadiness;
    approvalPosture: "Not ready for approval";
    materializedSites: 3;
    requirementSelectedSites: 3;
    addressingRows: 39;
    requirementOutputGaps: 0;
    securityZones: 7;
    executiveSummaryRootBlockers: 11;
    executiveSummaryWarnings: 174;
    legacyValidationRollupRootBlockers: 50;
    omittedEvidenceRows: 543;
    omittedEvidenceSurfaces: 23;
    hiddenOmittedBlockers: true;
    hiddenOmittedReviewRequired: true;
    implementationAllowed: false;
    implementationStepCount: 168;
    implementationReviewStepCount: 167;
    implementationBlockingFindingCount: 2;
    ipamCandidateAllocations: 39;
    ipamApprovedAllocations: 0;
    candidateIpamMustNotBeCalledReadyAuthority: true;
  };
  expectedCorrectedInvariants: {
    validationLedgerIsAuthoritative: true;
    exportLayerMayNotReclassifyFindings: true;
    rootBlockersCountedFromFindingClassOnly: true;
    propagatedBlockersDoNotInflateRootBlockers: true;
    candidateIpamIsReviewRequiredNotApprovedAuthority: true;
    professionalReportContainsNoDeveloperRepairNarrative: true;
    allExportFormatsUseSameEvidenceView: true;
    reportCountSurfaces: string[];
  };
}

export const CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE: ClinicGoldenExportFixture = {
  fixtureVersion: CLINIC_NETWORK_PLAN_GOLDEN_FIXTURE_VERSION,
  purpose: "freeze-known-export-truth-contradiction",
  documentationPolicy: {
    durableDocumentationTarget: "README.md",
    forbidAdditionalMarkdownNotes: true,
  },
  reportBoundary: {
    audience: "network-engineer",
    professionalOnly: true,
    developerFacingContentAllowed: false,
    forbiddenReportTerms: [
      "developer note",
      "selftest",
      "fixture",
      "repair phase",
      "chat commentary",
      "debug dump",
      "code snippet",
      "implementation TODO",
      "internal engine-room note",
    ],
  },
  capturedExport: {
    projectName: "Clinic Network Plan",
    organization: "Rizwan's Clinic",
    environment: "Hybrid",
    generatedAt: "2026-05-05T09:57:36.000-04:00",
    reportExportReadiness: "BLOCKED",
    approvalPosture: "Not ready for approval",
    materializedSites: 3,
    requirementSelectedSites: 3,
    addressingRows: 39,
    requirementOutputGaps: 0,
    securityZones: 7,
    executiveSummaryRootBlockers: 11,
    executiveSummaryWarnings: 174,
    legacyValidationRollupRootBlockers: 50,
    omittedEvidenceRows: 543,
    omittedEvidenceSurfaces: 23,
    hiddenOmittedBlockers: true,
    hiddenOmittedReviewRequired: true,
    implementationAllowed: false,
    implementationStepCount: 168,
    implementationReviewStepCount: 167,
    implementationBlockingFindingCount: 2,
    ipamCandidateAllocations: 39,
    ipamApprovedAllocations: 0,
    candidateIpamMustNotBeCalledReadyAuthority: true,
  },
  expectedCorrectedInvariants: {
    validationLedgerIsAuthoritative: true,
    exportLayerMayNotReclassifyFindings: true,
    rootBlockersCountedFromFindingClassOnly: true,
    propagatedBlockersDoNotInflateRootBlockers: true,
    candidateIpamIsReviewRequiredNotApprovedAuthority: true,
    professionalReportContainsNoDeveloperRepairNarrative: true,
    allExportFormatsUseSameEvidenceView: true,
    reportCountSurfaces: [
      "executive-summary",
      "validation-strategy",
      "validation-rollup",
      "risks-open-review-items",
      "json-export",
      "csv-export",
      "pdf-export",
      "docx-export",
    ],
  },
};
