export const V1_READINESS_LADDER_CONTRACT = "V1_READINESS_LADDER_CONTRACT" as const;
export const V1_READINESS_LADDER_ROLE = "CENTRAL_IMPLEMENTATION_READINESS_AUTHORITY" as const;

export type ReadinessLadderState =
  | "BLOCKED"
  | "REVIEW_REQUIRED"
  | "DRAFT"
  | "PLANNING_READY"
  | "IMPLEMENTATION_READY";

export type ReadinessLadderReasonSeverity = "BLOCKING" | "REVIEW_REQUIRED" | "DRAFT" | "INFO";

export interface ReadinessLadderReason {
  code: string;
  severity: ReadinessLadderReasonSeverity;
  detail: string;
  sourcePath: string;
  readinessImpact: ReadinessLadderState;
}

export interface ReadinessLadderInput {
  invalidAddressingCount?: number;
  missingCapacitySourceCount?: number;
  inferredSecurityPolicyCount?: number;
  omittedHasBlockers?: boolean;
  omittedHasReviewRequired?: boolean;
  unvalidatedGeneratedObjectCount?: number;
  blockingFindingCount?: number;
  reviewRequiredFindingCount?: number;
  warningFindingCount?: number;
  materializedObjectCount?: number;
  validatedObjectCount?: number;
  implementationPlanningReadiness?: unknown;
  implementationTemplateReadiness?: unknown;
  reportExportReadiness?: unknown;
  diagramReadiness?: unknown;
  aiDraftOnly?: boolean;
}

export interface ReadinessLadderSummary {
  contract: typeof V1_READINESS_LADDER_CONTRACT;
  role: typeof V1_READINESS_LADDER_ROLE;
  ladder: readonly ReadinessLadderState[];
  overallReadiness: ReadinessLadderState;
  implementationOutputAllowed: boolean;
  planningOutputAllowed: boolean;
  reportMayClaimImplementationReady: boolean;
  diagramMayShowCleanProductionTruth: boolean;
  aiMayProduceAuthority: false;
  blockingReasonCount: number;
  reviewReasonCount: number;
  draftReasonCount: number;
  reasons: ReadinessLadderReason[];
  notes: string[];
}

const LADDER: readonly ReadinessLadderState[] = [
  "BLOCKED",
  "REVIEW_REQUIRED",
  "DRAFT",
  "PLANNING_READY",
  "IMPLEMENTATION_READY",
] as const;

