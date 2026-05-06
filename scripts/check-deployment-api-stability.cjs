#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) { console.error(`[deployment-api-stability] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const frontendApi = read('frontend/src/lib/api.ts');
assert(frontendApi.includes('VITE_API_BASE_URL is required for production builds'), 'frontend API client must fail clearly when production API base is missing');
assert(frontendApi.includes('!import.meta.env.PROD') && frontendApi.includes('http://localhost:4000/api'), 'frontend API client may use localhost fallback only outside production');
assert(!frontendApi.includes('inferHostedApiBase'), 'frontend API client must not infer hosted API base from hostnames');
assert(!frontendApi.includes('hostname.replace'), 'frontend API client must not rewrite frontend hostnames into backend hostnames');
assert(!/return\s+["']\/api["']/.test(frontendApi), 'frontend API client must not silently fall back to /api');

const viteConfig = read('frontend/vite.config.ts');
assert(viteConfig.includes('loadEnv'), 'Vite config must load build-time environment');
assert(viteConfig.includes('command === "build"') && viteConfig.includes('mode === "production"'), 'Vite config must target production builds');
assert(viteConfig.includes('VITE_API_BASE_URL is required for production builds'), 'Vite production build must fail with a clear VITE_API_BASE_URL message');

const frontendDockerfile = read('frontend/Dockerfile');
assert(frontendDockerfile.includes('ARG VITE_API_BASE_URL'), 'frontend Dockerfile must define VITE_API_BASE_URL build argument');
assert(frontendDockerfile.includes('test -n "$VITE_API_BASE_URL"'), 'frontend Dockerfile must fail when VITE_API_BASE_URL build argument is empty');
assert(!frontendDockerfile.includes('ARG VITE_API_BASE_URL=/api'), 'frontend Dockerfile must not hide missing API config behind a default /api value');

const envProductionExample = read('frontend/.env.production.example');
assert(envProductionExample.includes('VITE_API_BASE_URL=https://subnetops-backend.onrender.com/api'), 'frontend production env example must use explicit backend API URL');
assert(!/^VITE_API_BASE_URL=\/api\s*$/m.test(envProductionExample), 'frontend production env example must not recommend /api for Render/static hosting');

const backendEnv = read('backend/src/config/env.ts');
assert(backendEnv.includes('requiredInProduction("CORS_ORIGIN"'), 'backend env must require CORS_ORIGIN in production');
assert(backendEnv.includes('requiredInProduction("FRONTEND_APP_URL"'), 'backend env must require FRONTEND_APP_URL in production');
assert(backendEnv.includes('deploymentConfigReady'), 'backend env must expose deployment configuration readiness');
assert(!backendEnv.includes('https://subnetops-frontend.onrender.com",\n  ])'), 'backend env must not silently default production CORS to a guessed hosted origin');

const backendApp = read('backend/src/app.ts');
assert(backendApp.includes('/api/health/ready'), 'backend must expose readiness health endpoint');
assert(backendApp.includes('checks: { database: "ok", deploymentConfig: "ok" }'), 'readiness endpoint must include database and deployment-config checks');
assert(backendApp.includes('deploymentConfig: env.deploymentConfigReady'), 'health endpoint must surface deployment configuration readiness');

const render = read('render.yaml');
for (const token of ['healthCheckPath: /api/health/ready', 'CORS_ORIGIN', 'FRONTEND_APP_URL', 'VITE_API_BASE_URL']) {
  assert(render.includes(token), `render.yaml must include ${token}`);
}
assert(/key:\s*CORS_ORIGIN[\s\S]*?sync:\s*false/.test(render), 'render.yaml must require explicit backend CORS_ORIGIN');
assert(/key:\s*FRONTEND_APP_URL[\s\S]*?sync:\s*false/.test(render), 'render.yaml must require explicit backend FRONTEND_APP_URL');
assert(/key:\s*VITE_API_BASE_URL[\s\S]*?sync:\s*false/.test(render), 'render.yaml must require explicit frontend VITE_API_BASE_URL');

const packageJson = JSON.parse(read('package.json'));
assert(String(packageJson.scripts['check:quality'] || '').includes('check-deployment-api-stability.cjs'), 'check:quality must include deployment/API stability guard');
const regression = read('scripts/check-regression-kill-switches.cjs');
assert(regression.includes('check-deployment-api-stability.cjs'), 'regression kill-switches must include deployment/API stability guard');

const readme = read('README.md');
assert(readme.includes('Deployment/API stability hardening'), 'README must document deployment/API stability hardening');
assert(readme.includes('check-deployment-api-stability.cjs'), 'README must document the deployment/API stability guard');
assert(readme.includes('production frontend must not infer hostnames or silently fall back to /api'), 'README must state the production API-base rule');

console.log('[deployment-api-stability] ok');
