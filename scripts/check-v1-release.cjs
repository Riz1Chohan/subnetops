#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const fail = (message) => {
  console.error(`V1 release check failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
};

const milestone = 'ph' + 'ase';
const numberedMilestonePattern = new RegExp(`\\b${milestone}\\s*[-_]?\\s*\\d+|\\b${milestone}\\d+`, 'i');
const oldHighVPattern = /\bv(?:[2-9]\d|\d{3,})\b/i;
const oldProductReleasePattern = /\b0\.(?:8[0-9]|9[0-9]|1[0-9]{2})\.0\b/;

const rootPkg = readJson('package.json');
const backendPkg = readJson('backend/package.json');
const frontendPkg = readJson('frontend/package.json');
assert(rootPkg.version === '1.0.0', 'root package must be version 1.0.0');
assert(backendPkg.version === '1.0.0', 'backend package must be version 1.0.0');
assert(frontendPkg.version === '1.0.0', 'frontend package must be version 1.0.0');

const allFiles = walk(root);
const markdownFiles = allFiles.filter((file) => /\.md$/i.test(file));
const extraMarkdown = markdownFiles.filter((file) => path.relative(root, file).replace(/\\/g, '/') !== 'README.md');
assert(
  extraMarkdown.length === 0,
  'README.md must be the only Markdown documentation file'
);

const ignoredContentFiles = new Set([
  path.join(root, 'package-lock.json'),
  path.join(root, 'backend', 'package-lock.json'),
  path.join(root, 'frontend', 'package-lock.json'),
]);

for (const file of allFiles) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  assert(!numberedMilestonePattern.test(relative), `file path leaks old internal milestone label: ${relative}`);
  assert(!oldHighVPattern.test(relative), `file path leaks old high-numbered v label: ${relative}`);
  if (ignoredContentFiles.has(file)) continue;
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');
  assert(!numberedMilestonePattern.test(text), `${relative} leaks old numbered internal milestone label`);
  assert(!oldHighVPattern.test(text), `${relative} leaks old high-numbered v label`);
  assert(!oldProductReleasePattern.test(text), `${relative} leaks old 0.x product release label`);
}

const render = readText('render.yaml');
assert(!/prisma\s+db\s+push/.test(render), 'render.yaml must not run unsafe Prisma schema push in production');

function extractBackendStartCommand(renderYaml) {
  const backendService = renderYaml.match(/name:\s*subnetops-backend[\s\S]*?(?=\n\s*-\s*type:\s*web|\ndatabases:|$)/);
  if (!backendService) return null;
  const startCommand = backendService[0].match(/^\s*startCommand:\s*(.+)$/m);
  return startCommand ? startCommand[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function commandScriptPath(command) {
  if (!command) return null;
  const match = command.match(/(?:^|\s)(?:sh\s+)?\.\/(entrypoint\.sh)\b/);
  return match ? path.join('backend', match[1]) : null;
}

const backendStartCommand = extractBackendStartCommand(render);
const delegatedScript = commandScriptPath(backendStartCommand);
const productionStartupText = delegatedScript ? readText(delegatedScript) : render;
const productionStartupTarget = delegatedScript || 'render.yaml';

assert(
  /prisma\s+migrate\s+deploy/.test(productionStartupText),
  `${productionStartupTarget} must run Prisma migrations in production`
);

console.log('V1 release check passed.');
