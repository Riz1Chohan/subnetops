#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fail = (message) => {
  console.error(`Frontend engine modularity check failed: ${message}`);
  process.exit(1);
};

const libDir = path.join(root, "frontend", "src", "lib");
for (const removed of ["designSynthesis.ts", "designSynthesis.implementation.ts", "designSynthesis.topology.ts", "frontendPreviewDesign.ts"]) {
  if (fs.existsSync(path.join(libDir, removed))) {
    fail(`${removed} must remain removed. Frontend planning engines are not allowed after Phase 32B.`);
  }
}

for (const required of ["designSynthesis.types.ts", "backendDesignDisplayModel.ts", "backendSnapshotViewModel.ts", "designCoreAdapter.ts", "designAuthority.tsx"]) {
  if (!fs.existsSync(path.join(libDir, required))) fail(`missing ${required}`);
}

const hook = fs.readFileSync(path.join(root, "frontend", "src", "features", "designCore", "hooks.ts"), "utf8");
if (!hook.includes("buildBackendOnlyDisplayDesign") || hook.includes("buildFrontendDraftPreviewDesign")) {
  fail("useAuthoritativeDesign must use a backend-only display shell and must not call a frontend planner.");
}

const viewModelBytes = Buffer.byteLength(fs.readFileSync(path.join(libDir, "backendSnapshotViewModel.ts"), "utf8"), "utf8");
if (viewModelBytes > 90000) {
  fail(`backendSnapshotViewModel.ts is too large (${viewModelBytes} bytes > 90000). Split it before it becomes another monster file.`);
}

console.log("Frontend engine modularity check passed.");
process.exit(0);
