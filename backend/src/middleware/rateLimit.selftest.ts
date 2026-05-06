import type { NextFunction, Request, Response } from "express";
import { createRateLimiter, MemoryRateLimitStore } from "./rateLimit.js";

interface MockResponse {
  statusCode?: number;
  body?: unknown;
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function makeRequest(ip: string): Request {
  return {
    ip,
    socket: { remoteAddress: ip },
  } as unknown as Request;
}

function makeResponse(): MockResponse & Response {
  const response: MockResponse = {
    headers: {},
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response as MockResponse & Response;
}

async function invoke(limiter: ReturnType<typeof createRateLimiter>, ip: string) {
  const req = makeRequest(ip);
  const res = makeResponse();
  let passed = false;
  const next: NextFunction = (error?: unknown) => {
    if (error) throw error;
    passed = true;
  };

  await limiter(req, res, next);
  return { passed, statusCode: res.statusCode, headers: res.headers };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function runRateLimitSelftest() {
  const store = new MemoryRateLimitStore();
  const authLimiter = createRateLimiter({ keyPrefix: "auth-selftest", windowMs: 60_000, maxAttempts: 1, store });

  const firstClientFirstAttempt = await invoke(authLimiter, "198.51.100.10");
  assert(firstClientFirstAttempt.passed, "first request from client A should pass");

  const firstClientSecondAttempt = await invoke(authLimiter, "198.51.100.10");
  assert(!firstClientSecondAttempt.passed, "second request from client A should be blocked");
  assert(firstClientSecondAttempt.statusCode === 429, "blocked request should return 429");

  const secondClientFirstAttempt = await invoke(authLimiter, "198.51.100.11");
  assert(secondClientFirstAttempt.passed, "client B must not inherit client A's exhausted bucket");

  const passwordResetLimiter = createRateLimiter({ keyPrefix: "password-reset-selftest", windowMs: 60_000, maxAttempts: 1, store });
  const sameIpDifferentPrefix = await invoke(passwordResetLimiter, "198.51.100.10");
  assert(sameIpDifferentPrefix.passed, "different limiter prefixes must use separate buckets for the same IP");

  console.log("Rate limiter selftest passed.");
}

runRateLimitSelftest();
