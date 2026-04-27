import { useQuery } from "@tanstack/react-query";
import { getDesignCoreSnapshot } from "./api";

export function useDesignCoreSnapshot(projectId: string) {
  return useQuery({
    queryKey: ["design-core", projectId],
    queryFn: () => getDesignCoreSnapshot(projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}
