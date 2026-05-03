import { buildPhase7StandardsRulebookControl, PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT } from "../services/designCore/designCore.phase7StandardsRulebookControl.js";
import type { NetworkObjectModel, Phase3RequirementsClosureControlSummary, StandardsAlignmentSummary } from "../services/designCore.types.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[phase7] ${message}`);
}

const standardsAlignment: StandardsAlignmentSummary = {
  rulebook: { totalRuleCount: 3, formalStandardCount: 2, bestPracticeCount: 1, requiredRuleCount: 2, recommendedRuleCount: 1, conditionalRuleCount: 0, reviewRequiredRuleCount: 0, notes: [] },
  evaluations: [
    { ruleId: "ADDR-PRIVATE-IPV4", title: "Use RFC 1918 private IPv4 space for internal enterprise addressing", authority: "formal-standard", strength: "required", status: "applied", notes: ["Private range is valid."] },
    { ruleId: "GUEST-ISOLATION", title: "Keep guest access isolated from internal business and management resources", authority: "best-practice", strength: "recommended", status: "violated", notes: ["Guest access exists but no guest zone is visible."] },
    { ruleId: "FIREWALL-POLICY", title: "Use structured firewall policy and controlled traffic flow between differing security postures", authority: "formal-standard", strength: "required", status: "review", notes: ["Firewall boundary needs review."] },
  ],
  appliedRuleIds: ["ADDR-PRIVATE-IPV4"],
  deferredRuleIds: [],
  violatedRuleIds: ["GUEST-ISOLATION"],
  reviewRuleIds: ["FIREWALL-POLICY"],
  notes: [],
};

const phase3 = {
  closureMatrix: [
    { key: "guestWifi", active: true, lifecycleStatus: "PARTIALLY_PROPAGATED" },
    { key: "securityPosture", active: true, lifecycleStatus: "MATERIALIZED" },
  ],
} as unknown as Phase3RequirementsClosureControlSummary;

const model = {
  securityZones: [{ id: "zone-internal" }, { id: "zone-management" }],
  policyRules: [{ id: "policy-review" }],
  routeDomains: [{ id: "rd-default" }],
  routingSegmentation: { routeIntents: [{ id: "route-default" }] },
  interfaces: [{ id: "iface-gw" }],
  devices: [{ id: "dev-fw" }],
  dhcpPools: [],
} as unknown as NetworkObjectModel;

const summary = buildPhase7StandardsRulebookControl({
  requirementsJson: JSON.stringify({ guestWifi: true, securityPosture: "strict" }),
  siteCount: 2,
  standardsAlignment,
  phase3RequirementsClosure: phase3,
  networkObjectModel: model,
  issues: [],
});

assert(summary.contractVersion === PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT, "contract marker mismatch");
assert(summary.rulebookRole === "ACTIVE_STANDARDS_RULEBOOK_NOT_DECORATIVE_TEXT", "rulebook role missing");
assert(summary.ruleRows.length === 3, "expected three rule rows");
assert(summary.passRuleCount === 1, "expected one pass row");
assert(summary.warningRuleCount === 1, "expected one warning row for best-practice violation");
assert(summary.reviewRuleCount === 1, "expected one review row");
assert(summary.findings.length === 2, "expected review/warn findings");
assert(summary.requirementActivations.some((item) => item.requirementKey === "guestWifi" && item.activatedRuleIds.includes("GUEST-ISOLATION")), "guestWifi must activate guest isolation rule");
assert(summary.ruleRows.every((row) => row.applicabilityCondition && row.remediationGuidance && row.exceptionPolicy && row.requirementRelationships.length >= 0), "rules must carry phase7 governance fields");

console.log("[phase7] Standards rulebook control selftest passed");
