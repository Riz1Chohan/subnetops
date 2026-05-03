import { parseJsonMap, valueAsString } from "./designCore.helpers.js";
import type {
  Phase19AiDraftFinding,
  Phase19AiDraftGateRow,
  Phase19AiDraftHelperControlSummary,
  Phase19AiDraftObjectRow,
} from "../designCore.types.js";

export const PHASE19_AI_DRAFT_HELPER_CONTRACT = "PHASE19_AI_DRAFT_HELPER_CONTRACT" as const;
export const PHASE19_AI_DRAFT_ROLE = "AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY" as const;
export const PHASE19_AI_AUTHORITY = "DRAFT_ONLY_NOT_AUTHORITATIVE" as const;
export const PHASE19_AI_APPLIED_MARKER = "PHASE19_AI_DRAFT_APPLIED_REVIEW_REQUIRED" as const;

type Phase19Project = {
  id: string;
  name: string;
  description?: string | null;
  requirementsJson?: string | null;
  sites?: Array<{
    id: string;
    name: string;
    notes?: string | null;
    vlans?: Array<{ id: string; vlanId: number; vlanName: string; notes?: string | null }>;
  }>;
};

type DraftMetadata = {
  contract?: string;
  state?: string;
  provider?: string;
  selected?: Record<string, unknown>;
  createdFrom?: string;
  reviewRequired?: boolean;
  notAuthoritative?: boolean;
  gate?: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function hasAiMarker(value?: string | null) {
  return Boolean(value && value.includes(PHASE19_AI_APPLIED_MARKER));
}

function providerMode(metadata: DraftMetadata): Phase19AiDraftHelperControlSummary["providerMode"] {
  const provider = valueAsString(metadata.provider).toLowerCase();
  if (provider === "openai") return "openai";
  if (provider === "local") return "local";
  if (provider) return "unknown";
  return "not-used";
}

function phase19Path() {
  return [
    "AI draft suggestion",
    "user selective review/apply action",
    "structured requirement/site/VLAN object with PHASE19_AI_DRAFT_APPLIED_REVIEW_REQUIRED marker",
    "requirements materialization and traceability review",
    "validation/readiness gate",
    "Engine 1 addressing proof",
    "Engine 2 IPAM reconciliation when relevant",
    "standards check",
    "report/export/diagram display only with review-required truth label",
  ];
}

function buildGateRows(metadata: DraftMetadata, aiObjectCount: number): Phase19AiDraftGateRow[] {
  const hasMetadata = metadata.contract === PHASE19_AI_DRAFT_HELPER_CONTRACT || metadata.state === "AI_DRAFT";
  const rows: Phase19AiDraftGateRow[] = [
    {
      contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "draft-only-authority",
      gate: "AI output is draft-only and not engineering authority",
      required: true,
      state: "ENFORCED",
      evidence: [PHASE19_AI_AUTHORITY, "AIPlanDraft.authority.notAuthoritative=true", "design-core phase19AiDraftHelper.aiAuthority=DRAFT_ONLY_NOT_AUTHORITATIVE"],
      blocksAuthority: true,
      consumerImpact: "Frontend, report, export, and validation must label AI output as review-required until structured approval exists.",
    },
    {
      contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "selective-user-apply",
      gate: "AI draft must be selectively applied by a user, not silently saved",
      required: true,
      state: hasMetadata || aiObjectCount > 0 ? "ENFORCED" : "REVIEW_REQUIRED",
      evidence: hasMetadata || aiObjectCount > 0 ? ["AI workspace stores explicit applyProjectFields/applySites/applyVlans selections", "New project flow persists PHASE19 metadata when AI is used"] : ["No AI draft metadata detected on this project."],
      blocksAuthority: true,
      consumerImpact: "AI suggestions cannot bypass Start Plan review controls.",
    },
    {
      contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "structured-conversion-required",
      gate: "AI suggestions must become structured requirements/source objects before downstream engines treat them as design-driving",
      required: true,
      state: hasMetadata || aiObjectCount > 0 ? "REVIEW_REQUIRED" : "ENFORCED",
      evidence: hasMetadata || aiObjectCount > 0 ? ["AI-derived objects exist and remain review-required.", "Requirement materialization and validation must run after project creation."] : ["No AI-derived objects detected; no AI conversion risk in this snapshot."],
      blocksAuthority: true,
      consumerImpact: "Addressing, IPAM, standards, routing, security, reports, and diagrams must not claim AI authority.",
    },
    {
      contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "validation-engine-proof",
      gate: "AI-created structured objects must pass validation and engine proof before implementation trust",
      required: true,
      state: aiObjectCount > 0 ? "REVIEW_REQUIRED" : "ENFORCED",
      evidence: aiObjectCount > 0 ? ["Validation receives PHASE19_AI_DRAFT_REVIEW_REQUIRED findings.", "AI-derived site/VLAN notes retain the Phase 19 marker."] : ["No AI-derived site/VLAN objects detected."],
      blocksAuthority: true,
      consumerImpact: "Implementation readiness stays review-gated for AI-derived objects.",
    },
  ];
  return rows;
}

function buildMetadataObject(project: Phase19Project, metadata: DraftMetadata): Phase19AiDraftObjectRow | null {
  if (metadata.contract !== PHASE19_AI_DRAFT_HELPER_CONTRACT && metadata.state !== "AI_DRAFT") return null;
  return {
    contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
    objectId: `${project.id}:requirements:phase19-ai-draft`,
    objectType: "requirement-profile",
    objectLabel: "AI draft metadata saved with requirements profile",
    state: "AI_DRAFT",
    sourceType: "AI_DRAFT",
    proofStatus: "DRAFT_ONLY",
    downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED",
    sourceRequirementIds: ["phase19.aiDraft"],
    reviewRequired: true,
    materializationPath: phase19Path(),
    notes: [
      `Provider: ${valueAsString(metadata.provider) || "unknown"}`,
      `Selected apply controls: ${JSON.stringify(metadata.selected || {})}`,
      "This metadata is evidence of draft provenance, not approval.",
    ],
  };
}

function buildObjectRows(project: Phase19Project, metadata: DraftMetadata): Phase19AiDraftObjectRow[] {
  const rows: Phase19AiDraftObjectRow[] = [];
  const metadataRow = buildMetadataObject(project, metadata);
  if (metadataRow) rows.push(metadataRow);

  for (const site of project.sites || []) {
    if (hasAiMarker(site.notes)) {
      rows.push({
        contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
        objectId: site.id,
        objectType: "site",
        objectLabel: `AI-applied site: ${site.name}`,
        state: "REVIEW_REQUIRED",
        sourceType: "AI_DRAFT",
        proofStatus: "REVIEW_REQUIRED",
        downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED",
        sourceRequirementIds: ["phase19.aiDraft.site"],
        reviewRequired: true,
        materializationPath: phase19Path(),
        notes: [site.notes || "AI-applied site requires review."],
      });
    }

    for (const vlan of site.vlans || []) {
      if (!hasAiMarker(vlan.notes)) continue;
      rows.push({
        contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
        objectId: vlan.id,
        objectType: "vlan",
        objectLabel: `AI-applied VLAN ${vlan.vlanId} ${vlan.vlanName} at ${site.name}`,
        state: "REVIEW_REQUIRED",
        sourceType: "AI_DRAFT",
        proofStatus: "REVIEW_REQUIRED",
        downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED",
        sourceRequirementIds: ["phase19.aiDraft.vlan"],
        reviewRequired: true,
        materializationPath: phase19Path(),
        notes: [vlan.notes || "AI-applied VLAN requires validation, addressing, IPAM, standards, and traceability checks."],
      });
    }
  }

  return rows;
}

function buildFindings(hasMetadata: boolean, objectRows: Phase19AiDraftObjectRow[], gateRows: Phase19AiDraftGateRow[]): Phase19AiDraftFinding[] {
  const findings: Phase19AiDraftFinding[] = [];
  const appliedObjects = objectRows.filter((row) => row.objectType === "site" || row.objectType === "vlan");
  const missingGates = gateRows.filter((row) => row.state === "MISSING");

  if (missingGates.length) {
    findings.push({
      severity: "BLOCKING",
      code: "PHASE19_AI_GATE_MISSING",
      title: "AI helper safety gate is missing",
      detail: "One or more mandatory AI draft gates are missing, so AI output could be mistaken for engineering authority.",
      affectedObjects: missingGates.map((row) => row.gateKey),
      readinessImpact: "BLOCKED",
      remediation: "Restore the Phase 19 draft-only authority, selective review, structured conversion, validation, and proof gates.",
    });
  }

  if (appliedObjects.length) {
    findings.push({
      severity: "REVIEW_REQUIRED",
      code: "PHASE19_AI_APPLIED_OBJECT_REVIEW_REQUIRED",
      title: "AI-applied objects require engineering review",
      detail: `${appliedObjects.length} AI-applied site/VLAN object(s) are present. They are structured inputs now, but they remain review-required and not authoritative until validation, addressing, IPAM, standards, and traceability checks are accepted.`,
      affectedObjects: appliedObjects.map((row) => row.objectId),
      readinessImpact: "REVIEW_REQUIRED",
      remediation: "Review every AI-applied object, adjust requirements if needed, run validation, and do not treat reports/diagrams as approved implementation evidence until blockers are closed.",
    });
  }

  if (hasMetadata && !appliedObjects.length) {
    findings.push({
      severity: "INFO",
      code: "PHASE19_AI_METADATA_DRAFT_ONLY",
      title: "AI draft metadata is present without applied network objects",
      detail: "The project records AI draft provenance, but no AI-applied site or VLAN objects were detected.",
      affectedObjects: objectRows.map((row) => row.objectId),
      readinessImpact: "SAFE_DRAFT_ONLY",
      remediation: "Keep AI output as notes unless a user explicitly converts it into reviewed structured requirements or objects.",
    });
  }

  if (!hasMetadata && objectRows.length === 0) {
    findings.push({
      severity: "PASSED",
      code: "PHASE19_NO_AI_AUTHORITY_RISK",
      title: "No AI-derived authority risk detected",
      detail: "This snapshot does not contain saved AI draft metadata or AI-applied site/VLAN markers.",
      affectedObjects: [],
      readinessImpact: "SAFE_DRAFT_ONLY",
      remediation: "No action required for Phase 19 unless AI is used to seed this project later.",
    });
  }

  findings.push({
    severity: "INFO",
    code: "PHASE19_AI_DRAFT_ONLY_BOUNDARY",
    title: "AI helper is draft-only",
    detail: "AI can suggest requirements, sites, VLANs, and explanations, but cannot be the source of engineering truth for addressing, routing, security, diagrams, reports, or implementation.",
    affectedObjects: [],
    readinessImpact: appliedObjects.length ? "REVIEW_REQUIRED" : "SAFE_DRAFT_ONLY",
    remediation: "Convert AI suggestions into structured reviewed inputs, then let the deterministic engines prove or reject them.",
  });

  return findings;
}

export function buildPhase19AiDraftHelperControl(project: Phase19Project): Phase19AiDraftHelperControlSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const metadata = asRecord(requirements.phase19AiDraft) as DraftMetadata;
  const hasMetadata = metadata.contract === PHASE19_AI_DRAFT_HELPER_CONTRACT || metadata.state === "AI_DRAFT";
  const preliminaryObjectRows = buildObjectRows(project, metadata);
  const aiObjectCount = preliminaryObjectRows.length;
  const gateRows = buildGateRows(metadata, aiObjectCount);
  const objectRows = preliminaryObjectRows;
  const reviewRequiredObjectCount = objectRows.filter((row) => row.reviewRequired).length;
  const enforcedGateCount = gateRows.filter((row) => row.state === "ENFORCED").length;
  const missingGateCount = gateRows.filter((row) => row.state === "MISSING").length;
  const hasAiAppliedObjects = objectRows.some((row) => row.objectType === "site" || row.objectType === "vlan");
  const findings = buildFindings(hasMetadata, objectRows, gateRows);
  const overallReadiness: Phase19AiDraftHelperControlSummary["overallReadiness"] = missingGateCount > 0 ? "BLOCKED" : hasAiAppliedObjects ? "REVIEW_REQUIRED" : "SAFE_DRAFT_ONLY";

  return {
    contract: PHASE19_AI_DRAFT_HELPER_CONTRACT,
    role: PHASE19_AI_DRAFT_ROLE,
    sourceOfTruthLevel: "ai-draft-only-review-gated",
    aiAuthority: PHASE19_AI_AUTHORITY,
    overallReadiness,
    draftApplyPolicy: "SELECTIVE_REVIEW_REQUIRED_BEFORE_STRUCTURED_SAVE",
    aiDerivedObjectCount: objectRows.length,
    reviewRequiredObjectCount,
    gateCount: gateRows.length,
    enforcedGateCount,
    missingGateCount,
    hasAiDraftMetadata: hasMetadata,
    hasAiAppliedObjects,
    providerMode: providerMode(metadata),
    gateRows,
    draftObjectRows: objectRows,
    findings,
    proofBoundary: [
      "AI output is never authoritative engineering truth in SubnetOps.",
      "AI can only generate drafts, explanations, and suggested structured inputs.",
      "AI-created sites/VLANs must carry PHASE19_AI_DRAFT_APPLIED_REVIEW_REQUIRED provenance when imported from the AI workspace.",
      "AI-created objects remain REVIEW_REQUIRED until deterministic validation, Engine 1 addressing, Engine 2 IPAM when relevant, standards, traceability, report/export, and diagram checks prove them.",
      "Reports and diagrams must not cite AI as the source of truth; they may only show reviewed backend objects and review-required provenance.",
    ],
    notes: [
      "Phase 19 intentionally refuses to make AI an authority layer.",
      "The safe path is AI draft → reviewed structured input → deterministic engines → validation/report/diagram evidence.",
      hasAiAppliedObjects ? "AI-derived objects are present and must stay review-labelled." : "No AI-applied site/VLAN markers detected in this snapshot.",
    ],
  };
}
