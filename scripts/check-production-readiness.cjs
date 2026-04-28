#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fail = (message) => {
  console.error(`Production readiness check failed: ${message}`);
  process.exitCode = 1;
};
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

function walk(dir, visitor) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      visitor(relative, true);
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".npm-cache") continue;
      walk(absolute, visitor);
    } else {
      visitor(relative, false);
    }
  }
}

for (const required of [
  "backend/src/app.ts",
  "backend/src/server.ts",
  "backend/src/services/designCore.service.ts",
  "backend/src/lib/behavioralMatrix.selftest.ts",
  "backend/prisma/schema.prisma",
  "backend/prisma/migrations",
  "frontend/src/main.tsx",
  "frontend/src/features/designCore/hooks.ts",
  "frontend/src/lib/designSynthesis.types.ts",
  "frontend/src/lib/backendDesignDisplayModel.ts",
  "frontend/src/lib/backendSnapshotViewModel.ts",
  "scripts/verify-build.sh",
  "scripts/final-preflight.sh",
  "scripts/deployment-rehearsal.sh",
  "scripts/smoke-test.sh",
]) {
  if (!exists(required)) fail(`required release surface is missing: ${required}`);
}

walk(root, (relativePath, isDirectory) => {
  if (!isDirectory) return;
  if (relativePath === "backend/dist" || relativePath === "frontend/dist") {
    fail(`${relativePath} must not be packaged; Render should build artifacts from source.`);
  }
  if (relativePath === "backend/node_modules" || relativePath === "frontend/node_modules" || relativePath === "node_modules") {
    fail(`${relativePath} must not be packaged; dependencies must be restored with npm ci.`);
  }
});

const rootName = path.basename(root);
if (/phase1[3-9]|phase2[0-4]/i.test(rootName)) {
  fail(`release root folder name is stale for Phase 25: ${rootName}`);
}

const backendPackage = readJson("backend/package.json");
const frontendPackage = readJson("frontend/package.json");
const backendLock = readJson("backend/package-lock.json");
const frontendLock = readJson("frontend/package-lock.json");

if (backendPackage.name !== "subnetops-backend") fail("backend/package.json has the wrong package name.");
if (frontendPackage.name !== "subnetops-frontend") fail("frontend/package.json has the wrong package name.");
if (!backendPackage.scripts?.build?.includes("tsc")) fail("backend build script must compile TypeScript.");
if (!frontendPackage.scripts?.build?.includes("tsc") || !frontendPackage.scripts?.build?.includes("vite build")) {
  fail("frontend build script must run TypeScript and Vite build.");
}
if (backendLock.name !== "subnetops-backend" && backendLock.packages?.[""]?.name !== "subnetops-backend") {
  fail("backend package-lock does not match subnetops-backend.");
}
if (frontendLock.name !== "subnetops-frontend" && frontendLock.packages?.[""]?.name !== "subnetops-frontend") {
  fail("frontend package-lock does not match subnetops-frontend.");
}

const render = read("render.yaml");
for (const requiredRender of [
  "rootDir: backend",
  "rootDir: frontend",
  "npm ci --include=dev --ignore-scripts --no-audit --no-fund && npm run prisma:generate && npm run build",
  "npm ci --include=dev --no-audit --no-fund && npm run build",
  "healthCheckPath: /api/health/ready",
  "staticPublishPath: ./dist",
  "VITE_API_BASE_URL",
  "CORS_ORIGIN",
]) {
  if (!render.includes(requiredRender)) fail(`render.yaml is missing required production setting: ${requiredRender}`);
}

for (const [key, unsafeValue] of [
  ["PRISMA_BASELINE_EXISTING_DB", '"true"'],
  ["ALLOW_UNSAFE_DB_PUSH", '"true"'],
  ["DB_PUSH_ON_BOOT", '"true"'],
]) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const valuePattern = new RegExp(`key:\\s*${escapedKey}[\\s\\S]{0,80}value:\\s*${unsafeValue}`);
  if (valuePattern.test(render)) fail(`render.yaml must not leave ${key} enabled for the final release.`);
}

const verify = read("scripts/verify-build.sh");
for (const requiredGate of [
  "scripts/assert-release-discipline.sh",
  "node scripts/check-production-readiness.cjs",
  "node scripts/check-behavioral-test-matrix.cjs",
  "npm run security:selftest:rate-limit",
  "npm run engine:selftest:all",
  "selftest-design-authority-overlay.ts",
  "npm run build",
]) {
  if (!verify.includes(requiredGate)) fail(`verify-build.sh is missing release gate: ${requiredGate}`);
}
if (!verify.includes('npm_config_cache="${NPM_CONFIG_CACHE:-${ROOT_DIR}/.npm-cache}"')) {
  fail("verify-build.sh must use a local npm cache so root-owned global npm cache state does not break the release gate.");
}
if (!read(".gitignore").includes(".npm-cache/")) {
  fail(".gitignore must exclude the local npm cache used by verify-build.sh.");
}

const deploymentRehearsal = read("scripts/deployment-rehearsal.sh");
for (const requiredProbe of [
  "Checking backend live endpoint",
  "Checking backend ready endpoint",
  "CORS preflight from frontend origin",
  "Unsafe request is rejected without CSRF",
  "Authenticated login and export checks",
]) {
  if (!deploymentRehearsal.includes(requiredProbe)) fail(`deployment rehearsal is missing probe: ${requiredProbe}`);
}

for (const doc of [
  "docs/project-meta/PHASE21-RELEASE-FOUNDATION-CLEANUP.md",
  "docs/project-meta/PHASE22-BACKEND-AUTHORITY-ENFORCEMENT.md",
  "docs/project-meta/PHASE23-FRONTEND-ENGINE-CLEANUP.md",
  "docs/project-meta/PHASE24-BEHAVIORAL-TEST-MATRIX.md",
  "docs/project-meta/PHASE25-PRODUCTION-READINESS-AUDIT.md",
]) {
  if (!exists(doc)) fail(`phase handoff document is missing: ${doc}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Production readiness check passed.");
process.exit(0);
