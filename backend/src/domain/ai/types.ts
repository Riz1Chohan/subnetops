export const V1_AI_DRAFT_HELPER_CONTRACT = "V1_AI_DRAFT_HELPER_CONTRACT" as const;
export const V1_AI_DRAFT_ROLE = "AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY" as const;
export const V1_AI_AUTHORITY = "DRAFT_ONLY_NOT_AUTHORITATIVE" as const;
export const V1_AI_APPLIED_MARKER = "V1_AI_DRAFT_APPLIED_REVIEW_REQUIRED" as const;

export type AIDraftProvider = "local" | "openai";
export type V1AiDraftReadiness = "SAFE_DRAFT_ONLY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1AiDraftState = "NO_AI_DRAFT" | "AI_DRAFT" | "REVIEW_REQUIRED" | "CONVERTED_TO_STRUCTURED_INPUT" | "VALIDATED_AFTER_REVIEW" | "BLOCKED";
export type V1AiGateState = "ENFORCED" | "REVIEW_REQUIRED" | "MISSING";
export type V1AiProviderMode = AIDraftProvider | "unknown" | "not-used";
export type V1AiDraftObjectType = "project" | "requirement-profile" | "site" | "vlan" | "validation-explanation" | "note";

export interface AIDraftSite {
  name: string;
  location?: string;
  siteCode?: string;
  defaultAddressBlock?: string;
  notes?: string;
}

export interface AIDraftVlan {
  siteName: string;
  vlanId: number;
  vlanName: string;
  purpose?: string;
  subnetCidr: string;
  gatewayIp: string;
  dhcpEnabled: boolean;
  estimatedHosts?: number;
  department?: string;
  notes?: string;
}

export interface V1AIDraftAuthority {
  contract: typeof V1_AI_DRAFT_HELPER_CONTRACT;
  state: "AI_DRAFT";
  sourceType: "AI_DRAFT";
  proofStatus: "DRAFT_ONLY";
  reviewRequired: true;
  notAuthoritative: true;
  materializationRequired: true;
  downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED";
  conversionGates: string[];
  allowedUses: string[];
  prohibitedUses: string[];
}

export interface AIPlanDraft {
  project: {
    name: string;
    description: string;
    organizationName?: string;
    environmentType?: string;
    basePrivateRange?: string;
  };
  sites: AIDraftSite[];
  vlans: AIDraftVlan[];
  rationale: string[];
  assumptions: string[];
  reviewChecklist: string[];
  provider: AIDraftProvider;
  authority: V1AIDraftAuthority;
}

export interface AIValidationExplanation {
  explanation: string;
  whyItMatters: string;
  suggestedFixes: string[];
  provider: AIDraftProvider;
  authority: V1AIDraftAuthority;
}

export interface AIDraftMetadata {
  contract?: string;
  state?: string;
  provider?: string;
  selected?: Record<string, unknown>;
  createdFrom?: string;
  reviewRequired?: boolean;
  notAuthoritative?: boolean;
  gate?: string[];
}

export interface AIProjectSnapshot {
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
}

export interface V1AiDraftGateRow {
  contract: typeof V1_AI_DRAFT_HELPER_CONTRACT;
  gateKey: string;
  gate: string;
  required: true;
  state: V1AiGateState;
  evidence: string[];
  blocksAuthority: boolean;
  consumerImpact: string;
}

export interface V1AiDraftObjectRow {
  contract: typeof V1_AI_DRAFT_HELPER_CONTRACT;
  objectId: string;
  objectType: V1AiDraftObjectType;
  objectLabel: string;
  state: V1AiDraftState;
  sourceType: "AI_DRAFT";
  proofStatus: "DRAFT_ONLY" | "REVIEW_REQUIRED";
  downstreamAuthority: "NOT_AUTHORITATIVE_UNTIL_REVIEWED";
  sourceRequirementIds: string[];
  reviewRequired: boolean;
  materializationPath: string[];
  notes: string[];
}

export interface V1AiDraftFinding {
  severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
  code: string;
  title: string;
  detail: string;
  affectedObjects: string[];
  readinessImpact: V1AiDraftReadiness;
  remediation: string;
}

export interface V1AiDraftHelperControlSummary {
  contract: typeof V1_AI_DRAFT_HELPER_CONTRACT;
  role: typeof V1_AI_DRAFT_ROLE;
  sourceOfTruthLevel: "ai-draft-only-review-gated";
  aiAuthority: typeof V1_AI_AUTHORITY;
  overallReadiness: V1AiDraftReadiness;
  draftApplyPolicy: "SELECTIVE_REVIEW_REQUIRED_BEFORE_STRUCTURED_SAVE";
  aiDerivedObjectCount: number;
  reviewRequiredObjectCount: number;
  gateCount: number;
  enforcedGateCount: number;
  missingGateCount: number;
  hasAiDraftMetadata: boolean;
  hasAiAppliedObjects: boolean;
  providerMode: V1AiProviderMode;
  gateRows: V1AiDraftGateRow[];
  draftObjectRows: V1AiDraftObjectRow[];
  findings: V1AiDraftFinding[];
  proofBoundary: string[];
  notes: string[];
}

export interface AIPromptContainmentResult {
  allowed: boolean;
  blockedReasons: string[];
  normalizedPrompt: string;
}
