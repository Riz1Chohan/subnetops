#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const servicePath = path.join(root, "backend/src/services/designCore.service.ts");
const seamDir = path.join(root, "backend/src/services/designCore");
const requiredSeams = [
  "designCore.helpers.ts",
  "designCore.repository.ts",
  "designCore.traceability.ts",
  "designCore.requirementsCoverage.ts",
  "designCore.standardsAlignment.ts",
];

function fail(message) {
  console.error(`Design core modularity check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(servicePath)) fail("designCore.service.ts is missing.");
for (const file of requiredSeams) {
  if (!fs.existsSync(path.join(seamDir, file))) fail(`${file} seam is missing.`);
}

const service = fs.readFileSync(servicePath, "utf8");
if (!service.includes("./designCore/designCore.traceability.js")) fail("traceability builder is not imported as a seam.");
if (!service.includes("./designCore/designCore.requirementsCoverage.js")) fail("requirements coverage builder is not imported as a seam.");
if (!service.includes("./designCore/designCore.standardsAlignment.js")) fail("standards alignment builder is not imported as a seam.");
if (/^function buildTraceability\(/m.test(service)) fail("buildTraceability is still embedded in the monster service.");
if (/^function buildRequirementsCoverageSummary\(/m.test(service)) fail("buildRequirementsCoverageSummary is still embedded in the monster service.");
if (/^function buildStandardsAlignmentSummary\(/m.test(service)) fail("buildStandardsAlignmentSummary is still embedded in the monster service.");

const serviceBytes = Buffer.byteLength(service, "utf8");
if (serviceBytes > 90_000) {
  fail(`designCore.service.ts is ${serviceBytes} bytes; keep reducing it below the 90 KB danger line.`);
}

console.log("Design core modularity check passed.");
