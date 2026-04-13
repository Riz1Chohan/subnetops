import { useNavigate } from "react-router-dom";
import { ProjectForm } from "../features/projects/components/ProjectForm";
import { useOrganizations } from "../features/organizations/hooks";
import { useCreateProject } from "../features/projects/hooks";

export function NewProjectPage() {
  const navigate = useNavigate();
  const mutation = useCreateProject();
  const orgsQuery = useOrganizations();

  return (
    <section className="panel">
      <h1>Create project</h1>
      <p className="muted">Start a new network planning workspace for a customer, office, school, or lab.</p>
      <ProjectForm
        organizations={orgsQuery.data ?? []}
        isSubmitting={mutation.isPending}
        onSubmit={async (values) => {
          const project = await mutation.mutateAsync(values);
          navigate(`/projects/${project.id}`);
        }}
      />
    </section>
  );
}
