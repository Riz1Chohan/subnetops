-- Phase 58: durable brownfield conflict resolution records.
CREATE TABLE "DesignBrownfieldConflictResolution" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "conflictKey" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "routeDomainKey" TEXT,
  "addressFamily" "AddressFamily" NOT NULL,
  "importedCidr" TEXT NOT NULL,
  "proposedCidr" TEXT,
  "existingObjectType" TEXT NOT NULL,
  "existingObjectId" TEXT,
  "decision" TEXT NOT NULL,
  "reviewerLabel" TEXT,
  "reason" TEXT NOT NULL,
  "designInputHash" TEXT,
  "supersededAllocationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesignBrownfieldConflictResolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesignBrownfieldConflictResolution_projectId_conflictKey_key" ON "DesignBrownfieldConflictResolution"("projectId", "conflictKey");
CREATE INDEX "DesignBrownfieldConflictResolution_projectId_idx" ON "DesignBrownfieldConflictResolution"("projectId");
CREATE INDEX "DesignBrownfieldConflictResolution_decision_idx" ON "DesignBrownfieldConflictResolution"("decision");
CREATE INDEX "DesignBrownfieldConflictResolution_designInputHash_idx" ON "DesignBrownfieldConflictResolution"("designInputHash");
ALTER TABLE "DesignBrownfieldConflictResolution" ADD CONSTRAINT "DesignBrownfieldConflictResolution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
