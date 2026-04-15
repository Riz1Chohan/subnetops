import { Link, useSearchParams } from "react-router-dom";
import { useProjects } from "../features/projects/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { useAssignedTasks } from "../features/comments/hooks";
import { UsageBanner } from "../components/app/UsageBanner";
import { ProjectCard } from "../features/projects/components/ProjectCard";
import { EmptyState } from "../components/app/EmptyState";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";

export function DashboardPage() {
  const projectsQuery = useProjects();
  const authQuery = useCurrentUser();
  const assignedTasksQuery = useAssignedTasks();
  const [searchParams, setSearchParams] = useSearchParams();

  const projects = [...(projectsQuery.data ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const assignedTasks = assignedTasksQuery.data ?? [];
  const overdueCount = assignedTasks.filter((task) => task.dueDate && task.taskStatus !== "DONE" && new Date(task.dueDate).getTime() < Date.now()).length;

  const createdProjectId = searchParams.get("projectId");
  const createdName = searchParams.get("name");
  const created = searchParams.get("created") === "1";
  const deleted = searchParams.get("deleted") === "1";
  const warning = searchParams.get("warning");

  const dismissBanner = () => {
    const next = new URLSearchParams(searchParams);
    ["created", "deleted", "projectId", "name", "warning"].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Dashboard"
        description="A control tower for your network planning portfolio, review workload, and next actions."
        actions={<Link to="/projects/new"><button type="button">Create Project</button></Link>}
      />

      {created ? (
        <div className="panel" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", borderColor: "rgba(40,167,69,0.35)", background: "rgba(40,167,69,0.08)" }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Project created successfully</strong>
            <p className="muted" style={{ margin: 0 }}>
              {createdName ? `"${createdName}" is now in your project list.` : "Your project is now in the dashboard."}
              {warning ? ` ${warning}` : " Open it to continue with discovery, requirements, and the design package."}
            </p>
          </div>
          <div className="form-actions">
            {createdProjectId ? <Link to={`/projects/${createdProjectId}/discovery`} className="link-button">Open project</Link> : null}
            <button type="button" className="link-button" onClick={dismissBanner}>Dismiss</button>
          </div>
        </div>
      ) : null}

      {deleted ? (
        <div className="panel" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", borderColor: "rgba(220,53,69,0.25)", background: "rgba(220,53,69,0.06)" }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Project deleted</strong>
            <p className="muted" style={{ margin: 0 }}>The project was removed so you can start fresh without old data hanging around.</p>
          </div>
          <button type="button" className="link-button" onClick={dismissBanner}>Dismiss</button>
        </div>
      ) : null}

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        projectCount={projects.length}
      />

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className="panel">
          <p className="muted" style={{ marginBottom: 8 }}>Projects</p>
          <h2 style={{ margin: 0 }}>{projects.length}</h2>
        </div>
        <div className="panel">
          <p className="muted" style={{ marginBottom: 8 }}>Assigned tasks</p>
          <h2 style={{ margin: 0 }}>{assignedTasks.length}</h2>
        </div>
        <div className="panel">
          <p className="muted" style={{ marginBottom: 8 }}>Overdue tasks</p>
          <h2 style={{ margin: 0 }}>{overdueCount}</h2>
        </div>
        <div className="panel">
          <p className="muted" style={{ marginBottom: 8 }}>Next step</p>
          <p style={{ margin: 0 }}>Open a recently updated network plan, or start a new office, clinic, school, or warehouse draft with AI.</p>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>Recent network workspaces</h2>
              <p className="muted" style={{ margin: "6px 0 0 0" }}>Sorted by most recently updated.</p>
            </div>
            <Link to="/my-tasks" className="link-button">Open My Tasks</Link>
          </div>
          {projectsQuery.isLoading ? (
            <LoadingState title="Loading projects" message="Gathering your project list and summaries." />
          ) : projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              message="Create your first network workspace or start with the AI planning assistant to avoid the blank-page problem."
              action={<Link to="/projects/new"><button type="button">Create your first project</button></Link>}
            />
          ) : (
            <div className="grid-cards" style={{ marginTop: 12 }}>
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Network AI starters</h2>
            <p className="muted" style={{ margin: 0 }}>
              Start from a plain-English description and let SubnetOps generate the first draft for sites, VLANs, subnet sizes, and gateways.
            </p>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Use office, clinic, school lab, or warehouse starter prompts.</li>
            <li>Generate a draft instead of starting from a blank form.</li>
            <li>Review assumptions and apply only the parts you want.</li>
          </ul>
          <div className="form-actions">
            <Link to="/projects/new"><button type="button">Open AI Project Starter</button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
