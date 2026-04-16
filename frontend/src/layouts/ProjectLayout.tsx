import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile, planningReadinessSummary } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { buildProjectWorkflowReview } from "../lib/projectWorkflow";
import { buildRecoveryCompletionPlan } from "../lib/recoveryCompletionPlan";
import { buildWorkspaceIssuePath } from "../lib/workspaceIssue";

type WorkspaceLink = {
  key: string;
  label: string;
  path: string;
  description?: string;
};

type StageGroup = {
  key: string;
  label: string;
  path: string;
  summary: string;
  matchers: string[];
};

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

function activeForPath(pathname: string, matchers: string[]) {
  return matchers.some((matcher) => pathname.includes(matcher));
}

function metricPill(label: string, value: number | string) {
  return (
    <div className="metric-pill project-header-metric-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function ProjectLayout() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);
  const commentsQuery = useProjectComments(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validations = validationQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const readiness = planningReadinessSummary(requirementsProfile);
  const synthesized = useMemo(() => synthesizeLogicalDesign(project, sites, vlans, requirementsProfile), [project, sites, vlans, requirementsProfile]);
  const workflowReview = useMemo(() => buildProjectWorkflowReview(projectId, synthesized, validations.filter((item) => item.severity === "ERROR").length), [projectId, synthesized, validations]);
  const recoveryCompletion = useMemo(() => buildRecoveryCompletionPlan(projectId, synthesized, validations.filter((item) => item.severity === "ERROR").length), [projectId, synthesized, validations]);
  const isDiagramWorkspace = location.pathname.includes("/diagram");

  const errorCount = validations.filter((item) => item.severity === "ERROR").length;
  const warningCount = validations.filter((item) => item.severity === "WARNING").length;
  const unresolvedTaskCount = comments.filter((item) => item.taskStatus !== "DONE").length;
  const siteCount = Math.max(sites.length, synthesized.siteSummaries.length);
  const vlanCount = Math.max(vlans.length, synthesized.addressingPlan.length);
  const blockerCount = Math.max(errorCount, recoveryCompletion.mustFinish.length, workflowReview.actionQueue.filter((item) => item.severity !== "secondary").length);
  const openTaskCount = Math.max(unresolvedTaskCount, workflowReview.actionQueue.length);

  const stageGroups: StageGroup[] = [
    {
      key: "discovery",
      label: "Discovery",
      path: `/projects/${projectId}/discovery`,
      summary: "Current-state capture and baseline evidence.",
      matchers: ["/discovery"],
    },
    {
      key: "requirements",
      label: "Requirements",
      path: `/projects/${projectId}/requirements`,
      summary: "Planning brief, constraints, and scenario inputs.",
      matchers: ["/requirements"],
    },
    {
      key: "design",
      label: "Design Package",
      path: `/projects/${projectId}/logical-design`,
      summary: "Logical design views and engineering truth.",
      matchers: ["/logical-design", "/overview", "/core-model", "/addressing", "/security", "/routing", "/implementation", "/standards", "/platform", "/sites", "/vlans"],
    },
    {
      key: "validation",
      label: "Validation",
      path: `/projects/${projectId}/validation`,
      summary: "Findings, blockers, and review corrections.",
      matchers: ["/validation"],
    },
    {
      key: "deliver",
      label: "Deliver",
      path: `/projects/${projectId}/report`,
      summary: "Report, diagram, and handoff outputs.",
      matchers: ["/report", "/diagram"],
    },
  ];

  const activeStage = isDiagramWorkspace ? undefined : stageGroups.find((group) => activeForPath(location.pathname, group.matchers))?.key ?? "discovery";

  const discoveryLinks: WorkspaceLink[] = [
    { key: "summary", label: "Current state summary", path: `/projects/${projectId}/discovery?section=summary`, description: "Project baseline and saved discovery state." },
    { key: "extraction", label: "Extraction preview", path: `/projects/${projectId}/discovery?section=extraction`, description: "What discovery is already feeding into design." },
    { key: "authority", label: "Authority lift", path: `/projects/${projectId}/discovery?section=authority`, description: "Discovery-backed route and boundary anchors." },
    { key: "inputs", label: "Paste inputs", path: `/projects/${projectId}/discovery?section=inputs`, description: "Current-state notes, inventory, risks, and constraints." },
    { key: "coverage", label: "Coverage and gaps", path: `/projects/${projectId}/discovery?section=coverage`, description: "Coverage, highlights, parsed signals, and next inputs." },
  ];

  const requirementLinks: WorkspaceLink[] = [
    { key: "core", label: "Core use case", path: `/projects/${projectId}/requirements?step=core`, description: "Business goal, environment, and scope." },
    { key: "scenario", label: "Scenario", path: `/projects/${projectId}/requirements?step=scenario`, description: "Topology direction and conditional tracks." },
    { key: "security", label: "Security", path: `/projects/${projectId}/requirements?step=security`, description: "Trust boundaries, management, and remote access." },
    { key: "cloud", label: "Cloud / hybrid", path: `/projects/${projectId}/requirements?step=cloud`, description: "Cloud edge, hosted services, and boundary logic." },
    { key: "edge", label: "Edge & resilience", path: `/projects/${projectId}/requirements?step=edge`, description: "WAN edge, breakout, and resilience posture." },
    { key: "addressing", label: "Addressing", path: `/projects/${projectId}/requirements?step=addressing`, description: "Blocks, subnets, gateways, and growth." },
    { key: "operations", label: "Operations", path: `/projects/${projectId}/requirements?step=operations`, description: "Monitoring, logging, and manageability." },
    { key: "physical", label: "Physical / wireless", path: `/projects/${projectId}/requirements?step=physical`, description: "Site footprint, switching, wireless, and device classes." },
    { key: "apps-wan", label: "Apps & WAN", path: `/projects/${projectId}/requirements?step=apps-wan`, description: "Applications, flows, and WAN behavior." },
    { key: "implementation", label: "Implementation", path: `/projects/${projectId}/requirements?step=implementation`, description: "Execution constraints and rollout expectations." },
  ];

  const designLinks: WorkspaceLink[] = [
    { key: "design-summary", label: "Design summary", path: `/projects/${projectId}/logical-design?section=summary`, description: "Recovery gate, project basics, and current design posture." },
    { key: "design-topology", label: "Topology blueprint", path: `/projects/${projectId}/logical-design?section=topology`, description: "Topology behavior, placement highlights, and major paths." },
    { key: "design-truth", label: "Unified truth", path: `/projects/${projectId}/logical-design?section=truth`, description: "Shared model status and discovery-backed design foundation." },
    { key: "design-lld", label: "Site LLD", path: `/projects/${projectId}/logical-design?section=lld`, description: "Per-site low-level design and implementation posture." },
    { key: "design-traceability", label: "Traceability", path: `/projects/${projectId}/logical-design?section=traceability`, description: "Requirement-to-design traceability, risks, and next steps." },
    { key: "core-authority", label: "Core authority", path: `/projects/${projectId}/core-model?section=authority`, description: "Authority-source ledger and cleanup priorities." },
    { key: "core-sites", label: "Site truth", path: `/projects/${projectId}/core-model?section=sites`, description: "Per-site unification, unresolved refs, and linkage." },
    { key: "addressing-hierarchy", label: "Address hierarchy", path: `/projects/${projectId}/addressing?section=hierarchy`, description: "Organization/site blocks, route domains, and transit plan." },
    { key: "addressing-table", label: "Address table", path: `/projects/${projectId}/addressing?section=table`, description: "Implementation-ready logical addressing rows only." },
    { key: "security-boundaries", label: "Security boundaries", path: `/projects/${projectId}/security?section=boundaries`, description: "Boundary truth, zones, and trust model." },
    { key: "security-policy", label: "Policy matrix", path: `/projects/${projectId}/security?section=policy`, description: "Controls, segmentation review, and policy-intent flows." },
    { key: "routing-intent", label: "Routing intent", path: `/projects/${projectId}/routing?section=intent`, description: "Protocols, transport, summarization, switching, and QoS." },
    { key: "routing-flows", label: "Flow coverage", path: `/projects/${projectId}/routing?section=flows`, description: "Required path coverage and route-domain anchors." },
    { key: "implementation", label: "Implementation", path: `/projects/${projectId}/implementation`, description: "Migration and cutover posture." },
    { key: "platform", label: "Platform & BOM", path: `/projects/${projectId}/platform`, description: "Platform profile and BOM readiness." },
  ];

  const validationLinks: WorkspaceLink[] = [
    { key: "focus", label: "Current priorities", path: `/projects/${projectId}/validation?section=focus`, description: "Main issues and the order to address them." },
    { key: "health", label: "Health summary", path: `/projects/${projectId}/validation?section=health`, description: "Readiness, authority debt, and strongest signals." },
    { key: "findings", label: "Findings", path: `/projects/${projectId}/validation?section=findings`, description: "Errors, warnings, and issue list." },
    { key: "guidance", label: "Review guidance", path: `/projects/${projectId}/validation?section=guidance`, description: "Correction advice and AI fix helper." },
  ];

  const deliverLinks: WorkspaceLink[] = [
    { key: "diagram", label: "Diagram workspace", path: `/projects/${projectId}/diagram?section=canvas`, description: "Topology workspace and overlays." },
    { key: "assumptions", label: "Assumptions & constraints", path: `/projects/${projectId}/report?section=assumptions`, description: "Section 1 report content only." },
    { key: "naming", label: "Naming standard", path: `/projects/${projectId}/report?section=naming`, description: "Section 1A naming and site identity." },
    { key: "topology", label: "Topology & placement", path: `/projects/${projectId}/report?section=topology`, description: "Section 2 report content only." },
    { key: "addressing", label: "Addressing hierarchy", path: `/projects/${projectId}/report?section=addressing`, description: "Section 3 report content only." },
    { key: "services-security", label: "Services & boundaries", path: `/projects/${projectId}/report?section=services-security`, description: "Section 4 report content only." },
    { key: "routing-flows", label: "Routing & flows", path: `/projects/${projectId}/report?section=routing-flows`, description: "Section 5 report content only." },
    { key: "site-lld", label: "Site low-level design", path: `/projects/${projectId}/report?section=site-lld`, description: "Section 6 report content only." },
    { key: "validation", label: "Validation", path: `/projects/${projectId}/report?section=validation`, description: "Section 7 report content only." },
    { key: "implementation", label: "Implementation", path: `/projects/${projectId}/report?section=implementation`, description: "Section 8 report content only." },
    { key: "issues", label: "Open issues", path: `/projects/${projectId}/report?section=issues`, description: "Sections 9 and 10 report content only." },
  ];

  const workspaceLinks = activeStage === "discovery"
    ? discoveryLinks
    : activeStage === "requirements"
      ? requirementLinks
      : activeStage === "design"
        ? designLinks
        : activeStage === "validation"
          ? validationLinks
          : deliverLinks;

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading project workspace" message="Preparing the project shell and navigation." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load project workspace"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this project right now."}
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested project could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  return (
    <section className="project-workspace-page project-workspace-reset">
      <header className="panel project-header-card">
        <div className="project-header-main">
          <div className="project-header-copy">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
              <span className={approvalBadge(project.approvalStatus)}>{approvalLabel(project.approvalStatus)}</span>
              <span className="badge-soft">Requirements {readiness.completionLabel}</span>
              {warningCount > 0 ? <span className="badge-soft">Warnings {warningCount}</span> : null}
              <span className="muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
            <div>
              <h1 style={{ margin: "0 0 8px 0" }}>{project.name}</h1>
              <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization label set"}</p>
              <p className="muted" style={{ marginTop: 8 }}>{project.description || "Use the workflow stages below to move through discovery, requirements, design, validation, and delivery one focused card at a time."}</p>
            </div>
          </div>
          <div className="project-header-side">
            <div className="project-header-metrics">
              {metricPill("Sites", siteCount)}
              {metricPill("VLANs", vlanCount)}
              {metricPill("Blockers", blockerCount)}
              {metricPill("Open tasks", openTaskCount)}
            </div>
            <div className="project-header-actions">
              <Link to={`/projects/${projectId}/diagram?section=canvas`} className={location.pathname.includes("/diagram") ? "project-quick-link active" : "project-quick-link"}>Diagram</Link>
              <Link to={`/projects/${projectId}/report`} className={location.pathname.includes("/report") ? "project-quick-link active" : "project-quick-link"}>Reports</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="panel project-stage-strip-panel">
        <div className="project-stage-strip-reset">
          {stageGroups.map((group, index) => {
            const isActive = activeStage === group.key;
            return (
              <NavLink
                key={group.key}
                to={group.path}
                className={() => `project-stage-chip ${isActive ? "active" : ""}`.trim()}
              >
                <span className="project-stage-chip-step">Stage {index + 1}</span>
                <strong>{group.label}</strong>
                <small>{group.summary}</small>
              </NavLink>
            );
          })}
        </div>
      </section>

      <section className={`project-stage-workspace ${isDiagramWorkspace ? "project-stage-workspace-diagram" : ""}`.trim()}>
        {isDiagramWorkspace ? (
          <main className="project-stage-content-pane project-stage-content-pane-wide">
            <Outlet />
          </main>
        ) : (
          <>
            <aside className="panel project-stage-nav-pane">
              <div className="project-stage-nav-header">
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>{stageGroups.find((group) => group.key === activeStage)?.label || "Workspace"}</strong>
                  <p className="muted" style={{ margin: 0 }}>Choose one card on the left. Only that item should take over the working pane on the right.</p>
                </div>
                <span className="badge-soft">{workspaceLinks.length} cards</span>
              </div>

              <div className="project-stage-nav-list">
                {workspaceLinks.map((item) => {
                  const isExactPath = location.pathname === item.path.split("?")[0] && location.search === (item.path.includes("?") ? `?${item.path.split("?")[1]}` : "");
                  return (
                    <Link key={item.key} to={item.path} className={`project-stage-nav-link ${isExactPath ? "active" : ""}`.trim()}>
                      <span>{item.label}</span>
                      {item.description ? <small>{item.description}</small> : null}
                    </Link>
                  );
                })}
              </div>

              <details className="project-action-center">
                <summary>
                  <span>Action Center</span>
                  <span className="badge-soft">{workflowReview.actionQueue.length}</span>
                </summary>
                <div className="project-action-center-list">
                  {workflowReview.actionQueue.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>No open action items are currently being surfaced.</p>
                  ) : workflowReview.actionQueue.map((item) => {
                    const issuePath = buildWorkspaceIssuePath(item.path, { key: item.key, title: item.title, detail: item.detail });
                    return (
                      <Link key={item.key} to={issuePath} className={`project-action-center-link ${item.severity === "primary" ? "primary" : item.severity === "warning" ? "warning" : "secondary"}`}>
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </Link>
                    );
                  })}
                </div>
              </details>

              <div className="project-stage-nav-footer">
                <Link to={`/projects/${projectId}/tasks`} className="link-button link-button-subtle">Tasks</Link>
                <Link to={`/projects/${projectId}/settings`} className="link-button link-button-subtle">Settings</Link>
              </div>
            </aside>

            <main className="project-stage-content-pane">
              <Outlet />
            </main>
          </>
        )}
      </section>
    </section>
  );
}
