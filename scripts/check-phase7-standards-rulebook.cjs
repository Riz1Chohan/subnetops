const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`[phase7] ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }
function read(file) { return fs.readFileSync(path.join(process.cwd(), file), "utf8"); }
function json(file) { return JSON.parse(read(file)); }

const files = {
  builder: "backend/src/services/designCore/designCore.phase7StandardsRulebookControl.ts",
  selftest: "backend/src/lib/phase7StandardsRulebook.selftest.ts",
  types: "backend/src/services/designCore.types.ts",
  service: "backend/src/services/designCore.service.ts",
  validation: "backend/src/services/validation.service.ts",
  exportService: "backend/src/services/export.service.ts",
  report: "backend/src/services/exportDesignCoreReport.service.ts",
  frontendTypes: "frontend/src/lib/designCoreSnapshot.ts",
  overview: "frontend/src/pages/ProjectOverviewPage.tsx",
  standardsPage: "frontend/src/pages/ProjectStandardsPage.tsx",
  phase0: "backend/src/lib/phase0EngineInventory.ts",
  doc: "docs/doc/PHASE7-STANDARDS-ALIGNMENT-RULEBOOK.md",
  rootPkg: "package.json",
  backendPkg: "backend/package.json",
};

for (const file of Object.values(files)) assert(fs.existsSync(path.join(process.cwd(), file)), `missing ${file}`);
const c = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, read(f)]));

for (const marker of [
  "PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT",
  "ACTIVE_STANDARDS_RULEBOOK_NOT_DECORATIVE_TEXT",
  "applicabilityCondition",
  "severity",
  "enforcementState",
  "affectedEngines",
  "affectedObjectIds",
  "remediationGuidance",
  "requirementRelationships",
  "exceptionPolicy",
  "requirementActivations",
  "STANDARDS_RULE_BLOCKER",
  "STANDARDS_RULE_REVIEW_REQUIRED",
  "STANDARDS_RULE_WARNING",
]) {
  assert(c.builder.includes(marker), `builder missing ${marker}`);
  assert(c.types.includes(marker), `types missing ${marker}`);
  assert(c.frontendTypes.includes(marker), `frontend types missing ${marker}`);
}

for (const rule of [
  "ADDR-PRIVATE-IPV4",
  "ADDR-CIDR-HIERARCHY",
  "WAN-POINT-TO-POINT-31",
  "IPV6-ARCHITECTURE",
  "VLAN-SEGMENTATION",
  "ACCESS-CONTROL-8021X",
  "LINK-AGGREGATION",
  "WLAN-STANDARDS",
  "FIREWALL-POLICY",
  "ZERO-TRUST-RESOURCE-FOCUS",
  "MGMT-ISOLATION",
  "GUEST-ISOLATION",
  "HIERARCHICAL-SITE-BLOCKS",
  "GATEWAY-CONSISTENCY",
]) {
  assert(c.builder.includes(rule), `builder missing standards rule ${rule}`);
}

for (const requirement of ["guestWifi", "managementAccess", "remoteAccess", "dualIsp", "cloudConnected", "securityPosture", "gatewayConvention", "siteBlockStrategy"]) {
  assert(c.builder.includes(requirement), `builder missing requirement relationship ${requirement}`);
}

assert(c.service.includes('buildPhase7StandardsRulebookControl'), 'designCore.service must build Phase 7 summary');
assert(c.service.includes('phase7StandardsRulebookControl,'), 'designCore snapshot must expose phase7StandardsRulebookControl');
assert(c.validation.includes('designSnapshot?.phase7StandardsRulebookControl'), 'validation must consume Phase 7 findings');
assert(c.exportService.includes('Phase 7 Standards Rulebook Contract'), 'CSV/export must include Phase 7 contract rows');
assert(c.report.includes('Phase 7 Standards Alignment / Rulebook Contract'), 'DOCX/PDF report must include Phase 7 section');
assert(c.overview.includes('Phase 7 standards rulebook control'), 'ProjectOverview must display Phase 7 control');
assert(c.standardsPage.includes('Rulebook readiness'), 'ProjectStandardsPage must show backend Phase 7 rulebook readiness');
assert(c.phase0.includes('designCore.phase7StandardsRulebookControl.ts') && c.phase0.includes('phase7StandardsRulebookControl') && c.phase0.includes('phase: 7') && c.phase0.includes('currentPhase0Verdict: "CONTROLLED"'), 'Phase 0 inventory must mark Phase 7 controlled');
assert(c.doc.includes('Phase 7') && c.doc.includes('PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT'), 'Phase 7 doc missing contract');
assert(c.selftest.includes('buildPhase7StandardsRulebookControl') && c.selftest.includes('guestWifi must activate guest isolation rule'), 'Phase 7 selftest missing core assertions');

const rootPkg = json(files.rootPkg);
const backendPkg = json(files.backendPkg);
assert(['0.107.0','0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(rootPkg.version), 'root version must remain 0.107.0 for inherited Phase 84-107 release checks');
assert(rootPkg.scripts && rootPkg.scripts['check:phase7-standards-rulebook'] === 'node scripts/check-phase7-standards-rulebook.cjs', 'root script check:phase7-standards-rulebook missing');
assert(rootPkg.scripts && rootPkg.scripts['check:phase7-107-release'], 'root script check:phase7-107-release missing');
assert(rootPkg.scripts['check:phase7-107-release'].includes('check:phase7-standards-rulebook'), 'phase7 release chain must include phase7 check');
assert(rootPkg.scripts['check:phase7-107-release'].includes('check:phase6-107-release'), 'phase7 release chain must include previous phase chain');
assert(backendPkg.scripts && backendPkg.scripts['engine:selftest:phase7-standards-rulebook'] === 'tsx src/lib/phase7StandardsRulebook.selftest.ts', 'backend phase7 selftest script missing');

console.log('[phase7] Standards rulebook checks passed');
