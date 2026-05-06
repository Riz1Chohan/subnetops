import { evaluateRequirementClosureBlockerProof } from "./closure-proof.js";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const noProof = evaluateRequirementClosureBlockerProof({
    active: true,
    missingMandatoryConsumers: [],
    requiredSourceObjectMissing: false,
    engineOutputContradiction: false,
  });
  assert(!noProof.blocked, "A requirement cannot be blocked without mandatory missing consumer, missing source object, or engine contradiction proof.");
  assert(noProof.proofStatus === "REVIEW_REQUIRED", "No-proof requirements must stay review-required.");

  const missingConsumer = evaluateRequirementClosureBlockerProof({
    active: true,
    missingMandatoryConsumers: ["Engine1.addressing"],
    requiredSourceObjectMissing: false,
    engineOutputContradiction: false,
  });
  assert(missingConsumer.blocked, "Mandatory missing consumers are blocker proof.");
  assert(missingConsumer.blockedReason?.includes("Engine1.addressing"), "Blocker proof must name the missing mandatory consumer.");

  const missingSource = evaluateRequirementClosureBlockerProof({
    active: true,
    missingMandatoryConsumers: [],
    requiredSourceObjectMissing: true,
    engineOutputContradiction: false,
  });
  assert(missingSource.blocked, "Missing required source objects are blocker proof.");

  const contradiction = evaluateRequirementClosureBlockerProof({
    active: true,
    missingMandatoryConsumers: [],
    requiredSourceObjectMissing: false,
    engineOutputContradiction: true,
  });
  assert(contradiction.blocked, "Engine contradictions are blocker proof.");

  const inactive = evaluateRequirementClosureBlockerProof({
    active: false,
    missingMandatoryConsumers: ["Engine1.addressing"],
    requiredSourceObjectMissing: true,
    engineOutputContradiction: true,
  });
  assert(!inactive.blocked, "Inactive/no-op requirements must not create blockers.");
}

main();
