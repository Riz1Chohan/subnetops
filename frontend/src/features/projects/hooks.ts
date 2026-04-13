import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, createTemplateProject, duplicateProject, getProject, getProjects, getProjectSites, getProjectVlans, updateProject } from "./api";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: getProjects });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });
}

export function useProjectSites(projectId: string) {
  return useQuery({
    queryKey: ["project-sites", projectId],
    queryFn: () => getProjectSites(projectId),
    enabled: Boolean(projectId),
  });
}

export function useProjectVlans(projectId: string) {
  return useQuery({
    queryKey: ["project-vlans", projectId],
    queryFn: () => getProjectVlans(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Parameters<typeof updateProject>[1]) => updateProject(projectId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useDuplicateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicateProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useCreateTemplateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateKey, name }: { templateKey: "small-office" | "branch-office" | "clinic-starter"; name?: string }) =>
      createTemplateProject(templateKey, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
