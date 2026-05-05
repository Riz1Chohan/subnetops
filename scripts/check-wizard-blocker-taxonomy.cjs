#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, pattern, message) {
  const text = read(rel);
  if (!pattern.test(text)) {
    console.error(`FAIL ${rel}: ${message}`);
    process.exit(1);
  }
}

must('backend/src/services/designCore.types.ts', /V1ValidationFindingClass\s*=\s*"ROOT_BLOCKER" \| "PROPAGATED_BLOCKER" \| "DERIVED_IMPACT" \| "REVIEW_ITEM"/, 'V1 validation findings must expose root/propagated/derived/review taxonomy.');
must('backend/src/services/designCore/designCore.validationReadinessControl.ts', /classifyValidationFinding/, 'Validation readiness must classify findings before counting.');
must('backend/src/services/designCore/designCore.validationReadinessControl.ts', /DOWNSTREAM_ECHO_RULES/, 'Downstream report\/diagram\/implementation blockers must be separated from root blockers.');
must('backend/src/services/designCore/designCore.validationReadinessControl.ts', /REVIEW_ONLY_AUTHORITY_PATTERNS/, 'Wizard-generated candidate authority gaps must be review-required unless hard invalid evidence exists.');
must('backend/src/services/designCore/designCore.validationReadinessControl.ts', /rootBlockerCount/, 'Validation summary must publish root blocker counts.');
must('backend/src/services/designCore/designCore.validationReadinessControl.ts', /sourceSnapshotPath\.startsWith\("V1RequirementsClosure"\)/, 'Requirements coverage must not count all V1 findings.');
must('backend/src/services/designCore/designCore.validationReadinessControl.ts', /sourceSnapshotPath\.startsWith\("V1CidrAddressingTruth"\)/, 'CIDR coverage must not count all V1 findings.');
must('backend/src/services/designCore/designCore.validationReadinessControl.ts', /sourceSnapshotPath\.startsWith\("V1EnterpriseIpamTruth"\)/, 'IPAM coverage must not count all V1 findings.');
must('backend/src/services/validation.service.ts', /severityForV1ValidationFinding/, 'Saved validation results must use root-blocker taxonomy, not raw downstream block state.');
must('backend/src/services/validation.service.ts', /V1_STRICT_READINESS_PROPAGATED_BLOCKER/, 'Propagated readiness blockers must be separately labelled.');
must('backend/src/services/validation.service.ts', /downstreamSurfaceSeverity/, 'Downstream surfaces must not inflate root ERROR rows.');
must('backend/src/services/exportDesignCoreReport.service.ts', /Root-cause taxonomy/, 'Report must expose root vs propagated blocker counts.');
must('backend/src/services/exportDesignCoreReport.service.ts', /Remediation \/ classification note/, 'Report finding table must include classification context.');
must('frontend/src/lib/designCoreSnapshot.ts', /V1ValidationFindingClass/, 'Frontend snapshot type must preserve backend taxonomy fields without computing them.');

console.log('wizard blocker taxonomy gate passed');
