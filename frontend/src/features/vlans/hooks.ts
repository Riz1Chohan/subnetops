import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVlan, deleteVlan, updateVlan } from "./api";
import { runValidation } from "../validation/api";

export function useCreateVlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVlan,
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
      try {
        await runValidation(projectId);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}

export function useUpdateVlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vlanId, values }: { vlanId: string; values: Parameters<typeof updateVlan>[1] }) =>
      updateVlan(vlanId, values),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
      try {
        await runValidation(projectId);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}

export function useDeleteVlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVlan,
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-vlans", projectId] });
      try {
        await runValidation(projectId);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}
