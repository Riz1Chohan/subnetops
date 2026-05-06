#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[root-blocker-taxonomy-authority] ${message}`); process.exit(1); };
const mustInclude = (rel, marker) => { if (!read(rel).includes(marker)) fail(`${rel} missing ${marker}`); };
const mustNotInclude = (rel, marker) => { if (read(rel).includes(marker)) fail(`${rel} still contains forbidden marker ${marker}`); };

mustInclude('backend/src/domain/validation/root-blocker-taxonomy.ts', 'V1_ROOT_BLOCKER_TAXONOMY_CONTRACT');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.ts', 'classifyV1RootBlockerTaxonomy');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.ts', 'ROOT_ELIGIBLE_RULE_CODES');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.ts', 'PROPAGATED_RULE_CODES');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.ts', 'REVIEW_ONLY_RULE_CODES');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.ts', 'rootProof');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.ts', 'DERIVED_IMPACT');

mustInclude('backend/src/domain/validation/root-blocker-taxonomy.selftest.ts', 'without root proof must be review-required');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.selftest.ts', 'Propagated report truth must be de-escalated');
mustInclude('backend/src/domain/validation/root-blocker-taxonomy.selftest.ts', 'Candidate/review IPAM authority must not become a root blocker');

mustInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'classifyV1RootBlockerTaxonomy');
mustInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'findingClass: hasRootProof ? "ROOT_BLOCKER" : "REVIEW_ITEM"');
mustInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'findingClass: "PROPAGATED_BLOCKER"');
mustInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'findingClass: routingCategory === "BLOCKING" ? "DERIVED_IMPACT" : "REVIEW_ITEM"');
mustInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', 'findingClass: issueCategory === "BLOCKING" ? "ROOT_BLOCKER" : "REVIEW_ITEM"');

for (const marker of ['HARD_BLOCKER_PATTERNS', 'REVIEW_ONLY_AUTHORITY_PATTERNS', 'PROPAGATED_BOUNDARY_PATTERNS', 'matchesAny(', 'combinedFindingText(']) {
  mustNotInclude('backend/src/services/designCore/designCore.validationReadinessControl.ts', marker);
}

mustInclude('backend/package.json', 'selftest:root-blocker-taxonomy');
mustInclude('package.json', 'check-root-blocker-taxonomy-authority.cjs');
mustInclude('scripts/check-regression-kill-switches.cjs', 'check-root-blocker-taxonomy-authority.cjs');

console.log('[root-blocker-taxonomy-authority] ok');
