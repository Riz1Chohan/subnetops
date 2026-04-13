import { api } from "../../lib/api";
import type { ProjectWatcher } from "../../lib/types";

export function getProjectWatchers(projectId: string) {
  return api<ProjectWatcher[]>(`/project-watchers/${projectId}`);
}

export function watchProject(projectId: string) {
  return api<ProjectWatcher>(`/project-watchers/${projectId}`, { method: "POST", body: JSON.stringify({}) });
}

export function unwatchProject(projectId: string) {
  return api<void>(`/project-watchers/${projectId}`, { method: "DELETE" });
}
