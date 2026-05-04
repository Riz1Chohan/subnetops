const READINESS_LABELS: Record<string, string> = {
  READY: "Ready",
  REVIEW_REQUIRED: "Needs review",
  BLOCKED: "Blocked",
  INCOMPLETE: "Incomplete",
  READY_WITH_WARNINGS: "Ready with warnings",
  NOT_AVAILABLE: "Not available",
  DRAFT_ONLY: "Draft only",
  PARTIAL: "Partial",
  PROVEN: "Verified",
};

const AUTHORITY_LABELS: Record<string, string> = {
  USER_PROVIDED: "User provided",
  SYSTEM_CALCULATED: "Calculated",
  SYSTEM_VERIFIED: "Verified",
  REQUIREMENT_MATERIALIZED: "Applied from requirements",
  ENGINE2_DURABLE: "Approved IPAM record",
  IMPORTED: "Imported current state",
  REVIEW_REQUIRED: "Needs review",
  INFERRED: "Draft suggestion",
  DRAFT_ONLY: "Draft only",
  NOT_AUTHORITATIVE_UNTIL_REVIEWED: "Needs review before use",
};

export function userFacingStatusLabel(value: string | null | undefined): string {
  if (!value) return "Not available";
  const trimmed = String(value).trim();
  const direct = READINESS_LABELS[trimmed] ?? AUTHORITY_LABELS[trimmed];
  if (direct) return direct;

  return trimmed
    .replace(/^V1[_-]?/i, "")
    .replace(/ENGINE\s*1/gi, "Addressing")
    .replace(/ENGINE\s*2/gi, "IPAM")
    .replace(/ENGINE1/gi, "Addressing")
    .replace(/ENGINE2/gi, "IPAM")
    .replace(/BACKEND/gi, "System")
    .replace(/DESIGN[_\s-]*CORE/gi, "Design model")
    .replace(/MATERIALIZED/gi, "Applied")
    .replace(/PROOF/gi, "Evidence")
    .replace(/AUTHORITY/gi, "Source")
    .replace(/ORCHESTRATOR/gi, "Planner")
    .replace(/NO[_\s-]*OP/gi, "Not applicable")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function userFacingEvidenceLabel(value: string | null | undefined): string {
  return userFacingStatusLabel(value)
    .replace(/System Contract/gi, "Verified source")
    .replace(/Runtime Evidence/gi, "Save check evidence")
    .replace(/Read Repair/gi, "Saved-state refresh");
}

export function userFacingSystemMessage(value: string): string {
  return value
    .replace(/\bbackend\b/gi, "system")
    .replace(/\bdesign[-\s]?core\b/gi, "design model")
    .replace(/\bengine\b/gi, "planner")
    .replace(/\bEngine\s*1\b/g, "Addressing")
    .replace(/\bEngine\s*2\b/g, "IPAM")
    .replace(/\bproof\b/gi, "evidence")
    .replace(/\bmaterialized\b/gi, "applied")
    .replace(/\bBackend authority\b/gi, "Verified source");
}
