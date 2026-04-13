import { Link, useParams } from "react-router-dom";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { useProject, useProjectVlans } from "../features/projects/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const commentsQuery = useProjectComments(projectId);

  const project = projectQuery.data;
  const vlans = vlansQuery.data ?? [];
  const comments = commentsQuery.data ?? [];

  if (projectQuery.isLoading) return <LoadingState title="Loading diagram" message="Preparing the logical and physical diagram workspace." />;
  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load diagram workspace"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this diagram right now."}
        action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
      />
    );
  }
  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested diagram workspace could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  const enrichedProject = {
    ...project,
    sites: project.sites.map((site) => ({
      ...site,
      vlans: vlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
    })),
  };

  const openSiteTasks = comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === "SITE").length;
  const openVlanTasks = comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === "VLAN").length;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Diagram"
        description="A larger, calmer workspace for reviewing topology, segmentation, and communication-ready diagram views."
      />

      <div className="summary-grid">
        <div className="summary-card"><div className="muted">Sites in view</div><div className="value">{enrichedProject.sites.length}</div></div>
        <div className="summary-card"><div className="muted">VLANs represented</div><div className="value">{vlans.length}</div></div>
        <div className="summary-card"><div className="muted">Open site tasks</div><div className="value">{openSiteTasks}</div></div>
        <div className="summary-card"><div className="muted">Open VLAN tasks</div><div className="value">{openVlanTasks}</div></div>
      </div>

      <div className="workspace-grid">
        <div style={{ minWidth: 0 }}>
          <ProjectDiagram project={enrichedProject} comments={comments} />
        </div>

        <aside className="panel" style={{ display: "grid", gap: 12, alignSelf: "start" }}>
          <h2 style={{ margin: 0 }}>Diagram guide</h2>
          <div className="trust-note">
            <strong>How to use this page</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Use the diagram page to review structure and explain the design to others. Keep deep addressing and remediation work in the VLAN and validation pages.
            </p>
          </div>

          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Reading the logical and physical views</summary>
            <ul style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
              <li>Logical view is best for segmentation, VLAN boundaries, and subnet discussion.</li>
              <li>Physical view is best for quick infrastructure storytelling and handoff conversations.</li>
              <li>Open task markers help you see where review work is concentrated.</li>
            </ul>
          </details>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Recommended workflow</summary>
            <ol style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
              <li>Validate the project first.</li>
              <li>Use the diagram to present the intended structure.</li>
              <li>Use the report page for cleaner stakeholder-facing output.</li>
            </ol>
          </details>

          <div className="toolbar-row">
            <Link to={`/projects/${projectId}/validation`} className="link-button">Open Validation</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Open Report</Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
