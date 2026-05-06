import type { ValidationSeverity } from "../../lib/domainTypes.js";

export type ValidationLedgerReadinessCategory = "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
export type ValidationLedgerFindingClass = "ROOT_BLOCKER" | "PROPAGATED_BLOCKER" | "DERIVED_IMPACT" | "REVIEW_ITEM";

export interface ValidationLedgerInput {
  severity?: ValidationSeverity;
  ruleCode?: string;
  title?: string;
  message?: string;
  readinessCategory?: ValidationLedgerReadinessCategory;
  findingClass?: ValidationLedgerFindingClass;
  sourceEngine?: string;
  sourceSnapshotPath?: string;
  rootCauseKey?: string;
  rootCauseTitle?: string;
  deEscalationReason?: string;
  remediation?: string;
  affectedRequirements?: string[];
  affectedObjects?: string[];
  evidence?: unknown[];
}

export interface ValidationLedgerFields {
  readinessCategory: ValidationLedgerReadinessCategory;
  findingClass: ValidationLedgerFindingClass;
  sourceEngine?: string;
  sourceSnapshotPath?: string;
  rootCauseKey?: string;
  rootCauseTitle?: string;
  deEscalationReason?: string;
  remediation?: string;
  affectedRequirementsJson: string;
  affectedObjectsJson: string;
  evidenceJson: string;
}

function clean(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length ? text : undefined;
}

function unique(values: unknown[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => clean(value)).filter(Boolean) as string[])).sort();
}

function defaultReadinessCategory(input: ValidationLedgerInput): ValidationLedgerReadinessCategory {
  if (input.readinessCategory) return input.readinessCategory;
  if (input.severity === "ERROR") return "BLOCKING";
  if (input.severity === "WARNING") return "REVIEW_REQUIRED";
  return "INFO";
}

function defaultFindingClass(input: ValidationLedgerInput, category: ValidationLedgerReadinessCategory): ValidationLedgerFindingClass {
  if (input.findingClass) return input.findingClass;
  const code = String(input.ruleCode ?? "").toUpperCase();
  if (code.includes("PROPAGATED_BLOCKER")) return "PROPAGATED_BLOCKER";
  if (code.includes("DERIVED_IMPACT")) return "DERIVED_IMPACT";
  if (category === "BLOCKING") return "ROOT_BLOCKER";
  return "REVIEW_ITEM";
}

export function severityForValidationLedger(input: Pick<ValidationLedgerInput, "readinessCategory" | "findingClass">): ValidationSeverity {
  if (input.readinessCategory === "BLOCKING" && input.findingClass === "ROOT_BLOCKER") return "ERROR";
  if (input.readinessCategory === "PASSED" || input.readinessCategory === "INFO") return "INFO";
  return "WARNING";
}

export function buildValidationLedgerFields(input: ValidationLedgerInput): ValidationLedgerFields {
  const readinessCategory = defaultReadinessCategory(input);
  const findingClass = defaultFindingClass(input, readinessCategory);
  const sourceEngine = clean(input.sourceEngine);
  const sourceSnapshotPath = clean(input.sourceSnapshotPath);
  const rootCauseKey = clean(input.rootCauseKey ?? input.ruleCode);
  const rootCauseTitle = clean(input.rootCauseTitle ?? input.title);
  const deEscalationReason = clean(input.deEscalationReason);
  const remediation = clean(input.remediation);
  const affectedRequirementsJson = JSON.stringify(unique(input.affectedRequirements));
  const affectedObjectsJson = JSON.stringify(unique(input.affectedObjects));
  const evidenceJson = JSON.stringify(input.evidence ?? []);

  return {
    readinessCategory,
    findingClass,
    sourceEngine,
    sourceSnapshotPath,
    rootCauseKey,
    rootCauseTitle,
    deEscalationReason,
    remediation,
    affectedRequirementsJson,
    affectedObjectsJson,
    evidenceJson,
  };
}

export function isRootBlockerLedgerRow(input: Pick<ValidationLedgerFields, "readinessCategory" | "findingClass">): boolean {
  return input.readinessCategory === "BLOCKING" && input.findingClass === "ROOT_BLOCKER";
}
