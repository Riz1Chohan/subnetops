import { useEffect, useRef, useState } from "react";
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
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [deviceFocus, setDeviceFocus] = useState<DeviceFocus>("all");
  const [linkFocus, setLinkFocus] = useState<LinkFocus>("all");
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);

  const project = projectQuery.data;
  const projectSites = project?.sites ?? [];
  const fetchedSites = sitesQuery.data ?? [];
  const baseSites = fetchedSites.length >= projectSites.length ? fetchedSites : projectSites;
  const projectVlans = projectSites.flatMap((site) => site.vlans ?? []);
  const fetchedVlans = vlansQuery.data ?? [];
  const baseVlans = fetchedVlans.length > 0 ? fetchedVlans : projectVlans;
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

  const seedProject = {
    ...project,
    sites: baseSites.map((site) => ({
      ...site,
      vlans: baseVlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
    })),
  };

  const seedSynthesized = synthesizeLogicalDesign(seedProject, seedProject.sites, baseVlans, requirementsProfile);

  const sites = baseSites.length > 0
    ? baseSites
    : seedSynthesized.siteSummaries.map((site) => ({
        id: site.id,
        projectId: project.id,
        name: site.name,
        location: site.location,
        siteCode: site.siteCode,
        notes: site.note,
        defaultAddressBlock: site.siteBlockCidr,
      }));

  const vlans = baseVlans.length > 0
    ? baseVlans
    : seedSynthesized.addressingPlan.map((row, index) => ({
        id: row.id || `proposed-vlan-${index}`,
        siteId: row.siteId,
        vlanId: row.vlanId ?? 0,
        vlanName: row.segmentName,
        purpose: row.purpose,
        subnetCidr: row.subnetCidr,
        gatewayIp: row.gatewayIp,
        dhcpEnabled: row.dhcpEnabled,
        estimatedHosts: row.estimatedHosts,
        notes: row.notes.join(" • "),
        site: {
          id: row.siteId,
          name: row.siteName,
          siteCode: row.siteCode,
        },
      }));

  const enrichedProject = {
    ...project,
    sites: sites.map((site) => ({
      ...site,
      vlans: vlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
    })),
  };

  const synthesized = synthesizeLogicalDesign(enrichedProject, enrichedProject.sites, vlans, requirementsProfile);
  const activeSiteId = focusedSiteId || enrichedProject.sites[0]?.id || "";
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



  const applyDiagramFocusPreset = (presetKey: (typeof diagramFocusPresets)[number]["key"]) => {
    const preset = diagramFocusPresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setDeviceFocus(preset.deviceFocus);
    setLinkFocus(preset.linkFocus);
    if (preset.key === "flows" && !activeOverlays.includes("flows")) {
      setActiveOverlays((current) => [...current, "flows"]);
    }
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
    <section className="diagram-workspace-shell diagram-workspace-shell-professional diagram-workspace-shell-streamlined">
      <div className={`diagram-two-pane-workspace diagram-two-pane-workspace-professional diagram-two-pane-workspace-streamlined${isCanvasFocused ? " diagram-two-pane-workspace-canvas-focus" : ""}`}>
        <aside className={`panel diagram-control-pane diagram-control-pane-professional diagram-control-pane-streamlined${isCanvasFocused ? " diagram-control-pane-hidden" : ""}`}>
          <div className="diagram-control-card diagram-control-card-compact diagram-control-card-top">
            <div className="diagram-control-section">
              <span className="diagram-control-label">View</span>
              <div className="diagram-toggle-grid">
                <button type="button" className={mode === "physical" ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setMode("physical")}>Physical</button>
                <button type="button" className={mode === "logical" ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setMode("logical")}>Logical</button>
              </div>
            </div>

            <div className="diagram-control-section">
              <span className="diagram-control-label">Scope</span>
              <div className="diagram-toggle-grid diagram-toggle-grid-stack">
                {scopeItems.map((item) => (
                  <button key={item.key} type="button" className={scope === item.key ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setScope(item.key)}>
                    <span>{item.label}</span>
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

            <div className="diagram-control-section">
              <div className="diagram-control-row-head">
                <span className="diagram-control-label">Layers</span>
                <span className="diagram-inline-meta">{overlayCount} active</span>
              </div>
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

          <details className="diagram-advanced-panel" open={showAdvancedControls} onToggle={(event) => setShowAdvancedControls((event.currentTarget as HTMLDetailsElement).open)}>
            <summary>Advanced controls</summary>
            <div className="diagram-advanced-panel-body">
              <div className="diagram-control-card diagram-control-card-compact">
                <div className="diagram-control-section">
                  <span className="diagram-control-label">Focus</span>
                  <div className="diagram-focus-preset-row diagram-focus-preset-row-sidebar">
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
                </div>

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
            </div>
          </details>

        </aside>

        <div className="diagram-display-pane diagram-display-pane-professional">
          <div className="panel diagram-display-shell diagram-display-shell-streamlined">
            <div className="diagram-stage-surface-pro diagram-stage-surface-pro-streamlined" ref={canvasStageRef}>
              <div className="diagram-stage-toolbar-pro diagram-stage-toolbar-pro-streamlined">
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
                </div>
                <div className="diagram-stage-toolbar-group">
                  <button type="button" className="diagram-stage-button" onClick={() => setIsCanvasFocused((current) => !current)}>{isCanvasFocused ? "Show controls" : "Focus canvas"}</button>
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
                  bareCanvas: true,
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
