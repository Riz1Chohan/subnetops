#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error('Usage: node scripts/check-relative-imports.cjs <dir> [dir...]');
  process.exit(2);
}

const missing = [];

function existsAsModule(basePath) {
  const normalizedBases = basePath.endsWith('.js') ? [basePath.slice(0, -3), basePath] : [basePath];
  const candidates = [];
  for (const base of normalizedBases) {
    candidates.push(
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}.jsx`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
      path.join(base, 'index.js'),
      path.join(base, 'index.jsx')
    );
  }
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function checkFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const importPattern = /(?:from\s+|import\s*\()(['"])(\.[^'"]+)\1/g;
  let match;
  while ((match = importPattern.exec(source))) {
    const importPath = match[2];
    if (/\.(css|png|svg|jpg|jpeg|webp|gif|ico)$/.test(importPath)) continue;
    const resolvedBase = path.normalize(path.join(path.dirname(filePath), importPath));
    if (!existsAsModule(resolvedBase)) {
      missing.push(`${filePath} -> ${importPath}`);
    }
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (/\.(ts|tsx)$/.test(entry.name)) checkFile(fullPath);
  }
}

for (const root of roots) {
  if (!fs.existsSync(root)) {
    console.error(`Missing root: ${root}`);
    process.exit(2);
  }
  walk(root);
}

if (missing.length) {
  console.error('Missing relative imports:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Relative import check passed.');
