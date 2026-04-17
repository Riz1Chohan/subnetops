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
} from "../features/diagram/components/ProjectDiagram";
import { useProject, useProjectVlans } from "../features/projects/hooks";
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

const canvasHints = [
  "Default = devices + connection lines",
  "Turn on only the layers you need",
  "Use Per-site scope for detailed review",
] as const;

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const commentsQuery = useProjectComments(projectId);
  const validationQuery = useValidationResults(projectId);

  const [mode, setMode] = useState<DiagramMode>("logical");
  const [scope, setScope] = useState<DiagramScope>("global");
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlayMode[]>([]);
  const [labelMode, setLabelMode] = useState<DiagramLabelMode>("essential");
  const [linkAnnotationMode, setLinkAnnotationMode] = useState<LinkAnnotationMode>("minimal");
  const [focusedSiteId, setFocusedSiteId] = useState<string>("");
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);

  const project = projectQuery.data;
  const vlans = vlansQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const validations = validationQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);

  if (projectQuery.isLoading) return <LoadingState title="Loading diagram" message="Preparing the topology canvas." />;
  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load diagram workspace"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this diagram right now."}
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
    sites: project.sites.map((site) => ({
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

  const getCanvasSvg = () => {
    const node = canvasViewportRef.current?.querySelector("svg");
    return node instanceof SVGSVGElement ? node : null;
  };

  const fitCanvasToView = () => {
    const viewport = canvasViewportRef.current;
    const svg = getCanvasSvg();
    if (!viewport || !svg) return;
    const baseWidth = Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 1600;
    const baseHeight = Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height || 1000;
    const widthFactor = (viewport.clientWidth - 28) / baseWidth;
    const heightFactor = (viewport.clientHeight - 28) / baseHeight;
    const nextZoom = Math.min(1.05, Math.max(0.55, Number(Math.min(widthFactor, heightFactor).toFixed(2))));
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
    setMode("logical");
    setScope("global");
    setActiveOverlays([]);
    setLabelMode("essential");
    setLinkAnnotationMode("minimal");
    setFocusedSiteId(enrichedProject.sites[0]?.id || "");
  };

  const enableReviewLayer = () => {
    setMode("logical");
    setScope("global");
    setActiveOverlays(["addressing", "security", "services", "flows"]);
    setLabelMode("detailed");
    setLinkAnnotationMode("full");
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

      <div className="diagram-two-pane-workspace diagram-two-pane-workspace-professional">
        <aside className="panel diagram-control-pane diagram-control-pane-professional">
          <div className="diagram-control-section diagram-control-section-hero">
            <div>
              <strong>Display controls</strong>
              <p className="muted" style={{ margin: 0 }}>Turn layers on only when you need them. The default view stays clean and reviewable.</p>
            </div>
            <div className="diagram-quick-actions">
              <button type="button" className="diagram-utility-button" onClick={resetToBaseline}>Baseline</button>
              <button type="button" className="diagram-utility-button" onClick={enableReviewLayer}>Review set</button>
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
            <div className="diagram-display-header">
              <div>
                <span className="diagram-kicker">Live topology canvas</span>
                <h3>{scope === "site" && enrichedProject.sites.length ? `${enrichedProject.sites.find((site) => site.id === activeSiteId)?.name || "Site"} focus` : "Full diagram view"}</h3>
                <p className="muted" style={{ margin: 0 }}>Start with the base topology only, then layer in the exact details you want for review. The canvas stays cleaner by default.</p>
              </div>
              <div className="diagram-display-summary">
                <span className="diagram-display-summary-chip">{mode === "logical" ? "Logical" : "Physical"}</span>
                <span className="diagram-display-summary-chip">{scopeItems.find((item) => item.key === scope)?.label || "Global"}</span>
                <span className="diagram-display-summary-chip">Layers: {overlayCount}</span>
              </div>
            </div>
            <div className="diagram-canvas-cue-row">
              {canvasHints.map((hint) => (
                <span key={hint} className="diagram-canvas-cue-chip">{hint}</span>
              ))}
            </div>
            <div className="diagram-stage-surface-pro" ref={canvasStageRef}>
              <div className="diagram-stage-toolbar-pro">
                <div className="diagram-stage-toolbar-group">
                  <span className="diagram-stage-toolbar-label">Canvas</span>
                  <button type="button" className="diagram-stage-button" onClick={() => setCanvasZoom((current) => Math.max(0.55, Number((current - 0.1).toFixed(2))))}>−</button>
                  <button type="button" className="diagram-stage-button" onClick={fitCanvasToView}>Fit</button>
                  <button type="button" className="diagram-stage-button" onClick={() => setCanvasZoom(1)}>100%</button>
                  <button type="button" className="diagram-stage-button" onClick={() => setCanvasZoom((current) => Math.min(1.6, Number((current + 0.1).toFixed(2))))}>+</button>
                  <span className="diagram-stage-zoom-readout">{Math.round(canvasZoom * 100)}%</span>
                </div>
                <div className="diagram-stage-toolbar-group">
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
              <div className="diagram-stage-viewport-pro" ref={canvasViewportRef}>
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
                    deviceFocus: "all",
                    linkFocus: activeOverlays.includes("flows") ? "flows" : activeOverlays.includes("security") ? "security" : activeOverlays.includes("redundancy") ? "transport" : "all",
                    focusedSiteId: activeSiteId,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
