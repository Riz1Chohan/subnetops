import { prisma } from "../db/prisma.js";
import { buildSecurityAuditRecord, type SecurityAuditEventInput } from "../domain/security/index.js";

export async function recordSecurityAuditEvent(input: SecurityAuditEventInput, db: any = prisma) {
  const record = buildSecurityAuditRecord(input);
  try {
    return await db.securityAuditEvent.create({
      data: {
        actorUserId: record.actorUserId || undefined,
        organizationId: record.organizationId || undefined,
        projectId: record.projectId || undefined,
        action: record.action,
        outcome: record.outcome,
        targetType: record.targetType || undefined,
        targetId: record.targetId || undefined,
        detailJson: record.detailJson || undefined,
        ipAddress: record.ipAddress || undefined,
        userAgent: record.userAgent || undefined,
        createdAt: record.createdAt,
      },
    });
  } catch {
    // Audit logging must not mask the original user action. Release checks and CI
    // should still verify the table exists before production deploy.
    return null;
  }
}
