-- V1: Engine 2 enterprise source-of-truth data model.
-- These tables turn allocator evidence into durable project objects instead of inferred report-only output.
DO $$ BEGIN CREATE TYPE "AddressFamily" AS ENUM ('IPV4', 'IPV6'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IpPoolScope" AS ENUM ('ORGANIZATION', 'SITE', 'SEGMENT', 'TRANSIT', 'LOOPBACK', 'RESERVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IpPoolStatus" AS ENUM ('ACTIVE', 'RESERVED', 'DEPRECATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IpAllocationStatus" AS ENUM ('PROPOSED', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'IMPLEMENTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BrownfieldImportStatus" AS ENUM ('IMPORTED', 'REVIEWED', 'SUPERSEDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BrownfieldObjectKind" AS ENUM ('NETWORK', 'VLAN', 'DHCP_SCOPE', 'RESERVATION', 'ROUTE', 'FIREWALL_POLICY', 'UNKNOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AllocationApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_CHANGES'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AllocationLedgerAction" AS ENUM ('CREATED', 'UPDATED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'IMPLEMENTED', 'STALE_DETECTED', 'IMPORTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DesignRouteDomain" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "routeDomainKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "vrfName" TEXT,
  "routeDistinguisher" TEXT,
  "description" TEXT,
  "allowOverlappingCidrs" BOOLEAN NOT NULL DEFAULT false,
  "sourceState" TEXT NOT NULL DEFAULT 'configured',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignRouteDomain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DesignRouteDomain_projectId_routeDomainKey_key" ON "DesignRouteDomain"("projectId", "routeDomainKey");
CREATE INDEX IF NOT EXISTS "DesignRouteDomain_projectId_idx" ON "DesignRouteDomain"("projectId");

CREATE TABLE IF NOT EXISTS "DesignIpPool" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "routeDomainId" TEXT,
  "siteId" TEXT,
  "name" TEXT NOT NULL,
  "addressFamily" "AddressFamily" NOT NULL,
  "scope" "IpPoolScope" NOT NULL DEFAULT 'SITE',
  "cidr" TEXT NOT NULL,
  "status" "IpPoolStatus" NOT NULL DEFAULT 'ACTIVE',
  "purpose" TEXT,
  "ownerLabel" TEXT,
  "businessUnit" TEXT,
  "reservePercent" INTEGER NOT NULL DEFAULT 20,
  "noAllocate" BOOLEAN NOT NULL DEFAULT false,
  "sourceState" TEXT NOT NULL DEFAULT 'configured',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignIpPool_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DesignIpPool_routeDomainId_fkey" FOREIGN KEY ("routeDomainId") REFERENCES "DesignRouteDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignIpPool_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignIpPool_projectId_idx" ON "DesignIpPool"("projectId");
CREATE INDEX IF NOT EXISTS "DesignIpPool_routeDomainId_idx" ON "DesignIpPool"("routeDomainId");
CREATE INDEX IF NOT EXISTS "DesignIpPool_siteId_idx" ON "DesignIpPool"("siteId");

CREATE TABLE IF NOT EXISTS "DesignIpAllocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "poolId" TEXT,
  "routeDomainId" TEXT,
  "siteId" TEXT,
  "vlanId" TEXT,
  "addressFamily" "AddressFamily" NOT NULL,
  "cidr" TEXT NOT NULL,
  "gatewayIp" TEXT,
  "purpose" TEXT,
  "status" "IpAllocationStatus" NOT NULL DEFAULT 'PROPOSED',
  "source" TEXT NOT NULL DEFAULT 'engine2',
  "confidence" TEXT NOT NULL DEFAULT 'proposed',
  "inputHash" TEXT,
  "approvedAt" TIMESTAMP(3),
  "implementedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignIpAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DesignIpAllocation_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "DesignIpPool"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignIpAllocation_routeDomainId_fkey" FOREIGN KEY ("routeDomainId") REFERENCES "DesignRouteDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignIpAllocation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignIpAllocation_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "Vlan"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignIpAllocation_projectId_idx" ON "DesignIpAllocation"("projectId");
CREATE INDEX IF NOT EXISTS "DesignIpAllocation_poolId_idx" ON "DesignIpAllocation"("poolId");
CREATE INDEX IF NOT EXISTS "DesignIpAllocation_routeDomainId_idx" ON "DesignIpAllocation"("routeDomainId");
CREATE INDEX IF NOT EXISTS "DesignIpAllocation_siteId_idx" ON "DesignIpAllocation"("siteId");
CREATE INDEX IF NOT EXISTS "DesignIpAllocation_vlanId_idx" ON "DesignIpAllocation"("vlanId");

CREATE TABLE IF NOT EXISTS "DesignDhcpScope" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "siteId" TEXT,
  "vlanId" TEXT,
  "routeDomainId" TEXT,
  "allocationId" TEXT,
  "addressFamily" "AddressFamily" NOT NULL DEFAULT 'IPV4',
  "scopeCidr" TEXT NOT NULL,
  "defaultGateway" TEXT,
  "dnsServersJson" TEXT,
  "leaseSeconds" INTEGER,
  "excludedRangesJson" TEXT,
  "optionsJson" TEXT,
  "relayTargetsJson" TEXT,
  "serverLocation" TEXT,
  "source" TEXT NOT NULL DEFAULT 'configured',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignDhcpScope_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DesignDhcpScope_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignDhcpScope_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "Vlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignDhcpScope_routeDomainId_fkey" FOREIGN KEY ("routeDomainId") REFERENCES "DesignRouteDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignDhcpScope_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "DesignIpAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignDhcpScope_projectId_idx" ON "DesignDhcpScope"("projectId");
CREATE INDEX IF NOT EXISTS "DesignDhcpScope_siteId_idx" ON "DesignDhcpScope"("siteId");
CREATE INDEX IF NOT EXISTS "DesignDhcpScope_vlanId_idx" ON "DesignDhcpScope"("vlanId");
CREATE INDEX IF NOT EXISTS "DesignDhcpScope_routeDomainId_idx" ON "DesignDhcpScope"("routeDomainId");

CREATE TABLE IF NOT EXISTS "DesignIpReservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "siteId" TEXT,
  "vlanId" TEXT,
  "dhcpScopeId" TEXT,
  "allocationId" TEXT,
  "addressFamily" "AddressFamily" NOT NULL DEFAULT 'IPV4',
  "ipAddress" TEXT NOT NULL,
  "macAddress" TEXT,
  "hostname" TEXT,
  "ownerLabel" TEXT,
  "purpose" TEXT,
  "source" TEXT NOT NULL DEFAULT 'configured',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignIpReservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DesignIpReservation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignIpReservation_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "Vlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignIpReservation_dhcpScopeId_fkey" FOREIGN KEY ("dhcpScopeId") REFERENCES "DesignDhcpScope"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DesignIpReservation_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "DesignIpAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignIpReservation_projectId_idx" ON "DesignIpReservation"("projectId");
CREATE INDEX IF NOT EXISTS "DesignIpReservation_dhcpScopeId_idx" ON "DesignIpReservation"("dhcpScopeId");
CREATE INDEX IF NOT EXISTS "DesignIpReservation_allocationId_idx" ON "DesignIpReservation"("allocationId");

CREATE TABLE IF NOT EXISTS "DesignBrownfieldImport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceName" TEXT,
  "status" "BrownfieldImportStatus" NOT NULL DEFAULT 'IMPORTED',
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "DesignBrownfieldImport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignBrownfieldImport_projectId_idx" ON "DesignBrownfieldImport"("projectId");

CREATE TABLE IF NOT EXISTS "DesignBrownfieldNetwork" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "importId" TEXT,
  "routeDomainKey" TEXT,
  "addressFamily" "AddressFamily" NOT NULL,
  "cidr" TEXT NOT NULL,
  "vlanNumber" INTEGER,
  "siteName" TEXT,
  "ownerLabel" TEXT,
  "sourceObjectKind" "BrownfieldObjectKind" NOT NULL DEFAULT 'NETWORK',
  "sourceObjectId" TEXT,
  "confidence" TEXT NOT NULL DEFAULT 'imported',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignBrownfieldNetwork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DesignBrownfieldNetwork_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DesignBrownfieldImport"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignBrownfieldNetwork_projectId_idx" ON "DesignBrownfieldNetwork"("projectId");
CREATE INDEX IF NOT EXISTS "DesignBrownfieldNetwork_importId_idx" ON "DesignBrownfieldNetwork"("importId");
CREATE INDEX IF NOT EXISTS "DesignBrownfieldNetwork_routeDomainKey_idx" ON "DesignBrownfieldNetwork"("routeDomainKey");

CREATE TABLE IF NOT EXISTS "DesignAllocationApproval" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "allocationId" TEXT NOT NULL,
  "decision" "AllocationApprovalDecision" NOT NULL,
  "reviewerLabel" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignAllocationApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DesignAllocationApproval_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "DesignIpAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignAllocationApproval_projectId_idx" ON "DesignAllocationApproval"("projectId");
CREATE INDEX IF NOT EXISTS "DesignAllocationApproval_allocationId_idx" ON "DesignAllocationApproval"("allocationId");

CREATE TABLE IF NOT EXISTS "DesignAllocationLedgerEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "allocationId" TEXT,
  "action" "AllocationLedgerAction" NOT NULL,
  "actorLabel" TEXT,
  "summary" TEXT NOT NULL,
  "designInputHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignAllocationLedgerEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DesignAllocationLedgerEntry_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "DesignIpAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DesignAllocationLedgerEntry_projectId_idx" ON "DesignAllocationLedgerEntry"("projectId");
CREATE INDEX IF NOT EXISTS "DesignAllocationLedgerEntry_allocationId_idx" ON "DesignAllocationLedgerEntry"("allocationId");
