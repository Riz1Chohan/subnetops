#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[phase0] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = process.cwd();
const inventoryPath = path.join(root, 'backend/src/lib/phase0EngineInventory.ts');
const docPath = path.join(root, 'docs/doc/PHASE0-ENGINE-INVENTORY-PROPAGATION-CONTRACT.md');
const packagePath = path.join(root, 'package.json');

assert(fs.existsSync(inventoryPath), 'phase0 engine inventory source file missing');
assert(fs.existsSync(docPath), 'phase0 control document missing');

const inventory = fs.readFileSync(inventoryPath, 'utf8');
const doc = fs.readFileSync(docPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

assert(inventory.includes('PHASE0_ENGINE_INVENTORY'), 'inventory export missing');
assert(inventory.includes('PHASE0_PROPAGATION_CONTRACT'), 'propagation contract export missing');
assert(inventory.includes('PHASE0_REQUIREMENT_FIELD_GROUPS'), 'requirement field groups export missing');
assert(inventory.includes('PHASE0_ENGINE_INVENTORY_EXPECTED_PHASES = 19'), 'expected 19 engine rows marker missing');
assert(inventory.includes('validatePhase0EngineInventory'), 'inventory validator export missing');

const rowMatches = [...inventory.matchAll(/phase:\s*(\d+)/g)].map((match) => Number(match[1]));
assert(rowMatches.length === 19, `expected 19 inventory rows, found ${rowMatches.length}`);
for (let phase = 1; phase <= 19; phase += 1) {
  assert(rowMatches.includes(phase), `missing phase ${phase} inventory row`);
}

const requiredEngineNames = [
  'Planning input discipline / traceability',
  'Requirements materialization',
  'Requirements impact / closure / scenario proof',
  'Engine 1 CIDR/addressing',
  'Engine 2 enterprise IPAM',
  'Design-core orchestrator',
  'Standards alignment / rulebook',
  'Validation/readiness',
  'Network object model',
  'Design graph',
  'Routing and segmentation',
  'Security policy flow',
  'Implementation planning',
  'Vendor-neutral implementation templates',
  'Report/export truth',
  'Diagram truth / renderer / layout',
  'Platform/BOM foundation',
  'Discovery/current-state',
  'AI draft/helper',
];
for (const name of requiredEngineNames) assert(inventory.includes(name), `missing inventory engine: ${name}`);

const contractSteps = [
  'Requirement input',
  'normalized requirement signal',
  'materialized source object OR explicit no-op/review reason',
  'backend design-core input',
  'engine-specific computation',
  'traceability evidence',
  'validation/readiness impact',
  'frontend display',
  'report/export impact',
  'diagram impact where relevant',
  'test/golden scenario proof',
];
for (const step of contractSteps) {
  assert(inventory.includes(step), `inventory missing contract step: ${step}`);
  assert(doc.includes(step), `doc missing contract step: ${step}`);
}

const requiredColumns = [
  'Engine name',
  'Inputs',
  'Outputs',
  'Consumers',
  'Source-of-truth level',
  'Requirement fields consumed',
  'Frontend pages using it',
  'Report/export sections using it',
  'Diagram sections using it',
  'Validation/readiness impact',
  'Tests/selftests proving it',
];
for (const column of requiredColumns) assert(doc.includes(column), `doc missing control-sheet column: ${column}`);

assert(doc.includes('Do not add new features in Phase 0'), 'phase0 boundary missing');
assert(doc.includes('No ghost outputs'), 'no ghost outputs rule missing');
assert(doc.includes('No frontend-only engineering facts'), 'frontend authority rule missing');
assert(doc.includes('No computed-but-unused fields'), 'computed-but-unused rule missing');
assert(doc.includes('No fake confidence'), 'fake confidence rule missing');
assert(doc.includes('No default survey value pretending to be user intent'), 'default survey intent rule missing');
assert(doc.includes('No report saying something the backend cannot prove'), 'report truth rule missing');
assert(pkg.scripts && pkg.scripts['check:phase0-engine-inventory'] === 'node scripts/check-phase0-engine-inventory.cjs', 'root package script check:phase0-engine-inventory missing');

console.log('[phase0] engine inventory and propagation contract checks passed');
