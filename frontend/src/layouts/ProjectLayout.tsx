import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";

const projectNavItems = [
  { key: "overview", label: "Overview" },
  { key: "sites", label: "Sites" },
  { key: "vlans", label: "VLANs" },
  { key: "validation", label: "Validation" },
  { key: "diagram", label: "Diagram" },
  { key: "tasks", label: "Tasks" },
  { key: "report", label: "Report" },
  { key: "settings", label: "Settings" },
];

function summaryPill(label: string, value: number | string) {
  return (
    <div className="metric-pill project-metric-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function approvalBadge(approvalStatus?: string) {
  if (approvalStatus === "APPROVED") return "badge badge-info";
  if (approvalStatus === "IN_REVIEW") return "badge badge-warning";
  return "badge badge-info";
}

function approvalLabel(approvalStatus?: string) {
  if (approvalStatus === "APPROVED") return "Approved";
  if (approvalStatus === "IN_REVIEW") return "In Review";
  return "Draft";
}

export function ProjectLayout() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);
  const commentsQuery = useProjectComments(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validations = validationQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const openTasks = comments.filter((item) => item.taskStatus !== "DONE").length;
  const errorCount = validations.filter((item) => item.severity === "ERROR").length;

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading project workspace" message="Preparing the project shell and navigation." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load project workspace"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this project right now."}
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested project could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="panel project-shell-header">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
            <span className={approvalBadge(project.approvalStatus)}>{approvalLabel(project.approvalStatus)}</span>
            <span className="muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
          <div>
            <h1 style={{ marginBottom: 8 }}>{project.name}</h1>
            <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization label set"}</p>
            <p className="muted" style={{ marginTop: 8 }}>{project.description || "No description yet."}</p>
          </div>
          <div className="form-actions">
            <Link to={`/projects/${projectId}/validation`} className="link-button">Validation</Link>
            <Link to={`/projects/${projectId}/diagram`} className="link-button">Diagram</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Report</Link>
          </div>
        </div>
        <div className="usage-metrics project-summary-metrics">
          {summaryPill("Sites", sites.length)}
          {summaryPill("VLANs", vlans.length)}
          {summaryPill("Errors", errorCount)}
          {summaryPill("Open tasks", openTasks)}
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}>
        <aside className="panel project-sidebar" style={{ position: "sticky", top: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Workspace</h2>
          <nav style={{ display: "grid", gap: 8 }}>
            {projectNavItems.map((item) => (
              <NavLink
                key={item.key}
                to={`/projects/${projectId}/${item.key}`}
                className={({ isActive }) => (isActive ? "project-nav-link active" : "project-nav-link")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main style={{ minWidth: 0 }}>
          <Outlet />
        </main>
      </section>
    </section>
  );
}
