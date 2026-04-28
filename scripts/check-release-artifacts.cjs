#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const archiveSelf = process.argv.includes('--archive-self');

const failures = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function isExecutable(rel) {
  const mode = fs.statSync(path.join(root, rel)).mode;
  return Boolean(mode & 0o111);
}

function walk(dirRel, callback) {
  const abs = path.join(root, dirRel);
  if (!fs.existsSync(abs)) return;
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(dirRel, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      callback(rel, true);
      walk(rel, callback);
    } else {
      callback(rel, false);
    }
  }
}

for (const rel of ['backend/dist', 'frontend/dist', 'backend/node_modules', 'frontend/node_modules', 'node_modules']) {
  if (exists(rel)) fail(`Generated artifact must not be committed or packaged: ${rel}`);
}

for (const rel of ['backend/package-lock.json', 'frontend/package-lock.json']) {
  if (!exists(rel)) fail(`Missing reproducible dependency lockfile: ${rel}`);
}

for (const rel of [
  'scripts/clean-generated-artifacts.sh',
  'scripts/final-preflight.sh',
  'scripts/verify-build.sh',
  'scripts/assert-release-discipline.sh',
  'scripts/check-release-artifacts.cjs',
  'backend/entrypoint.sh'
]) {
  if (!exists(rel)) {
    fail(`Missing required release script: ${rel}`);
  }
}

for (const rel of ['scripts/clean-generated-artifacts.sh', 'scripts/final-preflight.sh', 'scripts/verify-build.sh', 'scripts/assert-release-discipline.sh', 'backend/entrypoint.sh']) {
  if (exists(rel) && !isExecutable(rel)) fail(`Script is not executable in source package: ${rel}`);
}

if (exists('render.yaml')) {
  const render = read('render.yaml');
  if (/startCommand:\s*\.\/entrypoint\.sh/.test(render)) {
    fail('render.yaml uses ./entrypoint.sh directly. Use sh ./entrypoint.sh so Render does not depend on zip executable-bit preservation.');
  }
  if (!/startCommand:\s*sh\s+\.\/entrypoint\.sh/.test(render)) {
    warn('render.yaml does not clearly use startCommand: sh ./entrypoint.sh for the backend service.');
  }
} else {
  fail('Missing render.yaml');
}

if (exists('README.md')) {
  const readme = read('README.md');
  if (!readme.includes('Phase 31')) warn('README does not mention Phase 31 release integrity status.');
  if (readme.includes('./scripts/verify-build.sh') && !readme.includes('bash scripts/verify-build.sh')) {
    warn('README still has executable-bit-dependent verification examples. Prefer bash scripts/verify-build.sh.');
  }
}

walk('.', (rel, isDir) => {
  if (rel.includes('/.git/')) return;
  if (isDir && /(^|\/)(dist|node_modules)$/.test(rel)) {
    fail(`Generated directory present in source tree: ${rel}`);
  }
  if (!isDir && /\.tsbuildinfo$/.test(rel)) {
    fail(`Generated TypeScript build-info artifact present: ${rel}`);
  }
});

if (archiveSelf) {
  try {
    const output = execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim();
    if (output) warn('Git working tree is not clean. Review changes before packaging.');
  } catch {
    warn('Git status unavailable; archive-self ran outside a git checkout.');
  }
}

if (warnings.length) {
  console.log('Release artifact warnings:');
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (failures.length) {
  console.error('Release artifact check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Release artifact check passed.');

process.exit(0);
