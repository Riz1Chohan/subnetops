#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`[api-service-database-integration-proof] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const selftestPath = 'backend/src/services/apiServiceDatabaseIntegration.selftest.ts';
assert(exists(selftestPath), `missing ${selftestPath}`);
const selftest = read(selftestPath);
const rootPackage = JSON.parse(read('package.json'));
const backendPackage = JSON.parse(read('backend/package.json'));

for (const required of [
  'materializeRequirementsForProject',
  'buildDesignCoreSnapshot',
  'composeProfessionalReport',
  'applyBackendDesignCoreToReport',
  'buildReadRepairEvidence',
  'buildOmittedEvidenceSummary',
  'makeMemoryTx',
  'machineReadableAppendix',
]) {
  assert(selftest.includes(required), `integration selftest must include ${required}`);
}

const requiredScenarios = [
  'scenarioValidRequirementsPlanningReadyOutput',
  'scenarioMissingUsersPerSiteReviewRequired',
  'scenarioInvalidGatewayRejectedBeforeDbWrite',
  'scenarioExistingProjectReloadNoDuplicateMaterialization',
  'scenarioReadRepairNeededProducesEvidence',
  'scenarioDiagramEvidenceSlicedOmittedWarningProduced',
  'scenarioReportEvidenceSlicedFullAppendixPreserved',
  'scenarioSecurityPolicyInferredReviewRequiredNotFinal',
  'scenarioRoutingMissingWanIntentReviewRequired',
  'scenarioBasePrivateRangeInvalidRejectedOrBlocked',
];
for (const scenario of requiredScenarios) {
  assert(selftest.includes(`function ${scenario}`) || selftest.includes(`async function ${scenario}`), `missing integration scenario ${scenario}`);
  assert(selftest.includes(`${scenario}();`), `main() must execute ${scenario}`);
}

assert(selftest.includes('invalid gateway must be rejected before DB write'), 'integration proof must cover invalid gateway rejection before persistence');
assert(selftest.includes('reload materialization must update existing rows instead of duplicating them'), 'integration proof must cover project reload with no duplicate materialization');
assert(selftest.includes('read repair evidence must list created objects'), 'integration proof must cover explicit read-repair evidence');
assert(selftest.includes('diagram sliced evidence must expose hidden blockers'), 'integration proof must cover diagram omitted blocker warning');
assert(selftest.includes('report/export must preserve a full machine-readable appendix'), 'integration proof must cover report full appendix preservation');
assert(selftest.includes('inferred security policy must not be final implementation truth'), 'integration proof must cover inferred security policy review state');
assert(selftest.includes('routing missing WAN intent must remain review-required'), 'integration proof must cover missing WAN intent review state');
assert(selftest.includes('public basePrivateRange must be rejected or blocked before clean persistence'), 'integration proof must cover bad basePrivateRange rejection');

const serviceScript = backendPackage.scripts['selftest:api-service-database-integration'];
assert(serviceScript === 'tsx src/services/apiServiceDatabaseIntegration.selftest.ts', 'backend must expose api/service/database integration selftest');
assert(String(backendPackage.scripts['selftest:integration-proof'] || '').includes('selftest:api-service-database-integration'), 'backend integration proof script must run integration selftest');
assert(String(backendPackage.scripts['selftest:services'] || '').includes('selftest:api-service-database-integration'), 'service selftests must include integration proof');
assert(String(backendPackage.scripts['selftest:all'] || '').includes('selftest:integration-proof'), 'backend selftest:all must include integration proof');
assert(String(rootPackage.scripts['check:trust'] || '').includes('selftest:integration-proof'), 'root trust gate must run backend integration proof');
assert(String(rootPackage.scripts['check:quality'] || '').includes('check-api-service-database-integration-proof.cjs'), 'root quality gate must include integration proof kill-switch');

assert(!/data:\s*vlanData,\s*data:\s*vlanData/.test(read('backend/src/services/requirementsMaterialization.service.ts')), 'requirements materializer must not contain duplicate data properties on VLAN update');

console.log('[api-service-database-integration-proof] ok');
