import type { Project } from "./types";
import type { SynthesizedLogicalDesign } from "./designSynthesis.types";
import { buildBackendOnlyDisplayDesign } from "./backendDesignDisplayModel";
import { applyDesignCoreSnapshotToDisplayDesign } from "./designCoreAdapter";

export * from "./designSynthesis.types";
export { applyDesignCoreSnapshotToDisplayDesign, buildBackendOnlyDisplayDesign };

/**
 * Compatibility facade for older repository copies that still include/import
 * designSynthesis.ts. This is deliberately not a browser-side planning engine.
 * It returns the same empty backend-only display shell used elsewhere, so stale
 * frontend synthesis cannot regenerate topology, addressing, routes, security,
 * or implementation truth.
 */
export function synthesizeLogicalDesign(project?: Project | null): SynthesizedLogicalDesign {
  return buildBackendOnlyDisplayDesign(project);
}

export function buildSynthesizedLogicalDesign(project?: Project | null): SynthesizedLogicalDesign {
  return buildBackendOnlyDisplayDesign(project);
}

export function buildDesignSynthesis(project?: Project | null): SynthesizedLogicalDesign {
  return buildBackendOnlyDisplayDesign(project);
}

export function buildLogicalDesign(project?: Project | null): SynthesizedLogicalDesign {
  return buildBackendOnlyDisplayDesign(project);
}
