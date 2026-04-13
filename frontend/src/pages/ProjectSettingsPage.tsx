import { Link, useNavigate, useParams } from "react-router-dom";
import { useProject, useUpdateProject } from "../features/projects/hooks";
import { ProjectForm } from "../features/projects/components/ProjectForm";
import { useOrganizations } from "../features/organizations/hooks";

export function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const updateMutation = useUpdateProject(projectId);
  const orgsQuery = useOrganizations();

  if (projectQuery.isLoading) return <p className="muted">Loading settings...</p>;
  if (!projectQuery.data) return <p className="error-text">Project not found.</p>;

  const project = projectQuery.data;

  return (
    <section className="panel" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Project Settings</h1>
          <p className="muted" style={{ margin: 0 }}>Update project metadata, branding, and report text.</p>
        </div>
        <div className="actions">
          <Link to={`/projects/${projectId}`} className="link-button">Back to Project</Link>
          <Link to={`/projects/${projectId}/report`} className="link-button">Open Report</Link>
        </div>
      </div>

      {project.logoUrl ? (
        <div className="panel" style={{ maxWidth: 360 }}>
          <h3 style={{ marginTop: 0 }}>Brand Preview</h3>
          <img src={project.logoUrl} alt="Project logo preview" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain" }} />
          <p className="muted" style={{ marginBottom: 0 }}>{project.reportHeader || "No report header set"}</p>
        </div>
      ) : null}

      <ProjectForm
        organizations={orgsQuery.data ?? []}
        initialValues={project}
        submitLabel="Save settings"
        isSubmitting={updateMutation.isPending}
        onSubmit={async (values) => {
          await updateMutation.mutateAsync(values);
          navigate(`/projects/${projectId}`);
        }}
      />
    </section>
  );
}
