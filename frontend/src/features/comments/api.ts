import { api } from "../../lib/api";
import type { MentionSuggestion, ProjectComment } from "../../lib/types";

export function getProjectComments(projectId: string) {
  return api<ProjectComment[]>(`/comments/projects/${projectId}`);
}

export function createProjectComment(projectId: string, input: { body: string; parentId?: string; visibility?: "ALL" | "REVIEWER_ONLY"; isPinned?: boolean; assignedToUserId?: string; dueDate?: string; taskStatus?: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE"; priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; targetType?: "PROJECT" | "SITE" | "VLAN"; targetId?: string; }) {
  return api<ProjectComment>(`/comments/projects/${projectId}`, { method: "POST", body: JSON.stringify(input) });
}

export function toggleResolveComment(commentId: string) {
  return api<ProjectComment>(`/comments/${commentId}/resolve`, { method: "PATCH", body: JSON.stringify({}) });
}

export function togglePinComment(commentId: string) {
  return api<ProjectComment>(`/comments/${commentId}/pin`, { method: "PATCH", body: JSON.stringify({}) });
}

export function updateCommentTask(commentId: string, input: { assignedToUserId?: string | null; dueDate?: string | null; taskStatus?: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE"; priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; targetType?: "PROJECT" | "SITE" | "VLAN"; targetId?: string | null; }) {
  return api<ProjectComment>(`/comments/${commentId}/task`, { method: "PATCH", body: JSON.stringify(input) });
}

export function getMentionSuggestions(projectId: string) {
  return api<MentionSuggestion[]>(`/comments/projects/${projectId}/mention-suggestions`);
}

export function getAssignedTasks() {
  return api<ProjectComment[]>("/comments/assigned/me");
}

export function bulkReassignProjectTasks(projectId: string, input: { commentIds: string[]; assignedToUserId: string | null }) {
  return api<{ updated: number }>(`/comments/projects/${projectId}/bulk-reassign`, { method: "POST", body: JSON.stringify(input) });
}

export function queueProjectOverdueReminders(projectId: string) {
  return api<{ queued: number }>(`/comments/projects/${projectId}/reminders/queue`, { method: "POST", body: JSON.stringify({}) });
}

export function queueMyDigest() {
  return api<{ queued: boolean; open?: number; overdue?: number; reason?: string }>(`/comments/digests/me/queue`, { method: "POST", body: JSON.stringify({}) });
}
