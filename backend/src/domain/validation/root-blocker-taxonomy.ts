import type { ValidationLedgerFindingClass, ValidationLedgerReadinessCategory } from "./ledger.js";

export const V1_ROOT_BLOCKER_TAXONOMY_CONTRACT = "V1_ROOT_BLOCKER_TAXONOMY_CONTRACT" as const;

export type V1RootBlockerTaxonomyRuleCode = string;

export interface V1RootBlockerTaxonomyInput {
  category: ValidationLedgerReadinessCategory;
  ruleCode: V1RootBlockerTaxonomyRuleCode;
  title: string;
  sourceEngine: string;
  sourceSnapshotPath: string;
  explicitFindingClass?: ValidationLedgerFindingClass;
  rootProof?: boolean;
  propagatedProof?: boolean;
  reviewOnlyProof?: boolean;
  rootCauseKey?: string;
  rootCauseTitle?: string;
}

export interface V1RootBlockerTaxonomyResult {
  category: ValidationLedgerReadinessCategory;
  originalCategory: ValidationLedgerReadinessCategory;
  findingClass: ValidationLedgerFindingClass;
  rootCauseKey: string;
  rootCauseTitle: string;
  deEscalationReason?: string;
}

const PROPAGATED_RULE_CODES = new Set([
  "VALIDATION_ORCHESTRATOR_BOUNDARY_GAP",
  "VALIDATION_IMPLEMENTATION_READINESS_GAP",
  "VALIDATION_REPORT_TRUTH_WARNING",
  "VALIDATION_DIAGRAM_TRUTH_WARNING",
]);

const REVIEW_ONLY_RULE_CODES = new Set([
  "VALIDATION_REQUIREMENT_IPAM_GAP",
  "VALIDATION_IPAM_DURABLE_AUTHORITY_GAP",
  "VALIDATION_ROUTING_SEGMENTATION_READINESS_GAP",
  "VALIDATION_SECURITY_POLICY_READINESS_GAP",
  "VALIDATION_STANDARDS_RULE_GAP",
]);

const ROOT_ELIGIBLE_RULE_CODES = new Set([
  "VALIDATION_REQUIREMENT_PROPAGATION_GAP",
  "VALIDATION_GOLDEN_SCENARIO_CLOSURE_GAP",
  "VALIDATION_CIDR_EDGE_CASE_BLOCKER",
  "VALIDATION_CIDR_ADDRESSING_READINESS_GAP",
  "VALIDATION_REQUIREMENT_ADDRESSING_GAP",
  "VALIDATION_DESIGN_CORE_ISSUE",
]);

function rootCauseKeyFor(input: V1RootBlockerTaxonomyInput): string {
  return input.rootCauseKey || input.ruleCode;
}

function rootCauseTitleFor(input: V1RootBlockerTaxonomyInput): string {
  return input.rootCauseTitle || input.title;
}

function nonBlockingClass(category: ValidationLedgerReadinessCategory): ValidationLedgerFindingClass {
  return category === "PASSED" || category === "INFO" ? "REVIEW_ITEM" : "REVIEW_ITEM";
}

function downgradeToReview(input: V1RootBlockerTaxonomyInput, findingClass: ValidationLedgerFindingClass, reason: string): V1RootBlockerTaxonomyResult {
  return {
    category: input.category === "BLOCKING" ? "REVIEW_REQUIRED" : input.category,
    originalCategory: input.category,
    findingClass,
    rootCauseKey: rootCauseKeyFor(input),
    rootCauseTitle: rootCauseTitleFor(input),
    deEscalationReason: reason,
  };
}

export function classifyV1RootBlockerTaxonomy(input: V1RootBlockerTaxonomyInput): V1RootBlockerTaxonomyResult {
  if (input.category === "PASSED" || input.category === "INFO") {
    return {
      category: input.category,
      originalCategory: input.category,
      findingClass: nonBlockingClass(input.category),
      rootCauseKey: rootCauseKeyFor(input),
      rootCauseTitle: rootCauseTitleFor(input),
    };
  }

  if (input.explicitFindingClass && input.explicitFindingClass !== "ROOT_BLOCKER") {
    return downgradeToReview(input, input.explicitFindingClass, "The finding is explicitly classified as non-root readiness evidence by the source engine.");
  }

  if (input.propagatedProof || PROPAGATED_RULE_CODES.has(input.ruleCode)) {
    return downgradeToReview(input, "PROPAGATED_BLOCKER", "The finding is a downstream readiness/report/diagram/implementation impact. It must stay visible, but it must not inflate the root blocker count.");
  }

  if (input.reviewOnlyProof || REVIEW_ONLY_RULE_CODES.has(input.ruleCode)) {
    return downgradeToReview(input, "REVIEW_ITEM", "The finding represents review-only planning authority or unresolved engineer confirmation, not a proven invalid engineering object.");
  }

  if (input.explicitFindingClass === "ROOT_BLOCKER" || (input.category === "BLOCKING" && input.rootProof && ROOT_ELIGIBLE_RULE_CODES.has(input.ruleCode))) {
    return {
      category: "BLOCKING",
      originalCategory: input.category,
      findingClass: "ROOT_BLOCKER",
      rootCauseKey: rootCauseKeyFor(input),
      rootCauseTitle: rootCauseTitleFor(input),
    };
  }

  if (input.category === "BLOCKING") {
    return downgradeToReview(input, "DERIVED_IMPACT", "The source emitted blocking readiness, but did not provide root-proof metadata. The item remains visible as review-required until a true source-object blocker is proven.");
  }

  return {
    category: input.category,
    originalCategory: input.category,
    findingClass: "REVIEW_ITEM",
    rootCauseKey: rootCauseKeyFor(input),
    rootCauseTitle: rootCauseTitleFor(input),
  };
}

export function isStrictRootBlocker(input: Pick<V1RootBlockerTaxonomyResult, "category" | "findingClass">): boolean {
  return input.category === "BLOCKING" && input.findingClass === "ROOT_BLOCKER";
}
