import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjectWatchers, watchProject, unwatchProject } from "./api";

export function useProjectWatchers(projectId: string) {
  return useQuery({ queryKey: ["project-watchers", projectId], queryFn: () => getProjectWatchers(projectId), enabled: Boolean(projectId) });
}

export function useWatchProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => watchProject(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-watchers", projectId] });
    },
  });
}

export function useUnwatchProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwatchProject(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-watchers", projectId] });
    },
  });
}
