const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (condition, message) => {
  if (!condition) {
    console.error(`Phase 97 check failed: ${message}`);
    process.exit(1);
  }
};

const runtime = read("backend/src/services/requirementsRuntimeProof.service.ts");
const pkg = read("package.json");
const canvas = read("frontend/src/features/diagram/components/BackendDiagramCanvas.tsx");
const doc = read("docs/doc/PHASE97-DIAGRAM-QA-SECURITY-MATRIX-RELEASE-INTEGRITY.md");

assert(/version: "0\.(9[7-9]|[1-9][0-9]{2,})\.0"/.test(runtime), "runtime version must include Phase 97 or later");
assert(runtime.includes('diagramQaSecurityMatrixReleaseIntegrity: "PHASE_97_DIAGRAM_QA_SECURITY_MATRIX_RELEASE_INTEGRITY"'), "Phase 97 runtime marker missing");
assert(/"version": "0\.(9[7-9]|[1-9][0-9]{2,})\.0"/.test(pkg), "root package version must include Phase 97 or later");
assert(pkg.includes('"check:phase97-diagram-qa-security-matrix-release-integrity"'), "Phase 97 package script missing");
assert(pkg.includes('"check:phase84-97-release"'), "Phase 84-97 release chain missing");

assert(canvas.includes("phase97SecurityMatrixGuides"), "security matrix guides missing from diagram canvas");
assert(canvas.includes("phase97LogicalSiteGuides"), "logical site lane guides missing from diagram canvas");
assert(canvas.includes("phase97TopologyGuides"), "topology guide frame missing from diagram canvas");
assert(canvas.includes("pruneDuplicateWanAnchors"), "duplicate WAN/transit pruning missing");
assert(canvas.includes("Policy rules are grouped by allow/review/deny lanes"), "security matrix explanatory copy missing");
assert(!canvas.includes("layout: {renderModel.summary.layoutMode}"), "internal layout mode is still leaking into user-facing canvas copy");

[
  "render.yaml",
  "scripts/verify-build.sh",
  "scripts/final-preflight.sh",
  "scripts/deployment-rehearsal.sh",
  "scripts/generate-lockfiles.sh",
  "scripts/check-release-artifacts.cjs",
  "scripts/assert-release-discipline.sh"
].forEach((file) => assert(exists(file), `${file} missing`));

assert(doc.includes("PHASE_97_DIAGRAM_QA_SECURITY_MATRIX_RELEASE_INTEGRITY"), "Phase 97 documentation marker missing");
assert(doc.includes("Security/Boundaries"), "Phase 97 documentation does not describe security boundary work");
assert(doc.includes("release package integrity"), "Phase 97 documentation does not describe release integrity work");

console.log("Phase 97 diagram QA, security matrix, and release package integrity checks passed.");
