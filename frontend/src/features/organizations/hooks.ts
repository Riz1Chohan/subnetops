import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptInvitation, createOrganization, createOrganizationInvitation, getMyInvitations, getOrganizationEmailOutbox, getOrganizationInvitations, getOrganizationMembers, getOrganizations, removeOrganizationMember, revokeOrganizationInvitation, transferOrganizationOwnership, updateOrganizationMemberRole } from "./api";

export function useOrganizations() {
  return useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useOrganizationMembers(organizationId: string) {
  return useQuery({ queryKey: ["organization-members", organizationId], queryFn: () => getOrganizationMembers(organizationId), enabled: Boolean(organizationId) });
}

export function useUpdateOrganizationMemberRole(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: "OWNER" | "ADMIN" | "MEMBER" }) => updateOrganizationMemberRole(organizationId, membershipId, role),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] }); },
  });
}

export function useRemoveOrganizationMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => removeOrganizationMember(organizationId, membershipId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] }); },
  });
}

export function useTransferOrganizationOwnership(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => transferOrganizationOwnership(organizationId, membershipId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] }); void queryClient.invalidateQueries({ queryKey: ["organizations"] }); },
  });
}

export function useOrganizationEmailOutbox(organizationId: string) {
  return useQuery({ queryKey: ["organization-email-outbox", organizationId], queryFn: () => getOrganizationEmailOutbox(organizationId), enabled: Boolean(organizationId) });
}

export function useOrganizationInvitations(organizationId: string) {
  return useQuery({ queryKey: ["organization-invitations", organizationId], queryFn: () => getOrganizationInvitations(organizationId), enabled: Boolean(organizationId) });
}

export function useCreateOrganizationInvitation(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: "OWNER" | "ADMIN" | "MEMBER" }) => createOrganizationInvitation(organizationId, email, role),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["organization-invitations", organizationId] }); },
  });
}

export function useRevokeOrganizationInvitation(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeOrganizationInvitation(organizationId, invitationId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["organization-invitations", organizationId] }); },
  });
}

export function useMyInvitations() {
  return useQuery({ queryKey: ["my-invitations"], queryFn: getMyInvitations });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      void queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}
