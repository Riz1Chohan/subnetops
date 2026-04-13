import { Link } from "react-router-dom";
import type { Project } from "../../../lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className="card-link">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>{project.name}</h3>
        {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
      </div>
      <p className="muted">{project.organizationName || "No organization set"}</p>
      <small className="muted">{project.basePrivateRange || "No base range"}</small>
      {project.taskSummary ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className="badge badge-warning">Open: {project.taskSummary.open}</span>
          <span className={project.taskSummary.overdue > 0 ? "badge badge-error" : "badge badge-info"}>Overdue: {project.taskSummary.overdue}</span>
        </div>
      ) : null}
    </Link>
  );
}
