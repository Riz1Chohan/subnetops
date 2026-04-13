import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVlan, deleteVlan, updateVlan } from "./api";

export function useCreateVlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
    },
  });
}

export function useUpdateVlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vlanId, values }: { vlanId: string; values: Parameters<typeof updateVlan>[1] }) =>
      updateVlan(vlanId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}

export function useDeleteVlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}
