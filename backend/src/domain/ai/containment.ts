import {
  V1_AI_AUTHORITY,
  V1_AI_DRAFT_HELPER_CONTRACT,
  V1_AI_DRAFT_ROLE,
  V1_AI_APPLIED_MARKER,
  type AIDraftMetadata,
  type AIPromptContainmentResult,
  type AIPlanDraft,
  type AIProjectSnapshot,
  type AIValidationExplanation,
  type V1AIDraftAuthority,
  type V1AiDraftFinding,
  type V1AiDraftGateRow,
  type V1AiDraftHelperControlSummary,
  type V1AiDraftObjectRow,
  type V1AiProviderMode,
} from "./types.js";

export { V1_AI_AUTHORITY, V1_AI_DRAFT_HELPER_CONTRACT, V1_AI_DRAFT_ROLE, V1_AI_APPLIED_MARKER };

const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 4000;
const FINAL_AUTHORITY_PATTERNS = [
  /\b(final|approved|production[- ]ready|ready for implementation|implement now|deploy now)\b/i,
  /\b(no review required|skip review|bypass validation|ignore validation|override validation)\b/i,
  /\b(generate\s+(final\s+)?(cisco|palo alto|fortinet|juniper|vendor)\s+(config|commands?))\b/i,
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function valueAsString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function boundedText(value: unknown, fallback: string, maxLength = 500): string {
  const text = valueAsString(value).trim();
  return (text || fallback).slice(0, maxLength);
}

function stringArray(value: unknown, fallback: string[], maxItems = 12, maxLength = 300): string[] {
  if (!Array.isArray(value)) return fallback;
  const rows = value
    .map((item) => boundedText(item, "", maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
  return rows.length > 0 ? rows : fallback;
}

function numeric(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function buildV1DraftAuthority(): V1AIDraftAuthority {
  return {
    contract: V1_AI_DRAFT_HELPER_CONTRACT,
    state: "AI_DRAFT",
    sourceType: "AI_DRAFT",
    proofStatus: "DRAFT_ONLY",
    reviewRequired: true,
    notAuthoritative: true,
    materializationRequired: true,
    downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED",
    conversionGates: [
      "User reviews and selects draft parts to keep",
      "Selected items become structured project inputs, not approved design facts",
      "Requirements traceability records what changed and what still needs review",
      "Addressing and IPAM checks must validate subnet, gateway, capacity, and conflict safety",
      "Validation/readiness checks must stay visible before implementation or export claims",
      "Reports and diagrams may display only reviewed backend facts with evidence labels",
    ],
    allowedUses: [
      "Draft requirement wording",
      "Suggest site/VLAN starting points for review",
      "Explain validation findings in plain language",
      "Suggest follow-up questions for a human reviewer",
    ],
    prohibitedUses: [
      "Final subnet authority",
      "Final route authority",
      "Final firewall/security-policy authority",
      "Readiness approval",
      "Vendor command generation",
      "Report, diagram, or implementation proof",
    ],
  };
}

export function containPrompt(prompt: string): AIPromptContainmentResult {
  const normalizedPrompt = prompt.trim().replace(/\s+/g, " ").slice(0, MAX_PROMPT_LENGTH);
  const blockedReasons: string[] = [];
  if (normalizedPrompt.length < MIN_PROMPT_LENGTH) blockedReasons.push("Prompt is too short for a useful draft suggestion.");
  for (const pattern of FINAL_AUTHORITY_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      blockedReasons.push("Prompt requests final/production authority. AI helper can only create review-required drafts.");
      break;
    }
  }
  return { allowed: blockedReasons.length === 0, blockedReasons, normalizedPrompt };
}

export function sanitizePlanDraft(candidate: Partial<AIPlanDraft>, provider: AIPlanDraft["provider"], fallback: AIPlanDraft): AIPlanDraft {
  const project = asRecord(candidate.project);
  const sites = Array.isArray(candidate.sites) ? candidate.sites.map((raw, index) => {
    const site = asRecord(raw);
    return {
      name: boundedText(site.name, `Draft Site ${index + 1}`, 120),
      location: boundedText(site.location, "", 180) || undefined,
      siteCode: boundedText(site.siteCode, "", 32) || undefined,
      defaultAddressBlock: boundedText(site.defaultAddressBlock, "", 64) || undefined,
      notes: boundedText(site.notes, "AI-suggested site; review before saving.", 300),
    };
  }).slice(0, 30) : fallback.sites;

  const vlans = Array.isArray(candidate.vlans) ? candidate.vlans.map((raw, index) => {
    const vlan = asRecord(raw);
    return {
      siteName: boundedText(vlan.siteName, sites[0]?.name || fallback.sites[0]?.name || "Draft Site", 120),
      vlanId: Math.max(1, Math.min(4094, Math.trunc(numeric(vlan.vlanId, 10 + index)))),
      vlanName: boundedText(vlan.vlanName, `DRAFT_${index + 1}`, 80).toUpperCase(),
      purpose: boundedText(vlan.purpose, "Review-required AI VLAN suggestion.", 180),
      subnetCidr: boundedText(vlan.subnetCidr, fallback.vlans[index]?.subnetCidr || "", 64),
      gatewayIp: boundedText(vlan.gatewayIp, fallback.vlans[index]?.gatewayIp || "", 64),
      dhcpEnabled: booleanValue(vlan.dhcpEnabled, true),
      estimatedHosts: Math.max(1, Math.trunc(numeric(vlan.estimatedHosts, fallback.vlans[index]?.estimatedHosts || 25))),
      department: boundedText(vlan.department, "", 80) || undefined,
      notes: boundedText(vlan.notes, "AI-suggested VLAN; review before saving.", 300),
    };
  }).slice(0, 200) : fallback.vlans;

  return {
    project: {
      name: boundedText(project.name, fallback.project.name, 160),
      description: boundedText(project.description, fallback.project.description, 1000),
      organizationName: boundedText(project.organizationName, fallback.project.organizationName || "", 120) || undefined,
      environmentType: boundedText(project.environmentType, fallback.project.environmentType || "custom", 80),
      basePrivateRange: boundedText(project.basePrivateRange, fallback.project.basePrivateRange || "", 64) || undefined,
    },
    sites,
    vlans,
    rationale: stringArray(candidate.rationale, fallback.rationale),
    assumptions: stringArray(candidate.assumptions, fallback.assumptions),
    reviewChecklist: stringArray(candidate.reviewChecklist, fallback.reviewChecklist),
    provider,
    authority: buildV1DraftAuthority(),
  };
}

export function containValidationExplanation(candidate: Partial<AIValidationExplanation>, provider: AIValidationExplanation["provider"], fallback: AIValidationExplanation): AIValidationExplanation {
  return {
    explanation: boundedText(candidate.explanation, fallback.explanation, 1000),
    whyItMatters: boundedText(candidate.whyItMatters, fallback.whyItMatters, 1000),
    suggestedFixes: stringArray(candidate.suggestedFixes, fallback.suggestedFixes, 8, 260),
    provider,
    authority: buildV1DraftAuthority(),
  };
}

function parseJsonMap(value?: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function hasAiMarker(value?: string | null): boolean {
  return Boolean(value && value.includes(V1_AI_APPLIED_MARKER));
}

function providerMode(metadata: AIDraftMetadata): V1AiProviderMode {
  const provider = valueAsString(metadata.provider).toLowerCase();
  if (provider === "openai") return "openai";
  if (provider === "local") return "local";
  if (provider) return "unknown";
  return "not-used";
}

function reviewPath(): string[] {
  return [
    "AI draft suggestion",
    "user selective review/apply action",
    "structured requirement/site/VLAN object with draft-review marker",
    "requirements traceability review",
    "addressing and IPAM checks",
    "validation/readiness review",
    "standards and source-evidence checks",
    "report/diagram display only with review-required truth label",
  ];
}

function buildGateRows(metadata: AIDraftMetadata, aiObjectCount: number): V1AiDraftGateRow[] {
  const hasMetadata = metadata.contract === V1_AI_DRAFT_HELPER_CONTRACT || metadata.state === "AI_DRAFT";
  return [
    {
      contract: V1_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "draft-only-authority",
      gate: "AI output is draft-only and not engineering authority",
      required: true,
      state: "ENFORCED",
      evidence: [V1_AI_AUTHORITY, "AIPlanDraft.authority.notAuthoritative=true", "design-core AI draft helper reports DRAFT_ONLY_NOT_AUTHORITATIVE"],
      blocksAuthority: true,
      consumerImpact: "Frontend, report, export, validation, diagrams, and implementation must label AI output as review-required until structured approval exists.",
    },
    {
      contract: V1_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "selective-user-apply",
      gate: "AI draft must be selectively applied by a user, not silently saved",
      required: true,
      state: hasMetadata || aiObjectCount > 0 ? "ENFORCED" : "REVIEW_REQUIRED",
      evidence: hasMetadata || aiObjectCount > 0 ? ["AI workspace stores explicit applyProjectFields/applySites/applyVlans selections", "Project creation preserves AI draft provenance"] : ["No AI draft metadata detected on this project."],
      blocksAuthority: true,
      consumerImpact: "AI suggestions cannot bypass Start Plan review controls.",
    },
    {
      contract: V1_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "structured-conversion-required",
      gate: "AI suggestions must become structured requirements/source objects before downstream planning modules use them",
      required: true,
      state: hasMetadata || aiObjectCount > 0 ? "REVIEW_REQUIRED" : "ENFORCED",
      evidence: hasMetadata || aiObjectCount > 0 ? ["AI-derived objects exist and remain review-required.", "Requirement traceability and validation must run after project creation."] : ["No AI-derived objects detected; no AI conversion risk in this snapshot."],
      blocksAuthority: true,
      consumerImpact: "Addressing, IPAM, standards, routing, security, reports, diagrams, and implementation cannot cite AI as authority.",
    },
    {
      contract: V1_AI_DRAFT_HELPER_CONTRACT,
      gateKey: "deterministic-checks-required",
      gate: "AI-created structured objects must pass deterministic checks before implementation trust",
      required: true,
      state: aiObjectCount > 0 ? "REVIEW_REQUIRED" : "ENFORCED",
      evidence: aiObjectCount > 0 ? ["AI-derived site/VLAN notes retain the draft-review marker.", "Validation and readiness must keep AI-derived objects review-labelled."] : ["No AI-derived site/VLAN objects detected."],
      blocksAuthority: true,
      consumerImpact: "Implementation readiness stays review-gated for AI-derived objects.",
    },
  ];
}

function buildMetadataObject(project: AIProjectSnapshot, metadata: AIDraftMetadata): V1AiDraftObjectRow | null {
  if (metadata.contract !== V1_AI_DRAFT_HELPER_CONTRACT && metadata.state !== "AI_DRAFT") return null;
  return {
    contract: V1_AI_DRAFT_HELPER_CONTRACT,
    objectId: `${project.id}:requirements:ai-draft`,
    objectType: "requirement-profile",
    objectLabel: "AI draft metadata saved with requirements profile",
    state: "AI_DRAFT",
    sourceType: "AI_DRAFT",
    proofStatus: "DRAFT_ONLY",
    downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED",
    sourceRequirementIds: ["aiDraft"],
    reviewRequired: true,
    materializationPath: reviewPath(),
    notes: [
      `Provider: ${valueAsString(metadata.provider) || "unknown"}`,
      `Selected apply controls: ${JSON.stringify(metadata.selected || {})}`,
      "This metadata is evidence of draft provenance, not approval.",
    ],
  };
}

function buildObjectRows(project: AIProjectSnapshot, metadata: AIDraftMetadata): V1AiDraftObjectRow[] {
  const rows: V1AiDraftObjectRow[] = [];
  const metadataRow = buildMetadataObject(project, metadata);
  if (metadataRow) rows.push(metadataRow);

  for (const site of project.sites || []) {
    if (hasAiMarker(site.notes)) {
      rows.push({
        contract: V1_AI_DRAFT_HELPER_CONTRACT,
        objectId: site.id,
        objectType: "site",
        objectLabel: `AI-applied site: ${site.name}`,
        state: "REVIEW_REQUIRED",
        sourceType: "AI_DRAFT",
        proofStatus: "REVIEW_REQUIRED",
        downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED",
        sourceRequirementIds: ["aiDraft.site"],
        reviewRequired: true,
        materializationPath: reviewPath(),
        notes: [site.notes || "AI-applied site requires review."],
      });
    }
    for (const vlan of site.vlans || []) {
      if (!hasAiMarker(vlan.notes)) continue;
      rows.push({
        contract: V1_AI_DRAFT_HELPER_CONTRACT,
        objectId: vlan.id,
        objectType: "vlan",
        objectLabel: `AI-applied VLAN ${vlan.vlanId} ${vlan.vlanName} at ${site.name}`,
        state: "REVIEW_REQUIRED",
        sourceType: "AI_DRAFT",
        proofStatus: "REVIEW_REQUIRED",
        downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED",
        sourceRequirementIds: ["aiDraft.vlan"],
        reviewRequired: true,
        materializationPath: reviewPath(),
        notes: [vlan.notes || "AI-applied VLAN requires validation, addressing, IPAM, standards, and traceability checks."],
      });
    }
  }
  return rows;
}

function buildFindings(hasMetadata: boolean, objectRows: V1AiDraftObjectRow[], gateRows: V1AiDraftGateRow[]): V1AiDraftFinding[] {
  const findings: V1AiDraftFinding[] = [];
  const appliedObjects = objectRows.filter((row) => row.objectType === "site" || row.objectType === "vlan");
  const missingGates = gateRows.filter((row) => row.state === "MISSING");

  if (missingGates.length) {
    findings.push({
      severity: "BLOCKING",
      code: "V1_AI_GATE_MISSING",
      title: "AI helper safety gate is missing",
      detail: "One or more mandatory AI draft gates are missing, so AI output could be mistaken for engineering authority.",
      affectedObjects: missingGates.map((row) => row.gateKey),
      readinessImpact: "BLOCKED",
      remediation: "Restore draft-only authority, selective review, structured conversion, validation, and evidence gates.",
    });
  }

  if (appliedObjects.length) {
    findings.push({
      severity: "REVIEW_REQUIRED",
      code: "V1_AI_APPLIED_OBJECT_REVIEW_REQUIRED",
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
      code: "V1_AI_METADATA_DRAFT_ONLY",
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
      code: "V1_NO_AI_AUTHORITY_RISK",
      title: "No AI-derived authority risk detected",
      detail: "This snapshot does not contain saved AI draft metadata or AI-applied site/VLAN markers.",
      affectedObjects: [],
      readinessImpact: "SAFE_DRAFT_ONLY",
      remediation: "No action required unless AI is used to seed this project later.",
    });
  }

  findings.push({
    severity: "INFO",
    code: "V1_AI_DRAFT_ONLY_BOUNDARY",
    title: "AI helper is draft-only",
    detail: "AI can suggest requirements, sites, VLANs, and explanations, but cannot be the source of engineering truth for addressing, routing, security, diagrams, reports, readiness, or implementation.",
    affectedObjects: [],
    readinessImpact: appliedObjects.length ? "REVIEW_REQUIRED" : "SAFE_DRAFT_ONLY",
    remediation: "Convert AI suggestions into structured reviewed inputs, then let deterministic checks prove or reject them.",
  });

  return findings;
}

export function buildAiDraftHelperControl(project: AIProjectSnapshot): V1AiDraftHelperControlSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const metadata = asRecord(requirements.V1AiDraft) as AIDraftMetadata;
  const hasMetadata = metadata.contract === V1_AI_DRAFT_HELPER_CONTRACT || metadata.state === "AI_DRAFT";
  const objectRows = buildObjectRows(project, metadata);
  const gateRows = buildGateRows(metadata, objectRows.length);
  const reviewRequiredObjectCount = objectRows.filter((row) => row.reviewRequired).length;
  const enforcedGateCount = gateRows.filter((row) => row.state === "ENFORCED").length;
  const missingGateCount = gateRows.filter((row) => row.state === "MISSING").length;
  const hasAiAppliedObjects = objectRows.some((row) => row.objectType === "site" || row.objectType === "vlan");
  const findings = buildFindings(hasMetadata, objectRows, gateRows);
  const overallReadiness: V1AiDraftHelperControlSummary["overallReadiness"] = missingGateCount > 0 ? "BLOCKED" : hasAiAppliedObjects ? "REVIEW_REQUIRED" : "SAFE_DRAFT_ONLY";

  return {
    contract: V1_AI_DRAFT_HELPER_CONTRACT,
    role: V1_AI_DRAFT_ROLE,
    sourceOfTruthLevel: "ai-draft-only-review-gated",
    aiAuthority: V1_AI_AUTHORITY,
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
      "AI-created sites/VLANs must carry draft-review provenance when imported from the AI workspace.",
      "AI-created objects remain REVIEW_REQUIRED until deterministic validation, addressing, IPAM, standards, traceability, report/export, and diagram checks prove them.",
      "Reports and diagrams must not cite AI as the source of truth; they may only show reviewed backend objects and review-required provenance.",
    ],
    notes: [
      "V1 intentionally refuses to make AI an authority layer.",
      "The safe path is AI draft → reviewed structured input → deterministic checks → validation/report/diagram evidence.",
      hasAiAppliedObjects ? "AI-derived objects are present and must stay review-labelled." : "No AI-applied site/VLAN markers detected in this snapshot.",
    ],
  };
}
