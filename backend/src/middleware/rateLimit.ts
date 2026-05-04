import type { NextFunction, Request, Response } from "express";
import { makeRateLimitKey, rateLimitDecision } from "../domain/security/rate-limit.js";

interface RateLimitOptions {
  windowMs?: number;
  maxAttempts?: number;
  keyPrefix?: string;
  store?: RateLimitStore;
}

interface Bucket {
  count: number;
  resetAt: Date;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number, now: Date): Promise<Bucket> | Bucket;
  sweepExpired?(now: Date): Promise<void> | void;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();

  increment(key: string, windowMs: number, now: Date): Bucket {
    this.sweepExpired(now);
    const current = this.buckets.get(key);
    const bucket = current && current.resetAt.getTime() > now.getTime()
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt: new Date(now.getTime() + windowMs) };
    this.buckets.set(key, bucket);
    return bucket;
  }

  sweepExpired(now: Date): void {
    if (this.buckets.size < 500) return;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt.getTime() <= now.getTime()) this.buckets.delete(key);
    }
  }
}

async function getPrisma() {
  const module = await import("../db/prisma.js");
  return module.prisma as any;
}

export class PrismaRateLimitStore implements RateLimitStore {
  async increment(key: string, windowMs: number, now: Date): Promise<Bucket> {
    const prisma = await getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const existing = await tx.rateLimitBucket.findUnique({ where: { key } });
      if (!existing || existing.resetAt.getTime() <= now.getTime()) {
        const resetAt = new Date(now.getTime() + windowMs);
        const created = await tx.rateLimitBucket.upsert({
          where: { key },
          update: { count: 1, resetAt, updatedAt: now },
          create: { key, count: 1, resetAt, updatedAt: now },
        });
        return { count: created.count, resetAt: created.resetAt };
      }

      const updated = await tx.rateLimitBucket.update({
        where: { key },
        data: { count: { increment: 1 }, updatedAt: now },
      });
      return { count: updated.count, resetAt: updated.resetAt };
    });
  }

  async sweepExpired(now: Date): Promise<void> {
    const prisma = await getPrisma();
    await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } });
  }
}

const sharedStore = new PrismaRateLimitStore();

function normalizeClientIp(req: Request) {
  // Express resolves req.ip from the configured trust proxy setting.
  // Do not parse X-Forwarded-For here; trusting raw client-supplied headers inside
  // the limiter lets attackers rotate spoofed values and bypass per-IP limits.
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getClientKey(req: Request, keyPrefix: string) {
  return makeRateLimitKey(keyPrefix, normalizeClientIp(req));
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 10;
  const keyPrefix = options.keyPrefix ?? "default";
  const store = options.store ?? sharedStore;

  return async function rateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const key = getClientKey(req, keyPrefix);
      const bucket = await store.increment(key, windowMs, now);
      const decision = rateLimitDecision({ key, count: bucket.count, maxAttempts, resetAt: bucket.resetAt, now });

      res.setHeader("RateLimit-Limit", String(maxAttempts));
      res.setHeader("RateLimit-Remaining", String(decision.remaining));
      res.setHeader("RateLimit-Reset", String(decision.retryAfterSeconds));

      if (!decision.allowed) {
        res.setHeader("Retry-After", String(decision.retryAfterSeconds));
        res.status(429).json({ message: "Too many attempts. Please wait before trying again." });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authRateLimit = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
});

export const passwordResetRateLimit = createRateLimiter({
  keyPrefix: "password-reset",
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
});

export const exportRateLimit = createRateLimiter({
  keyPrefix: "export",
  windowMs: 15 * 60 * 1000,
  maxAttempts: 20,
});

export const aiRateLimit = createRateLimiter({
  keyPrefix: "ai",
  windowMs: 15 * 60 * 1000,
  maxAttempts: 30,
});
