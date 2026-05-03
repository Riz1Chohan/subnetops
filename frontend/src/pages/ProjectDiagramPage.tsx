// V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT: canvas evidence panel displays backend-only diagram proof.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackendDiagramCanvas } from "../features/diagram/components/BackendDiagramCanvas";
import {
  annotationItems,
  layerItems,
  scopeItems,
} from "../features/diagram/diagramWorkspace";
import type {
  ActiveOverlayMode,
  DiagramLabelMode,
  DiagramMode,
  DiagramScope,
  LinkAnnotationMode,
} from "../features/diagram/diagramTypes";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { useAuthoritativeDesign } from "../features/designCore/hooks";
import { DesignAuthorityBanner } from "../lib/designAuthority";
import { buildDiagramTruthModel, truthBadgeClass } from "../lib/reportDiagramTruth";

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);

  const [mode, setMode] = useState<DiagramMode>("physical");
  const [scope, setScope] = useState<DiagramScope>("global");
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlayMode[]>([]);
  const [labelMode, setLabelMode] = useState<DiagramLabelMode>("essential");
  const [linkAnnotationMode, setLinkAnnotationMode] = useState<LinkAnnotationMode>("minimal");
  const [focusedSiteId, setFocusedSiteId] = useState<string>("");
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);

  const project = projectQuery.data;
  const isWorkspaceLoading = projectQuery.isLoading || sitesQuery.isLoading || vlansQuery.isLoading;
  const workspaceError = projectQuery.isError
    ? projectQuery.error
    : sitesQuery.isError
      ? sitesQuery.error
      : vlansQuery.isError
        ? vlansQuery.error
        : null;
  const projectSites = project?.sites ?? [];
  const fetchedSites = sitesQuery.data ?? [];
  const projectVlans = projectSites.flatMap((site) => site.vlans ?? []);
  const fetchedVlans = vlansQuery.data ?? [];
  const siteMap = new Map(projectSites.map((site) => [site.id, site]));
  for (const site of fetchedSites) siteMap.set(site.id, { ...siteMap.get(site.id), ...site });
  const baseSites = Array.from(siteMap.values());
  const vlanMap = new Map(projectVlans.map((vlan) => [vlan.id, vlan]));
  for (const vlan of fetchedVlans) vlanMap.set(vlan.id, { ...vlanMap.get(vlan.id), ...vlan });
  const baseVlans = Array.from(vlanMap.values());
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);

  const seedProject = project
    ? {
        ...project,
        sites: baseSites.map((site) => ({
          ...site,
          vlans: baseVlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
        })),
      }
    : null;


  const { synthesized, authority, designCore } = useAuthoritativeDesign(projectId, seedProject ?? project, baseSites, baseVlans, requirementsProfile);
  const diagramTruth = useMemo(() => buildDiagramTruthModel(designCore), [designCore]);
  const V1DiagramTruth = designCore?.V1DiagramTruth;

  const sites = baseSites.length > 0
    ? baseSites
    : (synthesized.siteSummaries ?? []).map((site) => ({
        id: site.id,
        projectId: project?.id || projectId,
        name: site.name,
        location: site.location,
        siteCode: site.siteCode,
        notes: site.note,
        defaultAddressBlock: site.siteBlockCidr,
      }));

  const vlans = baseVlans.length > 0
    ? baseVlans
    : (synthesized.addressingPlan ?? []).map((row, index) => ({
        id: row.id || `proposed-vlan-${index}`,
        siteId: row.siteId,
        vlanId: row.vlanId ?? 0,
        vlanName: row.segmentName,
        purpose: row.purpose,
        segmentRole: row.role,
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

  const enrichedProject = project
    ? {
        ...project,
        sites: sites.map((site) => ({
          ...site,
          vlans: vlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
        })),
      }
    : null;


  const activeSiteId = focusedSiteId || enrichedProject?.sites[0]?.id || "";
  const activeSiteName = enrichedProject?.sites.find((site) => site.id === activeSiteId)?.name || "site";
  const overlayCount = activeOverlays.length;
  const canvasFileBase = `${(project?.name || "project").replace(/\s+/g, "-").toLowerCase()}-${mode}-${scope}-${overlayCount ? activeOverlays.join("-") : "baseline"}-${activeSiteName.replace(/\s+/g, "-").toLowerCase()}`;
  const authoritativeRenderSiteCount = diagramTruth.renderModel?.groups.filter((group) => group.groupType === "site").length || enrichedProject?.sites.length || 1;
  const isEnterpriseScaleDiagram = authoritativeRenderSiteCount >= 7;
  const viewSpecificLayerItems = useMemo(() => {
    if (scope === "boundaries") return [];
    if (scope === "wan-cloud") return [];
    if (mode === "physical") return [];
    if (mode === "logical" && scope === "global" && isEnterpriseScaleDiagram) return [];
    return layerItems;
  }, [mode, scope, isEnterpriseScaleDiagram]);
  const viewSpecificLayerNotice = useMemo(() => {
    if (scope === "boundaries") return "Security view already shows policy actions and evidence. IP/service layers are hidden here.";
    if (scope === "wan-cloud") return "WAN view focuses on transport, ISP underlay, and VPN overlay. Use link notes for tunnel labels.";
    if (mode === "physical") return "Physical view is equipment and edge-path only. Open Logical / Per-site for VLAN, subnet, DHCP, and gateway detail.";
    if (mode === "logical" && scope === "global" && isEnterpriseScaleDiagram) return "Large global logical view is summarized by site. Open Logical / Per-site for full VLAN/subnet details.";
    return "";
  }, [mode, scope, isEnterpriseScaleDiagram]);
  const estimatedSiteCount = scope === "site" ? 1 : authoritativeRenderSiteCount;
  const estimatedBranchRows = Math.max(1, Math.ceil(Math.max(estimatedSiteCount - 1, 0) / 2));
  const canvasViewportMinHeight = mode === "physical"
    ? Math.max(760, 760 + Math.max(0, estimatedBranchRows - 1) * 220)
    : Math.max(720, 720 + Math.max(0, estimatedSiteCount - 4) * 80);

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
    setLabelMode("essential");
    setLinkAnnotationMode("minimal");
    setFocusedSiteId(enrichedProject?.sites[0]?.id || "");
  };

  useEffect(() => {
    const allowedLayers = new Set(viewSpecificLayerItems.map((item) => item.key));
    setActiveOverlays((current) => current.filter((item) => allowedLayers.has(item)));
  }, [viewSpecificLayerItems]);

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
  }, [mode, scope, activeSiteId, overlayCount]);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsCanvasFullscreen(document.fullscreenElement === canvasStageRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  if (isWorkspaceLoading) return <LoadingState title="Loading diagram" message="Preparing project, site, VLAN, and backend Engine 1 inputs before rendering the canvas." />;
  if (workspaceError) {
    return (
      <ErrorState
        title="Unable to load diagram workspace"
        message={workspaceError instanceof Error ? workspaceError.message : "SubnetOps could not load this diagram right now."}
        action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
      />
    );
  }
  if (!project || !enrichedProject) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested diagram workspace could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  return (
    <section className="diagram-workspace-shell diagram-workspace-shell-professional diagram-workspace-shell-streamlined">
      <DesignAuthorityBanner authority={authority} compact />

      <div className={`diagram-two-pane-workspace diagram-two-pane-workspace-professional diagram-two-pane-workspace-streamlined${isCanvasFocused ? " diagram-two-pane-workspace-canvas-focus" : ""}`}>
        <aside className={`panel diagram-control-pane diagram-control-pane-professional diagram-control-pane-streamlined${isCanvasFocused ? " diagram-control-pane-hidden" : ""}`}>
          <div className="diagram-control-card diagram-control-card-compact diagram-control-card-top">
            <div className="diagram-control-section diagram-control-section-actions">
              <button type="button" className="diagram-chip-button" onClick={resetToBaseline}>Reset</button>
            </div>

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
              <span className="diagram-control-label">Annotations</span>
              <div className="diagram-toggle-grid diagram-toggle-grid-stack">
                {annotationItems.map((item) => {
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

            <details className="diagram-advanced-panel" open={false}>
              <summary>More layers</summary>
              <div className="diagram-advanced-panel-body">
                <div className="diagram-control-section" style={{ paddingTop: 0 }}>
                  <div className="diagram-toggle-grid diagram-toggle-grid-stack">
                    {viewSpecificLayerItems.length > 0 ? viewSpecificLayerItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={activeOverlays.includes(item.key) ? "diagram-chip-button active" : "diagram-chip-button"}
                        onClick={() => toggleOverlay(item.key)}
                      >
                        <span>{item.label}</span>
                        <small>{activeOverlays.includes(item.key) ? "On" : "Off"}</small>
                      </button>
                    )) : (
                      <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.45 }}>{viewSpecificLayerNotice}</p>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </div>
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
                  <span className="diagram-stage-passive-pill">{scopeItems.find((item) => item.key === scope)?.label || "Global"}</span>
                  <span className="diagram-stage-passive-pill">{scope === "site" ? activeSiteName : `${authoritativeRenderSiteCount} sites`}</span>
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
                {diagramTruth.hasModeledTopology ? null : <div className="panel" style={{ marginBottom: 12, padding: 14 }}><strong>Topology proof is incomplete.</strong><p className="muted" style={{ margin: "8px 0 0 0" }}>{diagramTruth.emptyStateReason}</p></div>}
                {diagramTruth.renderModel ? (
                  <BackendDiagramCanvas
                    renderModel={diagramTruth.renderModel}
                    mode={mode}
                    scope={scope}
                    focusedSiteId={activeSiteId}
                    activeOverlays={activeOverlays}
                    labelMode={labelMode}
                    linkAnnotationMode={linkAnnotationMode}
                    canvasZoom={canvasZoom}
                  />
                ) : (
                  <div className="panel" style={{ padding: 14 }}>
                    <strong>Authoritative topology canvas is unavailable.</strong>
                    <p className="muted" style={{ margin: "8px 0 0 0" }}>The legacy diagram renderer is intentionally disabled. Refresh after deployment or regenerate the design snapshot so the current authoritative render model is used.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <details className="panel diagram-truth-details-panel" style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Diagram truth / readiness details</summary>
        <div style={{ display: "grid", gap: 14, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div><p className="workspace-detail-kicker">Verify</p><h2 style={{ margin: "0 0 8px 0" }}>Diagram truth workspace</h2><p className="muted" style={{ margin: 0 }}>Use this panel when you need evidence behind the canvas. It stays collapsed so the diagram remains the primary workspace.</p></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><span className={truthBadgeClass(diagramTruth.overallReadiness)}>{diagramTruth.overallReadiness === "unknown" ? "Truth pending" : diagramTruth.overallReadiness === "blocked" ? "Diagram truth blocked" : diagramTruth.overallReadiness === "review" ? "Diagram truth under review" : "Diagram truth ready"}</span><span className="badge-soft">Devices {diagramTruth.topologySummary.deviceCount}</span><span className="badge-soft">Links {diagramTruth.topologySummary.linkCount}</span><span className="badge-soft">Route domains {diagramTruth.topologySummary.routeDomainCount}</span><span className="badge-soft">Security zones {diagramTruth.topologySummary.securityZoneCount}</span></div>
          </div>
          {diagramTruth.emptyStateReason ? <div className="trust-note"><p className="muted" style={{ margin: 0 }}><strong>Why the diagram is limited:</strong> {diagramTruth.emptyStateReason}</p></div> : null}
          {V1DiagramTruth ? (
            <div className="trust-note" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <strong>V1 diagram truth contract</strong>
                  <p className="muted" style={{ margin: "4px 0 0 0" }}>Backend-only renderer authority: every visual node needs backend object identity, every edge needs relationship evidence, and each mode has its own purpose.</p>
                </div>
                <span className={truthBadgeClass(V1DiagramTruth.overallReadiness)}>{V1DiagramTruth.overallReadiness}</span>
              </div>
              <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", alignItems: "start" }}>
                <div className="summary-card"><div className="muted">Backend authored</div><div className="value">{V1DiagramTruth.backendAuthored ? "Yes" : "No"}</div><div className="muted">Frontend cannot invent topology.</div></div>
                <div className="summary-card"><div className="muted">Render coverage</div><div className="value">{V1DiagramTruth.renderNodeCount}/{V1DiagramTruth.renderEdgeCount}</div><div className="muted">Nodes / edges with lineage checks.</div></div>
                <div className="summary-card"><div className="muted">Mode contracts</div><div className="value">{V1DiagramTruth.modeContractCount}</div><div className="muted">Physical, logical, WAN/cloud, security, per-site, implementation.</div></div>
                <div className="summary-card"><div className="muted">Truth visibility</div><div className="value">{V1DiagramTruth.inferredOrReviewVisibleCount}</div><div className="muted">Inferred/review evidence remains visible.</div></div>
              </div>
              <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", alignItems: "start" }}>
                {V1DiagramTruth.modeContracts.slice(0, 6).map((item) => (
                  <div key={item.mode} className="summary-card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div className="muted">{item.mode}</div><span className={truthBadgeClass(item.readinessImpact)}>{item.status}</span></div>
                    <div style={{ fontWeight: 800, marginTop: 8 }}>{item.evidenceCount} evidence item(s)</div>
                    <div className="muted" style={{ marginTop: 6 }}>{item.purpose}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", alignItems: "start" }}>{diagramTruth.overlaySummaries.map((item) => <div key={item.key} className="summary-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div className="muted">{item.label}</div><span className={truthBadgeClass(item.readiness)}>{item.readiness}</span></div><div className="value">{item.count}</div><div className="muted" style={{ marginTop: 6 }}>{item.detail}</div></div>)}</div>
          <div className="grid-2" style={{ alignItems: "start" }}><div><h3 style={{ marginTop: 0, marginBottom: 8 }}>Top cross-check hotspots</h3>{diagramTruth.hotspots.length === 0 ? <p className="muted" style={{ margin: 0 }}>No major routing, security, or implementation hotspots are currently surfaced by design truth.</p> : <ul style={{ margin: 0, paddingLeft: 18 }}>{diagramTruth.hotspots.map((item, index) => <li key={`${item.scopeLabel}-${item.title}-${index}`} style={{ marginBottom: 8 }}><strong>{item.scopeLabel} — {item.title}:</strong> {item.detail}</li>)}</ul>}</div><div><h3 style={{ marginTop: 0, marginBottom: 8 }}>How to use the canvas honestly</h3><ul style={{ margin: 0, paddingLeft: 18 }}><li style={{ marginBottom: 8 }}><strong>Addressing:</strong> confirm site blocks, gateway anchors, and orphaned rows before trusting labels.</li><li style={{ marginBottom: 8 }}><strong>Routing:</strong> compare displayed paths against route intents, reachability checks, and next-hop review items.</li><li style={{ marginBottom: 8 }}><strong>Security:</strong> cross-check zone boundaries, required flows, and NAT coverage instead of assuming visual adjacency means permission.</li><li style={{ marginBottom: 0 }}><strong>Implementation:</strong> blocked implementation or verification items still override a clean-looking canvas.</li></ul></div></div>
        </div>
      </details>
    </section>
  );
}