function count(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function readinessText(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function isBlockedReadiness(value: unknown): boolean {
  const text = readinessText(value);
  return text.includes("BLOCK") || text.includes("ERROR") || text.includes("INVALID");
}

function isReviewReadiness(value: unknown): boolean {
  const text = readinessText(value);
  return text.includes("REVIEW") || text.includes("WARNING") || text.includes("WARN") || text.includes("DRAFT") || text.includes("ADVISORY") || text.includes("UNKNOWN") || text.includes("NOT_READY");
}

function pushReason(reasons: ReadinessLadderReason[], reason: ReadinessLadderReason) {
  if (!reasons.some((existing) => existing.code === reason.code && existing.sourcePath === reason.sourcePath)) reasons.push(reason);
}

export function deriveReadinessLadder(input: ReadinessLadderInput): ReadinessLadderSummary {
  const reasons: ReadinessLadderReason[] = [];

  const invalidAddressingCount = count(input.invalidAddressingCount);
  if (invalidAddressingCount > 0) {
    pushReason(reasons, {
      code: "READINESS_INVALID_ADDRESSING_BLOCKER",
      severity: "BLOCKING",
      detail: `${invalidAddressingCount} invalid addressing/IPAM item(s) exist. Invalid addressing blocks implementation output.`,
      sourcePath: "V1CidrAddressingTruth / V1EnterpriseIpamTruth",
      readinessImpact: "BLOCKED",
    });
  }

  const unvalidatedGeneratedObjectCount = count(input.unvalidatedGeneratedObjectCount);
  if (unvalidatedGeneratedObjectCount > 0) {
    pushReason(reasons, {
      code: "READINESS_UNVALIDATED_GENERATED_OBJECT_BLOCKER",
      severity: "BLOCKING",
      detail: `${unvalidatedGeneratedObjectCount} generated object(s) lack validation or source-object proof.`,
      sourcePath: "V1NetworkObjectModel / V1ValidationReadiness",
      readinessImpact: "BLOCKED",
    });
  }

  if (input.omittedHasBlockers) {
    pushReason(reasons, {
      code: "READINESS_OMITTED_BLOCKER_VISIBLE",
      severity: "BLOCKING",
      detail: "At least one omitted evidence window contains blockers; readiness cannot be cleaned by slicing evidence.",
      sourcePath: "omittedEvidenceSummaries",
      readinessImpact: "BLOCKED",
    });
  }

  const blockingFindingCount = count(input.blockingFindingCount);
  if (blockingFindingCount > 0) {
    pushReason(reasons, {
      code: "READINESS_BLOCKING_FINDINGS_PRESENT",
      severity: "BLOCKING",
      detail: `${blockingFindingCount} blocking finding(s) exist across validation/report/diagram/implementation gates.`,
      sourcePath: "V1ValidationReadiness / V1ReportExportTruth / V1DiagramTruth / V1ImplementationPlanning",
      readinessImpact: "BLOCKED",
    });
  }

  for (const [code, value, sourcePath] of [
    ["READINESS_IMPLEMENTATION_PLANNING_BLOCKED", input.implementationPlanningReadiness, "V1ImplementationPlanning.overallReadiness"],
    ["READINESS_IMPLEMENTATION_TEMPLATES_BLOCKED", input.implementationTemplateReadiness, "V1ImplementationTemplates.overallReadiness"],
    ["READINESS_REPORT_EXPORT_BLOCKED", input.reportExportReadiness, "V1ReportExportTruth.overallReadiness"],
    ["READINESS_DIAGRAM_BLOCKED", input.diagramReadiness, "V1DiagramTruth.overallReadiness"],
  ] as const) {
    if (isBlockedReadiness(value)) {
      pushReason(reasons, {
        code,
        severity: "BLOCKING",
        detail: `${sourcePath} is ${String(value)} and therefore cannot support implementation-ready claims.`,
        sourcePath,
        readinessImpact: "BLOCKED",
      });
    }
  }

  const missingCapacitySourceCount = count(input.missingCapacitySourceCount);
  if (missingCapacitySourceCount > 0) {
    pushReason(reasons, {
      code: "READINESS_MISSING_CAPACITY_REVIEW_REQUIRED",
      severity: "REVIEW_REQUIRED",
      detail: `${missingCapacitySourceCount} capacity/source item(s) are missing or assumption-based. No final prefix/DHCP confidence is allowed.`,
      sourcePath: "V1RequirementsMaterialization / V1CidrAddressingTruth",
      readinessImpact: "REVIEW_REQUIRED",
    });
  }

  const inferredSecurityPolicyCount = count(input.inferredSecurityPolicyCount);
  if (inferredSecurityPolicyCount > 0) {
    pushReason(reasons, {
      code: "READINESS_INFERRED_SECURITY_POLICY_REVIEW_REQUIRED",
      severity: "REVIEW_REQUIRED",
      detail: `${inferredSecurityPolicyCount} inferred/review security policy item(s) exist. Security policy output stays review-gated.`,
      sourcePath: "V1SecurityPolicyFlow / networkObjectModel.securityPolicyFlow",
      readinessImpact: "REVIEW_REQUIRED",
    });
  }

  if (input.omittedHasReviewRequired) {
    pushReason(reasons, {
      code: "READINESS_OMITTED_REVIEW_VISIBLE",
      severity: "REVIEW_REQUIRED",
      detail: "At least one omitted evidence window contains review-required items; the summary must expose that limitation.",
      sourcePath: "omittedEvidenceSummaries",
      readinessImpact: "REVIEW_REQUIRED",
    });
  }

  const reviewRequiredFindingCount = count(input.reviewRequiredFindingCount);
  if (reviewRequiredFindingCount > 0) {
    pushReason(reasons, {
      code: "READINESS_REVIEW_FINDINGS_PRESENT",
      severity: "REVIEW_REQUIRED",
      detail: `${reviewRequiredFindingCount} review-required finding(s) remain unresolved.`,
      sourcePath: "V1ValidationReadiness / V1ReportExportTruth / V1ImplementationPlanning",
      readinessImpact: "REVIEW_REQUIRED",
    });
  }

  for (const [code, value, sourcePath] of [
    ["READINESS_IMPLEMENTATION_PLANNING_REVIEW", input.implementationPlanningReadiness, "V1ImplementationPlanning.overallReadiness"],
    ["READINESS_IMPLEMENTATION_TEMPLATES_REVIEW", input.implementationTemplateReadiness, "V1ImplementationTemplates.overallReadiness"],
    ["READINESS_REPORT_EXPORT_REVIEW", input.reportExportReadiness, "V1ReportExportTruth.overallReadiness"],
    ["READINESS_DIAGRAM_REVIEW", input.diagramReadiness, "V1DiagramTruth.overallReadiness"],
  ] as const) {
    if (!isBlockedReadiness(value) && isReviewReadiness(value)) {
      pushReason(reasons, {
        code,
        severity: "REVIEW_REQUIRED",
        detail: `${sourcePath} is ${String(value)} and therefore cannot be called implementation-ready.`,
        sourcePath,
        readinessImpact: "REVIEW_REQUIRED",
      });
    }
  }

  if (input.aiDraftOnly) {
    pushReason(reasons, {
      code: "READINESS_AI_DRAFT_NOT_AUTHORITY",
      severity: "REVIEW_REQUIRED",
      detail: "AI helper output is draft-only and cannot authorize implementation, report, diagram, or engineering facts.",
      sourcePath: "V1AiDraftHelper",
      readinessImpact: "REVIEW_REQUIRED",
    });
  }

  const materializedObjectCount = count(input.materializedObjectCount);
  const validatedObjectCount = count(input.validatedObjectCount);
  if (materializedObjectCount === 0 || validatedObjectCount === 0) {
    pushReason(reasons, {
      code: "READINESS_DRAFT_ONLY_EVIDENCE",
      severity: "DRAFT",
      detail: "Materialized and validated source-object evidence is incomplete, so output is draft/planning only.",
      sourcePath: "V1RequirementsMaterialization / V1ValidationReadiness",
      readinessImpact: "DRAFT",
    });
  }

  const hasBlocking = reasons.some((reason) => reason.severity === "BLOCKING");
  const hasReview = reasons.some((reason) => reason.severity === "REVIEW_REQUIRED");
  const hasDraft = reasons.some((reason) => reason.severity === "DRAFT");
  const warningFindingCount = count(input.warningFindingCount);

  const overallReadiness: ReadinessLadderState = hasBlocking
    ? "BLOCKED"
    : hasReview
      ? "REVIEW_REQUIRED"
      : hasDraft
        ? "DRAFT"
        : warningFindingCount > 0
          ? "PLANNING_READY"
          : "IMPLEMENTATION_READY";

  return {
    contract: V1_READINESS_LADDER_CONTRACT,
    role: V1_READINESS_LADDER_ROLE,
    ladder: LADDER,
    overallReadiness,
    implementationOutputAllowed: overallReadiness === "IMPLEMENTATION_READY",
    planningOutputAllowed: overallReadiness === "PLANNING_READY" || overallReadiness === "IMPLEMENTATION_READY",
    reportMayClaimImplementationReady: overallReadiness === "IMPLEMENTATION_READY",
    diagramMayShowCleanProductionTruth: overallReadiness === "IMPLEMENTATION_READY",
    aiMayProduceAuthority: false,
    blockingReasonCount: reasons.filter((reason) => reason.severity === "BLOCKING").length,
    reviewReasonCount: reasons.filter((reason) => reason.severity === "REVIEW_REQUIRED").length,
    draftReasonCount: reasons.filter((reason) => reason.severity === "DRAFT").length,
    reasons,
    notes: [
      "Readiness ladder order: BLOCKED → REVIEW_REQUIRED → DRAFT → PLANNING_READY → IMPLEMENTATION_READY.",
      "Only IMPLEMENTATION_READY may unlock clean implementation-ready report/export/template language.",
      "Review-required or omitted blocker evidence cannot be hidden by frontend summaries, sliced report tables, diagrams, or AI helper output.",
    ],
  };
}
