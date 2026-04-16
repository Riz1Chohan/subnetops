import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ProjectDiagram,
  type DiagramMode,
  type DiagramScope,
  type OverlayMode,
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

const overlayItems: Array<{ key: OverlayMode; label: string }> = [
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

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const commentsQuery = useProjectComments(projectId);
  const validationQuery = useValidationResults(projectId);

  const [mode, setMode] = useState<DiagramMode>("logical");
  const [scope, setScope] = useState<DiagramScope>("global");
  const [overlay, setOverlay] = useState<OverlayMode>("none");
  const [labelMode, setLabelMode] = useState<DiagramLabelMode>("essential");
  const [linkAnnotationMode, setLinkAnnotationMode] = useState<LinkAnnotationMode>("minimal");
  const [focusedSiteId, setFocusedSiteId] = useState<string>("");

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

  return (
    <section className="diagram-workspace-shell">
      <div className="panel diagram-legend-strip">
        <div>
          <strong style={{ display: "block", marginBottom: 4 }}>Topology legend</strong>
          <p className="muted" style={{ margin: 0 }}>Start with devices and lines only, then turn details on or off from the left pane.</p>
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

      <div className="diagram-two-pane-workspace">
        <aside className="panel diagram-control-pane">
          <div className="diagram-control-section">
            <strong>Diagram controls</strong>
            <p className="muted" style={{ margin: 0 }}>Use these selections to add or remove what appears on the diagram.</p>
          </div>

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
              <label className="field" style={{ display: "grid", gap: 6, marginTop: 10 }}>
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
            <span className="diagram-control-label">Add or remove information</span>
            <div className="diagram-toggle-grid diagram-toggle-grid-stack">
              {overlayItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={overlay === item.key ? "diagram-chip-button active" : "diagram-chip-button"}
                  onClick={() => setOverlay((current) => (current === item.key ? "none" : item.key))}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="diagram-control-section">
            <span className="diagram-control-label">Details</span>
            <div className="diagram-toggle-grid diagram-toggle-grid-stack">
              <button type="button" className={labelMode === "detailed" ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setLabelMode((current) => (current === "detailed" ? "essential" : "detailed"))}>
                Device labels
              </button>
              <button type="button" className={linkAnnotationMode === "full" ? "diagram-chip-button active" : "diagram-chip-button"} onClick={() => setLinkAnnotationMode((current) => (current === "full" ? "minimal" : "full"))}>
                Ports / link notes
              </button>
            </div>
          </div>

          <div className="diagram-control-section diagram-control-metrics">
            <div><span>Sites</span><strong>{enrichedProject.sites.length}</strong></div>
            <div><span>VLANs</span><strong>{vlans.length}</strong></div>
            <div><span>Flows</span><strong>{synthesized.trafficFlows.length}</strong></div>
            <div><span>Open issues</span><strong>{openIssues}</strong></div>
            <div><span>Confidence</span><strong>{authorityLedger.confidenceScore}%</strong></div>
          </div>
        </aside>

        <div className="diagram-display-pane">
          <ProjectDiagram
            project={enrichedProject}
            comments={comments}
            validations={validations}
            compact
            minimalWorkspace
            controls={{
              mode,
              overlay,
              scope,
              workspaceDensity: "guided",
              labelMode,
              linkAnnotationMode,
              labelFocus: overlay === "addressing" ? "addressing" : overlay === "security" ? "zones" : overlay === "flows" ? "flows" : overlay === "none" ? "topology" : "all",
              deviceFocus: overlay === "services" ? "services" : overlay === "none" ? "all" : "all",
              linkFocus: overlay === "flows" ? "flows" : overlay === "security" ? "security" : overlay === "redundancy" ? "transport" : "all",
              focusedSiteId: activeSiteId,
            }}
          />
        </div>
      </div>
    </section>
  );
}
