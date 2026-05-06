#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

function fail(message) {
  console.error(`V1 CI/deployment check failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function assertOrder(text, orderedSnippets, label) {
  let cursor = -1;
  for (const snippet of orderedSnippets) {
    const next = text.indexOf(snippet);
    assert(next !== -1, `${label} is missing required command: ${snippet}`);
    assert(next > cursor, `${label} has command out of order: ${snippet}`);
    cursor = next;
  }
}

const rootPkg = readJson('package.json');
const backendPkg = readJson('backend/package.json');

const expectedRootScripts = {
  'check:docs': 'node scripts/check-readme-only.cjs',
  'check:backend': 'npm --prefix backend run prisma:generate && npm --prefix backend run build',
  'check:frontend': 'npm --prefix frontend run build',
};

for (const [scriptName, scriptValue] of Object.entries(expectedRootScripts)) {
  assert(rootPkg.scripts?.[scriptName] === scriptValue, `root ${scriptName} script must be ${scriptValue}`);
}

for (const requiredScript of ['check:quality', 'check:trust', 'check:proof', 'check:v1']) {
  assert(typeof rootPkg.scripts?.[requiredScript] === 'string', `root ${requiredScript} script is required`);
}

assert(
  rootPkg.scripts['check:v1'] === 'npm run check:docs && npm run check:quality && npm run check:backend && npm run check:frontend && npm run check:trust && npm run check:proof',
  'root check:v1 must run docs, quality, backend, frontend, trust, and proof gates in the approved order'
);
assert(rootPkg.scripts['check:quality'].includes('check-ci-hardening.cjs'), 'root check:quality must include the CI/deployment hardening check');
assert(rootPkg.scripts['check:trust'].includes('selftest:services'), 'root check:trust must include backend service selftests');
assert(rootPkg.scripts['check:trust'].includes('selftest:scenario'), 'root check:trust must include scenario execution selftests');
assert(rootPkg.scripts['check:trust'].includes('selftest:proof'), 'root check:trust must include proof selftests');
assert(rootPkg.scripts['check:proof'].includes('check-final-proof-scenario-execution.cjs'), 'root check:proof must include final proof execution guard');
assert(rootPkg.scripts['check:proof'].includes('check-api-service-database-integration-proof.cjs'), 'root check:proof must include integration proof guard');

for (const requiredBackendScript of ['selftest:domain', 'selftest:services', 'selftest:scenario', 'selftest:proof', 'selftest:all']) {
  assert(typeof backendPkg.scripts?.[requiredBackendScript] === 'string', `backend ${requiredBackendScript} script is required`);
}
assert(backendPkg.scripts['selftest:scenario'].includes('selftest:scenario-matrix'), 'backend scenario group must execute the scenario matrix');
assert(backendPkg.scripts['selftest:proof'].includes('selftest:final-proof'), 'backend proof group must execute final proof');
assert(backendPkg.scripts['selftest:all'].includes('selftest:domain'), 'backend selftest:all must include domain group');
assert(backendPkg.scripts['selftest:all'].includes('selftest:services'), 'backend selftest:all must include service group');
assert(backendPkg.scripts['selftest:all'].includes('selftest:integration-proof'), 'backend selftest:all must include integration proof group');

assert(exists('package-lock.json'), 'root package-lock.json is required so CI can run npm ci at the root');
assert(exists('.github/workflows/v1-ci.yml'), 'GitHub Actions workflow .github/workflows/v1-ci.yml is required');
const workflow = readText('.github/workflows/v1-ci.yml');
for (const requiredSnippet of [
  'node-version: 20.12.2',
  'package-lock.json',
  'backend/package-lock.json',
  'frontend/package-lock.json',
  'npm run prisma:generate',
  'npm run prisma:migrate:deploy',
  'npm run check:backend',
  'npm run check:frontend',
  'npm run check:quality',
  'npm run check:trust',
  'npm run check:proof',
  'npm run check:v1',
  'docker build -t subnetops-backend-ci ./backend',
  'docker build -t subnetops-frontend-ci ./frontend',
]) {
  assert(workflow.includes(requiredSnippet), `CI workflow is missing required command: ${requiredSnippet}`);
}

assertOrder(
  workflow,
  [
    'actions/checkout@v4',
    'actions/setup-node@v4',
    'Install root dependencies',
    'Install backend dependencies',
    'Install frontend dependencies',
    'Generate Prisma client',
    'Apply database migrations',
    'Run backend checks',
    'Run frontend checks',
    'Run root quality checks',
    'Run root trust checks',
    'Run root proof checks',
    'Run final V1 gate',
  ],
  'CI workflow'
);

const firstFinalGate = workflow.indexOf('npm run check:v1');
const backendInstall = workflow.indexOf('Install backend dependencies');
const frontendInstall = workflow.indexOf('Install frontend dependencies');
assert(backendInstall !== -1 && firstFinalGate > backendInstall, 'CI must not run check:v1 before backend dependencies are installed');
assert(frontendInstall !== -1 && firstFinalGate > frontendInstall, 'CI must not run check:v1 before frontend dependencies are installed');
assert(has(workflow, /postgres:16-alpine/), 'CI workflow must include a Postgres service for migration/selftest coverage');
assert(!has(workflow, /prisma\s+db\s+push/), 'CI workflow must not use prisma db push');

const render = readText('render.yaml');
assert(has(render, /buildCommand:\s*npm ci --include=dev --no-audit --no-fund && npm run prisma:generate && npm run build/), 'Render backend buildCommand must install, generate Prisma client, and build');
assert(has(render, /startCommand:\s*sh \.[/]entrypoint[.]sh/), 'Render backend must start through backend/entrypoint.sh');
assert(has(render, /healthCheckPath:\s*\/api\/health\/ready/), 'Render backend should use the readiness health check');
assert(!has(render, /prisma\s+db\s+push/), 'Render config must not run prisma db push');
assert(has(render, /key:\s*PRISMA_SYNC_STRATEGY[\s\S]*?value:\s*migrate/), 'Render config must set PRISMA_SYNC_STRATEGY=migrate');
assert(has(render, /key:\s*ALLOW_UNSAFE_DB_PUSH[\s\S]*?value:\s*"false"/), 'Render config must explicitly refuse unsafe db push');

const entrypoint = readText('backend/entrypoint.sh');
assert(has(entrypoint, /prisma\s+migrate\s+deploy/), 'backend entrypoint must run prisma migrate deploy');
assert(has(entrypoint, /ALLOW_UNSAFE_DB_PUSH/), 'backend entrypoint must gate unsafe db push behind ALLOW_UNSAFE_DB_PUSH');
assert(!has(entrypoint, /npm\s+run\s+build/), 'backend entrypoint must not build production code at runtime');
assert(has(entrypoint, /dist\/server[.]js/), 'backend entrypoint must verify the built server artifact exists');
assert(has(entrypoint, /PRISMA_GENERATE_ON_BOOT/), 'backend entrypoint must make runtime Prisma generation explicit and opt-in');

const backendDockerfile = readText('backend/Dockerfile');
assert(has(backendDockerfile, /FROM node:20-alpine AS builder/), 'backend Dockerfile must use a build stage');
assert(has(backendDockerfile, /npm run prisma:generate/), 'backend Dockerfile must generate Prisma client at build time');
assert(has(backendDockerfile, /npm run build/), 'backend Dockerfile must build at image build time');
assert(has(backendDockerfile, /COPY --from=builder \/app\/node_modules \.\/node_modules/), 'backend Dockerfile must copy built dependencies into the runtime image');
assert(!has(backendDockerfile, /prisma\s+db\s+push/), 'backend Dockerfile must not run prisma db push');

const composeProd = readText('docker-compose.prod.yml');
assert(has(composeProd, /\.\/backend\/\.env\.production/), 'production compose must use backend/.env.production');
assert(!has(composeProd, /\.env\.production\.example/), 'production compose must not use an example env file');
assert(!has(composeProd, /DB_PUSH_ON_BOOT:\s*["']?true/), 'production compose must not enable DB_PUSH_ON_BOOT');
assert(!has(composeProd, /PRISMA_SYNC_STRATEGY:\s*["']?push/), 'production compose must not use Prisma push strategy');

const backendProductionEnvExample = readText('backend/.env.production.example');
assert(has(backendProductionEnvExample, /PRISMA_SYNC_STRATEGY=migrate/), 'production env example must use migrate strategy');
assert(has(backendProductionEnvExample, /PRISMA_BASELINE_EXISTING_DB=false/), 'production env example must not leave brownfield baselining enabled');
assert(has(backendProductionEnvExample, /ALLOW_UNSAFE_DB_PUSH=false/), 'production env example must refuse unsafe db push');
assert(has(backendProductionEnvExample, /DB_PUSH_ON_BOOT=false/), 'production env example must disable legacy db push');
assert(!has(backendProductionEnvExample, /JWT_SECRET=change-this-in-production/), 'production env example must not reuse the weak development JWT secret');

console.log('V1 CI/deployment check passed.');
