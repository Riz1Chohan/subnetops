import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getValidationResults, runValidation } from "./api";

export function useValidationResults(projectId: string) {
  return useQuery({
    queryKey: ["validation", projectId],
    queryFn: () => getValidationResults(projectId),
    enabled: Boolean(projectId),
  });
}

export function useRunValidation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runValidation(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });
}
