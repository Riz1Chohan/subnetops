import { Link } from "react-router-dom";
import type { Project } from "../../../lib/types";

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

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className="card-link">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>{project.name}</h3>
        {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>{project.organizationName || "No organization set"}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span className={approvalBadge(project.approvalStatus)}>{approvalLabel(project.approvalStatus)}</span>
        {project.basePrivateRange ? <span className="badge-soft">{project.basePrivateRange}</span> : null}
        <span className="muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
      </div>
      <small className="muted">Network planning workspace</small>
      {project.taskSummary ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className="badge badge-warning">Open: {project.taskSummary.open}</span>
          <span className={project.taskSummary.overdue > 0 ? "badge badge-error" : "badge badge-info"}>Overdue: {project.taskSummary.overdue}</span>
        </div>
      ) : null}
    </Link>
  );
}
