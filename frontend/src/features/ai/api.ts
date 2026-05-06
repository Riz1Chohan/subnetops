import { api } from "../../lib/api";
import type { AIPlanDraft, AIValidationExplanation, ValidationResult } from "../../lib/types";

export function generatePlanDraft(prompt: string) {
  return api<AIPlanDraft>("/ai/plan-draft", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function explainValidationFinding(item: Pick<ValidationResult, "title" | "message" | "severity" | "entityType">) {
  return api<AIValidationExplanation>("/ai/explain-validation", {
    method: "POST",
    body: JSON.stringify(item),
  });
}
