#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const requiredFiles = [
  "backend/src/services/designCore/designCore.implementationTemplates.ts",
  "backend/src/lib/phase42VendorNeutralTemplates.selftest.ts",
  "backend/src/services/designCore.types.ts",
  "backend/src/services/designCore.service.ts",
  "backend/src/services/exportDesignCoreReport.service.ts",
  "backend/src/services/export.service.ts",
  "frontend/src/lib/designCoreSnapshot.ts",
  "docs/doc/PHASE42-VENDOR-NEUTRAL-IMPLEMENTATION-TEMPLATES.md",
];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required Phase 42 file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function assertContains(file, token, reason) {
  const content = read(file);
  if (!content.includes(token)) {
    throw new Error(`${file} is missing ${JSON.stringify(token)} (${reason})`);
  }
}

function assertNotContains(file, token, reason) {
  const content = read(file);
  if (content.toLowerCase().includes(token.toLowerCase())) {
    throw new Error(`${file} must not contain ${JSON.stringify(token)} (${reason})`);
  }
}

for (const file of requiredFiles) read(file);

assertContains("backend/src/services/designCore.types.ts", "VendorNeutralImplementationTemplateModel", "backend snapshot needs typed template model");
assertContains("backend/src/services/designCore.types.ts", "commandGenerationAllowed: false", "Phase 42 must explicitly gate command generation");
assertContains("backend/src/services/designCore.types.ts", "vendorSpecificCommandCount: 0", "Phase 42 must prove no vendor commands are emitted");
assertContains("backend/src/services/designCore.types.ts", "vendorNeutralImplementationTemplates: VendorNeutralImplementationTemplateModel", "backend snapshot must expose template truth");
assertContains("frontend/src/lib/designCoreSnapshot.ts", "vendorNeutralImplementationTemplates?: VendorNeutralImplementationTemplateModel", "frontend type must accept backend-owned template truth");

const builder = "backend/src/services/designCore/designCore.implementationTemplates.ts";
assertContains(builder, "buildVendorNeutralImplementationTemplates", "Phase 42 builder must exist");
assertContains(builder, "implementationPlan.steps", "templates must derive from backend implementation plan steps");
assertContains(builder, "implementationPlan.verificationChecks", "templates must carry verification linkage");
assertContains(builder, "implementationPlan.rollbackActions", "templates must carry rollback linkage");
assertContains(builder, "vendorSpecificCommandCount: 0", "builder must keep command count at zero");
assertContains(builder, "commandGenerationAllowed: false", "builder must block command generation");
assertContains(builder, "not contain Cisco", "builder safety notice must reject platform syntax");
assertContains(builder, "Not proven: live device state", "builder must document proof boundary");
assertNotContains(builder, "configure terminal", "Phase 42 must not introduce vendor CLI examples");
assertNotContains(builder, "ip route ", "Phase 42 must not introduce Cisco-style route commands");
assertNotContains(builder, "set rulebase", "Phase 42 must not introduce Palo Alto-style rule commands");

assertContains("backend/src/services/designCore.service.ts", "buildVendorNeutralImplementationTemplates", "snapshot service must wire template builder");
assertContains("backend/src/services/designCore.service.ts", "vendorNeutralImplementationTemplates,", "snapshot must include templates");
assertContains("backend/src/services/exportDesignCoreReport.service.ts", "Phase 42 Vendor-Neutral Implementation Templates", "PDF/DOCX report model must export templates");
assertContains("backend/src/services/exportDesignCoreReport.service.ts", "Vendor-specific command generation remains a later gated phase", "exports must not fake command readiness");
assertContains("backend/src/services/export.service.ts", "Vendor-Neutral Implementation Templates", "CSV export must include template rows");
assertContains("backend/src/lib/phase42VendorNeutralTemplates.selftest.ts", "PHASE41_SCENARIOS", "Phase 42 runtime selftest must reuse scenario matrix");
assertContains("backend/src/lib/phase42VendorNeutralTemplates.selftest.ts", "vendorSpecificCommandCount", "runtime selftest must enforce zero vendor commands");
assertContains("backend/package.json", "engine:selftest:phase42-templates", "backend package must expose Phase 42 runtime selftest");
assertContains("backend/package.json", "engine:selftest:phase42-templates", "Phase 42 selftest must be wired into backend scripts");
assertContains("package.json", "check:phase42-vendor-neutral-templates", "root package must expose Phase 42 static gate");
assertContains("docs/doc/PHASE42-VENDOR-NEUTRAL-IMPLEMENTATION-TEMPLATES.md", "Vendor-neutral", "Phase 42 docs must explain scope");
assertContains("docs/doc/PHASE42-VENDOR-NEUTRAL-IMPLEMENTATION-TEMPLATES.md", "not vendor-specific commands", "docs must keep the command-generation boundary explicit");

console.log("Phase 42 vendor-neutral implementation template static gate passed.");
