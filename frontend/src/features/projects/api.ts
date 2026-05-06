import { api } from "../../lib/api";
import type { Project, ProjectDetail, Site, Vlan } from "../../lib/types";
import type { V1RequirementsMaterializationControlSummary } from "../../lib/designCoreSnapshot";

export type RequirementsRuntimeProof = {
  release?: { stage: string; version: string; saveRoute: string; proofRoute: string };
  proofStage?: string;
  generatedAt?: string;
  status: "pass" | "blocker";
  materializerExpected?: boolean;
  materializerContract?: string;
  requirementsPresent?: boolean;
  savedRequirementKeys?: string[];
  selectedSiteCount: number;
  requiredSegmentFamilies: string[];
  expectedMinimumVlans: number;
  counts: { sites: number; vlans: number; addressingRows: number };
  samples?: { sites?: Array<Record<string, unknown>>; vlans?: Array<Record<string, unknown>> };
  failureReasons: string[];
};

export type RequirementsMaterializationResponse = {
  message: string;
  projectId: string;
  release?: { stage: string; version: string; saveRoute: string; proofRoute: string };
  requirementsMaterialization?: {
    createdSites: number;
    updatedSites: number;
    createdVlans: number;
    updatedVlans: number;
    consumedFields: string[];
    impactInventoryCount: number;
    directImpactCount: number;
    reviewNotes: string[];
    V1MaterializationPolicy?: V1RequirementsMaterializationControlSummary;
  } | null;
  requirementsFieldCoverage?: {
    expectedFields: number;
    capturedFields: number;
    capturedFieldKeys: string[];
    missingFields: string[];
    unexpectedFields: string[];
    status: "complete" | "incomplete";
  };
  persistenceContract?: { siteCount: number; vlanCount: number; selectedSiteCount: number; expectedSegmentFamilies: string[] };
  runtimeProofBefore?: RequirementsRuntimeProof;
  runtimeProofAfter?: RequirementsRuntimeProof;
  outputCounts: { sites: number; vlans: number; addressingRows?: number };
};

export function getProjects() {
  return api<Project[]>("/projects");
}

export function getProject(projectId: string) {
  return api<ProjectDetail>(`/projects/${projectId}`);
}

export function getProjectSites(projectId: string) {
  return api<Site[]>(`/projects/${projectId}/sites`);
}

export function getProjectVlans(projectId: string) {
  return api<Vlan[]>(`/projects/${projectId}/vlans`);
}

export function createProject(input: {
  name: string;
  description?: string;
  organizationName?: string;
  environmentType?: string;
  basePrivateRange?: string;
  logoUrl?: string;
  reportHeader?: string;
  reportFooter?: string;
  requirementsJson?: string;
  discoveryJson?: string;
  platformProfileJson?: string;
}) {
  return api<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveProjectRequirements(projectId: string, input: {
  requirementsJson: string;
  environmentType?: string;
  description?: string;
}) {
  return api<RequirementsMaterializationResponse>(`/projects/${projectId}/requirements`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getRequirementsRuntimeProof(projectId: string) {
  return api<RequirementsRuntimeProof>(`/projects/${projectId}/requirements-runtime-proof`);
}

export function updateProject(projectId: string, input: {
  name?: string;
  description?: string;
  organizationName?: string;
  environmentType?: string;
  basePrivateRange?: string;
  logoUrl?: string;
  reportHeader?: string;
  reportFooter?: string;
  requirementsJson?: string;
  discoveryJson?: string;
  platformProfileJson?: string;
}) {
  return api<{ message: string }>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function duplicateProject(projectId: string) {
  return api<ProjectDetail>(`/projects/${projectId}/duplicate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function createTemplateProject(templateKey: "small-office" | "branch-office" | "clinic-starter", name?: string) {
  return api<ProjectDetail>(`/projects/templates/${templateKey}`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}


export function deleteProject(projectId: string) {
  return api<void>(`/projects/${projectId}`, {
    method: "DELETE",
  });
}
