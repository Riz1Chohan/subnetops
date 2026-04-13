import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSite, deleteSite, updateSite } from "./api";

export function useCreateSite(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-sites", projectId] });
    },
  });
}

export function useUpdateSite(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, values }: { siteId: string; values: Parameters<typeof updateSite>[1] }) =>
      updateSite(siteId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-sites", projectId] });
    },
  });
}

export function useDeleteSite(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-sites", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
    },
  });
}
