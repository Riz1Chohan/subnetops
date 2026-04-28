#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Security hardening check failed: ${message}`);
    process.exit(1);
  }
}

assert(exists("backend/src/middleware/rateLimit.ts"), "rateLimit middleware is missing.");
const rateLimit = read("backend/src/middleware/rateLimit.ts");
assert(rateLimit.includes("return `${keyPrefix}:${ip}`;"), "rate limiter must key buckets by both limiter prefix and normalized client IP.");
assert(exists("backend/src/middleware/rateLimit.selftest.ts"), "rate limiter behavioral selftest is missing.");
const rateLimitSelftest = read("backend/src/middleware/rateLimit.selftest.ts");
assert(rateLimitSelftest.includes("client B must not inherit client A's exhausted bucket"), "rate limiter selftest must prove per-IP bucket separation.");
assert(rateLimitSelftest.includes("different limiter prefixes must use separate buckets"), "rate limiter selftest must prove per-prefix bucket separation.");
const authRoutes = read("backend/src/routes/auth.routes.ts");
for (const route of ["/register", "/login", "/change-password", "/request-password-reset", "/reset-password"]) {
  assert(authRoutes.includes(route) && authRoutes.includes("authRateLimit"), `${route} is not protected by authRateLimit.`);
}

const schema = read("backend/prisma/schema.prisma");
assert(schema.includes("model PasswordResetToken"), "PasswordResetToken model is missing from Prisma schema.");
assert(schema.includes("tokenHash String") && schema.includes("@unique"), "PasswordResetToken tokenHash unique storage is missing.");

const env = read("backend/src/config/env.ts");
assert(env.includes('nodeEnv === "production"') && env.includes("JWT_SECRET") && env.includes("value.length < 32"), "production JWT secret strength validation is missing.");

const authService = read("backend/src/services/auth.service.ts");
assert(authService.includes("crypto.randomBytes") && authService.includes("sha256") && authService.includes("passwordResetToken.create"), "password reset flow does not use one-time stored hashed tokens.");
assert(authService.includes("usedAt") && authService.includes("expiresAt") && authService.includes("updateMany"), "password reset token one-use/expiry enforcement is missing.");
assert(!authService.includes("signPasswordResetToken") && !authService.includes("verifyPasswordResetToken"), "old JWT-only password reset helpers are still present.");

const emailService = read("backend/src/services/email.service.ts");
assert(emailService.includes("safeOutboxPayload") && emailService.includes('resetLink: "[REDACTED]"') && emailService.includes('inviteToken: "[REDACTED]"'), "outbox secret redaction is missing.");

const orgService = read("backend/src/services/organization.service.ts");
assert(orgService.includes("Only an owner can invite another owner"), "organization owner invite guard is missing.");
assert(orgService.includes("acceptInvitation") && orgService.includes("prisma.$transaction") && orgService.includes("status: \"PENDING\""), "invitation acceptance is not transactional/claim-based.");
assert(orgService.includes("transferOwnership") && orgService.includes("prisma.$transaction"), "ownership transfer transaction is missing.");

for (const file of ["backend/src/services/project.service.ts", "backend/src/services/site.service.ts", "backend/src/services/vlan.service.ts"]) {
  const source = read(file);
  assert(source.includes("prisma.$transaction"), `${file} does not use transactions for multi-step writes.`);
  assert(source.includes("addChangeLog") && source.includes(", tx)"), `${file} does not write change logs inside the transaction.`);
}

const loginPage = read("frontend/src/pages/LoginPage.tsx");
assert(loginPage.includes("VITE_ENABLE_DEMO_LOGIN") && loginPage.includes("demoLoginEnabled"), "frontend demo login is not gated behind an explicit env flag.");
const renderYaml = read("render.yaml");
assert(!renderYaml.includes("VITE_ENABLE_DEMO_LOGIN") || renderYaml.includes("value: \"false\""), "Render must not expose demo login by default.");

console.log("Security hardening check passed.");

process.exit(0);
