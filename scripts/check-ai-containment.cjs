#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

function fail(message) {
  console.error(`V1 AI containment check failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} must include: ${needle}`);
}
function assertNotIncludes(text, needle, label) {
  assert(!text.includes(needle), `${label} must not include: ${needle}`);
}

for (const file of [
  'backend/src/domain/ai/types.ts',
  'backend/src/domain/ai/containment.ts',
  'backend/src/domain/ai/index.ts',
  'backend/src/domain/ai/ai-domain.selftest.ts',
]) {
  assert(exists(file), `${file} must exist`);
}

const packageJson = JSON.parse(read('backend/package.json'));
assert(packageJson.scripts['selftest:ai-domain'] === 'tsx src/domain/ai/ai-domain.selftest.ts', 'backend package must expose selftest:ai-domain');
assert(String(packageJson.scripts['selftest:all']).includes('selftest:ai-domain'), 'selftest:all must include AI domain selftest');

const aiDomain = read('backend/src/domain/ai/containment.ts');
for (const forbidden of ['from "express"', 'from "@prisma/client"', 'PrismaClient', 'src/controllers', 'src/routes', 'React']) {
  assertNotIncludes(aiDomain, forbidden, 'AI domain');
}
assertIncludes(aiDomain, 'prohibitedUses', 'AI domain authority contract');
assertIncludes(aiDomain, 'Final route authority', 'AI domain authority contract');
assertIncludes(aiDomain, 'Vendor command generation', 'AI domain authority contract');
assertIncludes(aiDomain, 'containPrompt', 'AI domain prompt containment');
assertIncludes(aiDomain, 'FINAL_AUTHORITY_PATTERNS', 'AI domain prompt containment');

const aiService = read('backend/src/services/ai.service.ts');
assertIncludes(aiService, '../domain/ai/index.js', 'AI service');
assertIncludes(aiService, 'containPrompt(prompt)', 'AI service');
assertIncludes(aiService, 'sanitizePlanDraft', 'AI service');
assertIncludes(aiService, 'containValidationExplanation', 'AI service');
assertIncludes(aiService, 'Do not claim approval, readiness, final authority', 'OpenAI draft system prompt');
assertIncludes(aiService, 'Do not change readiness, approve implementation', 'OpenAI validation system prompt');

const aiControl = read('backend/src/services/designCore/designCore.aiDraftHelperControl.ts');
assertIncludes(aiControl, '../../domain/ai/index.js', 'AI draft helper compatibility wrapper');
assertNotIncludes(aiControl, 'const findings = buildFindings(hasMetadata, objectRows, gateRows);\n  const findings =', 'AI draft helper compatibility wrapper');

const planningPanel = read('frontend/src/features/ai/components/AIPlanningPanel.tsx');
assertIncludes(planningPanel, 'Draft-only assistant', 'AI planning panel');
assertIncludes(planningPanel, 'Status: draft suggestion', 'AI planning panel');
assertIncludes(planningPanel, 'cannot approve readiness, routes, security policy, diagrams, reports, or implementation work', 'AI planning panel');
assertNotIncludes(planningPanel, 'V1_AI_DRAFT_HELPER_CONTRACT', 'AI planning panel');
assertNotIncludes(planningPanel, 'AI_DRAFT / REVIEW_REQUIRED / NOT_AUTHORITATIVE', 'AI planning panel');
assertNotIncludes(planningPanel, 'Auto-create suggested', 'AI planning panel');
assertNotIncludes(planningPanel, 'Apply selected parts', 'AI planning panel');

const insight = read('frontend/src/features/ai/components/AIValidationInsight.tsx');
assertIncludes(insight, 'draft explanation only', 'AI validation insight');
assertIncludes(insight, 'cannot resolve the finding, approve readiness', 'AI validation insight');

const newProject = read('frontend/src/pages/NewProjectPage.tsx');
assertIncludes(newProject, 'AI selections sent to review', 'new project AI review box');
assertIncludes(newProject, 'They are not approved design facts', 'new project AI review box');
assertNotIncludes(newProject, 'Auto-create sites:', 'new project AI review box');
assertNotIncludes(newProject, 'Auto-create VLANs:', 'new project AI review box');

console.log('V1 AI containment check passed.');
