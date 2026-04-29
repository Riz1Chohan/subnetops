#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = process.cwd();
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function fail(message) { console.error(`Phase 64 requirements completion closure check failed: ${message}`); process.exit(1); }
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
if (profileKeys.length !== 83) fail(`expected 83 RequirementsProfile fields, found ${profileKeys.length}`);
const missing = profileKeys.filter((key) => !registryKeys.includes(key));
const extra = registryKeys.filter((key) => !profileKeys.includes(key));
if (missing.length) fail(`registry missing fields: ${missing.join(", ")}`);
if (extra.length) fail(`registry has unknown fields: ${extra.join(", ")}`);
const closureSource = read("backend/src/services/designCore/designCore.requirementsImpactClosure.ts");
for (const token of [
  "buildRequirementsImpactClosureSummary",
  "SEGMENT_NAME_BY_REQUIREMENT_KEY",
  "flow.requirementKeys?.includes(key)",
  "directCapturedTraceableOnlyKeys",
  "completionStatus",
  "concrete-output",
  "policy-consequence",
]) {
  if (!closureSource.includes(token)) fail(`requirements impact closure missing ${token}`);
}
for (const key of [
  "guestWifi", "management", "remoteAccess", "cloudConnected", "voice", "printers", "iot", "cameras", "wireless", "siteCount", "usersPerSite", "implementationTimeline", "outputPackage", "primaryAudience"
]) {
  if (!closureSource.includes(key)) fail(`closure model missing key mapping for ${key}`);
}
const coverageSource = read("backend/src/services/designCore/designCore.requirementsCoverage.ts");
for (const stale of ["businessApps", "cutoverWindow", "rollbackNeed", "reportAudience", "documentationDepth"]) {
  if (coverageSource.includes(stale)) fail(`requirements coverage still references stale field ${stale}`);
}
for (const current of ["applicationProfile", "criticalServicesModel", "implementationTimeline", "rolloutModel", "downtimeConstraint", "outputPackage", "primaryAudience"]) {
  if (!coverageSource.includes(current)) fail(`requirements coverage missing current field ${current}`);
}
const backendTypes = read("backend/src/services/designCore.types.ts");
for (const token of ["RequirementsImpactClosureItem", "RequirementsImpactClosureSummary", "requirementsImpactClosure: RequirementsImpactClosureSummary"]) {
  if (!backendTypes.includes(token)) fail(`backend type missing ${token}`);
}
const serviceSource = read("backend/src/services/designCore.service.ts");
for (const token of ["buildRequirementsImpactClosureSummary", "requirementsImpactClosure", "networkObjectModel"]) {
  if (!serviceSource.includes(token)) fail(`design core service missing ${token}`);
}
const frontendTypes = read("frontend/src/lib/designCoreSnapshot.ts");
for (const token of ["RequirementsImpactClosureSummary", "requirementsImpactClosure?: RequirementsImpactClosureSummary"]) {
  if (!frontendTypes.includes(token)) fail(`frontend snapshot missing ${token}`);
}
const overviewSource = read("frontend/src/pages/ProjectOverviewPage.tsx");
for (const token of ["Requirement impact closure", "requirementsImpactClosure", "directCapturedTraceableOnlyKeys", "concreteOutputs", "visibleIn"]) {
  if (!overviewSource.includes(token)) fail(`overview page missing ${token}`);
}
const materializerSource = read("backend/src/services/requirementsMaterialization.service.ts");
for (const banned of ["Phase 62 requirement materialization", "Phase 62 inventories"]) {
  if (materializerSource.includes(banned)) fail(`materializer still exposes internal wording: ${banned}`);
}
const registrySource = read("backend/src/services/requirementsImpactRegistry.ts");
if (registrySource.includes("Phase 62 must show")) fail("registry still exposes Phase 62 validation wording");
const packageJson = JSON.parse(read("package.json"));
if (packageJson.version !== '0.66.0') fail(`expected package version 0.66.0, found ${packageJson.version}`);
if (!packageJson.scripts["check:phase64-requirements-completion-closure"]) fail("package script missing phase64 check");
console.log(`Phase 64 requirements completion closure check passed (${profileKeys.length} fields covered).`);
