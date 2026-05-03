#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
function fail(message) { console.error(`[phase19] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }
function read(file) { return fs.readFileSync(path.join(process.cwd(), file), 'utf8'); }
const pkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));
const files = [
  'backend/src/services/designCore/designCore.phase19AiDraftHelperControl.ts',
  'backend/src/services/ai.service.ts',
  'backend/src/services/designCore.types.ts',
  'backend/src/services/designCore.service.ts',
  'backend/src/services/validation.service.ts',
  'backend/src/services/exportDesignCoreReport.service.ts',
  'backend/src/services/export.service.ts',
  'frontend/src/lib/types.ts',
  'frontend/src/lib/designCoreSnapshot.ts',
  'frontend/src/features/ai/components/AIPlanningPanel.tsx',
  'frontend/src/pages/AIWorkspacePage.tsx',
  'frontend/src/pages/NewProjectPage.tsx',
  'frontend/src/pages/ProjectOverviewPage.tsx',
  'backend/src/lib/phase0EngineInventory.ts',
  'backend/src/lib/phase19AiDraftHelper.selftest.ts',
  'docs/doc/PHASE19-AI-DRAFT-HELPER.md',
];
assert(['0.111.0','0.112.0'].includes(pkg.version), 'package version must be 0.111.0');
assert(pkg.scripts['check:phase19-ai-draft-helper'] === 'node scripts/check-phase19-ai-draft-helper.cjs', 'root phase19 check script missing');
assert(pkg.scripts['check:phase19-111-release'] === 'npm run check:phase19-ai-draft-helper && npm run check:phase18-110-release', 'phase19 release chain missing');
assert(backendPkg.scripts['engine:selftest:phase19-ai-draft'] === 'tsx src/lib/phase19AiDraftHelper.selftest.ts', 'backend phase19 selftest script missing');
assert((backendPkg.scripts['engine:selftest:all'] || '').includes('engine:selftest:phase19-ai-draft'), 'phase19 selftest not included in backend all selftests');
for (const file of files) assert(read(file).includes('PHASE19_AI_DRAFT_HELPER_CONTRACT'), `phase19 marker missing from ${file}`);
const control = read('backend/src/services/designCore/designCore.phase19AiDraftHelperControl.ts');
assert(control.includes('AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY'), 'phase19 role marker missing');
assert(control.includes('DRAFT_ONLY_NOT_AUTHORITATIVE'), 'phase19 AI authority marker missing');
assert(control.includes('PHASE19_AI_DRAFT_APPLIED_REVIEW_REQUIRED'), 'phase19 applied marker missing');
assert(control.includes('NOT_AUTHORITATIVE_UNTIL_REVIEWED'), 'phase19 downstream authority marker missing');
assert(control.includes('requirements materialization') && control.includes('Engine 1 addressing proof') && control.includes('Engine 2 IPAM reconciliation') && control.includes('standards') && control.includes('traceability'), 'phase19 deterministic conversion gates missing');
assert(control.includes('AI output is never authoritative engineering truth'), 'phase19 proof boundary missing');
const aiService = read('backend/src/services/ai.service.ts');
assert(aiService.includes('Phase19AIDraftAuthority') && aiService.includes('authority: phase19DraftAuthority()'), 'AI service draft authority missing');
assert(aiService.includes('reviewRequired: true') && aiService.includes('notAuthoritative: true') && aiService.includes('materializationRequired: true'), 'AI service review/not-authority flags missing');
const newProject = read('frontend/src/pages/NewProjectPage.tsx');
assert(newProject.includes('buildRequirementsJsonForCreate') && newProject.includes('phase19AiDraft'), 'NewProject phase19 metadata save missing');
assert(newProject.includes('appendPhase19AiReviewMarker') && newProject.includes('PHASE19_AI_DRAFT_APPLIED_REVIEW_REQUIRED'), 'NewProject AI-applied object marker missing');
const panel = read('frontend/src/features/ai/components/AIPlanningPanel.tsx');
assert(panel.includes('NOT_AUTHORITATIVE_UNTIL_REVIEWED') && panel.includes('Phase 19 authority gates'), 'AI planning panel authority gates missing');
assert(read('backend/src/services/designCore.types.ts').includes('Phase19AiDraftHelperControlSummary'), 'phase19 backend type missing');
assert(read('frontend/src/lib/designCoreSnapshot.ts').includes('phase19AiDraftHelper?: Phase19AiDraftHelperControlSummary'), 'phase19 frontend snapshot type missing');
assert(read('backend/src/services/designCore.service.ts').includes('buildPhase19AiDraftHelperControl') && read('backend/src/services/designCore.service.ts').includes('phase19AiDraftHelper,'), 'design-core phase19 wiring missing');
assert(read('backend/src/services/validation.service.ts').includes('PHASE19_AI_DRAFT_BLOCKING') && read('backend/src/services/validation.service.ts').includes('PHASE19_AI_DRAFT_REVIEW_REQUIRED'), 'validation phase19 wiring missing');
assert(read('backend/src/services/exportDesignCoreReport.service.ts').includes('Phase 19 AI Draft/Helper'), 'DOCX/PDF report phase19 section missing');
assert(read('backend/src/services/export.service.ts').includes('Phase 19 AI Draft/Helper'), 'CSV export phase19 rows missing');
assert(read('frontend/src/pages/ProjectOverviewPage.tsx').includes('Phase 19 AI draft/helper boundary'), 'ProjectOverview phase19 evidence panel missing');
const inventory = read('backend/src/lib/phase0EngineInventory.ts');
assert(inventory.includes('phase19AiDraftHelper') && inventory.includes('currentPhase0Verdict: "CONTROLLED"'), 'phase0 inventory phase19 not controlled');
assert(!inventory.includes('currentPhase0Verdict: "DRAFT_ONLY"'), 'phase19 still marked DRAFT_ONLY in phase0 inventory');
console.log('[phase19] AI draft/helper checks passed');
