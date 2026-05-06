import { classifyV1RootBlockerTaxonomy, isStrictRootBlocker } from "./root-blocker-taxonomy.js";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function classify(overrides: Partial<Parameters<typeof classifyV1RootBlockerTaxonomy>[0]> = {}) {
  return classifyV1RootBlockerTaxonomy({
    category: "BLOCKING",
    ruleCode: "VALIDATION_REQUIREMENT_PROPAGATION_GAP",
    title: "Requirement propagation gap",
    sourceEngine: "V1 requirements closure",
    sourceSnapshotPath: "V1RequirementsClosure.closureMatrix",
    ...overrides,
  });
}

function main(): void {
  const root = classify({ rootProof: true });
  assert(isStrictRootBlocker(root), "Only blocking rows with root proof and a root-eligible rule may become root blockers.");

  const noProof = classify();
  assert(noProof.category === "REVIEW_REQUIRED", "Blocking rows without root proof must be review-required, not root blockers.");
  assert(noProof.findingClass === "DERIVED_IMPACT", "Blocking rows without root proof must be derived impacts.");

  const propagated = classify({ ruleCode: "VALIDATION_REPORT_TRUTH_WARNING", rootProof: true });
  assert(propagated.category === "REVIEW_REQUIRED", "Propagated report truth must be de-escalated from blocking.");
  assert(propagated.findingClass === "PROPAGATED_BLOCKER", "Propagated report truth must remain separately classified.");

  const reviewOnly = classify({ ruleCode: "VALIDATION_IPAM_DURABLE_AUTHORITY_GAP", rootProof: true });
  assert(reviewOnly.category === "REVIEW_REQUIRED", "Candidate/review IPAM authority must not become a root blocker without conflict proof.");
  assert(reviewOnly.findingClass === "REVIEW_ITEM", "Candidate/review authority remains review debt.");

  const explicitRoot = classify({ explicitFindingClass: "ROOT_BLOCKER" });
  assert(isStrictRootBlocker(explicitRoot), "Source engines may explicitly declare root blockers when they own the proof.");
}

main();
