import type { SegmentRole } from "../addressing/cidr.js";

export type RequirementsInput = Record<string, unknown>;

export type RequirementResultStatus =
  | "applied"
  | "requires_review"
  | "not_supported"
  | "not_applicable"
  | "blocked";

export type RequirementTraceRecord = {
  key: string;
  status: RequirementResultStatus;
  originalValue: unknown;
  normalizedSignal: string;
  affectedObjectTypes: string[];
  evidence: string[];
  reviewReason?: string;
};

export type RequirementReviewItem = {
  key: string;
  reason: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  evidence: string[];
};

export type SegmentPlan = {
  vlanId: number;
  vlanName: string;
  segmentRole: SegmentRole;
  purpose: string;
  estimatedHosts: number;
  dhcpEnabled: boolean;
  department: string;
  requiredBy: string[];
  reviewNotes: string[];
};

export type SegmentAddressingPlan = {
  cidr: string;
  gateway?: string;
  recommendedPrefix: number;
  requiredUsableHosts: number;
  allocatorExplanation?: string;
};
