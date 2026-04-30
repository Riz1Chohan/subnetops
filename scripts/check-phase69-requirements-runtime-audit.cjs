#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error(`Phase 69 audit check failed: ${msg}`); process.exit(1); }
function requireText(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel} is missing required text: ${needle}`);
}

const profile = read('frontend/src/lib/requirementsProfile.ts');
const typeBlockMatch = profile.match(/export type RequirementsProfile = \{([\s\S]*?)\};/);
if (!typeBlockMatch) fail('RequirementsProfile type block not found');
const fields = [...typeBlockMatch[1].matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
if (fields.length !== 83) fail(`expected 83 RequirementsProfile fields, found ${fields.length}`);

const registry = read('backend/src/services/requirementsImpactRegistry.ts');
const registryKeys = [...registry.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]);
if (registryKeys.length !== 83) fail(`expected 83 registry fields, found ${registryKeys.length}`);
const missingRegistry = fields.filter((key) => !registryKeys.includes(key));
const extraRegistry = registryKeys.filter((key) => !fields.includes(key));
if (missingRegistry.length || extraRegistry.length) {
  fail(`registry mismatch. Missing: ${missingRegistry.join(', ') || 'none'}; Extra: ${extraRegistry.join(', ') || 'none'}`);
}

requireText('frontend/src/pages/ProjectRequirementsPage.tsx', 'requirementsJson: stringifyRequirementsProfile(requirements)');
requireText('backend/src/services/project.service.ts', 'await materializeRequirementsForProject(tx, projectId, actorLabel, { requirementsJson: data.requirementsJson })');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["project-sites", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["project-vlans", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["design-core", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'await runValidation(projectId)');

const doc = read('docs/doc/PHASE69-REQUIREMENTS-RUNTIME-TRUTH-AUDIT.md');
for (const required of [
  'Phase 69 is an audit package, not a feature-completion claim.',
  'UI control → save payload → project.requirementsJson → materializer → design-core → frontend/report/diagram/validation',
  'Current runtime evidence from screenshots/report proves the chain is broken after requirement capture.',
  'Do not claim requirements are fixed until Phase 70+ runtime acceptance tests pass.',
]) {
  if (!doc.includes(required)) fail(`Phase 69 doc missing required statement: ${required}`);
}

const fieldDoc = read('docs/doc/REQUIREMENTS-FIELD-LIFECYCLE-AUDIT.md');
for (const key of fields) {
  if (!fieldDoc.includes(`| ${key} |`)) fail(`field lifecycle audit missing row for ${key}`);
}
if (!fieldDoc.includes('| Field key | Card / category | Expected lifecycle | Source-level status | Runtime verdict |')) {
  fail('field lifecycle audit table header missing');
}

console.log(`Phase 69 requirements runtime audit check passed (${fields.length} fields audited).`);
