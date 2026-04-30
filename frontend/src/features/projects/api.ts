import { api } from "../../lib/api";
import type { Project, ProjectDetail, Site, Vlan } from "../../lib/types";

export type RequirementsMaterializationResponse = {
  message: string;
  projectId: string;
  requirementsMaterialization?: {
    createdSites: number;
    updatedSites: number;
    createdVlans: number;
    updatedVlans: number;
    consumedFields: string[];
    impactInventoryCount: number;
    directImpactCount: number;
    reviewNotes: string[];
  } | null;
  requirementsFieldCoverage?: {
    expectedFields: number;
    capturedFields: number;
    capturedFieldKeys: string[];
    missingFields: string[];
    unexpectedFields: string[];
    status: "complete" | "incomplete";
  };
  outputCounts: { sites: number; vlans: number };
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
