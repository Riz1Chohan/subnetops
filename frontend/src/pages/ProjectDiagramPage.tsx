import { Link, useParams } from "react-router-dom";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { useProject, useProjectVlans } from "../features/projects/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { useValidationResults } from "../features/validation/hooks";
import { buildValidationFixPath, validationFixLabel } from "../lib/validationFixLink";

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const commentsQuery = useProjectComments(projectId);
  const validationQuery = useValidationResults(projectId);

  const project = projectQuery.data;
  const vlans = vlansQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const validations = validationQuery.data ?? [];
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
  const cloudContext = requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected;
  const topValidationItems = validations.filter((item) => item.severity !== "INFO").slice(0, 5);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Diagram workspace"
        description="The diagram is now treated like a main artifact, not a squeezed side card. Use this stage for design review, report cross-checking, validation comparison, and export."
        actions={(
          <div className="form-actions">
            <Link to={`/projects/${projectId}/validation`} className="link-button">Open Validation</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Open Deliver Area</Link>
          </div>
        )}
      />

      <div className="panel diagram-stage-shell">
        <div className="diagram-stage-meta">
          <div className="network-chip-list">
            <span className="badge-soft">Sites {enrichedProject.sites.length}</span>
            <span className="badge-soft">VLANs {vlans.length}</span>
            <span className="badge-soft">Site tasks {openSiteTasks}</span>
            <span className="badge-soft">VLAN tasks {openVlanTasks}</span>
            <span className="badge-soft">Mode-ready for export</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            The canvas below gets priority on widescreen layouts. In v100 the diagram also carries topology-specific interface labels, device-level validation emphasis, explicit zone labels on perimeter/core segments, and naming aligned more tightly with the report.
          </p>
        </div>

        <div className="diagram-canvas-panel">
          <ProjectDiagram project={enrichedProject} comments={comments} validations={validations} />
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Diagram ↔ report cross-check</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ marginBottom: 8 }}><strong>Placement</strong> should match report section 2 and the site-by-site design section.</li>
            <li style={{ marginBottom: 8 }}><strong>Addressing</strong> should match report section 3 exactly, including block labels and gateways.</li>
            <li style={{ marginBottom: 8 }}><strong>Security</strong> should match report section 4, especially DMZ placement, attached devices, and peers.</li>
            <li style={{ marginBottom: 0 }}><strong>Flows</strong> should match report section 7 and the validation findings if a path or boundary looks wrong.</li>
          </ul>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Validation items to keep beside the diagram</strong>
          {topValidationItems.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No active validation blockers or warnings are open right now.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topValidationItems.map((item) => (
                <div key={item.id} className="panel" style={{ padding: 12, background: "rgba(17,24,39,0.02)" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span className="badge-soft">{item.severity}</span>
                    <span className="badge-soft">{item.ruleCode}</span>
                  </div>
                  <p style={{ margin: "0 0 6px 0", fontWeight: 700 }}>{item.title}</p>
                  <p className="muted" style={{ margin: 0 }}>{item.message}</p>
                  <div style={{ marginTop: 8 }}>
                    <Link to={buildValidationFixPath(projectId, item)} className="link-button">{validationFixLabel(item)}</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <details className="panel diagram-guide-panel">
        <summary>Diagram reading guide and workflow tips</summary>
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <div className="trust-note">
            <strong>Reading the views</strong>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
              <li><strong>Logical Design</strong> is best for segmentation, site blocks, VLAN structure, and engineering review.</li>
              <li><strong>Physical / Topology</strong> is best for presenting perimeter, core, branch attachment, and local edge components.</li>
              <li>Task markers still show where review work is concentrated.</li>
            </ul>
          </div>

          <div className="grid-2" style={{ alignItems: "start" }}>
            <div className="panel" style={{ padding: 14 }}>
              <strong style={{ display: "block", marginBottom: 8 }}>Recommended workflow</strong>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                <li>Run validation first so the diagram reflects a cleaner design state.</li>
                <li>Use the logical view for engineering review.</li>
                <li>Use the physical/topology view for handoff and explanation.</li>
              </ol>
            </div>

            {cloudContext ? (
              <div className="panel" style={{ padding: 14 }}>
                <strong style={{ display: "block", marginBottom: 8 }}>Cloud / hybrid planning context</strong>
                <p className="muted" style={{ margin: 0 }}>
                  This project assumes {requirementsProfile.cloudProvider} over {requirementsProfile.cloudConnectivity}, with {requirementsProfile.cloudHostingModel}. The diagram should be read with a cloud boundary of {requirementsProfile.cloudIdentityBoundary} and a traffic model of {requirementsProfile.cloudTrafficBoundary}.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}
