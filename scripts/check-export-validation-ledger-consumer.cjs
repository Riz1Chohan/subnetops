#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[export-validation-ledger-consumer] ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const exportService = read('backend/src/services/export.service.ts');
const validationBucketMatch = exportService.match(/function validationBucket\(item: ValidationItem\) \{[\s\S]*?\n\}/);
assert(validationBucketMatch, 'export service must keep validationBucket as the display-only grouping function.');
const validationBucket = validationBucketMatch[0];

assert(exportService.includes('function isRootBlockerValidationItem'), 'export service must expose a ledger-based root blocker predicate.');
assert(exportService.includes('return item.readinessCategory === "BLOCKING" && item.findingClass === "ROOT_BLOCKER";'), 'root blocker predicate must use only readinessCategory + findingClass.');
assert(exportService.includes('const errors = validations.filter(isRootBlockerValidationItem);'), 'export context root blocker count must come from the ledger predicate.');
assert(exportService.includes('const warnings = validations.filter((item) => item.severity !== "INFO" && !isRootBlockerValidationItem(item));'), 'export context review/warning count must exclude ledger root blockers instead of treating every WARNING as the only review bucket.');
assert(exportService.includes('category: "Propagated blocker"'), 'export rollup must keep propagated blockers visible but separate from root blockers.');
assert(exportService.includes('Validation ledger taxonomy missing'), 'export rollup must expose missing ledger taxonomy instead of guessing from title/message text.');
assert(!validationBucket.includes('item.severity === "ERROR" ||'), 'validationBucket must not promote ERROR severity into Root blocker.');
assert(!/ROOT_BLOCKER\|invalid CIDR\|noncanonical\|overlap\|cannot be resolved\|no dependency edge\|missing graph nodes/.test(validationBucket), 'validationBucket must not use root-blocker regex promotion.');
assert(!exportService.includes('error-level blocker'), 'professional report wording must use root blocker/review language, not generic error-level blocker wording.');

const rootPackage = JSON.parse(read('package.json'));
const regression = read('scripts/check-regression-kill-switches.cjs');
const readme = read('README.md');
assert(String(rootPackage.scripts['check:quality'] || '').includes('check-export-validation-ledger-consumer.cjs'), 'check:quality must run export validation ledger consumer guard.');
assert(regression.includes('check-export-validation-ledger-consumer.cjs'), 'regression kill-switch umbrella must run export validation ledger consumer guard.');
assert(readme.includes('Export validation ledger consumer'), 'README must document export validation ledger consumer guard.');
assert(readme.includes('check-export-validation-ledger-consumer.cjs'), 'README must name the export validation ledger consumer guard.');

console.log('[export-validation-ledger-consumer] OK');
