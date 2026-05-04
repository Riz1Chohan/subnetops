import type { SecurityAuditEventInput, SecurityAuditRecord, SecurityOutcome } from "./types.js";

const allowedOutcomes = new Set<SecurityOutcome>(["allowed", "denied", "failed", "revoked", "created", "updated"]);

export function normalizeAuditOutcome(value: unknown): SecurityOutcome {
  const normalized = String(value ?? "").trim().toLowerCase() as SecurityOutcome;
  return allowedOutcomes.has(normalized) ? normalized : "failed";
}

export function safeAuditDetailJson(detail: Record<string, unknown> | null | undefined) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("password") || lowerKey.includes("token") || lowerKey.includes("secret")) {
      redacted[key] = "[redacted]";
    } else {
      redacted[key] = value;
    }
  }
  return JSON.stringify(redacted);
}

export function buildSecurityAuditRecord(input: SecurityAuditEventInput, now = new Date()): SecurityAuditRecord {
  return {
    action: String(input.action || "system.unknown"),
    outcome: normalizeAuditOutcome(input.outcome),
    actorUserId: input.actorUserId || null,
    organizationId: input.organizationId || null,
    projectId: input.projectId || null,
    targetType: input.targetType || null,
    targetId: input.targetId || null,
    detailJson: safeAuditDetailJson(input.detail),
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
    createdAt: now,
  };
}
