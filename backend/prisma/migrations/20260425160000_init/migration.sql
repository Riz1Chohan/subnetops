-- SubnetOps baseline production migration.
-- For a brand-new database, `prisma migrate deploy` can apply this directly.
-- For an existing database that was previously created with `prisma db push`, baseline it first:
--   npx prisma migrate resolve --applied 20260425160000_init

CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PAID');
CREATE TYPE "NotificationType" AS ENUM ('INVITE', 'MENTION', 'COMMENT', 'REVIEW', 'SYSTEM');
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');
CREATE TYPE "ValidationSeverity" AS ENUM ('ERROR', 'WARNING', 'INFO');
CREATE TYPE "ExportType" AS ENUM ('CSV', 'PDF');
CREATE TYPE "EntityType" AS ENUM ('PROJECT', 'SITE', 'VLAN');
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED');
CREATE TYPE "CommentVisibility" AS ENUM ('ALL', 'REVIEWER_ONLY');
CREATE TYPE "CommentTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE');
CREATE TYPE "CommentTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "CommentTargetType" AS ENUM ('PROJECT', 'SITE', 'VLAN', 'VALIDATION');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "DigestFrequency" AS ENUM ('DAILY', 'WEEKLY');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT,
  "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailOutbox" (
  "id" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "payloadJson" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "organizationName" TEXT,
  "environmentType" TEXT,
  "basePrivateRange" TEXT,
  "logoUrl" TEXT,
  "reportHeader" TEXT,
  "reportFooter" TEXT,
  "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewerNotes" TEXT,
  "requirementsJson" TEXT,
  "discoveryJson" TEXT,
  "platformProfileJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Site" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "streetAddress" TEXT,
  "buildingLabel" TEXT,
  "floorLabel" TEXT,
  "siteCode" TEXT,
  "notes" TEXT,
  "defaultAddressBlock" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vlan" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "vlanId" INTEGER NOT NULL,
  "vlanName" TEXT NOT NULL,
  "purpose" TEXT,
  "subnetCidr" TEXT NOT NULL,
  "gatewayIp" TEXT NOT NULL,
  "dhcpEnabled" BOOLEAN NOT NULL DEFAULT true,
  "estimatedHosts" INTEGER,
  "department" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValidationResult" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "severity" "ValidationSeverity" NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" "EntityType" NOT NULL,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ValidationResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportLog" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "exportType" "ExportType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChangeLog" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "actorLabel" TEXT,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectComment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentId" TEXT,
  "assignedToUserId" TEXT,
  "body" TEXT NOT NULL,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "visibility" "CommentVisibility" NOT NULL DEFAULT 'ALL',
  "taskStatus" "CommentTaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "CommentTaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueDate" TIMESTAMP(3),
  "reminderLastQueuedAt" TIMESTAMP(3),
  "targetType" "CommentTargetType" NOT NULL DEFAULT 'PROJECT',
  "targetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrgInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
  "token" TEXT NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "OrgInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectWatch" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectWatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "userId" TEXT NOT NULL,
  "inAppInvites" BOOLEAN NOT NULL DEFAULT true,
  "inAppMentions" BOOLEAN NOT NULL DEFAULT true,
  "emailInvites" BOOLEAN NOT NULL DEFAULT false,
  "emailMentions" BOOLEAN NOT NULL DEFAULT false,
  "overdueReminders" BOOLEAN NOT NULL DEFAULT false,
  "emailDigests" BOOLEAN NOT NULL DEFAULT false,
  "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'DAILY',
  "lastDigestQueuedAt" TIMESTAMP(3),
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Site_projectId_idx" ON "Site"("projectId");
CREATE INDEX "Vlan_siteId_idx" ON "Vlan"("siteId");
CREATE INDEX "Vlan_vlanId_idx" ON "Vlan"("vlanId");
CREATE UNIQUE INDEX "Vlan_siteId_vlanId_key" ON "Vlan"("siteId", "vlanId");
CREATE INDEX "ValidationResult_projectId_idx" ON "ValidationResult"("projectId");
CREATE INDEX "ExportLog_projectId_idx" ON "ExportLog"("projectId");
CREATE INDEX "ChangeLog_projectId_idx" ON "ChangeLog"("projectId");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
CREATE INDEX "ProjectComment_projectId_idx" ON "ProjectComment"("projectId");
CREATE INDEX "ProjectComment_parentId_idx" ON "ProjectComment"("parentId");
CREATE UNIQUE INDEX "OrgInvitation_token_key" ON "OrgInvitation"("token");
CREATE INDEX "OrgInvitation_organizationId_idx" ON "OrgInvitation"("organizationId");
CREATE UNIQUE INDEX "ProjectWatch_projectId_userId_key" ON "ProjectWatch"("projectId", "userId");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vlan" ADD CONSTRAINT "Vlan_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValidationResult" ADD CONSTRAINT "ValidationResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgInvitation" ADD CONSTRAINT "OrgInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectWatch" ADD CONSTRAINT "ProjectWatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectWatch" ADD CONSTRAINT "ProjectWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
