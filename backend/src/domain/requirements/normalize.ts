import type { RequirementsInput } from "./types.js";

export function asString(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function asNumber(value: unknown, fallback: number, min = 0, max = 10_000) {
  const raw = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

export function asBoolean(value: unknown) {
  return value === true || String(value).toLowerCase() === "true";
}

export function isNotApplicable(value: unknown) {
  return asString(value).toLowerCase().includes("not applicable");
}

export function hasText(value: unknown) {
  return Boolean(asString(value)) && !isNotApplicable(value);
}

export function normalizeToken(value: string, fallback: string) {
  const token = value.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8);
  return token || fallback;
}

export function joinNotes(notes: string[]) {
  return notes.filter(Boolean).join("\n").slice(0, 1800);
}

export function mergeNotes(existing: string | null | undefined, next: string) {
  if (!existing) return next;
  if (existing.includes(next.slice(0, 80))) return existing;
  return `${existing}\n${next}`.slice(0, 2000);
}

export function textIncludes(value: string | null | undefined, fragment: string) {
  return Boolean(value && value.toLowerCase().includes(fragment.toLowerCase()));
}

export function parseRequirementsJson(requirementsJson?: string | null): RequirementsInput | null {
  if (!requirementsJson) return null;
  try {
    const parsed = JSON.parse(requirementsJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as RequirementsInput;
  } catch {
    return null;
  }
}
