import type { AuthTokenClaims, PersistedSessionState, PersistedUserSessionState, SessionValidationInput, SessionValidationResult } from "./types.js";

export const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MIN_TOKEN_VERSION = 1;

export function normalizeTokenVersion(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= MIN_TOKEN_VERSION ? Math.floor(parsed) : MIN_TOKEN_VERSION;
}

export function sessionExpiresAt(now = new Date(), ttlMs = DEFAULT_SESSION_TTL_MS) {
  return new Date(now.getTime() + ttlMs);
}

export function buildSessionClaims(input: {
  userId: string;
  email: string;
  planTier: string;
  sessionId: string;
  tokenVersion?: number | null;
}): AuthTokenClaims {
  return {
    sub: input.userId,
    email: input.email.trim().toLowerCase(),
    planTier: input.planTier,
    sid: input.sessionId,
    tokenVersion: normalizeTokenVersion(input.tokenVersion),
  };
}

function issuedAtDate(claims: AuthTokenClaims) {
  if (!claims.iat) return null;
  return new Date(claims.iat * 1000);
}

export function shouldAcceptSession(input: SessionValidationInput): SessionValidationResult {
  const now = input.now ?? new Date();
  const user: PersistedUserSessionState | null | undefined = input.user;
  const session: PersistedSessionState | null | undefined = input.session;

  if (!user) return { accepted: false, reason: "missing_user" };
  if (!session) return { accepted: false, reason: "missing_session" };
  if (session.userId !== input.claims.sub || user.id !== input.claims.sub) return { accepted: false, reason: "wrong_user" };
  if (session.tokenHash !== input.tokenHash) return { accepted: false, reason: "token_hash_mismatch" };
  if (session.revokedAt) return { accepted: false, reason: "session_revoked" };
  if (session.expiresAt.getTime() <= now.getTime()) return { accepted: false, reason: "session_expired" };

  const expectedVersion = normalizeTokenVersion(user.tokenVersion);
  if (normalizeTokenVersion(input.claims.tokenVersion) !== expectedVersion) {
    return { accepted: false, reason: "token_version_stale" };
  }

  const invalidBefore = user.tokensInvalidBefore;
  const issuedAt = issuedAtDate(input.claims);
  if (invalidBefore && issuedAt && issuedAt.getTime() <= invalidBefore.getTime()) {
    return { accepted: false, reason: "token_globally_revoked" };
  }

  return { accepted: true, reason: "accepted" };
}
