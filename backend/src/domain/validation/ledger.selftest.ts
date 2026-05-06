import { buildValidationLedgerFields, isRootBlockerLedgerRow, severityForValidationLedger } from "./ledger.js";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const root = buildValidationLedgerFields({
    severity: "ERROR",
    ruleCode: "INVALID_CIDR",
    title: "Invalid CIDR",
    message: "A subnet is invalid.",
  });
  assert(root.readinessCategory === "BLOCKING", "ERROR findings should default to BLOCKING readiness.");
  assert(root.findingClass === "ROOT_BLOCKER", "ERROR findings should default to ROOT_BLOCKER.");
  assert(isRootBlockerLedgerRow(root), "Root blocker predicate must only accept blocking root rows.");

  const propagated = buildValidationLedgerFields({
    severity: "WARNING",
    ruleCode: "V1_REPORT_EXPORT_TRUTH_PROPAGATED_BLOCKER",
    title: "Report blocked by upstream truth",
    message: "Report must stay blocked.",
  });
  assert(propagated.findingClass === "PROPAGATED_BLOCKER", "Propagated blocker code must not become a root blocker.");
  assert(!isRootBlockerLedgerRow(propagated), "Propagated blockers must not count as root blockers.");

  assert(severityForValidationLedger({ readinessCategory: "BLOCKING", findingClass: "ROOT_BLOCKER" }) === "ERROR", "Only blocking root blockers become ERROR.");
  assert(severityForValidationLedger({ readinessCategory: "BLOCKING", findingClass: "PROPAGATED_BLOCKER" }) === "WARNING", "Propagated blockers stay WARNING in persisted severity.");
}

main();
