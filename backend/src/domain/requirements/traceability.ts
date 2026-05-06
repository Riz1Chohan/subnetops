import { REQUIREMENT_FIELD_KEYS, buildRequirementImpactInventory, requirementValueToString } from "./impact-registry.js";
import { asString, isNotApplicable } from "./normalize.js";
import type { RequirementReviewItem, RequirementTraceRecord, RequirementsInput } from "./types.js";

export function consumedRequirementFields(requirements: RequirementsInput) {
  return REQUIREMENT_FIELD_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(requirements, key)).sort();
}

export function buildRequirementTraceRecords(requirements: RequirementsInput): RequirementTraceRecord[] {
  return buildRequirementImpactInventory(requirements).map((item) => {
    const originalValue = requirements[item.key];
    const captured = Object.prototype.hasOwnProperty.call(requirements, item.key);
    const valueText = requirementValueToString(originalValue);
    const status: RequirementTraceRecord["status"] = !captured || !valueText || isNotApplicable(originalValue)
      ? "not_applicable"
      : item.impact === "direct"
        ? "applied"
        : "requires_review";

    return {
      key: item.key,
      status,
      originalValue,
      normalizedSignal: `${item.category}:${item.key}:${asString(valueText, "not-captured")}`,
      affectedObjectTypes: item.outputAreas,
      evidence: [item.designConsequence, item.validationConsequence, item.reportConsequence].filter(Boolean),
      reviewReason: status === "requires_review" ? item.designConsequence : undefined,
    };
  });
}

export function buildRequirementReviewItems(requirements: RequirementsInput): RequirementReviewItem[] {
  return buildRequirementTraceRecords(requirements)
    .filter((record) => record.status === "requires_review" || record.status === "blocked" || record.status === "not_supported")
    .map((record) => ({
      key: record.key,
      reason: record.reviewReason ?? "Requirement needs downstream engineering review before it can become an applied design object.",
      severity: record.status === "blocked" ? "high" : "medium",
      evidence: record.evidence,
    }));
}
