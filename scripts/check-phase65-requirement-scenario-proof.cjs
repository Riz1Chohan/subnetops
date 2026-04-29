#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = process.cwd();
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function fail(message) { console.error(`Phase 65 requirement scenario proof check failed: ${message}`); process.exit(1); }

const scenarioSource = read("backend/src/services/designCore/designCore.requirementsScenarioProof.ts");
for (const token of [
  "buildRequirementsScenarioProofSummary",
  "scenario-proof-user-capacity",
  "scenario-proof-site-count",
  "scenario-proof-guest-isolation",
  "scenario-proof-management-plane",
  "scenario-proof-remote-access",
  "scenario-proof-cloud-boundary",
  "scenario-proof-voice-qos",
  "scenario-proof-shared-device-isolation",
  "scenario-proof-operations-plane",
  "scenario-proof-resilience-wan",
  "scenario-proof-security-segmentation",
  "flowCountForKeys",
  "concreteFragments",
  "objectCheck",
  "blocked",
  "review-required",
]) {
  if (!scenarioSource.includes(token)) fail(`scenario proof source missing ${token}`);
}

for (const key of [
  "siteCount",
  "usersPerSite",
  "guestWifi",
  "guestPolicy",
  "management",
  "managementAccess",
  "remoteAccess",
  "remoteAccessMethod",
  "cloudConnected",
  "environmentType",
  "cloudConnectivity",
  "voice",
  "phoneCount",
  "printers",
  "printerCount",
  "iot",
  "iotDeviceCount",
  "cameras",
  "cameraCount",
  "monitoringModel",
  "loggingModel",
  "backupPolicy",
  "complianceProfile",
  "dualIsp",
  "resilienceTarget",
  "primaryGoal",
  "securityPosture",
  "trustBoundaryModel",
]) {
  if (!scenarioSource.includes(key)) fail(`scenario proof does not inspect requirement key ${key}`);
}

const backendTypes = read("backend/src/services/designCore.types.ts");
for (const token of [
  "RequirementsScenarioProofSignal",
  "RequirementsScenarioProofSummary",
  'status: "passed" | "review-required" | "blocked"',
  "requirementsScenarioProof: RequirementsScenarioProofSummary",
]) {
  if (!backendTypes.includes(token)) fail(`backend type missing ${token}`);
}

const serviceSource = read("backend/src/services/designCore.service.ts");
for (const token of [
  "buildRequirementsScenarioProofSummary",
  "const requirementsScenarioProof",
  "requirementsImpactClosure",
  "networkObjectModel",
  "requirementsScenarioProof,",
]) {
  if (!serviceSource.includes(token)) fail(`design core service missing ${token}`);
}

const frontendTypes = read("frontend/src/lib/designCoreSnapshot.ts");
for (const token of [
  "RequirementsScenarioProofSignal",
  "RequirementsScenarioProofSummary",
  "requirementsScenarioProof?: RequirementsScenarioProofSummary",
]) {
  if (!frontendTypes.includes(token)) fail(`frontend snapshot type missing ${token}`);
}

const overviewSource = read("frontend/src/pages/ProjectOverviewPage.tsx");
for (const token of [
  "Requirement scenario proof",
  "requirementsScenarioProof",
  "Scenario drivers have backend-visible design evidence",
  "blockerCount",
  "reviewCount",
  "missingEvidence",
]) {
  if (!overviewSource.includes(token)) fail(`overview page missing ${token}`);
}

const exportSource = read("backend/src/services/exportDesignCoreReport.service.ts");
for (const token of [
  "requirementsScenarioProof",
  "Requirement Traceability and Scenario Proof",
  "Requirement Scenario Proof",
  "Requirement Impact Closure",
  "passedSignalCount",
]) {
  if (!exportSource.includes(token)) fail(`export report missing ${token}`);
}

const phase64Check = read("scripts/check-phase64-requirements-completion-closure.cjs");
if (!phase64Check.includes("0.66.0")) fail("phase64 check version expectation was not advanced to 0.66.0");
const packageJson = JSON.parse(read("package.json"));
if (!/^0\.(66|67|68)\.0$/.test(packageJson.version)) fail(`expected package version 0.66.0 or later, found ${packageJson.version}`);
if (packageJson.scripts["check:phase64-requirements-completion-closure"] !== "node scripts/check-phase64-requirements-completion-closure.cjs && npm run check:phase65-requirement-scenario-proof") {
  fail("phase64 check does not chain phase65 scenario proof check");
}
if (!packageJson.scripts["check:phase65-requirement-scenario-proof"]) fail("package script missing check:phase65-requirement-scenario-proof");

console.log("Phase 65 requirement scenario proof check passed.");
