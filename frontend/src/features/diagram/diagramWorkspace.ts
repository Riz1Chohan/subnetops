import type {
  ActiveOverlayMode,
  DeviceFocus,
  DiagramBaselineState,
  DiagramLabelMode,
  DiagramMode,
  DiagramReviewPreset,
  DiagramReviewPresetKey,
  DiagramScope,
  LabelFocus,
  LinkAnnotationMode,
  LinkFocus,
  OverlayMode,
} from "./diagramTypes";

export const scopeItems: Array<{ key: DiagramScope; label: string }> = [
  { key: "global", label: "Global" },
  { key: "site", label: "Per-site" },
  { key: "wan-cloud", label: "WAN / Cloud" },
  { key: "boundaries", label: "Security / Boundaries" },
];

export const layerItems: Array<{ key: ActiveOverlayMode; label: string }> = [
  { key: "addressing", label: "IP addresses" },
  { key: "services", label: "Services" },
];

export const annotationItems = [
  { key: "labels", label: "Device labels" },
  { key: "links", label: "Ports / link notes" },
] as const;

export function deriveDeviceFocus(scope: DiagramScope, overlays: ActiveOverlayMode[]): DeviceFocus {
  if (scope === "wan-cloud" || scope === "boundaries") return "edge";
  if (overlays.includes("services")) return "services";
  return "all";
}

export function deriveLinkFocus(scope: DiagramScope): LinkFocus {
  if (scope === "wan-cloud") return "transport";
  if (scope === "boundaries") return "security";
  return "all";
}

export function deriveLabelFocus(scope: DiagramScope, overlays: ActiveOverlayMode[]): LabelFocus {
  if (overlays.includes("addressing")) return "addressing";
  if (scope === "boundaries") return "zones";
  if (scope === "wan-cloud") return "transport";
  return "topology";
}

export function buildDiagramReviewPresets(focusedSiteId?: string): DiagramReviewPreset[] {
  return [
    { key: "architecture", label: "Architecture review", detail: "Global placement baseline for edge, switching, and shared anchors.", mode: "logical", scope: "global", overlay: "none", density: "guided", labelMode: "essential", linkAnnotationMode: "minimal", labelFocus: "topology", deviceFocus: "all", linkFocus: "all" },
    { key: "site-lld", label: "Site LLD", detail: "Per-site review for local topology, labels, and service anchors.", mode: "physical", scope: "site", overlay: "addressing", density: "expanded", labelMode: "detailed", linkAnnotationMode: "full", labelFocus: "addressing", deviceFocus: "all", linkFocus: "access", focusedSiteId },
    { key: "transport", label: "Transport / WAN", detail: "WAN, cloud edge, and redundancy posture review.", mode: "logical", scope: "wan-cloud", overlay: "redundancy", density: "guided", labelMode: "essential", linkAnnotationMode: "full", labelFocus: "transport", deviceFocus: "edge", linkFocus: "transport" },
    { key: "boundaries", label: "Trust boundaries", detail: "Boundary and enforcement review across edge, DMZ, guest, and management zones.", mode: "logical", scope: "boundaries", overlay: "security", density: "guided", labelMode: "detailed", linkAnnotationMode: "full", labelFocus: "zones", deviceFocus: "edge", linkFocus: "security" },
    { key: "services", label: "Service placement", detail: "Local, centralized, DMZ, and cloud-hosted service anchoring.", mode: "logical", scope: "global", overlay: "services", density: "guided", labelMode: "essential", linkAnnotationMode: "minimal", labelFocus: "topology", deviceFocus: "services", linkFocus: "all" },
    { key: "critical-flows", label: "Critical flows", detail: "Trace critical movement and control points through the current design.", mode: "logical", scope: "wan-cloud", overlay: "flows", density: "expanded", labelMode: "essential", linkAnnotationMode: "full", labelFocus: "flows", deviceFocus: "all", linkFocus: "flows" },
  ];
}

export function baselineStateForMode(mode: DiagramMode): DiagramBaselineState {
  if (mode === "physical") {
    return {
      scope: "global",
      overlay: "none",
      density: "guided",
      labelMode: "essential",
      linkAnnotationMode: "minimal",
      labelFocus: "topology",
      deviceFocus: "all",
      linkFocus: "transport",
    };
  }

  return {
    scope: "global",
    overlay: "none",
    density: "guided",
    labelMode: "essential",
    linkAnnotationMode: "minimal",
    labelFocus: "topology",
    deviceFocus: "all",
    linkFocus: "all",
  };
}

export function viewDecisionSummary(mode: DiagramMode) {
  return mode === "logical"
    ? {
        title: "Logical view is locked as architecture-first",
        detail: "This mode now defaults to a clean architecture posture: global scope, placement baseline, essential labels, and no inherited physical-detail baggage. Use it to review site roles, boundaries, WAN posture, and service relationships.",
      }
    : {
        title: "Physical view is locked as summarized engineering topology",
        detail: "This mode now defaults to a real topology summary: infrastructure blocks, transport emphasis, quiet labels, and no carried-over logical overlays. Use it to inspect edge, switching, wireless, services, and branch attachment without fake over-detail.",
      };
}

export function activePresetKeyForState(mode: DiagramMode, scope: DiagramScope, overlay: OverlayMode): DiagramReviewPresetKey | undefined {
  if (mode === "logical" && scope === "global" && overlay === "none") return "architecture";
  if (mode === "physical" && scope === "site" && overlay === "addressing") return "site-lld";
  if (mode === "logical" && scope === "wan-cloud" && overlay === "redundancy") return "transport";
  if (mode === "logical" && scope === "boundaries" && overlay === "security") return "boundaries";
  if (mode === "logical" && scope === "global" && overlay === "services") return "services";
  if (mode === "logical" && scope === "wan-cloud" && overlay === "flows") return "critical-flows";
  return undefined;
}
