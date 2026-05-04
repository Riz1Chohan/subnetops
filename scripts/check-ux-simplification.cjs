#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function fail(message) {
  console.error(`V1 UX simplification check failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} must include: ${needle}`);
}
function assertNotIncludes(text, needle, label) {
  assert(!text.includes(needle), `${label} must not include old/internal wording: ${needle}`);
}

const projectLayout = read('frontend/src/layouts/ProjectLayout.tsx');
assertIncludes(projectLayout, 'Step {index + 1}', 'project workspace navigation');
assertIncludes(projectLayout, 'label: "IPAM"', 'project workspace navigation');
for (const old of ['Engine 2 IPAM', 'Backend contract', 'V1 manual/imported current-state proof', 'Stage {index + 1}', 'Core authority', 'Unified truth']) {
  assertNotIncludes(projectLayout, old, 'project workspace navigation');
}

const requirementsPage = read('frontend/src/pages/ProjectRequirementsPage.tsx');
assertIncludes(requirementsPage, 'Save status', 'requirements page');
assertIncludes(requirementsPage, 'Verified design model required', 'requirements page');
assertIncludes(requirementsPage, 'Browser planning fallback disabled', 'requirements page');
for (const old of ['Save confidence', 'Backend design-core required', 'Frontend planning authority disabled', 'unknown backend check', 'No runtime check has been returned by the backend']) {
  assertNotIncludes(requirementsPage, old, 'requirements page');
}

const discoveryPage = read('frontend/src/pages/ProjectDiscoveryPage.tsx');
assertIncludes(discoveryPage, 'Current-state evidence contract', 'discovery page');
assertIncludes(discoveryPage, 'System-draft route anchors', 'discovery page');
for (const old of ['Backend discovery contract', 'Authority lift', 'Backend V1 discovery/current-state evidence', 'No backend discovery tasks', 'Backend-unconfirmed route anchors']) {
  assertNotIncludes(discoveryPage, old, 'discovery page');
}

const implementationPage = read('frontend/src/pages/ProjectImplementationPage.tsx');
assertIncludes(implementationPage, 'Implementation planning checks', 'implementation page');
assertIncludes(implementationPage, 'Vendor-neutral templates', 'implementation page');
for (const old of ['Backend V1C operational-safety implementation plan displayed', 'V1 implementation planning control', 'V1 vendor-neutral templates control', 'V1 unavailable', 'Backend plan unavailable']) {
  assertNotIncludes(implementationPage, old, 'implementation page');
}

const aiWorkspace = read('frontend/src/pages/AIWorkspacePage.tsx');
assertIncludes(aiWorkspace, 'AI output stays draft-only', 'AI workspace');
assertNotIncludes(aiWorkspace, 'V1_AI_DRAFT_HELPER_CONTRACT keeps AI draft-only', 'AI workspace');
assertNotIncludes(aiWorkspace, 'engineering authority', 'AI workspace');

const aiPanel = read('frontend/src/features/ai/components/AIPlanningPanel.tsx');
assertIncludes(aiPanel, 'Review gates', 'AI planning panel');
assertIncludes(aiPanel, 'Status: draft suggestion', 'AI planning panel');
assertNotIncludes(aiPanel, 'V1 authority gates', 'AI planning panel');
assertNotIncludes(aiPanel, 'Contract: {draft.authority', 'AI planning panel');

const overview = read('frontend/src/pages/ProjectOverviewPage.tsx');
for (const old of ['V1 AI draft/helper boundary', 'V1 final proof pass', 'Engine 1 planned addressing', 'Engine 2 durable IPAM authority', 'design-core coordinator contract']) {
  assertNotIncludes(overview, old, 'overview page');
}
assertIncludes(overview, 'AI draft boundary', 'overview page');
assertIncludes(overview, 'Final readiness review', 'overview page');
assertIncludes(overview, 'Enterprise IPAM durability', 'overview page');

const platform = read('frontend/src/pages/ProjectPlatformBomPage.tsx');
assertNotIncludes(platform, 'V1 Platform/BOM foundation contract', 'platform/BOM page');
assertNotIncludes(platform, 'Backend V1 evidence is not available yet', 'platform/BOM page');

console.log('V1 UX simplification check passed.');
