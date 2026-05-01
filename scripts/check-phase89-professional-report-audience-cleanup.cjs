#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 89 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
const phase88 = read('scripts/check-phase88-professional-report-release-discipline.cjs');
const pkg = read('package.json');
const docs = read('docs/doc/PHASE89-PROFESSIONAL-REPORT-AUDIENCE-CLEANUP.md');

assert(runtime.includes('professionalAudienceCleanup: "PHASE_89_PROFESSIONAL_REPORT_AUDIENCE_CLEANUP"'), 'runtime Phase 89 marker missing');
assert(runtime.includes('version: "0.89.0"'), 'runtime version not advanced to 0.89.0');
assert(pkg.includes('"version": "0.89.0"'), 'root package version not advanced to 0.89.0');
assert(pkg.includes('check:phase89-professional-report-audience-cleanup'), 'Phase 89 package script missing');
assert(pkg.includes('check:phase84-89-release'), 'Phase 84-89 aggregate script missing');

assert(report.includes('const includeTechnicalEvidence = reportMode !== "professional"'), 'professional report mode does not gate technical evidence');
assert(report.includes('isProfessionalInternalTableTitle'), 'professional report lacks internal table filter');
assert(report.includes('isProfessionalInternalSectionTitle'), 'professional report lacks internal section filter');
assert(report.includes('!isProfessionalInternalTableTitle(String(table.title ?? ""))'), 'professional report does not filter internal tables');
assert(report.includes('includeTechnicalEvidence && addressingSection && networkObjectModel'), 'raw network-object addressing tables are not gated to technical/full-proof output');
assert(report.includes('includeTechnicalEvidence && routingSection'), 'raw routing/security/implementation tables are not gated to technical/full-proof output');
assert(report.includes('if (includeTechnicalEvidence && enterpriseAllocatorPosture)'), 'raw enterprise allocator detail is not gated to technical/full-proof output');
assert(report.includes('IP Address Management Review Summary'), 'professional report lacks summarized IPAM replacement table');
assert(report.includes('Authoritative design snapshot:'), 'professional report still uses backend snapshot wording in user-facing addressing paragraph');

[
  'Gateway and Routing Interfaces',
  'Authoritative Design Graph',
  'Report Truth',
  'Implementation Steps',
  'Verification Checks',
  'Rollback Actions',
  'Diagram Render',
  'Route Intent Table',
  'NAT Intent',
].forEach((title) => assert(report.includes(title), `filter list no longer names internal table ${title}`));

assert(report.includes('replace(/\\bbackend\\b/gi, "design model")'), 'professional sanitizer does not replace backend wording');
assert(report.includes('replace(/graph-node-[A-Za-z0-9_-]+/g, "modeled object")'), 'professional sanitizer does not hide graph node ids');
assert(report.includes('replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "object reference")'), 'professional sanitizer does not hide UUIDs');
assert(report.includes('if (reportMode === "full-proof") report.sections.push(phase40Section, phase42Section)'), 'full-proof evidence mode was accidentally removed');

assert(phase88.includes('compatible runtime version missing for Phase 88 or later'), 'Phase 88 check is still pinned to exactly 0.88.0');
assert(docs.includes('PHASE_89_PROFESSIONAL_REPORT_AUDIENCE_CLEANUP'), 'Phase 89 docs marker missing');
console.log('Phase 89 professional report audience cleanup checks passed.');
process.exit(0);
