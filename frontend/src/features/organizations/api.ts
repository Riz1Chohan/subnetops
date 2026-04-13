import { api } from "../../lib/api";
import type { Organization } from "../../lib/types";

export interface OrganizationMember {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
  };
}

export interface OrganizationEmailOutboxItem {
  id: string;
  toEmail: string;
  subject: string;
  templateKey: string;
  payloadJson?: string;
  status: string;
  createdAt: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  token: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  createdAt: string;
  acceptedAt?: string;
  organization?: Organization;
}

export function getOrganizations() {
  return api<Organization[]>("/organizations");
}

export function createOrganization(name: string) {
  return api<Organization>("/organizations", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getOrganizationMembers(organizationId: string) {
  return api<OrganizationMember[]>(`/organizations/${organizationId}/members`);
}

export function updateOrganizationMemberRole(organizationId: string, membershipId: string, role: "OWNER" | "ADMIN" | "MEMBER") {
  return api<OrganizationMember>(`/organizations/${organizationId}/members/${membershipId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeOrganizationMember(organizationId: string, membershipId: string) {
  return api<void>(`/organizations/${organizationId}/members/${membershipId}`, {
    method: "DELETE",
  });
}

export function transferOrganizationOwnership(organizationId: string, membershipId: string) {
  return api<OrganizationMember>(`/organizations/${organizationId}/members/${membershipId}/transfer-ownership`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getOrganizationInvitations(organizationId: string) {
  return api<OrganizationInvitation[]>(`/organizations/${organizationId}/invitations`);
}

export function createOrganizationInvitation(organizationId: string, email: string, role: "OWNER" | "ADMIN" | "MEMBER") {
  return api<OrganizationInvitation>(`/organizations/${organizationId}/invitations`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export function revokeOrganizationInvitation(organizationId: string, invitationId: string) {
  return api<OrganizationInvitation>(`/organizations/${organizationId}/invitations/${invitationId}/revoke`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
}

export function getMyInvitations() {
  return api<OrganizationInvitation[]>("/organizations/my-invitations");
}

export function acceptInvitation(token: string) {
  return api<OrganizationInvitation>(`/organizations/invitations/${token}/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}


export function getOrganizationEmailOutbox(organizationId: string) {
  return api<OrganizationEmailOutboxItem[]>(`/organizations/${organizationId}/email-outbox`);
}
