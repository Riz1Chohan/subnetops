import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, createTemplateProject, deleteProject, duplicateProject, getProject, getProjects, getProjectSites, getProjectVlans, updateProject } from "./api";
import { runValidation } from "../validation/api";

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
    onSuccess: async (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (project?.id) {
        try {
          await runValidation(project.id);
        } catch {}
        void queryClient.invalidateQueries({ queryKey: ["validation", project.id] });
      }
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Parameters<typeof updateProject>[1]) => updateProject(projectId, values),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      try {
        await runValidation(projectId);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}

export function useDuplicateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicateProject,
    onSuccess: async (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (project?.id) {
        try {
          await runValidation(project.id);
        } catch {}
        void queryClient.invalidateQueries({ queryKey: ["validation", project.id] });
      }
    },
  });
}

export function useCreateTemplateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateKey, name }: { templateKey: "small-office" | "branch-office" | "clinic-starter"; name?: string }) =>
      createTemplateProject(templateKey, name),
    onSuccess: async (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (project?.id) {
        try {
          await runValidation(project.id);
        } catch {}
        void queryClient.invalidateQueries({ queryKey: ["validation", project.id] });
      }
    },
  });
}


export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
