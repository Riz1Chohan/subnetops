import { Link, useParams } from "react-router-dom";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { useProject, useProjectVlans } from "../features/projects/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile } from "../lib/requirementsProfile";

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const commentsQuery = useProjectComments(projectId);

  const project = projectQuery.data;
  const vlans = vlansQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);

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
        description="Network-style logical and topology views that are closer to real infrastructure storytelling than an abstract decision tree."
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
            <strong>How this is different now</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              The diagram page now aims to look and read more like a network plan, with a visible internet edge, firewall/core structure, site containers, and recognizable topology flow.
            </p>
          </div>

          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Reading the two views</summary>
            <ul style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
              <li><strong>Logical Design</strong> is best for segmentation, site blocks, VLAN structure, and design review.</li>
              <li><strong>Physical / Topology</strong> is best for presenting perimeter, core, branch attachment, and local edge components.</li>
              <li>Task markers still show where review work is concentrated.</li>
            </ul>
          </details>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Recommended workflow</summary>
            <ol style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
              <li>Run validation first so the diagram reflects a cleaner design state.</li>
              <li>Use the logical view for engineering review.</li>
              <li>Use the physical/topology view for handoff and explanation.</li>
            </ol>
          </details>

          {(requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected) ? (
            <div className="trust-note">
              <strong>Cloud / hybrid planning context</strong>
              <p className="muted" style={{ margin: "6px 0 0 0" }}>
                This project assumes {requirementsProfile.cloudProvider} over {requirementsProfile.cloudConnectivity}, with {requirementsProfile.cloudHostingModel}. The diagram should be read with a cloud boundary of {requirementsProfile.cloudIdentityBoundary} and a traffic model of {requirementsProfile.cloudTrafficBoundary}.
              </p>
            </div>
          ) : null}

          <div className="toolbar-row">
            <Link to={`/projects/${projectId}/validation`} className="link-button">Open Validation</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Open Report</Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
