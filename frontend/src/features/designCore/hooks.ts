import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDesignCoreSnapshot } from "./api";
import type { Project, Site, Vlan } from "../../lib/types";
import type { RequirementsProfile } from "../../lib/requirementsProfile";
import { buildBackendOnlyDisplayDesign } from "../../lib/backendDesignDisplayModel";
import { applyDesignCoreSnapshotToDisplayDesign } from "../../lib/designCoreAdapter";
import { resolveDesignAuthorityState } from "../../lib/designAuthority";

export function buildDesignCoreInputFingerprint(
  project: Project | undefined,
  sites: Site[],
  vlans: Vlan[],
  requirementsProfile: RequirementsProfile,
) {
  const projectInputs = {
    basePrivateRange: project?.basePrivateRange ?? "",
    requirementsProfile,
  };
  const siteInputs = sites
    .map((site) => ({ id: site.id, name: site.name, siteCode: site.siteCode ?? "", defaultAddressBlock: site.defaultAddressBlock ?? "" }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const vlanInputs = vlans
    .map((vlan) => ({
      id: vlan.id,
      siteId: vlan.siteId,
      vlanId: vlan.vlanId,
      vlanName: vlan.vlanName,
      purpose: vlan.purpose ?? "",
      segmentRole: vlan.segmentRole ?? "",
      subnetCidr: vlan.subnetCidr,
      gatewayIp: vlan.gatewayIp,
      estimatedHosts: vlan.estimatedHosts ?? null,
      dhcpEnabled: vlan.dhcpEnabled,
      department: vlan.department ?? "",
      notes: vlan.notes ?? "",
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return JSON.stringify({ projectInputs, siteInputs, vlanInputs });
}

export function useDesignCoreSnapshot(projectId: string, inputFingerprint = "") {
  return useQuery({
    queryKey: ["design-core", projectId, inputFingerprint],
    queryFn: () => getDesignCoreSnapshot(projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useAuthoritativeDesign(
  projectId: string,
  project: Project | undefined,
  sites: Site[],
  vlans: Vlan[],
  requirementsProfile: RequirementsProfile,
) {
  const inputFingerprint = useMemo(
    () => buildDesignCoreInputFingerprint(project, sites, vlans, requirementsProfile),
    [project, sites, vlans, requirementsProfile],
  );
  const designCoreQuery = useDesignCoreSnapshot(projectId, inputFingerprint);

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
