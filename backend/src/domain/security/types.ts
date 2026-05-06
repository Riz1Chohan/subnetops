export type SecurityOutcome = "allowed" | "denied" | "failed" | "revoked" | "created" | "updated";
export type SecurityActorRole = "OWNER" | "ADMIN" | "MEMBER" | "PROJECT_OWNER" | "NONE" | string | null | undefined;
export type SecurityAction =
  | "auth.register"
  | "auth.login"
  | "auth.logout"
  | "auth.password_change"
  | "auth.password_reset_request"
  | "auth.password_reset_complete"
  | "auth.session_rejected"
  | "org.create"
  | "org.invite"
  | "org.member_role_update"
  | "org.member_remove"
  | "org.ownership_transfer"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.read"
  | "ipam.write"
  | "report.export"
  | "ai.request"
  | string;

export type SecurityTargetType =
  | "user"
  | "session"
  | "organization"
  | "project"
  | "ipam"
  | "report"
  | "ai"
  | "system"
  | string;

export interface AuthTokenClaims {
  sub: string;
  email: string;
  planTier: "FREE" | "PAID" | string;
  sid: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface PersistedSessionState {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  lastSeenAt?: Date | null;
}

export interface PersistedUserSessionState {
  id: string;
  email: string;
  planTier: "FREE" | "PAID" | string;
  tokenVersion?: number | null;
  tokensInvalidBefore?: Date | null;
}

export interface SessionValidationInput {
  claims: AuthTokenClaims;
  tokenHash: string;
  user: PersistedUserSessionState | null | undefined;
  session: PersistedSessionState | null | undefined;
  now?: Date;
}

export interface SessionValidationResult {
  accepted: boolean;
  reason:
    | "accepted"
    | "missing_user"
    | "missing_session"
    | "wrong_user"
    | "token_hash_mismatch"
    | "session_revoked"
    | "session_expired"
    | "token_version_stale"
    | "token_globally_revoked";
}

export interface SecurityAuditEventInput {
  action: SecurityAction;
  outcome: SecurityOutcome;
  actorUserId?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  targetType?: SecurityTargetType | null;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SecurityAuditRecord extends Required<Omit<SecurityAuditEventInput, "detail" | "actorUserId" | "organizationId" | "projectId" | "targetType" | "targetId" | "ipAddress" | "userAgent">> {
  actorUserId: string | null;
  organizationId: string | null;
  projectId: string | null;
  targetType: string | null;
  targetId: string | null;
  detailJson: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface RateLimitDecisionInput {
  key: string;
  count: number;
  maxAttempts: number;
  resetAt: Date;
  now?: Date;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}
