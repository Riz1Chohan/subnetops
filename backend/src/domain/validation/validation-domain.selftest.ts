import {
  buildCoverageSummary,
  buildValidationFinding,
  buildValidationFindingId,
  deriveReadinessFromFindings,
  evidenceFromStrings,
  normalizeLegacyReadinessCategory,
  normalizeValidationSeverity,
  normalizeValidationStatus,
  legacyCategoryForFinding,
  severityToLegacyCategory,
} from './index.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const missingAddressing = buildValidationFinding({
  ruleCode: 'MISSING_ADDRESSING_DATA',
  severity: 'high',
  status: 'open',
  category: 'Addressing',
  title: 'Addressing data is missing',
  detail: 'No authoritative subnet rows exist for a selected site.',
  affectedObjects: ['site-hq'],
  evidence: evidenceFromStrings('design-snapshot', ['sites[0].addressRows is empty']),
  recommendedAction: 'Create or import authoritative subnet rows before implementation review.',
  sourcePath: 'addressing.rows',
});

const duplicateMissingAddressing = buildValidationFinding({
  ruleCode: 'MISSING_ADDRESSING_DATA',
  severity: 'HIGH',
  status: 'OPEN',
  category: 'cidr',
  title: 'Addressing data is missing',
  detail: 'No authoritative subnet rows exist for a selected site.',
  affectedObjects: ['site-hq'],
  evidence: evidenceFromStrings('design-snapshot', ['sites[0].addressRows is empty']),
  recommendedAction: 'Create or import authoritative subnet rows before implementation review.',
  sourcePath: 'addressing.rows',
});

assert(missingAddressing.id === duplicateMissingAddressing.id, 'deterministic finding IDs must be stable for equivalent inputs.');
assert(missingAddressing.severity === 'high', 'severity must normalize to high.');
assert(missingAddressing.status === 'open', 'status must normalize to open.');
assert(missingAddressing.category === 'Addressing', 'category must normalize to Addressing.');
assert(missingAddressing.affectedObjects[0] === 'site-hq', 'affected object linkage must be preserved.');
assert(missingAddressing.evidence.length === 1, 'evidence references must be preserved.');

assert(normalizeValidationSeverity('ERROR') === 'critical', 'service error severity must normalize to critical.');
assert(normalizeValidationSeverity('REVIEW_REQUIRED') === 'high', 'review-required status must normalize to high.');
assert(normalizeValidationStatus('accepted-risk') === 'accepted_risk', 'accepted risk must be explicit.');
assert(normalizeLegacyReadinessCategory('FULLY_PROPAGATED') === 'PASSED', 'legacy ready labels must normalize to passed.');
assert(legacyCategoryForFinding({ severity: 'critical', status: 'open' }) === 'BLOCKING', 'critical open finding must map to blocking.');
assert(severityToLegacyCategory('medium') === 'WARNING', 'medium severity must map to legacy warning.');

const critical = buildValidationFinding({
  ruleCode: 'ROUTE_DOMAIN_OVERLAP',
  severity: 'critical',
  status: 'open',
  category: 'IPAM',
  title: 'Route-domain overlap blocks readiness',
  detail: 'Two approved allocations overlap in the same route domain.',
  affectedObjects: ['alloc-a', 'alloc-b'],
  evidence: evidenceFromStrings('ipam', ['10.10.0.0/24 overlaps 10.10.0.128/25']),
});
const blocked = deriveReadinessFromFindings([critical]);
assert(blocked.readiness === 'blocked', 'open critical findings must block readiness.');
assert(blocked.label === 'Blocked', 'blocked readiness needs a user-friendly label.');
assert(blocked.implementationGateAllows === false, 'critical blockers must prevent implementation gate allowance.');

const highReview = deriveReadinessFromFindings([missingAddressing]);
assert(highReview.readiness === 'needs_review', 'open high findings must require review.');
assert(highReview.implementationGateAllows === false, 'open high findings must prevent implementation gate allowance.');

const mediumWarning = deriveReadinessFromFindings([
  buildValidationFinding({
    ruleCode: 'GATEWAY_CONVENTION_REVIEW',
    severity: 'medium',
    category: 'Addressing',
    title: 'Gateway convention needs review',
    detail: 'A custom gateway convention was detected.',
    affectedObjects: ['vlan-10'],
    evidence: evidenceFromStrings('addressing', ['gateway is not first usable']),
  }),
]);
assert(mediumWarning.readiness === 'ready_with_warnings', 'open medium findings should allow readiness only with warnings.');
assert(mediumWarning.readinessLadder === 'PLANNING_READY', 'warnings may be planning-ready but not implementation-ready.');
assert(mediumWarning.implementationGateAllows === false, 'non-blocking warnings must still block the implementation gate until the central ladder is clean.');

const acceptedRisk = deriveReadinessFromFindings([
  buildValidationFinding({
    ruleCode: 'PUBLIC_DMZ_EXCEPTION',
    severity: 'high',
    status: 'accepted_risk',
    category: 'Security',
    title: 'Public DMZ exception accepted',
    detail: 'A public dependency was accepted for this design review.',
    affectedObjects: ['zone-dmz'],
    evidence: evidenceFromStrings('security-policy', ['risk exception recorded']),
    acceptedRiskBy: 'review-board',
  }),
]);
assert(acceptedRisk.readiness === 'ready_with_warnings', 'accepted risk must remain visible without pretending to be clean.');
assert(acceptedRisk.acceptedRiskCount === 1, 'accepted risk must be counted explicitly.');
assert(acceptedRisk.readinessLadder === 'PLANNING_READY', 'accepted risk may be planning-ready but not implementation-ready.');
assert(acceptedRisk.implementationGateAllows === false, 'accepted risk must block clean implementation-ready output until explicitly resolved.');

const incomplete = deriveReadinessFromFindings([], { noFindingState: 'incomplete' });
assert(incomplete.readiness === 'incomplete', 'missing validation data must be representable as incomplete.');
assert(incomplete.label === 'Incomplete', 'incomplete readiness needs a user-friendly label.');
assert(incomplete.readinessLadder === 'DRAFT', 'incomplete validation stays draft-only in the readiness ladder.');

const coverage = buildCoverageSummary({
  domain: 'Addressing',
  sourcePath: 'addressing.rows',
  findings: [missingAddressing],
  evidence: ['1 missing addressing row.'],
});
assert(coverage.domain === 'Addressing', 'coverage summary must preserve domain name.');
assert(coverage.readiness === 'needs_review', 'coverage readiness must be derived from findings.');
assert(coverage.highCount === 1, 'coverage summary must count open high findings.');
assert(coverage.evidence.length === 1, 'coverage summary must preserve evidence notes.');

const idA = buildValidationFindingId({ ruleCode: 'ID_TEST', title: 'Same', detail: 'Same detail', category: 'Validation' });
const idB = buildValidationFindingId({ ruleCode: 'ID_TEST', title: 'Same', detail: 'Same detail', category: 'Validation' });
assert(idA === idB, 'standalone deterministic ID helper must be stable.');

console.log('Validation domain selftest passed');
