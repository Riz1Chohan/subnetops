import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ProjectDiagram,
  type DiagramMode,
  type DiagramScope,
  type OverlayMode,
  type ActiveOverlayMode,
  type DiagramLabelMode,
  type LinkAnnotationMode,
  type DeviceFocus,
  type LinkFocus,
} from "../features/diagram/components/ProjectDiagram";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { useValidationResults } from "../features/validation/hooks";
import { buildDesignAuthorityLedger } from "../lib/designAuthorityLedger";

function TinyDiagramIcon({ kind }: { kind: "firewall" | "router" | "switch" | "wireless" | "server" | "cloud" | "internet" }) {
  return (
    <span className={`tiny-diagram-icon tiny-diagram-icon-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === "firewall" ? <><path d="M5 7h14v10H5z" /><path d="M8 10h8" /><path d="M8 14h3" /><path d="M13 14h3" /></> : null}
        {kind === "router" ? <><circle cx="12" cy="12" r="7" /><path d="M9 12h6" /><path d="M12 9v6" /></> : null}
        {kind === "switch" ? <><rect x="4" y="7" width="16" height="10" rx="2" /><path d="M8 11h1" /><path d="M11 11h1" /><path d="M14 11h1" /><path d="M17 11h1" /></> : null}
        {kind === "wireless" ? <><path d="M6 14a9 9 0 0 1 12 0" /><path d="M9 17a5 5 0 0 1 6 0" /><circle cx="12" cy="19" r="1.2" /></> : null}
        {kind === "server" ? <><rect x="7" y="4" width="10" height="6" rx="1.5" /><rect x="7" y="14" width="10" height="6" rx="1.5" /><path d="M10 7h.01" /><path d="M10 17h.01" /></> : null}
        {kind === "cloud" ? <><path d="M8 18h8a4 4 0 0 0 .7-7.94A5 5 0 0 0 7 11.2 3.5 3.5 0 0 0 8 18Z" /></> : null}
        {kind === "internet" ? <><circle cx="12" cy="12" r="7" /><path d="M5 12h14" /><path d="M12 5a11 11 0 0 1 0 14" /><path d="M12 5a11 11 0 0 0 0 14" /></> : null}
      </svg>
    </span>
  );
}

const overlayItems: Array<{ key: ActiveOverlayMode; label: string }> = [
  { key: "addressing", label: "IP addresses" },
  { key: "security", label: "Zones" },
  { key: "services", label: "Services" },
  { key: "redundancy", label: "Redundancy" },
  { key: "flows", label: "Traffic emphasis" },
];

const scopeItems: Array<{ key: DiagramScope; label: string }> = [
  { key: "global", label: "Global" },
  { key: "site", label: "Per-site" },
  { key: "wan-cloud", label: "WAN / Cloud" },
  { key: "boundaries", label: "Boundaries" },
];

const detailItems = [
  { key: "labels", label: "Device labels" },
  { key: "links", label: "Ports / link notes" },
] as const;


const diagramWorkspacePresets = [
  { key: "architecture", label: "Architecture", detail: "Global physical baseline", mode: "physical" as const, scope: "global" as const, overlays: [] as ActiveOverlayMode[], labelMode: "detailed" as const, linkAnnotationMode: "full" as const },
  { key: "transport", label: "WAN / Cloud", detail: "Transport and hybrid edge", mode: "physical" as const, scope: "wan-cloud" as const, overlays: ["redundancy", "flows"] as ActiveOverlayMode[], labelMode: "detailed" as const, linkAnnotationMode: "full" as const },
  { key: "boundaries", label: "Boundaries", detail: "Zones, DMZ, and control points", mode: "physical" as const, scope: "boundaries" as const, overlays: ["security", "services"] as ActiveOverlayMode[], labelMode: "detailed" as const, linkAnnotationMode: "full" as const },
  { key: "site", label: "Site detail", detail: "Focused local topology", mode: "physical" as const, scope: "site" as const, overlays: ["addressing", "security"] as ActiveOverlayMode[], labelMode: "detailed" as const, linkAnnotationMode: "full" as const },
] as const;

const diagramFocusPresets: Array<{ key: string; label: string; detail: string; deviceFocus: DeviceFocus; linkFocus: LinkFocus }> = [
  { key: "all", label: "Blueprint", detail: "Balanced engineering view", deviceFocus: "all", linkFocus: "all" },
  { key: "edge", label: "Edge", detail: "Firewall, WAN, perimeter", deviceFocus: "edge", linkFocus: "transport" },
  { key: "switching", label: "Switching", detail: "Core, trunks, access", deviceFocus: "switching", linkFocus: "access" },
  { key: "wireless", label: "Wireless", detail: "APs and user edge", deviceFocus: "wireless", linkFocus: "access" },
  { key: "services", label: "Services", detail: "Shared service anchors", deviceFocus: "services", linkFocus: "security" },
  { key: "flows", label: "Flows", detail: "Traffic path emphasis", deviceFocus: "all", linkFocus: "flows" },
];

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const commentsQuery = useProjectComments(projectId);
  const validationQuery = useValidationResults(projectId);

  const [mode, setMode] = useState<DiagramMode>("physical");
  const [scope, setScope] = useState<DiagramScope>("global");
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlayMode[]>([]);
  const [labelMode, setLabelMode] = useState<DiagramLabelMode>("detailed");
  const [linkAnnotationMode, setLinkAnnotationMode] = useState<LinkAnnotationMode>("full");
  const [focusedSiteId, setFocusedSiteId] = useState<string>("");
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [showCanvasOutline, setShowCanvasOutline] = useState(false);
  const [deviceFocus, setDeviceFocus] = useState<DeviceFocus>("all");
  const [linkFocus, setLinkFocus] = useState<LinkFocus>("all");
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? project?.sites ?? [];
  const vlans = vlansQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const validations = validationQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);

  if (projectQuery.isLoading || sitesQuery.isLoading) return <LoadingState title="Loading diagram" message="Preparing the topology canvas." />;
  if (projectQuery.isError || sitesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load diagram workspace"
        message={
          projectQuery.error instanceof Error
            ? projectQuery.error.message
            : sitesQuery.error instanceof Error
              ? sitesQuery.error.message
              : "SubnetOps could not load this diagram right now."
        }
        action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
      />
    );
  }
  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested diagram workspace could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  const enrichedProject = {
    ...project,
    sites: sites.map((site) => ({
      ...site,
      vlans: vlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
    })),
  };

  const synthesized = synthesizeLogicalDesign(enrichedProject, enrichedProject.sites, vlans, requirementsProfile);
  const authorityLedger = buildDesignAuthorityLedger(projectId, synthesized);
  const activeSiteId = focusedSiteId || enrichedProject.sites[0]?.id || "";
  const openIssues = validations.filter((item) => item.severity !== "INFO").length;
  const overlayFocus: OverlayMode = activeOverlays[activeOverlays.length - 1] ?? "none";
  const overlayCount = activeOverlays.length;
  const activeSiteName = enrichedProject.sites.find((site) => site.id === activeSiteId)?.name || "site";
  const canvasFileBase = `${project.name.replace(/\s+/g, "-").toLowerCase()}-${mode}-${scope}-${overlayCount ? activeOverlays.join("-") : "baseline"}-${activeSiteName.replace(/\s+/g, "-").toLowerCase()}`;
  const estimatedSiteCount = scope === "site" ? 1 : enrichedProject.sites.length || 1;
  const estimatedBranchRows = Math.max(1, Math.ceil(Math.max(estimatedSiteCount - 1, 0) / 2));
  const canvasViewportMinHeight = mode === "physical"
    ? Math.max(760, 760 + Math.max(0, estimatedBranchRows - 1) * 250 + (activeOverlays.includes("flows") ? 120 : 0))
    : Math.max(720, 720 + Math.max(0, estimatedSiteCount - 4) * 90);

  const getCanvasSvg = () => {
    const node = canvasViewportRef.current?.querySelector("svg");
    return node instanceof SVGSVGElement ? node : null;
  };

  const centerCanvasViewport = (behavior: ScrollBehavior = "auto") => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    const nextLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
    const nextTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
    viewport.scrollTo({ left: nextLeft, top: nextTop, behavior });
  };

  const fitCanvasToView = () => {
    const viewport = canvasViewportRef.current;
    const svg = getCanvasSvg();
    if (!viewport || !svg) return;
    const baseWidth = Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 1600;
    const baseHeight = Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height || 1000;
    const widthFactor = (viewport.clientWidth - 28) / baseWidth;
    const heightFactor = (viewport.clientHeight - 28) / baseHeight;
    const fitFactor = Math.min(widthFactor, heightFactor * 1.08);
    const nextZoom = Math.min(1.12, Math.max(0.68, Number(fitFactor.toFixed(2))));
    setCanvasZoom(nextZoom);
  };

  const exportCanvas = async (format: "svg" | "png") => {
    const svg = getCanvasSvg();
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);

    if (format === "svg") {
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${canvasFileBase}.svg`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render diagram export."));
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
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${canvasFileBase}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleOverlay = (key: ActiveOverlayMode) => {
    setActiveOverlays((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const legendItems = useMemo(
    () => [
      { kind: "firewall" as const, label: "Firewall / Edge" },
      { kind: "router" as const, label: "Router" },
      { kind: "switch" as const, label: "Switching" },
      { kind: "wireless" as const, label: "Wireless" },
      { kind: "server" as const, label: "Service / Server" },
      { kind: "cloud" as const, label: "Cloud" },
      { kind: "internet" as const, label: "Internet" },
    ],
    [],
  );

  const resetToBaseline = () => {
    setMode("physical");
    setScope("global");
    setActiveOverlays([]);
    setLabelMode("detailed");
    setLinkAnnotationMode("full");
    setFocusedSiteId(enrichedProject.sites[0]?.id || "");
    setDeviceFocus("all");
    setLinkFocus("all");
  };

  const enableReviewLayer = () => {
    setMode("physical");
    setScope("global");
    setActiveOverlays(["addressing", "security", "services", "flows"]);
    setLabelMode("detailed");
    setLinkAnnotationMode("full");
    setDeviceFocus("all");
    setLinkFocus("security");
  };

  const applyWorkspacePreset = (presetKey: (typeof diagramWorkspacePresets)[number]["key"]) => {
    const preset = diagramWorkspacePresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setMode(preset.mode);
    setScope(preset.scope);
    setActiveOverlays([...preset.overlays]);
    setLabelMode(preset.labelMode);
    setLinkAnnotationMode(preset.linkAnnotationMode);
    if (preset.scope === "site") {
      setFocusedSiteId(enrichedProject.sites[0]?.id || "");
    }
    if (preset.key === "transport") {
      setDeviceFocus("edge");
      setLinkFocus("transport");
    } else if (preset.key === "boundaries") {
      setDeviceFocus("edge");
      setLinkFocus("security");
    } else if (preset.key === "site") {
      setDeviceFocus("switching");
      setLinkFocus("access");
    } else {
      setDeviceFocus("all");
      setLinkFocus("all");
    }
  };

  const applyDiagramFocusPreset = (presetKey: (typeof diagramFocusPresets)[number]["key"]) => {
    const preset = diagramFocusPresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setDeviceFocus(preset.deviceFocus);
    setLinkFocus(preset.linkFocus);
    if (preset.key === "flows" && !activeOverlays.includes("flows")) {
      setActiveOverlays((current) => [...current, "flows"]);
    }
  };

  const focusGlobalCanvas = () => {
    setScope("global");
    setFocusedSiteId(enrichedProject.sites[0]?.id || "");
    setDeviceFocus("all");
    setLinkFocus("all");
  };

  const focusSiteCanvas = (siteId: string) => {
    setScope("site");
    setFocusedSiteId(siteId);
    setDeviceFocus("switching");
    setLinkFocus("access");
  };

  useEffect(() => {
    const svg = getCanvasSvg();
    if (!svg) return;
    const baseWidth = Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 1600;
    const baseHeight = Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height || 1000;
    svg.style.width = `${Math.round(baseWidth * canvasZoom)}px`;
    svg.style.height = `${Math.round(baseHeight * canvasZoom)}px`;
    svg.style.maxWidth = "none";
    svg.style.display = "block";
    const raf = window.requestAnimationFrame(() => centerCanvasViewport());
    return () => window.cancelAnimationFrame(raf);
  }, [canvasZoom, mode, scope, activeSiteId, overlayCount, labelMode, linkAnnotationMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => fitCanvasToView(), 0);
    return () => window.clearTimeout(timer);
  }, [mode, scope, activeSiteId]);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsCanvasFullscreen(document.fullscreenElement === canvasStageRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  return (
    <section className="diagram-workspace-shell diagram-workspace-shell-professional">
      <div className="panel diagram-legend-strip diagram-legend-strip-compact">
        <div className="diagram-legend-copy">
          <span className="diagram-kicker">Diagram workspace</span>
          <div className="diagram-legend-title-row">
            <h2>Topology Diagram</h2>
            <div className="diagram-status-pills" aria-label="Diagram status">
              <span className="diagram-status-pill">Baseline: devices + links</span>
              <span className="diagram-status-pill">Layers on: {overlayCount}</span>
              <span className="diagram-status-pill">Confidence: {authorityLedger.confidenceScore}%</span>
            </div>
          </div>
        </div>
        <div className="diagram-legend-mini-row">
          {legendItems.map((item) => (
            <span key={item.label} className="diagram-legend-mini-item">
              <TinyDiagramIcon kind={item.kind} />
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className={`diagram-two-pane-workspace diagram-two-pane-workspace-professional${isCanvasFocused ? " diagram-two-pane-workspace-canvas-focus" : ""}`}>
        <aside className={`panel diagram-control-pane diagram-control-pane-professional${isCanvasFocused ? " diagram-control-pane-hidden" : ""}`}>
          <div className="diagram-control-section diagram-control-section-hero">
            <div>
              <strong>Display controls</strong>
              <p className="muted" style={{ margin: 0 }}>Turn layers on only when you need them. The default view stays clean and reviewable.</p>
            </div>
            <div className="diagram-quick-actions">
              <button type="button" className="diagram-utility-button" onClick={resetToBaseline}>Baseline</button>
              <button type="button" className="diagram-utility-button" onClick={enableReviewLayer}>Review set</button>
              <button type="button" className="diagram-utility-button" onClick={() => setIsCanvasFocused((current) => !current)}>{isCanvasFocused ? "Show controls" : "Focus canvas"}</button>
            </div>
          </div>

          <div className="diagram-control-card">
            <div className="diagram-control-section">
              <span className="diagram-control-label">View</span>
              <div className="diagram-toggle-grid">
                <button type="button" className={mode === "logical" ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setMode("logical")}>Logical</button>
                <button type="button" className={mode === "physical" ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setMode("physical")}>Physical</button>
              </div>
            </div>

            <div className="diagram-control-section">
              <span className="diagram-control-label">Scope</span>
              <div className="diagram-toggle-grid diagram-toggle-grid-stack">
                {scopeItems.map((item) => (
                  <button key={item.key} type="button" className={scope === item.key ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setScope(item.key)}>
                    {item.label}
                  </button>
                ))}
              </div>
              {scope === "site" ? (
                <label className="field diagram-site-select-field">
                  <span className="diagram-control-label">Site focus</span>
                  <select value={activeSiteId} onChange={(event) => setFocusedSiteId(event.target.value)}>
                    {enrichedProject.sites.map((site) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          <div className="diagram-control-card">
            <div className="diagram-control-section">
              <span className="diagram-control-label">Layers</span>
              <div className="diagram-toggle-grid diagram-toggle-grid-stack">
                {overlayItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={activeOverlays.includes(item.key) ? "diagram-chip-button active" : "diagram-chip-button"}
                    onClick={() => toggleOverlay(item.key)}
                  >
                    <span>{item.label}</span>
                    <small>{activeOverlays.includes(item.key) ? "On" : "Off"}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="diagram-control-card">
            <div className="diagram-control-section">
              <span className="diagram-control-label">Annotations</span>
              <div className="diagram-toggle-grid diagram-toggle-grid-stack">
                {detailItems.map((item) => {
                  const isActive = item.key === "labels" ? labelMode === "detailed" : linkAnnotationMode === "full";
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={isActive ? "diagram-chip-button active" : "diagram-chip-button"}
                      onClick={() => {
                        if (item.key === "labels") {
                          setLabelMode((current) => (current === "detailed" ? "essential" : "detailed"));
                        } else {
                          setLinkAnnotationMode((current) => (current === "full" ? "minimal" : "full"));
                        }
                      }}
                    >
                      <span>{item.label}</span>
                      <small>{isActive ? "On" : "Off"}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="diagram-control-section diagram-control-metrics diagram-control-metrics-pro">
            <div><span>Sites</span><strong>{enrichedProject.sites.length}</strong></div>
            <div><span>VLANs</span><strong>{vlans.length}</strong></div>
            <div><span>Flows</span><strong>{synthesized.trafficFlows.length}</strong></div>
            <div><span>Issues</span><strong>{openIssues}</strong></div>
            <div><span>Scope</span><strong>{scopeItems.find((item) => item.key === scope)?.label || "Global"}</strong></div>
            <div><span>Mode</span><strong>{mode === "logical" ? "Logical" : "Physical"}</strong></div>
          </div>
        </aside>

        <div className="diagram-display-pane diagram-display-pane-professional">
          <div className="panel diagram-display-shell">
            <div className="diagram-display-header diagram-display-header-tight">
              <div>
                <span className="diagram-kicker">Live topology canvas</span>
                <h3>{scope === "site" && enrichedProject.sites.length ? `${enrichedProject.sites.find((site) => site.id === activeSiteId)?.name || "Site"} focus` : "Full diagram view"}</h3>
                <p className="muted" style={{ margin: 0 }}>Start from the live topology canvas, then add layers only when you need more detail.</p>
              </div>
              <div className="diagram-display-summary">
                <span className="diagram-display-summary-chip">{mode === "logical" ? "Logical" : "Physical"}</span>
                <span className="diagram-display-summary-chip">{scopeItems.find((item) => item.key === scope)?.label || "Global"}</span>
                <span className="diagram-display-summary-chip">Layers: {overlayCount}</span>
                <span className="diagram-display-summary-chip">Sites: {enrichedProject.sites.length}</span>
              </div>
            </div>
            <div className="diagram-preset-row">
              {diagramWorkspacePresets.map((preset) => {
                const isActive =
                  mode === preset.mode &&
                  scope === preset.scope &&
                  preset.overlays.every((overlay) => activeOverlays.includes(overlay)) &&
                  activeOverlays.every((overlay) => preset.overlays.includes(overlay));
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className={isActive ? "diagram-preset-chip active" : "diagram-preset-chip"}
                    onClick={() => applyWorkspacePreset(preset.key)}
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.detail}</span>
                  </button>
                );
              })}
            </div>
            <div className="diagram-focus-preset-row" aria-label="Diagram focus presets">
              {diagramFocusPresets.map((preset) => {
                const isActive = deviceFocus === preset.deviceFocus && linkFocus === preset.linkFocus;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className={isActive ? "diagram-focus-preset active" : "diagram-focus-preset"}
                    onClick={() => applyDiagramFocusPreset(preset.key)}
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.detail}</span>
                  </button>
                );
              })}
            </div>
            <div className="diagram-site-lens-row" aria-label="Canvas site lenses">
              <button
                type="button"
                className={scope !== "site" ? "diagram-site-lens active" : "diagram-site-lens"}
                onClick={focusGlobalCanvas}
              >
                <strong>Global canvas</strong>
                <span>Full blueprint</span>
              </button>
              {enrichedProject.sites.slice(0, 6).map((site) => {
                const isActive = scope === "site" && activeSiteId === site.id;
                const isPrimary = site.name === synthesized.topology.primarySiteName;
                return (
                  <button
                    key={site.id}
                    type="button"
                    className={isActive ? "diagram-site-lens active" : "diagram-site-lens"}
                    onClick={() => focusSiteCanvas(site.id)}
                  >
                    <strong>{site.name}</strong>
                    <span>{isPrimary ? "Primary hub" : "Site lens"}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className={scope === "wan-cloud" ? "diagram-site-lens active" : "diagram-site-lens"}
                onClick={() => setScope("wan-cloud")}
              >
                <strong>WAN / Cloud</strong>
                <span>Transport lens</span>
              </button>
            </div>
            <div className="diagram-stage-surface-pro" ref={canvasStageRef}>
              <div className="diagram-stage-toolbar-pro">
                <div className="diagram-stage-toolbar-group">
                  <span className="diagram-stage-toolbar-label">Canvas</span>
                  <button type="button" className="diagram-stage-button" onClick={() => setCanvasZoom((current) => Math.max(0.55, Number((current - 0.1).toFixed(2))))}>−</button>
                  <button type="button" className="diagram-stage-button" onClick={fitCanvasToView}>Fit</button>
                  <button type="button" className="diagram-stage-button" onClick={() => setCanvasZoom(1)}>100%</button>
                  <button type="button" className="diagram-stage-button" onClick={() => { setCanvasZoom(1); centerCanvasViewport("smooth"); }}>Center</button>
                  <button type="button" className="diagram-stage-button" onClick={() => setCanvasZoom((current) => Math.min(1.6, Number((current + 0.1).toFixed(2))))}>+</button>
                  <span className="diagram-stage-zoom-readout">{Math.round(canvasZoom * 100)}%</span>
                </div>
                <div className="diagram-stage-toolbar-group diagram-stage-toolbar-group-passive" aria-label="Canvas context">
                  <span className="diagram-stage-passive-pill">{synthesized.topology.topologyLabel}</span>
                  <span className="diagram-stage-passive-pill">{scopeItems.find((item) => item.key === scope)?.label || "Global"}</span>
                  <span className="diagram-stage-passive-pill">{enrichedProject.sites.length} sites</span>
                  <span className="diagram-stage-passive-pill">Device focus: {diagramFocusPresets.find((item) => item.deviceFocus === deviceFocus && item.linkFocus === linkFocus)?.label || "Custom"}</span>
                </div>
                <div className="diagram-stage-toolbar-group">
                  <button type="button" className="diagram-stage-button" onClick={() => setIsCanvasFocused((current) => !current)}>{isCanvasFocused ? "Show controls" : "Focus canvas"}</button>
                  <button type="button" className="diagram-stage-button" onClick={() => setShowCanvasOutline((current) => !current)}>{showCanvasOutline ? "Hide outline" : "Show outline"}</button>
                  <button type="button" className="diagram-stage-button" onClick={() => { void exportCanvas("svg"); }}>SVG</button>
                  <button type="button" className="diagram-stage-button" onClick={() => { void exportCanvas("png"); }}>PNG</button>
                  <button
                    type="button"
                    className="diagram-stage-button"
                    onClick={() => {
                      const node = canvasStageRef.current;
                      if (!node) return;
                      if (document.fullscreenElement === node) {
                        void document.exitFullscreen();
                      } else {
                        void node.requestFullscreen();
                      }
                    }}
                  >
                    {isCanvasFullscreen ? "Exit full screen" : "Full screen"}
                  </button>
                </div>
              </div>
              {showCanvasOutline ? (
                <div className="diagram-stage-outline-dock" aria-label="Canvas outline">
                  <div className="diagram-stage-outline-card">
                    <span className="diagram-stage-outline-kicker">Canvas outline</span>
                    <strong>{mode === "physical" ? "Physical blueprint" : "Logical blueprint"}</strong>
                    <div className="diagram-stage-outline-grid">
                      <div><span>Primary</span><strong>{synthesized.topology.primarySiteName || "Not set"}</strong></div>
                      <div><span>Sites</span><strong>{enrichedProject.sites.length}</strong></div>
                      <div><span>WAN links</span><strong>{synthesized.wanLinks.length}</strong></div>
                      <div><span>Services</span><strong>{synthesized.servicePlacements.length}</strong></div>
                    </div>
                  </div>
                  <div className="diagram-stage-outline-card diagram-stage-outline-card-compact">
                    <span className="diagram-stage-outline-kicker">Reading order</span>
                    <ol className="diagram-stage-outline-list">
                      <li>North-south edge / WAN</li>
                      <li>Primary fabric</li>
                      <li>Branch fabrics</li>
                      <li>Critical flows</li>
                    </ol>
                  </div>
                </div>
              ) : null}
              <div className="diagram-stage-viewport-pro" ref={canvasViewportRef} style={{ minHeight: `${canvasViewportMinHeight}px` }} aria-label="Auto-growing diagram canvas">
                <ProjectDiagram
                  project={enrichedProject}
                  comments={comments}
                  validations={validations}
                  compact
                  minimalWorkspace
                  controls={{
                    mode,
                    overlay: overlayFocus,
                    activeOverlays,
                    scope,
                    workspaceDensity: "guided",
                    labelMode,
                    linkAnnotationMode,
                    labelFocus: activeOverlays.length === 0 ? "topology" : "all",
                    deviceFocus,
                    linkFocus: linkFocus === "all"
                      ? (activeOverlays.includes("flows") ? "flows" : activeOverlays.includes("security") ? "security" : activeOverlays.includes("redundancy") ? "transport" : "all")
                      : linkFocus,
                    focusedSiteId: activeSiteId,
                  }}
                />
              </div>
            </div>
            <div className="diagram-stage-support-bar">
              <div className="diagram-architecture-strip">
                <div className="diagram-architecture-strip-item">
                  <span>Primary topology</span>
                  <strong>{synthesized.topology.topologyLabel}</strong>
                </div>
                <div className="diagram-architecture-strip-item">
                  <span>Primary site</span>
                  <strong>{synthesized.topology.primarySiteName || "Not set"}</strong>
                </div>
                <div className="diagram-architecture-strip-item">
                  <span>Boundaries</span>
                  <strong>{synthesized.securityBoundaries.length}</strong>
                </div>
                <div className="diagram-architecture-strip-item">
                  <span>WAN links</span>
                  <strong>{synthesized.wanLinks.length}</strong>
                </div>
                <div className="diagram-architecture-strip-item">
                  <span>Service anchors</span>
                  <strong>{synthesized.servicePlacements.length}</strong>
                </div>
                <div className="diagram-architecture-strip-item">
                  <span>Issues</span>
                  <strong>{openIssues}</strong>
                </div>
              </div>
              <div className="diagram-workspace-shortcuts">
                <Link to={`/projects/${projectId}/report?section=assumptions`} className="diagram-workspace-shortcut-link">Open report section</Link>
                <Link to={`/projects/${projectId}/logical-design?section=topology`} className="diagram-workspace-shortcut-link diagram-workspace-shortcut-link-secondary">Open logical design</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
