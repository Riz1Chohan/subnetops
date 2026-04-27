#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const fail = (message) => {
  console.error(`Final trust cleanup check failed: ${message}`);
  process.exitCode = 1;
};

const backendLockPath = 'backend/package-lock.json';
if (!exists(backendLockPath)) {
  fail('backend/package-lock.json is missing, so backend npm ci is still not reproducible.');
} else {
  const lock = JSON.parse(read(backendLockPath));
  const rootPackage = lock.packages && lock.packages[''];
  if (!rootPackage) fail('backend package-lock.json is missing the root package entry.');
  if (rootPackage && rootPackage.name !== 'subnetops-backend') fail('backend lockfile does not describe subnetops-backend.');
}

const app = read('backend/src/app.ts');
if (!app.includes('app.set("trust proxy", 1)')) fail('Express trust proxy setting is missing.');

const rateLimit = read('backend/src/middleware/rateLimit.ts');
if (rateLimit.includes('req.headers["x-forwarded-for"]') || rateLimit.includes("req.headers['x-forwarded-for']")) {
  fail('rate limiter still parses raw X-Forwarded-For directly. Use req.ip after Express trust proxy is configured.');
}
if (!rateLimit.includes('normalizeClientIp')) fail('rate limiter client IP normalization helper is missing.');

const orgService = read('backend/src/services/organization.service.ts');
if (!orgService.includes('sanitizeInvitation')) fail('organization invitation token sanitizer is missing.');
if (!orgService.includes('return sanitizeInvitations(invitations)')) fail('organization invitation list does not return sanitized invitations.');
if (!orgService.includes('return sanitizeInvitation(invite)')) fail('organization invite creation still returns raw invitation token.');

const validationService = read('backend/src/services/validation.service.ts');
if (!validationService.includes('const savedResults = await prisma.$transaction')) fail('validation result rewrite is not transactional.');
if (!validationService.includes('tx.validationResult.deleteMany') || !validationService.includes('tx.validationResult.createMany')) {
  fail('validation delete/create does not run through the transaction client.');
}

if (exists('backend/src/types/prisma-shim.d.ts')) fail('unsafe Prisma shim still exists. Remove it once Prisma generate is part of the build chain.');

const orgApi = read('frontend/src/features/organizations/api.ts');
if (!orgApi.includes('token?: string')) fail('frontend organization invitation type still requires token exposure.');

const reportPage = read('frontend/src/pages/ProjectReportPage.tsx');
const issueSections = [...reportPage.matchAll(/data-report-section="issues"/g)].length;
if (issueSections !== 1) fail(`ProjectReportPage has ${issueSections} issues sections; expected exactly one.`);
if (!reportPage.includes('data-report-section="diagram-cross-check"')) fail('diagram cross-check report section is not separately identified.');

if (process.exitCode) process.exit(process.exitCode);
console.log('Final trust cleanup check passed.');
