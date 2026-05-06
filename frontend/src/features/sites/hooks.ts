import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSite, deleteSite, updateSite } from "./api";
import { runValidation } from "../validation/api";

export function useCreateSite(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSite,
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-sites", projectId] });
      try {
        await runValidation(projectId);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}

export function useUpdateSite(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, values }: { siteId: string; values: Parameters<typeof updateSite>[1] }) =>
      updateSite(siteId, values),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-sites", projectId] });
      try {
        await runValidation(projectId);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}

export function useDeleteSite(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSite,
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-sites", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
      try {
        await runValidation(projectId);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}
