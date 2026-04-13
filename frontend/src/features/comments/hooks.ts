import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkReassignProjectTasks, createProjectComment, getAssignedTasks, getMentionSuggestions, getProjectComments, queueMyDigest, queueProjectOverdueReminders, togglePinComment, toggleResolveComment, updateCommentTask } from "./api";

export function useProjectComments(projectId: string) {
  return useQuery({ queryKey: ["project-comments", projectId], queryFn: () => getProjectComments(projectId), enabled: Boolean(projectId) });
}

export function useCreateProjectComment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; parentId?: string; visibility?: "ALL" | "REVIEWER_ONLY"; isPinned?: boolean; assignedToUserId?: string; dueDate?: string; taskStatus?: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE"; priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; targetType?: "PROJECT" | "SITE" | "VLAN"; targetId?: string; }) => createProjectComment(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
    },
  });
}

export function useToggleResolveComment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => toggleResolveComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
    },
  });
}

export function useTogglePinComment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => togglePinComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useUpdateCommentTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, values }: { commentId: string; values: { assignedToUserId?: string | null; dueDate?: string | null; taskStatus?: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE"; priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; targetType?: "PROJECT" | "SITE" | "VLAN"; targetId?: string | null; } }) => updateCommentTask(commentId, values),
    onSuccess: () => {
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] });
        void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
    },
  });
}

export function useMentionSuggestions(projectId: string) {
  return useQuery({ queryKey: ["mention-suggestions", projectId], queryFn: () => getMentionSuggestions(projectId), enabled: Boolean(projectId) });
}

export function useAssignedTasks() {
  return useQuery({ queryKey: ["assigned-tasks"], queryFn: getAssignedTasks });
}

export function useBulkReassignProjectTasks(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { commentIds: string[]; assignedToUserId: string | null }) => bulkReassignProjectTasks(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
    },
  });
}

export function useQueueProjectOverdueReminders(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => queueProjectOverdueReminders(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useQueueMyDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: queueMyDigest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
