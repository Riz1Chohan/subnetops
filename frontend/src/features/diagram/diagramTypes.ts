export type DiagramMode = "logical" | "physical";
export type DiagramDensity = "guided" | "expanded";
export type DiagramLabelMode = "essential" | "detailed";
export type LinkAnnotationMode = "minimal" | "full";
export type OverlayMode = "none" | "addressing" | "security" | "flows" | "services" | "redundancy";
export type ActiveOverlayMode = Exclude<OverlayMode, "none">;
export type DiagramReviewPresetKey = "architecture" | "site-lld" | "transport" | "boundaries" | "services" | "critical-flows";
export type DiagramScope = "global" | "site" | "wan-cloud" | "boundaries";
export type DeviceFocus = "all" | "edge" | "switching" | "wireless" | "services";
export type LinkFocus = "all" | "transport" | "access" | "security" | "flows";
export type LabelFocus = "all" | "topology" | "addressing" | "zones" | "transport" | "flows";

export type DiagramBaselineState = {
  scope: DiagramScope;
  overlay: OverlayMode;
  density: DiagramDensity;
  labelMode: DiagramLabelMode;
  linkAnnotationMode: LinkAnnotationMode;
  labelFocus: LabelFocus;
  deviceFocus: DeviceFocus;
  linkFocus: LinkFocus;
};

export type DiagramReviewPreset = {
  key: DiagramReviewPresetKey;
  label: string;
  detail: string;
  mode: DiagramMode;
  scope: DiagramScope;
  overlay: OverlayMode;
  density: DiagramDensity;
  labelMode: DiagramLabelMode;
  linkAnnotationMode: LinkAnnotationMode;
  labelFocus: LabelFocus;
  deviceFocus: DeviceFocus;
  linkFocus: LinkFocus;
  focusedSiteId?: string;
};
