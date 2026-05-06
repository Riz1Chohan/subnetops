import { Link, useNavigate } from "react-router-dom";
import { useDeleteProject } from "../hooks";
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
  const navigate = useNavigate();
  const deleteMutation = useDeleteProject();

  return (
    <article className="panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>{project.name}</h3>
          <p className="muted" style={{ marginTop: 0, marginBottom: 0 }}>{project.organizationName || "No organization set"}</p>
        </div>
        {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span className={approvalBadge(project.approvalStatus)}>{approvalLabel(project.approvalStatus)}</span>
        {project.basePrivateRange ? <span className="badge-soft">{project.basePrivateRange}</span> : null}
        <span className="muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
      </div>

      <small className="muted">Network planning workspace</small>

      {project.taskSummary ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge badge-warning">Open: {project.taskSummary.open}</span>
          <span className={project.taskSummary.overdue > 0 ? "badge badge-error" : "badge badge-info"}>Overdue: {project.taskSummary.overdue}</span>
        </div>
      ) : null}

      <div className="form-actions" style={{ marginTop: 4, flexWrap: "wrap" }}>
        <Link to={`/projects/${project.id}`} className="link-button">Open</Link>
        <Link to={`/projects/${project.id}/settings`} className="link-button">Settings</Link>
        <button
          type="button"
          className="danger-button"
          disabled={deleteMutation.isPending}
          onClick={async () => {
            const confirmed = window.confirm(`Delete "${project.name}" and all of its saved planning data? This cannot be undone.`);
            if (!confirmed) return;
            await deleteMutation.mutateAsync(project.id);
            navigate(`/dashboard?deleted=1`);
          }}
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}
