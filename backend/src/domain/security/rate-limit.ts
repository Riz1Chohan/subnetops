import type { RateLimitDecision, RateLimitDecisionInput } from "./types.js";

export function makeRateLimitKey(scope: string, identity: string) {
  const safeScope = String(scope || "default").trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, "_");
  const safeIdentity = String(identity || "unknown").trim().toLowerCase();
  return `${safeScope}:${safeIdentity}`;
}

export function rateLimitDecision(input: RateLimitDecisionInput): RateLimitDecision {
  const now = input.now ?? new Date();
  const retryAfterSeconds = Math.max(1, Math.ceil((input.resetAt.getTime() - now.getTime()) / 1000));
  const remaining = Math.max(0, input.maxAttempts - input.count);
  return {
    allowed: input.count <= input.maxAttempts,
    remaining,
    retryAfterSeconds,
  };
}
