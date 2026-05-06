import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAllocationApproval,
  createAllocationFromPlan,
  createBrownfieldImport,
  createBrownfieldConflictResolution,
  createDhcpScope,
  createIpAllocation,
  createIpPool,
  createIpReservation,
  createRouteDomain,
  deleteBrownfieldNetwork,
  deleteDhcpScope,
  deleteIpAllocation,
  deleteIpPool,
  deleteIpReservation,
  deleteRouteDomain,
  getEnterpriseIpamSnapshot,
  previewBrownfieldImport,
  updateIpAllocationStatus,
  updateRouteDomain,
  updateIpPool,
  updateIpAllocation,
  updateDhcpScope,
  updateIpReservation,
  updateBrownfieldNetwork,
} from "./api";

function invalidateEngine2(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  void queryClient.invalidateQueries({ queryKey: ["enterprise-ipam", projectId] });
  void queryClient.invalidateQueries({ queryKey: ["design-core", projectId] });
}

export function useEnterpriseIpam(projectId: string) {
  return useQuery({ queryKey: ["enterprise-ipam", projectId], queryFn: () => getEnterpriseIpamSnapshot(projectId), enabled: Boolean(projectId) });
}

export function useEnterpriseIpamMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => invalidateEngine2(queryClient, projectId);
  return {
    createRouteDomain: useMutation({ mutationFn: (input: Record<string, unknown>) => createRouteDomain(projectId, input), onSuccess }),
    updateRouteDomain: useMutation({ mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateRouteDomain(id, input), onSuccess }),
    deleteRouteDomain: useMutation({ mutationFn: deleteRouteDomain, onSuccess }),
    createIpPool: useMutation({ mutationFn: (input: Record<string, unknown>) => createIpPool(projectId, input), onSuccess }),
    updateIpPool: useMutation({ mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateIpPool(id, input), onSuccess }),
    deleteIpPool: useMutation({ mutationFn: deleteIpPool, onSuccess }),
    createIpAllocation: useMutation({ mutationFn: (input: Record<string, unknown>) => createIpAllocation(projectId, input), onSuccess }),
    updateIpAllocation: useMutation({ mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateIpAllocation(id, input), onSuccess }),
    createAllocationFromPlan: useMutation({ mutationFn: (input: Record<string, unknown>) => createAllocationFromPlan(projectId, input), onSuccess }),
    updateIpAllocationStatus: useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateIpAllocationStatus>[1] }) => updateIpAllocationStatus(id, input), onSuccess }),
    deleteIpAllocation: useMutation({ mutationFn: deleteIpAllocation, onSuccess }),
    createDhcpScope: useMutation({ mutationFn: (input: Record<string, unknown>) => createDhcpScope(projectId, input), onSuccess }),
    updateDhcpScope: useMutation({ mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateDhcpScope(id, input), onSuccess }),
    deleteDhcpScope: useMutation({ mutationFn: deleteDhcpScope, onSuccess }),
    createIpReservation: useMutation({ mutationFn: (input: Record<string, unknown>) => createIpReservation(projectId, input), onSuccess }),
    updateIpReservation: useMutation({ mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateIpReservation(id, input), onSuccess }),
    deleteIpReservation: useMutation({ mutationFn: deleteIpReservation, onSuccess }),
    previewBrownfieldImport: useMutation({ mutationFn: (input: Record<string, unknown>) => previewBrownfieldImport(projectId, input) }),
    createBrownfieldImport: useMutation({ mutationFn: (input: Record<string, unknown>) => createBrownfieldImport(projectId, input), onSuccess }),
    createBrownfieldConflictResolution: useMutation({ mutationFn: (input: Record<string, unknown>) => createBrownfieldConflictResolution(projectId, input), onSuccess }),
    updateBrownfieldNetwork: useMutation({ mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateBrownfieldNetwork(id, input), onSuccess }),
    deleteBrownfieldNetwork: useMutation({ mutationFn: deleteBrownfieldNetwork, onSuccess }),
    createAllocationApproval: useMutation({ mutationFn: (input: Record<string, unknown>) => createAllocationApproval(projectId, input), onSuccess }),
  };
}
