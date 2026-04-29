#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  console.error(`Phase 62 requirements impact traceability check failed: ${message}`);
  process.exit(1);
}

function extractRequirementsProfileKeys() {
  const source = read("frontend/src/lib/requirementsProfile.ts");
  const match = source.match(/export type RequirementsProfile = \{([\s\S]*?)\};/);
  if (!match) fail("could not find RequirementsProfile type");
  return Array.from(match[1].matchAll(/\n\s*([A-Za-z0-9_]+):/g)).map((item) => item[1]).sort();
}

function extractRegistryKeys() {
  const source = read("backend/src/services/requirementsImpactRegistry.ts");
  return Array.from(source.matchAll(/key:\s*"([^"]+)"/g)).map((item) => item[1]).sort();
}

const profileKeys = extractRequirementsProfileKeys();
const registryKeys = extractRegistryKeys();

if (profileKeys.length !== 83) {
  fail(`expected 83 RequirementsProfile fields, found ${profileKeys.length}`);
}

const missing = profileKeys.filter((key) => !registryKeys.includes(key));
const extra = registryKeys.filter((key) => !profileKeys.includes(key));

if (missing.length) fail(`registry missing requirement fields: ${missing.join(", ")}`);
if (extra.length) fail(`registry has unknown requirement fields: ${extra.join(", ")}`);

const registrySource = read("backend/src/services/requirementsImpactRegistry.ts");
for (const token of [
  "REQUIREMENT_IMPACT_REGISTRY",
  "buildRequirementImpactInventory",
  "summarizeRequirementImpactInventory",
  "validationConsequence",
  "diagramConsequence",
  "reportConsequence",
]) {
  if (!registrySource.includes(token)) fail(`requirements impact registry missing ${token}`);
}

const traceabilitySource = read("backend/src/services/designCore/designCore.traceability.ts");
for (const token of [
  "buildRequirementImpactInventory",
  "materializationTargets",
  "designConsequence",
  "validationEvidence",
  "diagramEvidence",
  "reportEvidence",
]) {
  if (!traceabilitySource.includes(token)) fail(`backend traceability missing ${token}`);
}

const coverageSource = read("backend/src/services/designCore/designCore.requirementsCoverage.ts");
for (const token of ["fieldInventory", "totalFieldCount", "capturedFieldCount", "directFieldCount"]) {
  if (!coverageSource.includes(token)) fail(`requirements coverage missing ${token}`);
}

const materializerSource = read("backend/src/services/requirementsMaterialization.service.ts");
for (const token of ["REQUIREMENT_FIELD_KEYS", "impactInventoryCount", "directImpactCount", "buildRequirementImpactInventory"]) {
  if (!materializerSource.includes(token)) fail(`requirements materializer missing ${token}`);
}

const frontendSnapshotSource = read("frontend/src/lib/designCoreSnapshot.ts");
for (const token of ["BackendTraceabilityItem", "RequirementsCoverageSummary", "traceability?: BackendTraceabilityItem[]", "requirementsCoverage?: RequirementsCoverageSummary"]) {
  if (!frontendSnapshotSource.includes(token)) fail(`frontend snapshot type missing ${token}`);
}

const backendViewModelSource = read("frontend/src/lib/backendSnapshotViewModel.ts");
for (const token of ["backendTraceabilityRows", "snapshot.traceability", "Requirement impact traceability covers"]) {
  if (!backendViewModelSource.includes(token)) fail(`frontend backend view model missing ${token}`);
}

const userFacingFiles = [
  "frontend/src/features/diagram/components/DiagramSupportPanels.tsx",
  "frontend/src/features/diagram/components/ProjectDiagram.tsx",
  "frontend/src/pages/ProjectRequirementsPage.tsx",
  "frontend/src/pages/ProjectOverviewPage.tsx",
];

const bannedVisibleStrings = [
  "v117-v120",
  "v108 turns",
  "v109 workspace",
  "This recovery pass keeps",
  "real topology-engine target",
];

for (const file of userFacingFiles) {
  const source = read(file);
  for (const banned of bannedVisibleStrings) {
    if (source.includes(banned)) fail(`${file} still exposes internal wording: ${banned}`);
  }
}

console.log(`Phase 62 requirements impact traceability check passed (${profileKeys.length} requirement fields inventoried).`);
