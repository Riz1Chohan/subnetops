const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`Release artifact check failed: ${message}`);
    process.exit(1);
  }
};

function findForbiddenDirs(dir, names, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, "/");
    if (names.has(entry.name)) {
      results.push(rel);
      continue;
    }
    if (entry.name === ".git") continue;
    findForbiddenDirs(full, names, results);
  }
  return results;
}

[
  "package.json",
  "README.md",
  "DEPLOY_RENDER.md",
  "render.yaml",
  "backend/package.json",
  "backend/package-lock.json",
  "backend/tsconfig.json",
  "backend/prisma/schema.prisma",
  "frontend/package.json",
  "frontend/package-lock.json",
  "frontend/tsconfig.json",
  "frontend/vite.config.ts",
  "scripts/verify-build.sh",
  "scripts/final-preflight.sh",
  "scripts/deployment-rehearsal.sh",
  "scripts/generate-lockfiles.sh",
  "scripts/assert-release-discipline.sh"
].forEach((file) => assert(exists(file), `${file} missing`));

const rootPkg = JSON.parse(read("package.json"));
assert(/^0\.(99|1[0-9]{2})\.0$/.test(rootPkg.version), "root package version must be 0.99.0 or later Phase 100 compatible version");
assert(rootPkg.scripts["check:phase84-99-release"] || rootPkg.scripts["check:phase84-100-release"] || rootPkg.scripts["check:phase84-101-release"] || rootPkg.scripts["check:phase84-102-release"], "phase84-99, phase84-100, phase84-101, or phase84-102 release chain missing");

const render = read("render.yaml");
assert(render.includes("subnetops-backend"), "render.yaml missing backend service");
assert(render.includes("subnetops-frontend"), "render.yaml missing frontend service");
assert(render.includes("NODE_VERSION"), "render.yaml missing Node pin");

const forbidden = [
  "backend/dist",
  "frontend/dist",
  "node_modules",
  ".DS_Store"
];
for (const item of forbidden) {
  assert(!exists(item), `${item} should not be committed in release package`);
}
const nestedForbidden = findForbiddenDirs(root, new Set(["node_modules", "dist"]));
assert(nestedForbidden.length === 0, `nested build/dependency artifacts should not be committed: ${nestedForbidden.join(", ")}`);

console.log("Release artifact integrity checks passed.");
