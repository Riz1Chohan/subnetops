#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const allowed = new Set(['README.md']);
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage']);
const markdownFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    if (/\.md$/i.test(entry.name)) {
      markdownFiles.push(path.relative(root, path.join(dir, entry.name)).replace(/\\/g, '/'));
    }
  }
}

walk(root);
const extra = markdownFiles.filter((file) => !allowed.has(file));
if (extra.length > 0) {
  console.error('README-only documentation check failed. Move this content into README.md and delete the standalone Markdown file(s):');
  for (const file of extra) console.error(`- ${file}`);
  process.exit(1);
}
if (!markdownFiles.includes('README.md')) {
  console.error('README-only documentation check failed. README.md is required.');
  process.exit(1);
}
console.log('README-only documentation check passed.');
