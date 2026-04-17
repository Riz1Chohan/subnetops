import type { ValidationResult } from "./types";

function requirementsAnchorForRule(ruleCode: string) {
  if (ruleCode.includes("SITE_BLOCK")) return "requirements-addressing";
  if (ruleCode.includes("GATEWAY") || ruleCode.includes("CIDR") || ruleCode.includes("OVERLAP") || ruleCode.includes("HOST_CAPACITY") || ruleCode.includes("RIGHTSIZE") || ruleCode.includes("SLASH31") || ruleCode.includes("SLASH32")) {
    return "requirements-addressing";
  }
  if (ruleCode.includes("VALIDATION_PASSED")) return "requirements-readiness";
  return "requirements-summary";
}

export function buildValidationFixPath(projectId: string, item: ValidationResult) {
  if (item.entityType === "SITE") {
    return item.entityId ? `/projects/${projectId}/sites?edit=${encodeURIComponent(item.entityId)}&returnTo=validation` : `/projects/${projectId}/sites?returnTo=validation`;
  }

  if (item.entityType === "VLAN") {
    return item.entityId ? `/projects/${projectId}/vlans?edit=${encodeURIComponent(item.entityId)}&returnTo=validation` : `/projects/${projectId}/vlans?returnTo=validation`;
  }

  const anchor = requirementsAnchorForRule(item.ruleCode);
  return `/projects/${projectId}/requirements#${anchor}`;
}

export function validationFixLabel(item: ValidationResult) {
  if (item.entityType === "SITE") return "Open site to fix";
  if (item.entityType === "VLAN") return "Open VLAN to fix";
  if (item.ruleCode.includes("VALIDATION_PASSED")) return "Open readiness review";
  return "Open related section";
}
