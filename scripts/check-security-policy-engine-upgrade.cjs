#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fail = (message) => {
  console.error(`Security policy engine upgrade check failed: ${message}`);
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

mustExist("backend/src/lib/phase35SecurityPolicyEngine.selftest.ts");
mustContain("backend/package.json", "engine:selftest:phase35-security", "backend package must register the Phase 35 security policy selftest");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "buildPolicyMatrix", "security engine must build a backend policy matrix");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "buildRuleOrderReviews", "security engine must review rule order and shadowing");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "SECURITY_RULE_SHADOWED_BY_EARLIER_RULE", "security engine must detect shadowed rules");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "SECURITY_IMPLICIT_DENY_NOT_MODELED", "security engine must detect implicit-deny gaps");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "SECURITY_NAT_REQUIRED_FLOW_UNCOVERED", "security engine must detect uncovered NAT-required flows");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "evaluateNatReviewState", "security engine must evaluate NAT readiness through explicit conditions instead of blocking all required NAT");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "SECURITY_DEFAULT_DENY_WEAKENED_BY_ALLOW", "security engine must reject allow-only rules on default-deny boundaries");
mustContain("backend/src/services/designCore/designCore.securityPolicyFlow.ts", "loggingRequired", "security engine must expose logging evidence requirements");
mustContain("backend/src/services/designCore.types.ts", "SecurityPolicyMatrixRow", "backend snapshot types must include policy matrix rows");
mustContain("backend/src/services/designCore.types.ts", "SecurityRuleOrderReview", "backend snapshot types must include rule order reviews");
mustContain("backend/src/services/designCore.types.ts", "SecurityNatReview", "backend snapshot types must include NAT reviews");
mustContain("frontend/src/lib/designCoreSnapshot.ts", "SecurityPolicyMatrixRow", "frontend snapshot contract must mirror security outputs without computing them");
mustContain("frontend/src/lib/designCoreSnapshot.ts", "SecurityRuleOrderReview", "frontend snapshot contract must mirror rule order outputs without computing them");
mustContain("frontend/src/lib/designCoreSnapshot.ts", "SecurityNatReview", "frontend snapshot contract must mirror NAT review outputs without computing them");

for (const requiredCase of [
  "phase 35 builds a backend security policy matrix instead of frontend policy assumptions",
  "phase 35 detects implicit deny gaps for high-risk zone pairs",
  "phase 35 detects rule order shadowing and broad allow risk",
  "phase 35 reviews NAT coverage for NAT-required egress flows",
  "phase 35 exposes service groups logging requirements and observed first-match rule evidence",
  "phase 35 treats required NAT as ready when zones translation and flow coverage are valid",
  "phase 35 does not let allow-only rules satisfy default-deny boundaries",
  "phase 35 keeps security outputs vendor-neutral without command generation",
]) {
  mustContain("backend/src/lib/phase35SecurityPolicyEngine.selftest.ts", requiredCase, "missing Phase 35 security engine test case");
}

const securitySource = read("backend/src/services/designCore/designCore.securityPolicyFlow.ts");
for (const forbiddenSourcePattern of [
  '|| natRule.status === "required"',
  'if (row.explicitPolicyRuleIds.length > 0) continue',
]) {
  if (securitySource.includes(forbiddenSourcePattern)) {
    fail(`backend security engine still contains weak Phase 35 regression pattern: ${forbiddenSourcePattern}`);
  }
}

for (const forbiddenFrontend of [
  "buildPolicyMatrix(",
  "buildRuleOrderReviews(",
  "SECURITY_IMPLICIT_DENY_NOT_MODELED",
  "SECURITY_RULE_SHADOWED_BY_EARLIER_RULE",
]) {
  const frontendFiles = walk(path.join(root, "frontend/src")).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
  for (const file of frontendFiles) {
    const relative = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    if (source.includes(forbiddenFrontend)) {
      fail(`${relative} contains backend security-engine token ${forbiddenFrontend}; frontend must only display backend outputs`);
    }
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

console.log("Security policy engine upgrade check passed.");
process.exit(0);
