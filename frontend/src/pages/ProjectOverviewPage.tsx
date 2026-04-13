import { Link, useParams } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { UsageBanner } from "../components/app/UsageBanner";

function summaryCard(label: string, value: number | string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
    </div>
  );
}

export function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  const authQuery = useCurrentUser();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validationItems = validationQuery.data ?? [];

  const errorCount = validationItems.filter((item) => item.severity === "ERROR").length;
  const warningCount = validationItems.filter((item) => item.severity === "WARNING").length;

  if (projectQuery.isLoading) return <p className="muted">Loading project...</p>;
  if (!project) return <p className="error-text">Project not found.</p>;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ marginBottom: 8 }}>{project.name}</h1>
            <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization name set"}</p>
            <p className="muted">{project.description || "No description yet."}</p>
          </div>

          <div className="actions">
            <Link to={`/projects/${projectId}/validation`} className="link-button">Open Validation</Link>
            <Link to={`/projects/${projectId}/diagram`} className="link-button">Open Diagram</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Open Report</Link>
            {project.canEdit ? <Link to={`/projects/${projectId}/settings`} className="link-button">Settings</Link> : null}
          </div>
        </div>
      </div>

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        siteCount={sites.length}
        vlanCount={vlans.length}
      />

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {summaryCard("Sites", sites.length)}
        {summaryCard("VLANs", vlans.length)}
        {summaryCard("Validation errors", errorCount)}
        {summaryCard("Validation warnings", warningCount)}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>What you can do next</h2>
        <div className="grid-2">
          <Link to={`/projects/${projectId}/sites`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Sites</h3>
            <p className="muted">Manage sites and their address blocks.</p>
          </Link>

          <Link to={`/projects/${projectId}/vlans`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>VLANs</h3>
            <p className="muted">Plan VLANs, gateways, and subnet sizes.</p>
          </Link>

          <Link to={`/projects/${projectId}/validation`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Validation</h3>
            <p className="muted">Review overlaps, gateway issues, and sizing problems.</p>
          </Link>

          <Link to={`/projects/${projectId}/diagram`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Diagram</h3>
            <p className="muted">Open the dedicated diagram workspace.</p>
          </Link>

          <Link to={`/projects/${projectId}/tasks`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Tasks</h3>
            <p className="muted">Track project work, review items, and assignments.</p>
          </Link>

          <Link to={`/projects/${projectId}/report`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Report</h3>
            <p className="muted">Open the client-facing report view.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
