export interface ChangeLog {
  id: string;
  projectId: string;
  actorLabel?: string;
  message: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  parentId?: string;
  body: string;
  isResolved: boolean;
  isPinned: boolean;
  visibility: CommentVisibility;
  taskStatus: CommentTaskStatus;
  priority: CommentTaskPriority;
  dueDate?: string;
  reminderLastQueuedAt?: string;
  targetType: CommentTargetType;
  targetId?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
  };
  assignedTo?: CommentAssignee;
  project?: { id: string; name: string };
  replies?: ProjectCommentReply[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationName?: string;
  environmentType?: string;
  basePrivateRange?: string;
  logoUrl?: string;
  reportHeader?: string;
  reportFooter?: string;
  approvalStatus?: "DRAFT" | "IN_REVIEW" | "APPROVED";
  reviewerNotes?: string;
  requirementsJson?: string;
  discoveryJson?: string;
  platformProfileJson?: string;
  organizationId?: string;
  canEdit?: boolean;
  taskSummary?: {
    open: number;
    overdue: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
  location?: string;
  streetAddress?: string;
  siteCode?: string;
  notes?: string;
  defaultAddressBlock?: string;
}

export interface Vlan {
  id: string;
  siteId: string;
  vlanId: number;
  vlanName: string;
  purpose?: string;
  subnetCidr: string;
  gatewayIp: string;
  dhcpEnabled: boolean;
  estimatedHosts?: number;
  department?: string;
  notes?: string;
  site?: {
    id: string;
    name: string;
    siteCode?: string;
  };
}

export interface ProjectDetail extends Project {
  sites: Array<Site & { vlans?: Vlan[] }>;
  changeLogs?: ChangeLog[];
}

export interface ValidationResult {
  id: string;
  projectId: string;
  severity: "ERROR" | "WARNING" | "INFO";
  ruleCode: string;
  title: string;
  message: string;
  entityType: "PROJECT" | "SITE" | "VLAN";
  entityId?: string;
  createdAt: string;
}


export interface NotificationItem {
  id: string;
  userId: string;
  type: "INVITE" | "MENTION" | "COMMENT" | "REVIEW" | "SYSTEM";
  title: string;
  message: string;
  link?: string;
  status: "UNREAD" | "READ";
  createdAt: string;
  readAt?: string;
}

export interface NotificationSummary {
  unread: number;
  total: number;
}


export interface NotificationPreference {
  id: string;
  userId: string;
  inAppInvites: boolean;
  inAppMentions: boolean;
  emailInvites: boolean;
  emailMentions: boolean;
  overdueReminders: boolean;
  emailDigests: boolean;
  digestFrequency: "DAILY" | "WEEKLY";
}

export interface MentionSuggestion {
  id: string;
  email: string;
  fullName?: string;
  mentionToken: string;
}

export interface ProjectWatcher {
  id: string;
  projectId: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
  };
}


export type CommentVisibility = "ALL" | "REVIEWER_ONLY";

export interface CommentAssignee {
  id: string;
  email: string;
  fullName?: string;
}

export interface ProjectCommentReply {
  id: string;
  projectId: string;
  userId: string;
  parentId?: string;
  body: string;
  isResolved: boolean;
  isPinned: boolean;
  visibility: CommentVisibility;
  taskStatus: CommentTaskStatus;
  priority: CommentTaskPriority;
  dueDate?: string;
  reminderLastQueuedAt?: string;
  targetType: CommentTargetType;
  targetId?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
  };
  assignedTo?: CommentAssignee;
}


export type CommentTaskStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type CommentTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type CommentTargetType = "PROJECT" | "SITE" | "VLAN";


export interface AIPlanDraft {
  project: {
    name: string;
    description: string;
    organizationName?: string;
    environmentType?: string;
    basePrivateRange?: string;
  };
  sites: Array<{
    name: string;
    location?: string;
    siteCode?: string;
    defaultAddressBlock?: string;
    notes?: string;
  }>;
  vlans: Array<{
    siteName: string;
    vlanId: number;
    vlanName: string;
    purpose?: string;
    subnetCidr: string;
    gatewayIp: string;
    dhcpEnabled: boolean;
    estimatedHosts?: number;
    department?: string;
    notes?: string;
  }>;
  rationale: string[];
  assumptions: string[];
  reviewChecklist: string[];
  provider: "local" | "openai";
}

export interface AIValidationExplanation {
  explanation: string;
  whyItMatters: string;
  suggestedFixes: string[];
  provider: "local" | "openai";
}
