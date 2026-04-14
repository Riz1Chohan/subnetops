import { api } from "../../lib/api";
import type { Project, ProjectDetail, Site, Vlan } from "../../lib/types";

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
}) {
  return api<Project>("/projects", {
    method: "POST",
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
