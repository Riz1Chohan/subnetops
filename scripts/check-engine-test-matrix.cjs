#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fail = (message) => {
  console.error(`Engine test matrix check failed: ${message}`);
  process.exit(1);
};
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const mustExist = (relative) => {
  if (!fs.existsSync(path.join(root, relative))) fail(`missing ${relative}`);
};
const mustContain = (relative, needle, message) => {
  const source = read(relative);
  if (!source.includes(needle)) fail(`${message}: expected ${relative} to contain ${needle}`);
};

mustExist("backend/src/lib/phase33EngineMatrix.selftest.ts");
mustContain("backend/package.json", '"engine:selftest:phase33-matrix"', "backend package must register the Phase 33 engine matrix");
mustContain("backend/package.json", "engine:selftest:phase33-matrix", "backend all-selftest chain must include Phase 33 matrix");
mustContain("scripts/verify-build.sh", "engine:selftest:all", "verify-build must run the full backend engine selftest chain");

for (const requiredCase of [
  "phase 33 confirms backend authority metadata and no frontend design fallback contract",
  "phase 33 verifies backend object model coverage across devices interfaces zones policies NAT DHCP and reservations",
  "phase 33 verifies routing matrix produces connected default summary and branch reachability intent",
  "phase 33 verifies security-flow matrix exposes zone-to-zone policy and NAT consequences",
  "phase 33 verifies implementation matrix stages steps verification rollback and blockers are backend generated",
  "phase 33 hostile matrix keeps defects blocked instead of silently converting them into usable design truth",
]) {
  mustContain("backend/src/lib/phase33EngineMatrix.selftest.ts", requiredCase, `missing Phase 33 engine matrix case`);
}

for (const forbiddenFrontend of [
  "frontend/src/lib/cidrCore.ts",
  "frontend/src/lib/networkValidators.ts",
  "frontend/src/lib/frontendPreviewDesign.ts",
  "frontend/src/lib/designSynthesis.ts",
  "frontend/src/lib/designSynthesis.implementation.ts",
  "frontend/src/lib/designSynthesis.topology.ts",
]) {
  if (fs.existsSync(path.join(root, forbiddenFrontend))) {
    fail(`${forbiddenFrontend} must not exist; frontend cannot retain engine/planner modules`);
  }
}

console.log("Engine test matrix check passed.");
process.exit(0);
