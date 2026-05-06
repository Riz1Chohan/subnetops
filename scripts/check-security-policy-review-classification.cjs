#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) { console.error(`[security-policy-review-classification] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const classifier = read('backend/src/domain/security-policy/review-classifier.ts');
for (const token of [
  'STRUCTURAL_BLOCKER',
  'DIRECT_POLICY_CONFLICT_BLOCKER',
  'PLANNING_REVIEW_ITEM',
  'ADVISORY_ITEM',
  'SECURITY_POLICY_SOURCE_ZONE_MISSING',
  'SECURITY_NAT_SOURCE_ZONE_MISSING',
  'SECURITY_FLOW_POLICY_CONFLICT',
  'SECURITY_FLOW_POLICY_MISSING',
  'SECURITY_FLOW_NAT_MISSING',
  'SECURITY_NAT_REQUIRED_FLOW_UNCOVERED',
  'SECURITY_NAT_RULE_WITHOUT_COVERED_FLOW',
  'SECURITY_IMPLICIT_DENY_NOT_MODELED',
  'SECURITY_BROAD_PERMIT_TO_TRUSTED_ZONE',
  'SECURITY_RULE_SHADOWED_BY_EARLIER_RULE',
  'SECURITY_LOGGING_EVIDENCE_GAP',
  'severityForSecurityPolicyReviewClass',
]) assert(classifier.includes(token), `classifier must include ${token}`);

const model = read('backend/src/domain/security-policy/security-policy-model.ts');
assert(model.includes('classifySecurityPolicyFinding'), 'security-policy model must classify findings through the centralized classifier');
assert(model.includes('severityForSecurityPolicyReviewClass'), 'security-policy model must normalize severity from classifier output');
assert(model.includes('const severity = isConflict ? "ERROR" : "WARNING"'), 'missing policy/NAT flow gaps must be review items, not ERROR blockers');
assert(model.includes('state: blockedFlow ? "blocked" : reviewFlow || missingExplicitDeny'), 'missing explicit deny must leave the matrix in review, not blocked');
assert(model.includes('const blockedFlow = pairFlowRequirements.some((flow) => flow.state === "conflict")'), 'only direct flow conflicts may block a policy matrix row');
assert(model.includes('if (natRule.status === "required" && !natRuleHasConcreteTranslation(natRule)) {\n    return "review";'), 'required NAT without concrete translation must be review, not structural blocker');
assert(model.includes('severity: "WARNING",\n        code: "SECURITY_IMPLICIT_DENY_NOT_MODELED"'), 'implicit-deny documentation gap must be warning/review');
assert(model.includes('severity: "WARNING",\n        code: "SECURITY_RULE_SHADOWED_BY_EARLIER_RULE"'), 'shadowed-rule condition must be warning/review during planning');
assert(model.includes('severity: "WARNING",\n      code: "SECURITY_NAT_REQUIRED_FLOW_UNCOVERED"'), 'missing NAT coverage must be warning/review during planning');
assert(model.includes('reviewFindingCount'), 'policy readiness must consider review findings separately from blockers');
assert(model.includes('natReadiness: natReviews.some((review) => review.state === "blocked") ? "blocked" : missingNatCount > 0'), 'NAT readiness must treat missing NAT coverage as review unless a NAT reference is structurally blocked');


const implementationPlan = read('backend/src/domain/implementation/migration-plan.ts');
assert(implementationPlan.includes('classifySecurityPolicyFinding'), 'implementation planning must reclassify security findings before using them as blockers');
assert(implementationPlan.includes('severityForSecurityPolicyReviewClass(reviewClass)'), 'implementation planning must derive security upstream severity from review class');

const control = read('backend/src/services/designCore/designCore.securityPolicyFlowControl.ts');
assert(control.includes('findingReviewClass'), 'V1 security flow control must preserve review class');
assert(control.includes('reviewClass: findingReviewClass(finding)'), 'V1 findings must expose review class');
assert(control.includes('state === "MISSING" || state === "OVERBROAD" || state === "SHADOWED" || state === "REVIEW_REQUIRED"'), 'SHADOWED and MISSING states must be review-required, not blocked');
assert(!control.includes('state === "BLOCKED" || state === "SHADOWED"'), 'control must not treat shadowed-rule review as blocked');

const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
for (const source of [backendTypes, frontendTypes]) {
  assert(source.includes('SecurityPolicyReviewClass'), 'backend/frontend types must expose SecurityPolicyReviewClass');
  assert(source.includes('reviewClass?: SecurityPolicyReviewClass'), 'backend/frontend finding types must expose reviewClass');
}

const report = read('backend/src/services/exportDesignCoreReport.service.ts');
assert(report.includes('separates structural blockers and direct policy conflicts from planning review items'), 'report wording must explain blocker vs review separation');
assert(report.includes('"Severity", "Class", "Code", "Readiness", "Finding", "Remediation"'), 'security evidence report must show finding class');
assert(report.includes('"Missing Policy Review"') && report.includes('"Missing NAT Review"') && report.includes('"True Blockers"'), 'professional report summary must label missing policy/NAT as review and blockers as true blockers');

const frontend = read('frontend/src/pages/ProjectSecurityPage.tsx');
assert(frontend.includes('true blockers {V1SecurityPolicy.blockingFindingCount}'), 'security page must show true blocker count from backend evidence');
assert(frontend.includes('review findings {V1SecurityPolicy.reviewFindingCount}'), 'security page must show review finding count from backend evidence');
assert(frontend.includes('finding.reviewClass'), 'security page must render security finding review class');

const packageJson = JSON.parse(read('package.json'));
assert(String(packageJson.scripts['check:quality'] || '').includes('check-security-policy-review-classification.cjs'), 'check:quality must include security policy review-classification guard');
const regression = read('scripts/check-regression-kill-switches.cjs');
assert(regression.includes('check-security-policy-review-classification.cjs'), 'regression kill-switches must include security policy review-classification guard');

const readme = read('README.md');
assert(readme.includes('Security policy / NAT review classification'), 'README must document security policy / NAT review classification');
assert(readme.includes('check-security-policy-review-classification.cjs'), 'README must document the security policy review-classification guard');

console.log('[security-policy-review-classification] ok');
