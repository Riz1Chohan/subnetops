const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`[validation-ledger-authority] ${message}`);
  process.exit(1);
};

const schema = read('backend/prisma/schema.prisma');
const validationService = read('backend/src/services/validation.service.ts');
const ledger = read('backend/src/domain/validation/ledger.ts');
const backendPackage = JSON.parse(read('backend/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const regression = read('scripts/check-regression-kill-switches.cjs');

for (const field of [
  'readinessCategory',
  'findingClass',
  'sourceEngine',
  'sourceSnapshotPath',
  'rootCauseKey',
  'rootCauseTitle',
  'deEscalationReason',
  'remediation',
  'affectedRequirementsJson',
  'affectedObjectsJson',
  'evidenceJson',
]) {
  if (!schema.includes(field)) fail(`ValidationResult is missing ${field}.`);
}

if (!schema.includes('@@index([projectId, findingClass])')) fail('ValidationResult must index findingClass by project.');
if (!schema.includes('@@index([projectId, readinessCategory])')) fail('ValidationResult must index readinessCategory by project.');
if (!ledger.includes('severityForValidationLedger')) fail('ledger.ts must expose severityForValidationLedger.');
if (!ledger.includes('isRootBlockerLedgerRow')) fail('ledger.ts must expose root blocker predicate.');
if (!validationService.includes('buildValidationLedgerFields')) fail('validation.service.ts must persist ledger fields through buildValidationLedgerFields.');
if (!validationService.includes('readinessCategory: finding.category')) fail('V1 validation findings must persist readinessCategory from design-core.');
if (!validationService.includes('findingClass: finding.findingClass')) fail('V1 validation findings must persist findingClass from design-core.');
if (!validationService.includes('affectedRequirements: finding.affectedRequirementKeys')) fail('V1 validation findings must persist affected requirement keys.');
if (!validationService.includes('affectedObjects: finding.affectedObjectIds')) fail('V1 validation findings must persist affected object IDs.');
if (!backendPackage.scripts['selftest:validation-ledger']) fail('backend package must expose selftest:validation-ledger.');
if (!backendPackage.scripts['selftest:services'].includes('selftest:validation-ledger')) fail('selftest:services must include validation ledger selftest.');
if (!rootPackage.scripts['check:quality'].includes('check-validation-ledger-authority.cjs')) fail('check:quality must run validation ledger guard.');
if (!regression.includes('check-validation-ledger-authority.cjs')) fail('regression kill switches must run validation ledger guard.');

console.log('[validation-ledger-authority] OK');
