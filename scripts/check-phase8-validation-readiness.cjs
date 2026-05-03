const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`[phase8] ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }
function read(file) { return fs.readFileSync(path.join(process.cwd(), file), "utf8"); }
function json(file) { return JSON.parse(read(file)); }

const files = {
  builder: "backend/src/services/designCore/designCore.phase8ValidationReadinessControl.ts",
  selftest: "backend/src/lib/phase8ValidationReadiness.selftest.ts",
  types: "backend/src/services/designCore.types.ts",
  service: "backend/src/services/designCore.service.ts",
  validation: "backend/src/services/validation.service.ts",
  exportService: "backend/src/services/export.service.ts",
  report: "backend/src/services/exportDesignCoreReport.service.ts",
  frontendTypes: "frontend/src/lib/designCoreSnapshot.ts",
  overview: "frontend/src/pages/ProjectOverviewPage.tsx",
  phase0: "backend/src/lib/phase0EngineInventory.ts",
  doc: "docs/doc/PHASE8-VALIDATION-READINESS-AUTHORITY.md",
  rootPkg: "package.json",
  backendPkg: "backend/package.json",
};

for (const file of Object.values(files)) assert(fs.existsSync(path.join(process.cwd(), file)), `missing ${file}`);
const c = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, read(f)]));

for (const marker of [
  "PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT",
  "STRICT_READINESS_AUTHORITY_NOT_ADVISORY_SUMMARY",
  "phase8ValidationReadiness",
  "BLOCKING",
  "REVIEW_REQUIRED",
  "WARNING",
  "INFO",
  "PASSED",
  "validationGateAllowsImplementation",
  "coverageRows",
  "requirementGateRows",
  "frontendImpact",
  "reportImpact",
  "diagramImpact",
  "remediation",
  "VALIDATION_REQUIREMENT_PROPAGATION_GAP",
  "VALIDATION_CIDR_ADDRESSING_READINESS_GAP",
  "VALIDATION_IPAM_DURABLE_AUTHORITY_GAP",
  "VALIDATION_STANDARDS_RULE_GAP",
  "VALIDATION_REPORT_TRUTH_WARNING",
  "VALIDATION_DIAGRAM_TRUTH_WARNING",
]) {
  assert(c.builder.includes(marker), `builder missing ${marker}`);
  assert(c.types.includes(marker), `types missing ${marker}`);
  assert(c.frontendTypes.includes(marker), `frontend types missing ${marker}`);
}

for (const marker of [
  "PHASE8_STRICT_READINESS_BLOCKING",
  "PHASE8_STRICT_READINESS_REVIEW_REQUIRED",
  "PHASE8_STRICT_READINESS_WARNING",
  "designSnapshot?.phase8ValidationReadiness",
]) {
  assert(c.validation.includes(marker), `validation.service missing ${marker}`);
}

assert(c.service.includes("buildPhase8ValidationReadinessControl"), "designCore.service must build Phase 8 summary");
assert(c.service.includes("phase8ValidationReadiness,"), "DesignCoreSnapshot return must expose phase8ValidationReadiness");
assert(c.exportService.includes("Phase 8 Validation Readiness Authority"), "CSV/export must include Phase 8 contract rows");
assert(c.report.includes("Phase 8 Validation / Readiness Authority"), "DOCX/PDF report must include Phase 8 section");
assert(c.report.includes("paragraphs: [\"Design-core is the backend coordinator"), "Phase 6 report section must use ReportSection.paragraphs instead of unsupported summary property");
assert(c.report.includes("paragraphs: [\"Standards are evaluated as active rules"), "Phase 7 report section must use ReportSection.paragraphs instead of unsupported summary property");
assert(!c.report.includes("summary:"), "exportDesignCoreReport.service.ts must not use unsupported ReportSection.summary property");
assert(c.overview.includes("Phase 8 validation readiness authority"), "ProjectOverview must display Phase 8 control");
assert(c.phase0.includes("designCore.phase8ValidationReadinessControl.ts") && c.phase0.includes("phase8ValidationReadiness") && c.phase0.includes("phase: 8") && c.phase0.includes('currentPhase0Verdict: "CONTROLLED"'), "Phase 0 inventory must mark Phase 8 controlled");
assert(c.doc.includes("Phase 8") && c.doc.includes("PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT"), "Phase 8 doc missing contract");
assert(c.selftest.includes("buildPhase8ValidationReadinessControl") && c.selftest.includes("blocked/review findings must prevent implementation gate"), "Phase 8 selftest missing core assertions");

const rootPkg = json(files.rootPkg);
const backendPkg = json(files.backendPkg);
assert(['0.107.0','0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(rootPkg.version), "root version must remain 0.107.0 for inherited Phase 84-107 release checks");
assert(rootPkg.scripts && rootPkg.scripts["check:phase8-validation-readiness"] === "node scripts/check-phase8-validation-readiness.cjs", "root script check:phase8-validation-readiness missing");
assert(rootPkg.scripts && rootPkg.scripts["check:phase8-107-release"], "root script check:phase8-107-release missing");
assert(rootPkg.scripts["check:phase8-107-release"].includes("check:phase8-validation-readiness"), "phase8 release chain must include phase8 check");
assert(rootPkg.scripts["check:phase8-107-release"].includes("check:phase7-107-release"), "phase8 release chain must include previous phase chain");
assert(backendPkg.scripts && backendPkg.scripts["engine:selftest:phase8-validation-readiness"] === "tsx src/lib/phase8ValidationReadiness.selftest.ts", "backend phase8 selftest script missing");
assert(backendPkg.scripts["engine:selftest:all"].includes("engine:selftest:phase8-validation-readiness"), "backend engine:selftest:all must include Phase 8 selftest");

console.log("[phase8] Validation/readiness authority checks passed");
