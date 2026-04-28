#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const mustContain = (file, needle, message) => {
  const content = read(file);
  if (!content.includes(needle)) {
    console.error(`Behavioral matrix check failed: ${message}`);
    console.error(`Expected ${file} to contain: ${needle}`);
    process.exit(1);
  }
};

const mustExist = (relativePath) => {
  if (!fs.existsSync(path.join(root, relativePath))) {
    console.error(`Behavioral matrix check failed: missing ${relativePath}`);
    process.exit(1);
  }
};

mustExist("backend/src/lib/behavioralMatrix.selftest.ts");
mustExist("scripts/selftest-design-authority-overlay.ts");

mustContain("backend/package.json", '"engine:selftest:behavioral-matrix"', "backend behavioral matrix script must be registered");
mustContain("backend/package.json", "engine:selftest:behavioral-matrix", "backend all-selftest chain must include the behavioral matrix");
mustContain("scripts/verify-build.sh", "node scripts/check-behavioral-test-matrix.cjs", "verify-build must run the behavioral matrix seam check");
mustContain("scripts/verify-build.sh", "selftest-design-authority-overlay.ts", "verify-build must execute frontend/backend authority overlay behavior test");

for (const requiredCase of [
  "backend design-core detects noncanonical, undersized, unusable gateway, overlap, and outside-site defects",
  "backend design-core proposes distinct site blocks when saved site blocks are missing",
  "backend design-core keeps proposals explicitly separate from configured truth",
]) {
  mustContain("backend/src/lib/behavioralMatrix.selftest.ts", requiredCase, `backend matrix missing case: ${requiredCase}`);
}

for (const requiredCase of [
  "authority overlay returns the backend-only display shell unchanged until a backend snapshot exists",
  "authority overlay replaces local addressing with backend checked rows",
  "authority overlay promotes backend blockers into open issues and review state",
]) {
  mustContain("scripts/selftest-design-authority-overlay.ts", requiredCase, `authority overlay matrix missing case: ${requiredCase}`);
}

console.log("Behavioral test matrix seam check passed.");

process.exit(0);
