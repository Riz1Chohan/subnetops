-- V1 validation ledger authority fields.
-- These columns make ValidationResult the persisted source of truth for report/export/frontend/diagram validation counts.
ALTER TABLE "ValidationResult" ADD COLUMN "readinessCategory" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "findingClass" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "sourceEngine" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "sourceSnapshotPath" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "rootCauseKey" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "rootCauseTitle" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "deEscalationReason" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "remediation" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "affectedRequirementsJson" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "affectedObjectsJson" TEXT;
ALTER TABLE "ValidationResult" ADD COLUMN "evidenceJson" TEXT;

CREATE INDEX "ValidationResult_projectId_findingClass_idx" ON "ValidationResult"("projectId", "findingClass");
CREATE INDEX "ValidationResult_projectId_readinessCategory_idx" ON "ValidationResult"("projectId", "readinessCategory");
CREATE INDEX "ValidationResult_projectId_severity_idx" ON "ValidationResult"("projectId", "severity");
