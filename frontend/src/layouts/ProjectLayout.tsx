import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile, planningReadinessSummary } from "../lib/requirementsProfile";

const projectNavItems = [
  { key: "requirements", label: "Requirements" },
  { key: "logical-design", label: "Logical Design" },
  { key: "validation", label: "Validation" },
  { key: "diagram", label: "Diagram" },
  { key: "report", label: "Report / Export" },
  { key: "tasks", label: "Tasks" },
  { key: "settings", label: "Settings" },
];

const workflowStages = [
  { key: "requirements", label: "Requirements", route: "requirements", description: "Capture the planning brief, environment, security posture, and delivery assumptions." },
  { key: "logical-design", label: "Logical Design", route: "logical-design", description: "Shape sites, addressing, segmentation, and the core network structure from the saved requirements." },
  { key: "validation", label: "Validation", route: "validation", description: "Review conflicts, capacity, gateway logic, and overall design health before diagramming or handoff." },
  { key: "diagram", label: "Diagram", route: "diagram", description: "Translate the design into logical and topology views for review and communication." },
  { key: "report", label: "Report / Export", route: "report", description: "Turn the project into a clean handoff summary for review, export, and delivery." },
] as const;

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

function workflowStateForIndex(index: number, activeIndex: number) {
  if (index < activeIndex) return "complete";
  if (index === activeIndex) return "current";
  return "upcoming";
}

function workflowStatusLabel(stageKey: string, readinessLabel: string, errorCount: number, sitesCount: number, vlanCount: number) {
  if (stageKey === "requirements") {
    if (readinessLabel === "Review-ready" || readinessLabel === "Mostly shaped") return "Ready";
    return "Needs review";
  }

  if (stageKey === "logical-design") {
    if (sitesCount > 0 || vlanCount > 0) return "In progress";
    return "Not started";
  }

  if (stageKey === "validation") {
    if (errorCount > 0) return `${errorCount} error${errorCount === 1 ? "" : "s"}`;
    if (sitesCount > 0 || vlanCount > 0) return "Clear";
    return "Pending design";
  }

  if (stageKey === "diagram") {
    if (sitesCount > 0 || vlanCount > 0) return "Available";
    return "Waiting on design";
  }

  if (stageKey === "report") {
    if (sitesCount > 0 || vlanCount > 0) return "Ready to review";
    return "Waiting on design";
  }

  return "Review";
}

export function ProjectLayout() {
  const { projectId = "" } = useParams();
  const location = useLocation();
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
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const readiness = planningReadinessSummary(requirementsProfile);
  const activeStageIndex = Math.max(0, workflowStages.findIndex((stage) => location.pathname.includes(`/${stage.route}`)));
  const currentStage = workflowStages[activeStageIndex] ?? workflowStages[0];
  const nextStage = workflowStages[activeStageIndex + 1] ?? null;

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
            <Link to={`/projects/${projectId}/requirements`} className="link-button">Requirements</Link>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Logical Design</Link>
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

      <section className="panel workflow-panel" style={{ display: "grid", gap: 14 }}>
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0 }}>Workflow progress</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              SubnetOps is meant to move a plan from requirements through review and handoff. The current workspace stage is highlighted below.
            </p>
          </div>
          <div className="workflow-meta">
            <span className="badge-soft">Current stage: {currentStage.label}</span>
            <span className="badge-soft">Requirements: {readiness.completionLabel}</span>
            {nextStage ? <span className="badge-soft">Next: {nextStage.label}</span> : <span className="badge-soft">Next: Final review</span>}
          </div>
        </div>

        <div className="workflow-stage-grid">
          {workflowStages.map((stage, index) => {
            const state = workflowStateForIndex(index, activeStageIndex);
            const statusLabel = workflowStatusLabel(stage.key, readiness.completionLabel, errorCount, sites.length, vlans.length);
            return (
              <Link
                key={stage.key}
                to={`/projects/${projectId}/${stage.route}`}
                className={`workflow-stage-card ${state}`}
              >
                <div className="workflow-stage-topline">
                  <span className="workflow-stage-step">Stage {index + 1}</span>
                  <span className="workflow-stage-status">{statusLabel}</span>
                </div>
                <strong>{stage.label}</strong>
                <p className="muted" style={{ margin: 0 }}>{stage.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

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
          <div className="trust-note" style={{ marginTop: 16 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>Current workflow focus</strong>
            <p className="muted" style={{ margin: 0 }}>
              <strong>{currentStage.label}</strong> is active now. {currentStage.description}{" "}
              {nextStage ? `When this stage feels solid, move next into ${nextStage.label}.` : "This is the final handoff stage for the current workflow."}
            </p>
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          <Outlet />
        </main>
      </section>
    </section>
  );
}
