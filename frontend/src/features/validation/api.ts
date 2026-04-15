import { api } from "../../lib/api";
import type { ValidationResult } from "../../lib/types";

export function runValidation(projectId: string) {
  return api<ValidationResult[]>(`/validation/projects/${projectId}/run`, { method: "POST" });
}

export function getValidationResults(projectId: string) {
  return api<ValidationResult[]>(`/validation/projects/${projectId}`);
}
