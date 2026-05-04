import type {
  ValidationCategory,
  ValidationEvidenceRef,
  ValidationFinding,
  ValidationFindingInput,
  ValidationSeverity,
  ValidationStatus,
} from './types.js';

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function normalizeValidationSeverity(value: unknown): ValidationSeverity {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['critical', 'blocker', 'blocking', 'blocked', 'error', 'fatal'].includes(normalized)) return 'critical';
  if (['high', 'review_required', 'review', 'major', 'needs_review'].includes(normalized)) return 'high';
  if (['medium', 'warning', 'warn', 'partial'].includes(normalized)) return 'medium';
  if (['low', 'minor'].includes(normalized)) return 'low';
  return 'info';
}

export function normalizeValidationStatus(value: unknown): ValidationStatus {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['resolved', 'closed', 'fixed', 'passed'].includes(normalized)) return 'resolved';
  if (['accepted_risk', 'accepted-risk', 'risk_accepted', 'waived', 'exception'].includes(normalized)) return 'accepted_risk';
  return 'open';
}

export function normalizeValidationCategory(value: unknown): ValidationCategory {
  const text = cleanText(value);
  const normalized = text.toLowerCase().replace(/[\s_-]+/g, ' ');
  const known: Record<string, ValidationCategory> = {
    requirements: 'Requirements',
    requirement: 'Requirements',
    addressing: 'Addressing',
    cidr: 'Addressing',
    ipam: 'IPAM',
    topology: 'Topology',
    routing: 'Routing',
    route: 'Routing',
    security: 'Security',
    'security policy': 'Security',
    implementation: 'Implementation',
    reporting: 'Reporting',
    report: 'Reporting',
    diagram: 'Diagram',
    platform: 'Platform',
    discovery: 'Discovery',
    validation: 'Validation',
    project: 'Project',
  };
  return known[normalized] ?? (text || 'Validation');
}


function stableHash(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x01000193;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193) >>> 0;
    second ^= code + index;
    second = Math.imul(second, 0x811c9dc5) >>> 0;
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
}

export function buildValidationFindingId(input: {
  ruleCode?: string;
  severity?: unknown;
  status?: unknown;
  category?: unknown;
  title?: string;
  detail?: string;
  sourcePath?: string;
  affectedObjects?: string[];
  evidence?: ValidationEvidenceRef[];
}): string {
  const seed = stableStringify({
    ruleCode: cleanText(input.ruleCode).toUpperCase(),
    severity: normalizeValidationSeverity(input.severity),
    status: normalizeValidationStatus(input.status),
    category: normalizeValidationCategory(input.category),
    title: cleanText(input.title),
    detail: cleanText(input.detail),
    sourcePath: cleanText(input.sourcePath),
    affectedObjects: [...(input.affectedObjects ?? [])].sort(),
    evidence: input.evidence ?? [],
  });
  const hash = stableHash(seed);
  const code = cleanText(input.ruleCode).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'finding';
  return `validation-${code}-${hash}`;
}

export function normalizeValidationFinding(input: ValidationFindingInput): ValidationFinding {
  const severity = normalizeValidationSeverity(input.severity);
  const status = normalizeValidationStatus(input.status);
  const category = normalizeValidationCategory(input.category);
  const affectedObjects = Array.from(new Set((input.affectedObjects ?? []).filter(Boolean))).sort();
  const evidence = (input.evidence ?? []).filter((item) => cleanText(item.source) || cleanText(item.detail));
  const base = {
    ruleCode: input.ruleCode,
    severity,
    status,
    category,
    title: cleanText(input.title),
    detail: cleanText(input.detail),
    affectedObjects,
    evidence,
    recommendedAction: input.recommendedAction ? cleanText(input.recommendedAction) : undefined,
    createdAt: input.createdAt,
    resolvedAt: input.resolvedAt,
    acceptedRiskBy: input.acceptedRiskBy,
    sourcePath: input.sourcePath ? cleanText(input.sourcePath) : undefined,
  };
  return {
    id: input.id || buildValidationFindingId(base),
    ...base,
  };
}

export function buildValidationFinding(input: ValidationFindingInput): ValidationFinding {
  return normalizeValidationFinding(input);
}

export function evidenceFromStrings(source: string, values: string[]): ValidationEvidenceRef[] {
  return values.filter((item) => item.trim().length > 0).map((detail) => ({ source, detail }));
}
