import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  buildSecurityAuditRecord,
  buildSessionClaims,
  canEditProject,
  canManageOrganization,
  makeRateLimitKey,
  rateLimitDecision,
  sessionExpiresAt,
  shouldAcceptSession,
} from "./index.js";

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

const now = new Date("2026-05-03T12:00:00.000Z");
const sessionId = "session-1";
const token = "signed.jwt.value";
const tokenHash = hashSessionToken(token);
const claims = buildSessionClaims({ userId: "user-1", email: "USER@EXAMPLE.COM", planTier: "FREE", sessionId, tokenVersion: 3 });
claims.iat = Math.floor(now.getTime() / 1000);

assert.equal(claims.email, "user@example.com");
assert.equal(claims.sid, sessionId);
assert.equal(claims.tokenVersion, 3);

const accepted = shouldAcceptSession({
  claims,
  tokenHash,
  now,
  user: { id: "user-1", email: "user@example.com", planTier: "FREE", tokenVersion: 3 },
  session: { id: sessionId, userId: "user-1", tokenHash, expiresAt: sessionExpiresAt(now) },
});
assert.deepEqual(accepted, { accepted: true, reason: "accepted" });

assert.equal(shouldAcceptSession({
  claims,
  tokenHash,
  now,
  user: { id: "user-1", email: "user@example.com", planTier: "FREE", tokenVersion: 4 },
  session: { id: sessionId, userId: "user-1", tokenHash, expiresAt: sessionExpiresAt(now) },
}).reason, "token_version_stale");

assert.equal(shouldAcceptSession({
  claims,
  tokenHash,
  now,
  user: { id: "user-1", email: "user@example.com", planTier: "FREE", tokenVersion: 3, tokensInvalidBefore: new Date(now.getTime() + 1000) },
  session: { id: sessionId, userId: "user-1", tokenHash, expiresAt: sessionExpiresAt(now) },
}).reason, "token_globally_revoked");

assert.equal(shouldAcceptSession({
  claims,
  tokenHash,
  now,
  user: { id: "user-1", email: "user@example.com", planTier: "FREE", tokenVersion: 3 },
  session: { id: sessionId, userId: "user-1", tokenHash, expiresAt: sessionExpiresAt(now), revokedAt: now },
}).reason, "session_revoked");

assert.equal(canManageOrganization("ADMIN"), true);
assert.equal(canManageOrganization("MEMBER"), false);
assert.equal(canEditProject("PROJECT_OWNER"), true);
assert.equal(canEditProject("MEMBER"), false);

const audit = buildSecurityAuditRecord({
  action: "auth.login",
  outcome: "created",
  actorUserId: "user-1",
  targetType: "session",
  targetId: sessionId,
  detail: { email: "user@example.com", password: "plain-text", resetToken: "secret" },
}, now);
assert.equal(audit.detailJson?.includes("plain-text"), false);
assert.equal(audit.detailJson?.includes("secret"), false);
assert.equal(audit.outcome, "created");

assert.equal(makeRateLimitKey("Auth Login", "127.0.0.1"), "auth_login:127.0.0.1");
assert.deepEqual(rateLimitDecision({ key: "auth:1", count: 11, maxAttempts: 10, resetAt: new Date(now.getTime() + 60000), now }), {
  allowed: false,
  remaining: 0,
  retryAfterSeconds: 60,
});

console.log("Security domain selftest passed");
