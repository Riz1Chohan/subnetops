import { useMutation } from "@tanstack/react-query";
import { explainValidationFinding, generatePlanDraft } from "./api";

export function useGeneratePlanDraft() {
  return useMutation({
    mutationFn: generatePlanDraft,
  });
}

export function useExplainValidationFinding() {
  return useMutation({
    mutationFn: explainValidationFinding,
  });
}
