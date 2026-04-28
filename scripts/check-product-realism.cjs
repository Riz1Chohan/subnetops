#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Product realism check failed: ${message}`);
    process.exit(1);
  }
}

const exportService = read("backend/src/services/export.service.ts");
const reportPage = read("frontend/src/pages/ProjectReportPage.tsx");
const validationService = read("backend/src/services/validation.service.ts");
const validationList = read("frontend/src/features/validation/components/ValidationList.tsx");
const designCoreService = read("backend/src/services/designCore.service.ts");
const designCoreTypes = read("backend/src/services/designCore.types.ts");
const designCoreSnapshot = read("frontend/src/lib/designCoreSnapshot.ts");

assert(exportService.includes("Planning Assumptions"), "export report is missing Planning Assumptions.");
assert(exportService.includes("PLANNING_ASSUMPTIONS"), "export service does not include explicit planning assumptions.");
assert(reportPage.includes("PLANNING_ASSUMPTIONS"), "report page does not show planning assumptions.");
assert(exportService.includes("Engineer Review Checklist"), "export report is missing the engineer review checklist.");
assert(exportService.includes("ENGINEER_REVIEW_CHECKLIST"), "export service does not include engineer review checklist items.");
assert(reportPage.includes("ENGINEER_REVIEW_CHECKLIST"), "report page does not include the engineer review checklist.");
assert(exportService.includes("This design package is intended for planning and review"), "export report is missing engineer-review-required language.");
assert(reportPage.includes("This design package is intended for planning and review"), "report page is missing engineer-review-required language.");

assert(validationService.includes("issue:") && validationService.includes("impact:") && validationService.includes("recommendation:"), "backend validation does not expose issue/impact/recommendation structure.");
assert(validationList.includes("Issue:") && validationList.includes("Impact:") && validationList.includes("Recommendation:"), "frontend validation list does not render issue/impact/recommendation.");
assert(exportService.includes('headers: ["Severity", "Finding", "Issue", "Impact", "Recommendation"]'), "report/export validation findings are not structured.");
assert(exportService.includes("Validation Findings"), "report/export is missing validation findings.");

assert(designCoreService.includes('authority: {') && designCoreService.includes('source: "backend-design-core"') && designCoreService.includes('requiresEngineerReview: true'), "backend design-core snapshot authority metadata is missing.");
assert(designCoreTypes.includes('source: "backend-design-core"') && designCoreTypes.includes('requiresEngineerReview: true'), "backend design-core type is missing authority metadata.");
assert(designCoreSnapshot.includes('source: "backend-design-core"') && designCoreSnapshot.includes('requiresEngineerReview: true'), "frontend design-core snapshot type is missing authority metadata.");
assert(designCoreSnapshot.includes("Backend snapshot unavailable") && designCoreSnapshot.includes("engineer review required"), "fallback/authority labels are not realistic enough.");

const bannedTerms = [
  "guaranteed",
  "production-ready",
  "enterprise-grade",
  "complete network design",
  "automatic final design",
  "best-practice certified",
  "automatically creates production-ready",
  "production-perfect",
  "final implementation truth",
];

const keyFiles = [
  "frontend/src/pages/LandingPage.tsx",
  "frontend/src/pages/AboutPage.tsx",
  "frontend/src/pages/FaqPage.tsx",
  "frontend/src/pages/ProjectReportPage.tsx",
  "frontend/src/pages/ProjectAddressingPage.tsx",
  "frontend/src/features/validation/components/ValidationList.tsx",
  "backend/src/services/export.service.ts",
  "backend/src/services/validation.service.ts",
  "backend/src/services/exportDesignCoreReport.service.ts",
  "README.md",
];

for (const file of keyFiles) {
  const source = read(file).toLowerCase();
  for (const term of bannedTerms) {
    assert(!source.includes(term), `${file} still contains overconfident banned term: ${term}`);
  }
}

console.log("Product realism check passed.");

process.exit(0);
