import { Link, useNavigate, useParams } from "react-router-dom";
import { useDeleteProject, useProject, useUpdateProject } from "../features/projects/hooks";
import { ProjectForm } from "../features/projects/components/ProjectForm";
import { useOrganizations } from "../features/organizations/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";

export function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const updateMutation = useUpdateProject(projectId);
  const deleteMutation = useDeleteProject();
  const orgsQuery = useOrganizations();

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading settings" message="Preparing project branding, metadata, and report controls." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load project settings"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load project settings right now."}
      />
    );
  }

  if (!projectQuery.data) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested project settings page could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  const project = projectQuery.data;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Project Settings"
        description="Update project metadata, branding, and report text from one controlled settings workspace."
        actions={
          <>
            <Link to={`/projects/${projectId}`} className="link-button">Back to Project</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Open Report</Link>
          </>
        }
      />

      {project.logoUrl ? (
        <div className="panel" style={{ maxWidth: 360 }}>
          <h3 style={{ marginTop: 0 }}>Brand Preview</h3>
          <img src={project.logoUrl} alt="Project logo preview" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain" }} />
          <p className="muted" style={{ marginBottom: 0 }}>{project.reportHeader || "No report header set"}</p>
        </div>
      ) : null}

      <section className="panel" style={{ borderColor: "rgba(220,53,69,0.28)", background: "rgba(220,53,69,0.04)" }}>
        <h3 style={{ marginTop: 0 }}>Delete project</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Remove this whole project if you want to start fresh. This deletes the project, its sites, VLANs, comments, and related saved planning data.
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="danger-button"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              const confirmed = window.confirm(`Delete "${project.name}" and all of its saved planning data? This cannot be undone.`);
              if (!confirmed) return;
              await deleteMutation.mutateAsync(projectId);
              navigate(`/dashboard?deleted=1`);
            }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Project"}
          </button>
        </div>
      </section>

      <section className="panel">
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
    </section>
  );
}
