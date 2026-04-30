#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(message) {
  console.error(`Phase 76 check failed: ${message}`);
  process.exit(1);
}

function assertContains(rel, needle) {
  const body = read(rel);
  if (!body.includes(needle)) fail(`${rel} is missing ${needle}`);
}

function extractProfileTypeKeys() {
  const body = read("frontend/src/lib/requirementsProfile.ts");
  const match = body.match(/export type RequirementsProfile = \{([\s\S]*?)\n\};/);
  if (!match) fail("RequirementsProfile type not found.");
  return [...match[1].matchAll(/^\s+([A-Za-z0-9_]+):/gm)].map((item) => item[1]).sort();
}

function extractDefaultKeys() {
  const body = read("frontend/src/lib/requirementsProfile.ts");
  const match = body.match(/export const defaultRequirementsProfile: RequirementsProfile = \{([\s\S]*?)\n\};/);
  if (!match) fail("defaultRequirementsProfile object not found.");
  return [...match[1].matchAll(/^\s+([A-Za-z0-9_]+):/gm)].map((item) => item[1]).sort();
}

function extractPageRequirementRefs() {
  const body = read("frontend/src/pages/ProjectRequirementsPage.tsx");
  return [...new Set([...body.matchAll(/requirements\.([A-Za-z0-9_]+)/g)].map((item) => item[1]))].sort();
}

function extractRegistryKeys() {
  const body = read("backend/src/services/requirementsImpactRegistry.ts");
  return [...body.matchAll(/key:\s+"([^"]+)"/g)].map((item) => item[1]).sort();
}

function sameSet(left, right, label) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const missing = right.filter((item) => !leftSet.has(item));
  const extra = left.filter((item) => !rightSet.has(item));
  if (missing.length || extra.length) {
    fail(`${label} mismatch. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`);
  }
}

const profileKeys = extractProfileTypeKeys();
const defaultKeys = extractDefaultKeys();
const pageRefs = extractPageRequirementRefs();
const registryKeys = extractRegistryKeys();

if (profileKeys.length !== 83) fail(`expected 83 frontend profile keys, got ${profileKeys.length}`);
if (registryKeys.length !== 83) fail(`expected 83 backend registry keys, got ${registryKeys.length}`);

sameSet(defaultKeys, profileKeys, "defaultRequirementsProfile vs RequirementsProfile");
sameSet(pageRefs, profileKeys, "ProjectRequirementsPage requirement references vs RequirementsProfile");
sameSet(registryKeys, profileKeys, "backend requirement registry vs frontend RequirementsProfile");

assertContains("backend/src/services/project.service.ts", "import { REQUIREMENT_FIELD_KEYS } from \"./requirementsImpactRegistry.js\";");
assertContains("backend/src/services/project.service.ts", "type RequirementsFieldCoverage");
assertContains("backend/src/services/project.service.ts", "function buildRequirementsFieldCoverage(requirementsJson: string)");
assertContains("backend/src/services/project.service.ts", "requirementsFieldCoverage");
assertContains("backend/src/services/project.service.ts", "captured ${requirementsFieldCoverage.capturedFields}/${requirementsFieldCoverage.expectedFields} requirement field(s)");
assertContains("frontend/src/features/projects/api.ts", "requirementsFieldCoverage?:");
assertContains("frontend/src/features/projects/api.ts", "capturedFieldKeys: string[]");
assertContains("frontend/src/pages/ProjectRequirementsPage.tsx", "Captured ${coverage.capturedFields}/${coverage.expectedFields} requirement field(s)");
assertContains("frontend/src/pages/ProjectRequirementsPage.tsx", "coverage.missingFields.slice(0, 8)");
assertContains("docs/doc/PHASE76-REQUIREMENTS-SAVE-FIELD-COVERAGE-PROOF.md", "Captured 83/83 requirement field(s)");

const rootPackage = JSON.parse(read("package.json"));
if (rootPackage.version !== "0.76.0") fail(`expected root package version 0.76.0, got ${rootPackage.version}`);
if (rootPackage.scripts["check:phase76-requirements-save-field-coverage"] !== "node scripts/check-phase76-requirements-save-field-coverage.cjs") {
  fail("missing root check:phase76-requirements-save-field-coverage script.");
}
if (!rootPackage.scripts["check:phase75-golden-scenario-tests"]?.includes("check:phase76-requirements-save-field-coverage")) {
  fail("Phase 75 script does not chain Phase 76.");
}

console.log("Phase 76 requirements save field coverage proof checks passed.");
