#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[requirement-closure-blocker-proof] ${message}`); process.exit(1); };
const mustInclude = (rel, marker) => { if (!read(rel).includes(marker)) fail(`${rel} missing ${marker}`); };
const mustNotInclude = (rel, marker) => { if (read(rel).includes(marker)) fail(`${rel} still contains forbidden marker ${marker}`); };

mustInclude('backend/src/domain/requirements/closure-proof.ts', 'V1_REQUIREMENT_CLOSURE_BLOCKER_PROOF_CONTRACT');
mustInclude('backend/src/domain/requirements/closure-proof.ts', 'evaluateRequirementClosureBlockerProof');
mustInclude('backend/src/domain/requirements/closure-proof.ts', 'missingMandatoryConsumers.length > 0');
mustInclude('backend/src/domain/requirements/closure-proof.ts', 'requiredSourceObjectMissing');
mustInclude('backend/src/domain/requirements/closure-proof.ts', 'engineOutputContradiction');
mustInclude('backend/src/domain/requirements/closure-proof.selftest.ts', 'cannot be blocked without mandatory missing consumer');
mustInclude('backend/src/domain/requirements/closure-proof.selftest.ts', 'Mandatory missing consumers are blocker proof');
mustInclude('backend/src/domain/requirements/closure-proof.selftest.ts', 'Inactive/no-op requirements must not create blockers');

mustInclude('backend/src/services/designCore/designCore.requirementsClosureControl.ts', 'evaluateRequirementClosureBlockerProof');
mustInclude('backend/src/services/designCore/designCore.requirementsClosureControl.ts', 'blockedReason');
mustInclude('backend/src/services/designCore/designCore.requirementsClosureControl.ts', 'lifecycleProofStatus');
mustInclude('backend/src/services/designCore/designCore.requirementsClosureControl.ts', 'outcome.materializationStatus === "validation-blocker") return "REVIEW_REQUIRED"');
mustInclude('backend/src/services/designCore/designCore.requirementsClosureControl.ts', 'lifecycleStatus === "BLOCKED" && Boolean(row.blockedReason)');
mustInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'blocker proof: ${blockedReason || "not proven"}');
mustInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'category: hasRootProof ? category : category === "BLOCKING" ? "REVIEW_REQUIRED" : category');
mustInclude('backend/src/domain/reporting/report-export-truth.ts', 'hasRequirementBlockerProof');

mustNotInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'no mandatory consumer gap recorded');
mustNotInclude('backend/src/services/designCore/designCore.requirementsClosureControl.ts', 'validation-blocker") return "BLOCKED"');

mustInclude('backend/package.json', 'selftest:requirements-closure-proof');
mustInclude('package.json', 'check-requirement-closure-blocker-proof.cjs');
mustInclude('scripts/check-regression-kill-switches.cjs', 'check-requirement-closure-blocker-proof.cjs');

console.log('[requirement-closure-blocker-proof] ok');
