#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function assertIncludes(file, needles) {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`[readiness-ladder] ${file} missing: ${needle}`);
      process.exit(1);
    }
  }
}

assertIncludes('backend/src/domain/readiness/readiness-ladder.ts', [
  'V1_READINESS_LADDER_CONTRACT',
  'BLOCKED',
  'REVIEW_REQUIRED',
  'DRAFT',
  'PLANNING_READY',
  'IMPLEMENTATION_READY',
  'READINESS_INVALID_ADDRESSING_BLOCKER',
  'READINESS_MISSING_CAPACITY_REVIEW_REQUIRED',
  'READINESS_INFERRED_SECURITY_POLICY_REVIEW_REQUIRED',
  'READINESS_OMITTED_BLOCKER_VISIBLE',
  'READINESS_UNVALIDATED_GENERATED_OBJECT_BLOCKER',
  'implementationOutputAllowed: overallReadiness === "IMPLEMENTATION_READY"',
  'reportMayClaimImplementationReady: overallReadiness === "IMPLEMENTATION_READY"',
  'diagramMayShowCleanProductionTruth: overallReadiness === "IMPLEMENTATION_READY"',
  'aiMayProduceAuthority: false',
]);

assertIncludes('backend/src/services/designCore/designCore.readinessLadderControl.ts', [
  'buildV1ReadinessLadderControl',
  'V1RequirementsMaterialization',
  'V1CidrAddressingTruth',
  'V1EnterpriseIpamTruth',
  'V1ValidationReadiness',
  'V1SecurityPolicyFlow',
  'V1ImplementationPlanning',
  'V1ImplementationTemplates',
  'V1ReportExportTruth',
  'V1DiagramTruth',
  'V1AiDraftHelper',
  'omittedHasBlockers',
  'omittedHasReviewRequired',
]);

assertIncludes('backend/src/services/designCore.service.ts', [
  'buildV1ReadinessLadderControl',
  'const V1ReadinessLadder = buildV1ReadinessLadderControl',
  'summary.readinessLadder = V1ReadinessLadder.overallReadiness',
  'summary.readinessLadderAllowsImplementation = V1ReadinessLadder.implementationOutputAllowed',
  'V1ReadinessLadder,',
]);

assertIncludes('backend/src/services/exportDesignCoreReport.service.ts', [
  'Central Readiness Ladder Gate',
  'readinessLadderAllowsImplementation',
  'does not allow implementation-ready language',
  'report may claim implementation-ready',
]);

assertIncludes('backend/src/services/export.service.ts', [
  'V1 Central Readiness Ladder',
  'V1 Readiness Ladder Reasons',
  'reportMayClaimImplementationReady',
]);

assertIncludes('frontend/src/lib/designCoreSnapshot.ts', [
  'V1ReadinessLadderControlSummary',
  'readinessLadderAllowsImplementation',
  'readiness ladder ${readinessLadder}',
  'implementation allowed ${ladderAllowsImplementation ? "yes" : "no"}',
]);

assertIncludes('backend/src/domain/proof/final-proof.ts', [
  'V1ReadinessLadder',
  'V1_READINESS_LADDER_CONTRACT',
  'gateStateFromRows([13, 14, 20]',
  'gateStateFromRows([15, 16, 20]',
]);

assertIncludes('backend/src/domain/validation/readiness.ts', [
  "readinessLadder === 'IMPLEMENTATION_READY'",
  "'PLANNING_READY'",
]);

assertIncludes('README.md', [
  'Readiness ladder',
  'BLOCKED → REVIEW_REQUIRED → DRAFT → PLANNING_READY → IMPLEMENTATION_READY',
  'V1_READINESS_LADDER_CONTRACT',
]);

console.log('Readiness ladder enforcement check passed.');
