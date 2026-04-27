import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs?: number;
  maxAttempts?: number;
  keyPrefix?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function normalizeClientIp(req: Request) {
  // Express resolves req.ip from the configured trust proxy setting.
  // Do not parse X-Forwarded-For here; trusting raw client-supplied headers inside
  // the limiter lets attackers rotate spoofed values and bypass per-IP limits.
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getClientKey(req: Request, keyPrefix: string) {
  const ip = normalizeClientIp(req);
  return `:::`;
}

function sweepExpiredBuckets(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 10;
  const keyPrefix = options.keyPrefix ?? "default";

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    sweepExpiredBuckets(now);

    const key = getClientKey(req, keyPrefix);
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("RateLimit-Limit", String(maxAttempts));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, maxAttempts - bucket.count)));
    res.setHeader("RateLimit-Reset", String(retryAfterSeconds));

    if (bucket.count > maxAttempts) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ message: "Too many attempts. Please wait before trying again." });
      return;
    }

    next();
  };
}

export const authRateLimit = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
});
