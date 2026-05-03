-- V1: Engine 2 write-time integrity and conflict-enforcement metadata.
-- Enforcement remains primarily in the service layer because CIDR overlap rules are address-family-aware.
ALTER TABLE "DesignIpAllocation" ADD COLUMN IF NOT EXISTS "supersededByAllocationId" TEXT;
ALTER TABLE "DesignIpAllocation" ADD COLUMN IF NOT EXISTS "supersessionReason" TEXT;
ALTER TABLE "DesignAllocationApproval" ADD COLUMN IF NOT EXISTS "designInputHash" TEXT;

CREATE INDEX IF NOT EXISTS "DesignAllocationApproval_designInputHash_idx" ON "DesignAllocationApproval"("designInputHash");
CREATE INDEX IF NOT EXISTS "DesignIpAllocation_projectId_addressFamily_routeDomainId_idx" ON "DesignIpAllocation"("projectId", "addressFamily", "routeDomainId");
CREATE INDEX IF NOT EXISTS "DesignIpPool_projectId_addressFamily_routeDomainId_idx" ON "DesignIpPool"("projectId", "addressFamily", "routeDomainId");
CREATE INDEX IF NOT EXISTS "DesignDhcpScope_projectId_addressFamily_routeDomainId_idx" ON "DesignDhcpScope"("projectId", "addressFamily", "routeDomainId");
