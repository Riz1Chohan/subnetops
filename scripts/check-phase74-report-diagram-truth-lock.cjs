#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function assertContains(rel, needle) {
  const body = read(rel);
  if (!body.includes(needle)) {
    console.error(`Phase 74 check failed: ${rel} is missing ${needle}`);
    process.exit(1);
  }
}

assertContains("backend/src/services/export.service.ts", "collectRequirementOutputGaps");
assertContains("backend/src/services/export.service.ts", "Requirement Output Truth Lock");
assertContains("backend/src/services/export.service.ts", "Blocked - requirement outputs missing");
assertContains("backend/src/services/export.service.ts", "must not fall back to single-site language");
assertContains("backend/src/services/export.service.ts", "Requirement-selected sites");
assertContains("backend/src/services/exportDesignCoreReport.service.ts", "Phase 74 Report and Diagram Truth Lock");
assertContains("backend/src/services/exportDesignCoreReport.service.ts", "phase74TruthBlocked");
assertContains("backend/src/services/designCore/designCore.reportDiagramTruth.ts", "buildDiagramEmptyStateReason");
assertContains("backend/src/services/designCore/designCore.reportDiagramTruth.ts", "materialized Site rows");
assertContains("frontend/src/lib/reportDiagramTruth.ts", "missingTopologyInputs");
assertContains("docs/doc/PHASE74-REPORT-DIAGRAM-TRUTH-LOCK.md", "Phase 74");

const packageJson = JSON.parse(read("package.json"));
if (!/^0\.(7[4-9]|[8-9][0-9])\.0$/.test(packageJson.version)) {
  console.error(`Phase 74 check failed: expected package version 0.74.0 or later, got ${packageJson.version}`);
  process.exit(1);
}
if (!packageJson.scripts["check:phase74-report-diagram-truth-lock"]) {
  console.error("Phase 74 check failed: missing check:phase74-report-diagram-truth-lock script.");
  process.exit(1);
}

console.log("Phase 74 report/diagram truth lock static checks passed.");
