import type { SecurityActorRole } from "./types.js";

const roleRank: Record<string, number> = {
  NONE: 0,
  MEMBER: 10,
  ADMIN: 20,
  OWNER: 30,
  PROJECT_OWNER: 30,
};

export function normalizeSecurityRole(role: SecurityActorRole): "OWNER" | "ADMIN" | "MEMBER" | "PROJECT_OWNER" | "NONE" {
  const normalized = String(role ?? "NONE").trim().toUpperCase();
  if (normalized === "OWNER" || normalized === "ADMIN" || normalized === "MEMBER" || normalized === "PROJECT_OWNER") return normalized;
  return "NONE";
}

export function hasAtLeastRole(role: SecurityActorRole, minimum: "MEMBER" | "ADMIN" | "OWNER") {
  return roleRank[normalizeSecurityRole(role)] >= roleRank[minimum];
}

export function canManageOrganization(role: SecurityActorRole) {
  return hasAtLeastRole(role, "ADMIN");
}

export function canTransferOrganizationOwnership(role: SecurityActorRole) {
  return normalizeSecurityRole(role) === "OWNER";
}

export function canViewProject(role: SecurityActorRole) {
  return hasAtLeastRole(role, "MEMBER") || normalizeSecurityRole(role) === "PROJECT_OWNER";
}

export function canEditProject(role: SecurityActorRole) {
  const normalized = normalizeSecurityRole(role);
  return normalized === "PROJECT_OWNER" || normalized === "OWNER" || normalized === "ADMIN";
}
