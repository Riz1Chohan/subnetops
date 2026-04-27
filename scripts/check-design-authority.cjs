#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const requiredFiles = [
  "backend/src/routes/designCore.routes.ts",
  "backend/src/controllers/designCore.controller.ts",
  "backend/src/services/designCore.service.ts",
  "backend/src/services/designCore/designCore.helpers.ts",
  "backend/src/services/designCore/designCore.repository.ts",
  "frontend/src/features/designCore/api.ts",
  "frontend/src/features/designCore/hooks.ts",
  "frontend/src/lib/designCoreSnapshot.ts",
  "frontend/src/lib/designCoreAdapter.ts",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Design authority check failed. Missing files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const addressingPage = fs.readFileSync(path.join(root, "frontend/src/pages/ProjectAddressingPage.tsx"), "utf8");
const reportPage = fs.readFileSync(path.join(root, "frontend/src/pages/ProjectReportPage.tsx"), "utf8");

for (const [name, source] of [["ProjectAddressingPage", addressingPage], ["ProjectReportPage", reportPage]]) {
  if (!source.includes("useDesignCoreSnapshot(projectId)")) {
    console.error(`${name} does not fetch the backend design-core snapshot.`);
    process.exit(1);
  }
  if (!source.includes("applyDesignCoreSnapshotToSynthesis")) {
    console.error(`${name} does not apply backend design-core output to the frontend view model.`);
    process.exit(1);
  }
}

const backendService = fs.readFileSync(path.join(root, "backend/src/services/designCore.service.ts"), "utf8");
if (!backendService.includes("./designCore/designCore.helpers.js") || !backendService.includes("./designCore/designCore.repository.js")) {
  console.error("Backend design core service has not been split into helper/repository seams.");
  process.exit(1);
}

console.log("Design authority seam check passed.");
