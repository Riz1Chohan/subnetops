#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`Silent read-repair check failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

assert(exists('backend/src/services/readRepairPolicy.ts'), 'missing readRepairPolicy service');
assert(exists('backend/src/services/readRepairPolicy.selftest.ts'), 'missing readRepairPolicy selftest');

const policy = read('backend/src/services/readRepairPolicy.ts');
for (const token of [
  'READ_REPAIR_MATERIALIZATION',
  'ReadRepairAuthorization',
  'buildReadRepairPolicyDecision',
  'buildReadRepairEvidence',
  'beforeState',
  'afterState',
  'createdObjects',
  'updatedObjects',
  'reviewRequiredObjects',
  'blockedImplementationObjects',
  'repairLogged',
  'surfacedTo',
]) {
  assert(policy.includes(token), `readRepairPolicy.ts must include ${token}`);
}
assert(policy.includes('"project-read"') && policy.includes('"design-core-read"') && policy.includes('"export-read"') && policy.includes('"validation-read"'), 'read-repair operations must be explicit and enumerated');
assert(!policy.includes('legacy-read-repair-caller'), 'read-repair policy must not permit legacy implicit callers');

const materialization = read('backend/src/services/requirementsMaterialization.service.ts');
assert(materialization.includes('./readRepairPolicy.js'), 'requirements materialization must use readRepairPolicy');
assert(materialization.includes('recordSecurityAuditEvent'), 'read-repair must write audit evidence');
assert(materialization.includes('options: {') && materialization.includes('authorization?: ReadRepairAuthorization'), 'ensureRequirementsMaterializedForRead must accept explicit policy options');
assert(materialization.includes('policyDecision.status === "BLOCK_REPAIR"'), 'blocked read-repair must be enforced');
assert(materialization.includes('action: "project.read_repair"'), 'read-repair must create security audit records');
assert(materialization.includes('V1 explicit read-repair materialized saved requirements'), 'read-repair change log must be explicit');
assert(materialization.includes('evidence: ReadRepairEvidence | null'), 'read-repair summary must expose evidence');
assert(materialization.includes('buildReadRepairEvidence({'), 'read-repair summary must be built through the evidence helper');
assert(!materialization.includes('legacy-read-repair-caller'), 'requirements materialization must not allow legacy implicit read-repair');

const serviceFiles = [
  'backend/src/services/project.service.ts',
  'backend/src/services/designCore/designCore.repository.ts',
  'backend/src/services/export.service.ts',
  'backend/src/services/validation.service.ts',
];
for (const rel of serviceFiles) {
  const text = read(rel);
  const callCount = (text.match(/ensureRequirementsMaterializedForRead\(/g) || []).length;
  const explicitCount = (text.match(/authorization:\s*\{/g) || []).length;
  assert(callCount === explicitCount, `${rel} must pass explicit authorization to every read-repair call`);
  assert(text.includes('operation: '), `${rel} must pass an explicit read-repair operation`);
  assert(text.includes('surfacedTo:'), `${rel} must declare where read-repair evidence is surfaced`);
}

const projectService = read('backend/src/services/project.service.ts');
assert(projectService.includes('requirementsReadRepair'), 'project read response must surface read-repair evidence');
assert(projectService.includes('checkedBy: "ensureCanViewProject"'), 'user-facing project reads must tie repair authorization to ensureCanViewProject');

const backendPackage = JSON.parse(read('backend/package.json'));
assert(backendPackage.scripts['selftest:read-repair-policy'] === 'tsx src/services/readRepairPolicy.selftest.ts', 'backend package must expose read-repair policy selftest');
assert(String(backendPackage.scripts['selftest:services'] || '').includes('selftest:read-repair-policy'), 'service selftests must include read-repair policy selftest');

const rootPackage = JSON.parse(read('package.json'));
assert(String(rootPackage.scripts['check:quality'] || '').includes('check-no-silent-read-repair.cjs'), 'root quality gate must include silent read-repair check');

console.log('Silent read-repair check passed.');
