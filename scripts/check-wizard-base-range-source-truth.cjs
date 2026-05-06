#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (msg) => { console.error(`[wizard-base-range-source-truth] ${msg}`); process.exit(1); };
const must = (file, pattern, msg) => {
  const source = read(file);
  if (!pattern.test(source)) fail(`${file}: ${msg}`);
};

must('backend/src/domain/requirements/types.ts', /"SYSTEM_PROPOSED"/, 'requirement source types must distinguish system-proposed planning ranges from assumptions.');
must('backend/src/domain/requirements/apply.ts', /resolveProjectBaseRangeForRequirements/, 'requirements engine must resolve missing base range into explicit source-classified evidence.');
must('backend/src/domain/requirements/apply.ts', /proposedProjectBaseRangeForSiteCount/, 'requirements engine must deterministically propose a planning parent range for wizard output.');
must('backend/src/services/requirementsMaterialization.service.ts', /baseRangeResolution\.sourceType/, 'materialized site notes must expose base range source type.');
must('backend/src/services/requirementsMaterialization.service.ts', /effectiveBasePrivateRange/, 'materializer must use the resolved effective base range for generated sites/VLANs.');
must('backend/src/services/designCore.service.ts', /SYSTEM_PROPOSED_REVIEW_REQUIRED/, 'design-core organization block must surface system-proposed review-required base range state.');
must('backend/src/services/designCore.types.ts', /sourceType\?:[\s\S]*SYSTEM_PROPOSED/, 'backend snapshot type must expose base range source type.');
must('frontend/src/lib/designCoreSnapshot.ts', /sourceType\?:[\s\S]*SYSTEM_PROPOSED/, 'frontend snapshot type must consume backend base range source type without inventing it.');
must('backend/src/services/export.service.ts', /system-proposed; review required/, 'export must label proposed base range instead of saying the working range is missing.');
const exportSource = read('backend/src/services/export.service.ts');
if (/Base private range:\s*\$\{asString\(exportContext\.project\.basePrivateRange\) \|\| "working range still needs explicit confirmation"\}/.test(exportSource)) {
  fail('export still uses contradictory missing-base wording while generated site blocks exist.');
}
console.log('[wizard-base-range-source-truth] ok');
