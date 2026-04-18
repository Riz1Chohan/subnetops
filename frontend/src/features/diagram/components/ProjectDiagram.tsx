import { useMemo, useState } from "react";
import { synthesizeLogicalDesign } from "../../../lib/designSynthesis";
import { parseRequirementsProfile } from "../../../lib/requirementsProfile";
import type { ProjectComment, ProjectDetail, ValidationResult, Vlan } from "../../../lib/types";
import {
  activePresetKeyForState,
  baselineStateForMode,
  buildDiagramReviewPresets,
  viewDecisionSummary,
  type ActiveOverlayMode,
  type DeviceFocus,
  type DiagramDensity,
  type DiagramLabelMode,
  type DiagramMode,
  type DiagramReviewPresetKey,
  type DiagramScope,
  type LabelFocus,
  type LinkAnnotationMode,
  type LinkFocus,
  type OverlayMode,
  type SiteWithVlans,
  diagramScopeMeta,
  deviceFocusTitle,
  flowsForDiagramScope,
  labelFocusTitle,
  linkFocusTitle,
  siteIdsWithBoundaries,
  sitesForDiagramScope,
  topologyScopeBehaviorSummary,
} from "..";
import { LogicalTopologyDiagram } from "./LogicalTopologyDiagram";
import { PhysicalTopologyDiagram } from "./PhysicalTopologyDiagram";
import {
  OverlayBehaviorPanel,
  SiteDeviceLinkMatrixPanel,
  SupportArchitectureSignals,
  SupportConnectionSemanticsPanel,
  SupportCrossCheckPanels,
  SupportDeviceRealismDirectionPanel,
  SupportDeviceSymbolLibraryPanel,
  SupportDiagramReviewSequencePanel,
  SupportFlowSummaryPanel,
  SupportLabelFocusPanel,
  SupportLegend,
  SupportLinkTypeRenderingPanel,
  SupportOverlayEvidencePanel,
  SupportOverlayReviewPanel,
  SupportTopologyBehaviorMatrixPanel,
  SupportTopologyPostureLedgerPanel,
  TopologyFoundationPanel,
  TopologyObjectPanel,
  TopologySpecificRenderingPanel,
} from "./DiagramSupportPanels";

interface ProjectDiagramProps {
  project: ProjectDetail;
  comments?: ProjectComment[];
  validations?: ValidationResult[];
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
  compact?: boolean;
  minimalWorkspace?: boolean;
  controls?: Partial<{
    mode: DiagramMode;
    overlay: OverlayMode;
    activeOverlays: ActiveOverlayMode[];
    scope: DiagramScope;
    workspaceDensity: DiagramDensity;
    labelMode: DiagramLabelMode;
    linkAnnotationMode: LinkAnnotationMode;
    labelFocus: LabelFocus;
    deviceFocus: DeviceFocus;
    linkFocus: LinkFocus;
    focusedSiteId: string;
    bareCanvas: boolean;
  }>;
}

function getSvgElement(svgId: string) {
  return document.getElementById(svgId) as SVGSVGElement | null;
}

