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
import { buildRecoveryFocusPlan } from "../lib/recoveryFocus";
import { buildRecoveryMasterRoadmapGate, buildRecoveryRoadmapStatus } from "../lib/recoveryRoadmap";
import { buildProjectWorkflowReview } from "../lib/projectWorkflow";

type TabLink = {
  key: string;
  label: string;
  path: string;
  description?: string;
};

type GroupLink = {
  key: string;
  label: string;
  path: string;
  summary: string;
  matchers: string[];
  children?: TabLink[];
};

function summaryPill(label: string, value: number | string) {
  return (
    <div className="metric-pill project-metric-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

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
  const openTasks = comments.filter((item) => item.taskStatus !== "DONE").length;
  const errorCount = validations.filter((item) => item.severity === "ERROR").length;
  const warningCount = validations.filter((item) => item.severity === "WARNING").length;
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const readiness = planningReadinessSummary(requirementsProfile);
  const synthesized = useMemo(() => synthesizeLogicalDesign(project, sites, vlans, requirementsProfile), [project, sites, vlans, requirementsProfile]);
  const focusPlan = useMemo(() => buildRecoveryFocusPlan(projectId, synthesized, errorCount), [projectId, synthesized, errorCount]);
  const recoveryReview = useMemo(() => buildRecoveryRoadmapStatus(synthesized), [synthesized]);
  const masterGate = useMemo(() => buildRecoveryMasterRoadmapGate(recoveryReview), [recoveryReview]);
  const workflowReview = useMemo(() => buildProjectWorkflowReview(projectId, synthesized, errorCount), [projectId, synthesized, errorCount]);
  const createdFromWizard = new URLSearchParams(location.search).get("created") === "1";

  const designTabs: TabLink[] = [
    { key: "logical-design", label: "Overview", path: `/projects/${projectId}/logical-design`, description: "Architecture and design summary" },
    { key: "core-model", label: "Core Model", path: `/projects/${projectId}/core-model`, description: "Unified engineering truth layer" },
    { key: "addressing", label: "Addressing", path: `/projects/${projectId}/addressing`, description: "Subnets, gateways, ranges" },
    { key: "security", label: "Security", path: `/projects/${projectId}/security`, description: "Zones and boundary model" },
    { key: "routing", label: "Routing", path: `/projects/${projectId}/routing`, description: "Routing and switching intent" },
    { key: "implementation", label: "Implementation", path: `/projects/${projectId}/implementation`, description: "Migration and cutover plan" },
    { key: "standards", label: "Standards", path: `/projects/${projectId}/standards`, description: "Config standards and templates" },
    { key: "platform", label: "Platform & BOM", path: `/projects/${projectId}/platform`, description: "Platform profile and BOM" },
  ];

  const deliverTabs: TabLink[] = [
    { key: "diagram", label: "Diagram", path: `/projects/${projectId}/diagram`, description: "Canvas and topology view" },
    { key: "report", label: "Report & Export", path: `/projects/${projectId}/report`, description: "Report preview and export" },
  ];

  const supportTabs: TabLink[] = [
    { key: "tasks", label: "Tasks", path: `/projects/${projectId}/tasks` },
    { key: "settings", label: "Settings", path: `/projects/${projectId}/settings` },
  ];

  const groups: GroupLink[] = [
    {
      key: "discovery",
      label: "Discovery",
      path: `/projects/${projectId}/discovery`,
      summary: "Ground the project in what exists today.",
      matchers: ["/discovery"],
    },
    {
      key: "requirements",
      label: "Requirements",
      path: `/projects/${projectId}/requirements`,
      summary: "Capture the planning brief and constraints.",
      matchers: ["/requirements"],
    },
    {
      key: "design",
      label: "Design Package",
      path: `/projects/${projectId}/logical-design`,
      summary: "Review the generated design in focused tabs.",
      matchers: ["/logical-design", "/overview", "/core-model", "/addressing", "/security", "/routing", "/implementation", "/standards", "/platform"],
      children: designTabs,
    },
    {
      key: "validation",
      label: "Validation",
      path: `/projects/${projectId}/validation`,
      summary: "Check blockers, warnings, and review items.",
      matchers: ["/validation"],
    },
    {
      key: "deliver",
      label: "Deliver",
      path: `/projects/${projectId}/report`,
      summary: "Diagram, report, and export the handoff package.",
      matchers: ["/diagram", "/report"],
      children: deliverTabs,
    },
  ];

  const workflowStages = groups.map((group) => ({
    key: group.key,
    label: group.label,
    path: group.path,
  }));

  const activeGroup = groups.find((group) => activeForPath(location.pathname, group.matchers))?.key
    ?? (activeForPath(location.pathname, ["/tasks", "/settings"]) ? "support" : "discovery");
  const activeStageIndex = workflowStages.findIndex((stage) => stage.key === activeGroup);
  const previousStage = activeStageIndex > 0 ? workflowStages[activeStageIndex - 1] : null;
  const nextStageLink = activeStageIndex >= 0 && activeStageIndex < workflowStages.length - 1 ? workflowStages[activeStageIndex + 1] : null;

  const tabSet = activeGroup === "design"
    ? designTabs
    : activeGroup === "deliver"
      ? deliverTabs
      : activeGroup === "support"
        ? supportTabs
        : [];



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
    <section className="project-workspace-page">
      {createdFromWizard ? (
        <div className="panel project-created-banner">
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Project created successfully</strong>
            <p className="muted" style={{ margin: 0 }}>
              Start by checking the discovery baseline, then move into requirements and the design package. The app now keeps those stages grouped instead of scattering them across the screen.
            </p>
          </div>
          <div className="form-actions">
            <Link to={`/projects/${projectId}/requirements`} className="link-button">Open Requirements</Link>
          </div>
        </div>
      ) : null}

      <div className="panel" style={{ display: "grid", gap: 10, borderColor: masterGate.status === "ready-for-master" ? "rgba(34,197,94,0.35)" : masterGate.status === "near-transition" ? "rgba(245,158,11,0.35)" : "rgba(59,130,246,0.28)", background: masterGate.status === "ready-for-master" ? "rgba(34,197,94,0.08)" : masterGate.status === "near-transition" ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.06)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className={masterGate.status === "ready-for-master" ? "badge badge-info" : masterGate.status === "near-transition" ? "badge badge-warning" : "badge-soft"}>
            {masterGate.status === "ready-for-master" ? "Ready for master roadmap" : masterGate.status === "near-transition" ? "Near master-roadmap handoff" : "Stay on recovery roadmap"}
          </span>
          <span className="badge-soft">Recovery ready {recoveryReview.completedCount}</span>
          <span className="badge-soft">Partial {recoveryReview.partialCount}</span>
          <span className="badge-soft">Pending {recoveryReview.pendingCount}</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>{masterGate.summary}</p>
        {masterGate.blockers.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {masterGate.blockers.slice(0, 2).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <header className="panel project-shell-header project-shell-header-compact">
        <div style={{ display: "grid", gap: 10 }}>
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
            <p className="muted" style={{ marginTop: 8 }}>{project.description || "Use discovery, requirements, and the design package tabs to turn this into a reviewable network plan."}</p>
          </div>
        </div>
        <div className="usage-metrics project-summary-metrics project-summary-metrics-compact">
          {summaryPill("Sites", sites.length)}
          {summaryPill("VLANs", vlans.length)}
          {summaryPill("Blockers", errorCount)}
          {summaryPill("Open tasks", openTasks)}
        </div>
      </header>

      <section className="project-workspace-shell">
        <aside className="panel project-sidebar project-sidebar-grouped">
          <div className="project-sidebar-header">
            <div>
              <h2 style={{ margin: "0 0 6px 0" }}>Project workspace</h2>
              <p className="muted" style={{ margin: 0 }}>
                The app is regrouped into fewer major stages so you can see where to start, where the design lives, and where delivery happens. v109 also keeps the current stage and previous/next movement more obvious.
              </p>
            </div>
            <span className="badge-soft">Scroll this menu independently</span>
          </div>

          <div className="project-sidebar-scroll">
            <nav className="project-group-nav">
              {groups.map((group) => {
                const isActive = activeGroup === group.key;
                return (
                  <div key={group.key} className="project-group-block">
                    <NavLink
                      to={group.path}
                      className={({ isActive: routeActive }) => (
                        isActive || routeActive ? "project-group-link active" : "project-group-link"
                      )}
                    >
                      <span>{group.label}</span>
                      <small>{group.summary}</small>
                    </NavLink>

                    {isActive && group.children ? (
                      <div className="project-subnav-list">
                        {group.children.map((tab) => (
                          <NavLink
                            key={tab.key}
                            to={tab.path}
                            className={({ isActive: routeActive }) => (routeActive ? "project-subnav-link active" : "project-subnav-link")}
                          >
                            <span>{tab.label}</span>
                            {tab.description ? <small>{tab.description}</small> : null}
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <details className="project-support-group" open={activeGroup === "support"}>
                <summary>Support</summary>
                <div className="project-subnav-list" style={{ marginTop: 10 }}>
                  {supportTabs.map((tab) => (
                    <NavLink
                      key={tab.key}
                      to={tab.path}
                      className={({ isActive }) => (isActive ? "project-subnav-link active" : "project-subnav-link")}
                    >
                      <span>{tab.label}</span>
                    </NavLink>
                  ))}
                </div>
              </details>
            </nav>
          </div>

          <div className="trust-note project-sidebar-footer recovery-focus-footer">
            <strong style={{ display: "block", marginBottom: 6 }}>Recovery focus</strong>
            <p className="muted" style={{ margin: 0 }}>{focusPlan.summary}</p>
            <div className="form-actions" style={{ marginTop: 10 }}>
              <Link to={focusPlan.primaryAction.path} className="link-button">{focusPlan.primaryAction.label}</Link>
              {focusPlan.supportActions.slice(0, 1).map((action) => (
                <Link key={action.key} to={action.path} className="link-button link-button-subtle">{action.label}</Link>
              ))}
            </div>
            <ul className="recovery-focus-signal-list">
              {focusPlan.focusSignals.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="project-main-shell">
          <section className="panel workflow-panel" style={{ display: "grid", gap: 14 }}>
            <div className="project-stage-strip-top">
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>Workflow stages</strong>
                <p className="muted" style={{ margin: 0 }}>Keep the recovery work honest by showing stage status, not just navigation. The app should make the next engineering move clearer than the surrounding controls.</p>
              </div>
              <div className="project-stage-focus-summary">
                <strong>{focusPlan.headline}</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>{focusPlan.summary}</p>
              </div>
            </div>
            <div className="workflow-stage-grid">
              {workflowReview.stages.map((stage, index) => {
                const isCurrent = activeGroup === stage.key;
                return (
                  <NavLink
                    key={stage.key}
                    to={stage.path}
                    className={() => `workflow-stage-card ${stage.status === "ready" ? "complete" : ""} ${isCurrent ? "current" : ""}`.trim()}
                  >
                    <div className="workflow-stage-topline">
                      <span className="workflow-stage-step">Step {index + 1}</span>
                      <span className="workflow-stage-status">{stage.statusLabel}</span>
                    </div>
                    <strong>{stage.label}</strong>
                    <p className="muted" style={{ margin: 0 }}>{stage.summary}</p>
                    {stage.blockers[0] ? <small className="muted">{stage.blockers[0]}</small> : null}
                  </NavLink>
                );
              })}
            </div>
            <div className="grid-2" style={{ alignItems: "start" }}>
              <div className="panel" style={{ padding: 14 }}>
                <strong style={{ display: "block", marginBottom: 8 }}>Current action queue</strong>
                <div style={{ display: "grid", gap: 10 }}>
                  {workflowReview.actionQueue.map((item) => (
                    <div key={item.key} style={{ display: "grid", gap: 6, borderBottom: "1px solid #edf1f7", paddingBottom: 10 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className={item.severity === "primary" ? "badge badge-info" : item.severity === "warning" ? "badge badge-warning" : "badge-soft"}>
                          {item.severity === "primary" ? "Primary" : item.severity === "warning" ? "Watch" : "Next"}
                        </span>
                        <strong>{item.title}</strong>
                      </div>
                      <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
                      <div>
                        <Link to={item.path} className={item.severity === "primary" ? "link-button" : "link-button link-button-subtle"}>{item.label}</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel" style={{ padding: 14, display: "grid", gap: 10 }}>
                <strong style={{ display: "block", marginBottom: 2 }}>Stage movement</strong>
                <p className="muted" style={{ margin: 0 }}>Keep previous, current, and next movement obvious, but do not let it outrank the stronger recovery action.</p>
                <div className="project-stage-actions">
                  {previousStage ? <Link to={previousStage.path} className="link-button link-button-subtle">Previous stage</Link> : <span className="muted">You are at the first stage.</span>}
                  <Link to={focusPlan.primaryAction.path} className="link-button">{focusPlan.primaryAction.label}</Link>
                  {nextStageLink ? <Link to={nextStageLink.path} className="link-button link-button-subtle">Next stage</Link> : <span className="muted">You are at the final delivery stage.</span>}
                </div>
              </div>
            </div>
          </section>
          {tabSet.length > 0 ? (
            <section className="panel project-tab-strip">
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>{activeGroup === "design" ? "Design Package" : activeGroup === "deliver" ? "Deliver" : "Support"}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {activeGroup === "design"
                    ? "Use these focused tabs instead of hunting through many separate top-level pages."
                    : activeGroup === "deliver"
                      ? "Diagram, report, and export now live together as the delivery area."
                      : "Secondary project tools live here instead of taking over the main workflow."}
                </p>
              </div>
              <div className="project-tab-links">
                {tabSet.map((tab) => (
                  <NavLink
                    key={tab.key}
                    to={tab.path}
                    className={({ isActive }) => (isActive ? "project-tab-link active" : "project-tab-link")}
                  >
                    {tab.label}
                  </NavLink>
                ))}
              </div>
            </section>
          ) : null}

          <Outlet />
        </main>
      </section>
    </section>
  );
}
