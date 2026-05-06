export const V1_REQUIREMENT_CLOSURE_BLOCKER_PROOF_CONTRACT = "V1_REQUIREMENT_CLOSURE_BLOCKER_PROOF_CONTRACT" as const;

export interface RequirementClosureBlockerProofInput {
  active: boolean;
  missingMandatoryConsumers: string[];
  requiredSourceObjectMissing: boolean;
  engineOutputContradiction: boolean;
}

export interface RequirementClosureBlockerProofResult {
  blocked: boolean;
  blockedReason?: string;
  proofStatus: "PROVEN" | "REVIEW_REQUIRED" | "NOT_ACTIVE";
}

export function evaluateRequirementClosureBlockerProof(input: RequirementClosureBlockerProofInput): RequirementClosureBlockerProofResult {
  if (!input.active) return { blocked: false, proofStatus: "NOT_ACTIVE" };
  if (input.missingMandatoryConsumers.length > 0) {
    return {
      blocked: true,
      blockedReason: `Missing mandatory consumer proof: ${input.missingMandatoryConsumers.join(", ")}`,
      proofStatus: "PROVEN",
    };
  }
  if (input.requiredSourceObjectMissing) {
    return {
      blocked: true,
      blockedReason: "Required materialized source object is missing.",
      proofStatus: "PROVEN",
    };
  }
  if (input.engineOutputContradiction) {
    return {
      blocked: true,
      blockedReason: "Validation blocker is tied to invalid, conflicting, or contradictory engine evidence.",
      proofStatus: "PROVEN",
    };
  }
  return { blocked: false, proofStatus: "REVIEW_REQUIRED" };
}