function exportSvg(svgId: string, filename: string) {
  const svg = getSvgElement(svgId);
  if (!svg) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportPng(svgId: string, filename: string) {
  const svg = getSvgElement(svgId);
  if (!svg) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not render SVG as image."));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.width || 1800;
  canvas.height = image.height || 1200;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(url);
    return;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const pngUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = pngUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProjectDiagram({ project, comments = [], validations = [], onSelectTarget, compact = false, minimalWorkspace = false, controls }: ProjectDiagramProps) {
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const svgId = `diagram-${project.id}`;
  const [internalMode, setInternalMode] = useState<DiagramMode>("logical");
  const [internalOverlay, setInternalOverlay] = useState<OverlayMode>("none");
  const [internalActiveOverlays] = useState<ActiveOverlayMode[]>([]);
  const [internalScope, setInternalScope] = useState<DiagramScope>("global");
  const [internalWorkspaceDensity, setInternalWorkspaceDensity] = useState<DiagramDensity>("guided");
  const [internalLabelMode, setInternalLabelMode] = useState<DiagramLabelMode>("essential");
  const [internalLinkAnnotationMode, setInternalLinkAnnotationMode] = useState<LinkAnnotationMode>("minimal");
  const [internalLabelFocus, setInternalLabelFocus] = useState<LabelFocus>("all");
  const [internalDeviceFocus, setInternalDeviceFocus] = useState<DeviceFocus>("all");
  const [internalLinkFocus, setInternalLinkFocus] = useState<LinkFocus>("all");
  const [internalFocusedSiteId, setInternalFocusedSiteId] = useState<string>(sites[0]?.id ?? "");
  const mode = controls?.mode ?? internalMode;
  const overlay = controls?.overlay ?? internalOverlay;
  const activeOverlays = controls?.activeOverlays ?? (overlay === "none" ? internalActiveOverlays : [overlay]);
  const scope = controls?.scope ?? internalScope;
  const workspaceDensity = controls?.workspaceDensity ?? internalWorkspaceDensity;
  const labelMode = controls?.labelMode ?? internalLabelMode;
  const linkAnnotationMode = controls?.linkAnnotationMode ?? internalLinkAnnotationMode;
  const labelFocus = controls?.labelFocus ?? internalLabelFocus;
  const deviceFocus = controls?.deviceFocus ?? internalDeviceFocus;
  const linkFocus = controls?.linkFocus ?? internalLinkFocus;
  const focusedSiteId = controls?.focusedSiteId ?? internalFocusedSiteId;
  const bareCanvas = controls?.bareCanvas ?? minimalWorkspace;
  const isExternallyControlled = Boolean(controls);
  const renderBareCanvas = isExternallyControlled || minimalWorkspace || bareCanvas || compact;
  const setMode = controls?.mode !== undefined ? (_next: DiagramMode) => {} : setInternalMode;
  const setOverlay = controls?.overlay !== undefined ? (_next: OverlayMode) => {} : setInternalOverlay;
  const setScope = controls?.scope !== undefined ? (_next: DiagramScope) => {} : setInternalScope;
  const setWorkspaceDensity = controls?.workspaceDensity !== undefined ? (_next: DiagramDensity) => {} : setInternalWorkspaceDensity;
  const setLabelMode = controls?.labelMode !== undefined ? (_next: DiagramLabelMode) => {} : setInternalLabelMode;
  const setLinkAnnotationMode = controls?.linkAnnotationMode !== undefined ? (_next: LinkAnnotationMode) => {} : setInternalLinkAnnotationMode;
  const setLabelFocus = controls?.labelFocus !== undefined ? (_next: LabelFocus) => {} : setInternalLabelFocus;
  const setDeviceFocus = controls?.deviceFocus !== undefined ? (_next: DeviceFocus) => {} : setInternalDeviceFocus;
  const setLinkFocus = controls?.linkFocus !== undefined ? (_next: LinkFocus) => {} : setInternalLinkFocus;
  const setFocusedSiteId = controls?.focusedSiteId !== undefined ? (_next: string) => {} : setInternalFocusedSiteId;
  const applyModeBaseline = (nextMode: DiagramMode) => {
    setMode(nextMode);
    const baseline = baselineStateForMode(nextMode);
    setScope(baseline.scope);
    setOverlay(baseline.overlay);
    setWorkspaceDensity(baseline.density);
    setLabelMode(baseline.labelMode);
    setLinkAnnotationMode(baseline.linkAnnotationMode);
    setLabelFocus(baseline.labelFocus);
    setDeviceFocus(baseline.deviceFocus);
    setLinkFocus(baseline.linkFocus);
  };
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const allVlans = sites.flatMap((site) => site.vlans ?? []);
  const synthesized = useMemo(() => synthesizeLogicalDesign(project, sites, allVlans, requirements), [project, sites, allVlans, requirements]);
  const scopedSites = useMemo(() => sitesForDiagramScope(sites, synthesized, scope, focusedSiteId), [sites, synthesized, scope, focusedSiteId]);
  const focusedSite = useMemo(() => sites.find((site) => site.id === focusedSiteId) || scopedSites[0] || sites[0], [sites, scopedSites, focusedSiteId]);
  const scopeMeta = useMemo(() => diagramScopeMeta(scope, synthesized, focusedSite), [scope, synthesized, focusedSite]);
  const scopedFlows = useMemo(() => flowsForDiagramScope(synthesized.trafficFlows, scope, focusedSite?.name), [synthesized.trafficFlows, scope, focusedSite]);
  const scopedBoundaryIds = useMemo(() => new Set(scopedSites.map((site) => site.name)), [scopedSites]);
  const scopedBoundaryCount = synthesized.securityBoundaries.filter((boundary) => scopedBoundaryIds.has(boundary.siteName)).length;
  const scopedPlacementCount = synthesized.sitePlacements.filter((placement) => scopedSites.some((site) => site.id === placement.siteId)).length;
  const scopedServiceCount = synthesized.servicePlacements.filter((placement) => placement.siteId ? scopedSites.some((site) => site.id === placement.siteId) : placement.siteName ? scopedBoundaryIds.has(placement.siteName) : false).length;
  const scopeFilename = scope === "site" ? `site-${(focusedSite?.name || "focus").replace(/\s+/g, "-").toLowerCase()}` : scope;
  const baseFilename = useMemo(() => `${project.name.replace(/\s+/g, "-").toLowerCase()}-${mode}-${overlay}-${scopeFilename}-diagram`, [mode, overlay, scopeFilename, project.name]);
  const reviewPresets = useMemo(() => buildDiagramReviewPresets(focusedSite?.id || sites[0]?.id), [focusedSite?.id, sites]);
  const activePresetKey = useMemo(() => activePresetKeyForState(mode, scope, overlay), [mode, scope, overlay]);
  const activePreset = reviewPresets.find((preset) => preset.key === activePresetKey) || null;
  const topologyBehaviorSummary = useMemo(() => topologyScopeBehaviorSummary(scope, synthesized, focusedSite), [scope, synthesized, focusedSite]);
  const showNarrativePanels = !compact && !minimalWorkspace && !isExternallyControlled;
  const showSupportPanels = workspaceDensity === "expanded" && !compact && !minimalWorkspace && !isExternallyControlled;
  const densityLabel = workspaceDensity === "guided" ? "Guided" : "Expanded";
  const decisionCard = useMemo(() => viewDecisionSummary(mode), [mode]);

  const applyPreset = (presetKey: DiagramReviewPresetKey) => {
    const preset = reviewPresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setMode(preset.mode);
    setScope(preset.scope);
    setOverlay(preset.overlay);
    setWorkspaceDensity(preset.density);
    setLabelMode(preset.labelMode);
    setLinkAnnotationMode(preset.linkAnnotationMode);
    setLabelFocus(preset.labelFocus);
    setDeviceFocus(preset.deviceFocus);
    setLinkFocus(preset.linkFocus);
    if (preset.scope === "site") {
      setFocusedSiteId(preset.focusedSiteId || focusedSite?.id || sites[0]?.id || "");
    }
  };

  if (sites.length === 0) {
    return renderBareCanvas
      ? <div className="panel diagram-minimal-panel"><div className="diagram-empty-message">Add sites and VLANs to generate a topology diagram.</div></div>
      : <div className="panel"><div className="diagram-toolbar"><div><h2 style={{ marginBottom: 6 }}>Diagram</h2><p className="muted" style={{ margin: 0 }}>Add sites and VLANs to generate a topology diagram.</p></div></div></div>;
  }

  if (renderBareCanvas) {
    return (
      <div className="panel diagram-minimal-panel">
        {mode === "logical"
          ? <LogicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas />
          : <PhysicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas />}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="diagram-toolbar" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>{compact ? "Topology canvas" : "Generated Topology Diagram"}</h2>
          <p className="muted" style={{ margin: 0 }}>{compact ? "Use the canvas as the main workspace. Switch view, overlay, scope, and focus from the control strip, then review the supporting details from the diagram navigator." : "This recovery pass keeps the diagram work tied to the roadmap: real layout modes, guided-vs-expanded density control, stronger link semantics, and clearer label discipline so the workspace behaves more like a real topology review surface."}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="diagram-toggle">
            <button type="button" className={mode === "logical" ? "active" : ""} onClick={() => applyModeBaseline("logical")}>Logical Topology</button>
            <button type="button" className={mode === "physical" ? "active" : ""} onClick={() => applyModeBaseline("physical")}>Physical / Topology</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={scope === "global" ? "active" : ""} onClick={() => setScope("global")}>Global</button>
            <button type="button" className={scope === "site" ? "active" : ""} onClick={() => setScope("site")}>Per-site</button>
            <button type="button" className={scope === "wan-cloud" ? "active" : ""} onClick={() => setScope("wan-cloud")}>WAN / Cloud</button>
            <button type="button" className={scope === "boundaries" ? "active" : ""} onClick={() => setScope("boundaries")}>Boundaries</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={overlay === "none" ? "active" : ""} onClick={() => setOverlay("none")}>Placement</button>
            <button type="button" className={overlay === "addressing" ? "active" : ""} onClick={() => setOverlay("addressing")}>Addressing</button>
            <button type="button" className={overlay === "services" ? "active" : ""} onClick={() => setOverlay("services")}>Services</button>
            <button type="button" className={overlay === "security" ? "active" : ""} onClick={() => setOverlay("security")}>Security</button>
            <button type="button" className={overlay === "redundancy" ? "active" : ""} onClick={() => setOverlay("redundancy")}>Redundancy</button>
            <button type="button" className={overlay === "flows" ? "active" : ""} onClick={() => setOverlay("flows")}>Flows</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={workspaceDensity === "guided" ? "active" : ""} onClick={() => setWorkspaceDensity("guided")}>Guided</button>
            <button type="button" className={workspaceDensity === "expanded" ? "active" : ""} onClick={() => setWorkspaceDensity("expanded")}>Expanded</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={labelMode === "essential" ? "active" : ""} onClick={() => setLabelMode("essential")}>Essential labels</button>
            <button type="button" className={labelMode === "detailed" ? "active" : ""} onClick={() => setLabelMode("detailed")}>Detailed labels</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={linkAnnotationMode === "minimal" ? "active" : ""} onClick={() => setLinkAnnotationMode("minimal")}>Minimal link notes</button>
            <button type="button" className={linkAnnotationMode === "full" ? "active" : ""} onClick={() => setLinkAnnotationMode("full")}>Full link notes</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={deviceFocus === "all" ? "active" : ""} onClick={() => setDeviceFocus("all")}>All devices</button>
            <button type="button" className={deviceFocus === "edge" ? "active" : ""} onClick={() => setDeviceFocus("edge")}>Edge</button>
            <button type="button" className={deviceFocus === "switching" ? "active" : ""} onClick={() => setDeviceFocus("switching")}>Switching</button>
            <button type="button" className={deviceFocus === "wireless" ? "active" : ""} onClick={() => setDeviceFocus("wireless")}>Wireless</button>
            <button type="button" className={deviceFocus === "services" ? "active" : ""} onClick={() => setDeviceFocus("services")}>Services</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={linkFocus === "all" ? "active" : ""} onClick={() => setLinkFocus("all")}>All links</button>
            <button type="button" className={linkFocus === "transport" ? "active" : ""} onClick={() => setLinkFocus("transport")}>Transport</button>
            <button type="button" className={linkFocus === "access" ? "active" : ""} onClick={() => setLinkFocus("access")}>Access</button>
            <button type="button" className={linkFocus === "security" ? "active" : ""} onClick={() => setLinkFocus("security")}>Security</button>
            <button type="button" className={linkFocus === "flows" ? "active" : ""} onClick={() => setLinkFocus("flows")}>Flows</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={labelFocus === "all" ? "active" : ""} onClick={() => setLabelFocus("all")}>All labels</button>
            <button type="button" className={labelFocus === "topology" ? "active" : ""} onClick={() => setLabelFocus("topology")}>Topology</button>
            <button type="button" className={labelFocus === "addressing" ? "active" : ""} onClick={() => setLabelFocus("addressing")}>Addressing</button>
            <button type="button" className={labelFocus === "zones" ? "active" : ""} onClick={() => setLabelFocus("zones")}>Zones</button>
            <button type="button" className={labelFocus === "transport" ? "active" : ""} onClick={() => setLabelFocus("transport")}>Transport</button>
            <button type="button" className={labelFocus === "flows" ? "active" : ""} onClick={() => setLabelFocus("flows")}>Flows</button>
          </div>
          {scope === "site" ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4f6582" }}>
              <span>Site focus</span>
              <select value={focusedSite?.id || ""} onChange={(event) => setFocusedSiteId(event.target.value)}>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" onClick={() => exportSvg(svgId, `${baseFilename}.svg`)}>Export SVG</button>
          <button type="button" onClick={() => { void exportPng(svgId, `${baseFilename}.png`); }}>Export PNG</button>
        </div>
      </div>

      {showNarrativePanels ? (
        <div className="diagram-note-grid" style={{ marginBottom: 12 }}>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Guided review presets</strong>
            <p style={{ margin: "0 0 10px 0", color: "#61758f" }}>{activePreset ? `${activePreset.label} is currently active.` : "Choose a preset to move the workspace into a stronger engineering review posture without manually toggling each control."}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {reviewPresets.map((preset) => (
                <button key={preset.key} type="button" className={activePresetKey === preset.key ? "active" : ""} onClick={() => applyPreset(preset.key)}>{preset.label}</button>
              ))}
            </div>
            <p style={{ margin: "10px 0 0 0", color: "#61758f" }}>{activePreset?.detail || "Review presets align scope, overlay, and mode around the main engineering checks that still matter most in the recovery roadmap."}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>{scopeMeta.title}</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopeMeta.detail}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Current evidence in scope</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopedSites.length} site{scopedSites.length === 1 ? "" : "s"}, {scopedPlacementCount} placement object{scopedPlacementCount === 1 ? "" : "s"}, {scopedServiceCount} service anchor{scopedServiceCount === 1 ? "" : "s"}, {scopedBoundaryCount} boundary object{scopedBoundaryCount === 1 ? "" : "s"}, and {scopedFlows.length} flow path{scopedFlows.length === 1 ? "" : "s"} are currently active in this view.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Recovery direction</strong>
            <p style={{ margin: 0, color: "#61758f" }}>Use global for overall architecture, per-site for local LLD review, WAN / cloud for transport posture, and boundaries for trust enforcement. This keeps the diagram stage closer to the roadmap’s real topology-engine target.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Topology-specific rendering check</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{topologyBehaviorSummary}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Current workspace discipline</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{densityLabel} density • {labelMode === "detailed" ? "Detailed device + link labels" : "Essential labels only"} • {linkAnnotationMode === "full" ? "Full link annotations" : "Minimal link annotations"} • {labelFocusTitle(labelFocus)}. Guided mode keeps critical review cards first; Expanded mode exposes the deeper support panels.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>{decisionCard.title}</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{decisionCard.detail}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Engineering focus controls</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{deviceFocusTitle(deviceFocus)} + {linkFocusTitle(linkFocus)} + {labelFocusTitle(labelFocus)} are now emphasized. Non-matching device roles and link types remain visible but muted so the workspace can isolate the review you are doing without losing topology context.</p>
          </div>
          <SupportLabelFocusPanel labelFocus={labelFocus} />
        </div>
      ) : (
        <div className="diagram-note-grid" style={{ marginBottom: 12 }}>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Current review posture</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{activePreset ? `${activePreset.label} • ${activePreset.detail}` : "Choose a preset from the control strip to move quickly between architecture, site, transport, boundary, service, and flow reviews."}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Scope summary</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopeMeta.title}: {scopeMeta.detail}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Evidence in this view</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopedSites.length} site{scopedSites.length === 1 ? "" : "s"}, {scopedPlacementCount} placement object{scopedPlacementCount === 1 ? "" : "s"}, {scopedServiceCount} service anchor{scopedServiceCount === 1 ? "" : "s"}, {scopedBoundaryCount} boundary object{scopedBoundaryCount === 1 ? "" : "s"}, and {scopedFlows.length} flow path{scopedFlows.length === 1 ? "" : "s"} are active.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Focus controls</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{deviceFocusTitle(deviceFocus)} • {linkFocusTitle(linkFocus)} • {labelFocusTitle(labelFocus)} • {labelMode === "detailed" ? "Detailed labels" : "Essential labels"}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>{decisionCard.title}</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{decisionCard.detail}</p>
          </div>
        </div>
      )}

      {showNarrativePanels ? <SupportDeviceRealismDirectionPanel /> : null}
      {showNarrativePanels ? <SupportArchitectureSignals synthesized={synthesized} /> : null}
      {showNarrativePanels ? <TopologyFoundationPanel synthesized={synthesized} /> : null}
      {showSupportPanels && scope !== "site" ? <TopologyObjectPanel synthesized={synthesized} /> : null}
      {showSupportPanels && (scope !== "site" || mode === "physical") ? <SupportLegend /> : null}
      {showSupportPanels && scope === "global" ? <SupportDeviceSymbolLibraryPanel /> : null}
      {showNarrativePanels ? <SupportOverlayReviewPanel overlay={overlay} /> : null}
      {showNarrativePanels ? <OverlayBehaviorPanel overlay={overlay} /> : null}
      {(showSupportPanels || (showNarrativePanels && (overlay === "security" || overlay === "flows"))) && scope !== "site" && (overlay === "security" || overlay === "flows" || overlay === "redundancy") ? <SupportConnectionSemanticsPanel /> : null}
      {showNarrativePanels ? <SupportLinkTypeRenderingPanel synthesized={synthesized} /> : null}
      {showNarrativePanels ? <SupportOverlayEvidencePanel overlay={overlay} synthesized={synthesized} /> : null}
      {showNarrativePanels ? <TopologySpecificRenderingPanel synthesized={synthesized} /> : null}
      {showNarrativePanels ? <SupportTopologyPostureLedgerPanel synthesized={synthesized} sites={scopedSites} /> : null}
      {showSupportPanels && scope !== "site" && (overlay === "none" || overlay === "redundancy" || overlay === "flows") ? <SupportTopologyBehaviorMatrixPanel synthesized={synthesized} /> : null}
      {showNarrativePanels ? <SupportDiagramReviewSequencePanel overlay={overlay} /> : null}
      {showNarrativePanels ? <SupportCrossCheckPanels /> : null}
      {showSupportPanels ? <SiteDeviceLinkMatrixPanel synthesized={synthesized} siteIds={scopedSites.map((site) => site.id)} /> : null}
      {overlay === "flows" ? <SupportFlowSummaryPanel flows={scopedFlows} /> : null}
      {mode === "logical"
        ? <LogicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas={bareCanvas} />
        : <PhysicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas={bareCanvas} />}
    </div>
  );
}
