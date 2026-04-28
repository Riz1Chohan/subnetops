import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDesignCoreSnapshot } from "./api";
import type { Project, Site, Vlan } from "../../lib/types";
import type { RequirementsProfile } from "../../lib/requirementsProfile";
import { buildBackendOnlyDisplayDesign } from "../../lib/backendDesignDisplayModel";
import { applyDesignCoreSnapshotToDisplayDesign } from "../../lib/designCoreAdapter";
import { resolveDesignAuthorityState } from "../../lib/designAuthority";

export function useDesignCoreSnapshot(projectId: string) {
  return useQuery({
    queryKey: ["design-core", projectId],
    queryFn: () => getDesignCoreSnapshot(projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useAuthoritativeDesign(
  projectId: string,
  project: Project | undefined,
  sites: Site[],
  vlans: Vlan[],
  requirementsProfile: RequirementsProfile,
) {
  const designCoreQuery = useDesignCoreSnapshot(projectId);

  void sites;
  void vlans;
  void requirementsProfile;

  const backendOnlyDisplayShell = useMemo(
    () => buildBackendOnlyDisplayDesign(project),
    [project],
  );

  const synthesized = useMemo(
    () => applyDesignCoreSnapshotToDisplayDesign(backendOnlyDisplayShell, designCoreQuery.data),
    [backendOnlyDisplayShell, designCoreQuery.data],
  );

  const authority = useMemo(
    () => resolveDesignAuthorityState(designCoreQuery.data, designCoreQuery.isLoading, designCoreQuery.error),
    [designCoreQuery.data, designCoreQuery.error, designCoreQuery.isLoading],
  );

  return {
    synthesized,
    backendOnlyDisplayShell,
    localSynthesized: backendOnlyDisplayShell,
    designCore: designCoreQuery.data,
    designCoreQuery,
    authority,
    isUsingBackendDesignCore: authority.isBackendAuthority,
    isUsingFrontendFallback: false,
  };
}
