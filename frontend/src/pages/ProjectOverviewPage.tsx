import { Link, useLocation, useParams } from "react-router-dom";
// PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH
import { useMemo } from "react";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useAuthoritativeDesign } from "../features/designCore/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { UsageBanner } from "../components/app/UsageBanner";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile, planningReadinessSummary } from "../lib/requirementsProfile";
import { analyzeDiscoveryWorkspaceState, resolveDiscoveryWorkspaceState } from "../lib/discoveryFoundation";
import { resolvePlatformProfileState, synthesizePlatformBomFoundation } from "../lib/platformBomFoundation";
import { buildRecoveryFocusPlan } from "../lib/recoveryFocus";
import { buildRecoveryCompletionPlan } from "../lib/recoveryCompletionPlan";
import { WorkspaceIssueBanner } from "../components/app/WorkspaceIssueBanner";
import { parseWorkspaceIssueNotice } from "../lib/workspaceIssue";

function summaryCard(label: string, value: number | string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
    </div>
  );
}

function designFactCard(title: string, detail: string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{title}</p>
      <p style={{ margin: 0 }}>{detail}</p>
    </div>
  );
}

function validationHealthLabel(errorCount: number, warningCount: number) {
  if (errorCount === 0 && warningCount === 0) return "Clean";
  if (errorCount === 0) return `Warnings only (${warningCount})`;
  return `${errorCount} error${errorCount === 1 ? "" : "s"}`;
}

export function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const authQuery = useCurrentUser();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validationItems = validationQuery.data ?? [];

  const errorCount = validationItems.filter((item) => item.severity === "ERROR").length;
  const warningCount = validationItems.filter((item) => item.severity === "WARNING").length;
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const requirementsReadiness = planningReadinessSummary(requirementsProfile);
  const { synthesized, designCore } = useAuthoritativeDesign(projectId, project, sites, vlans, requirementsProfile);
  const phase19AiDraftHelper = designCore?.phase19AiDraftHelper;
  const phase20FinalProofPass = designCore?.phase20FinalProofPass;

  const discoverySummary = useMemo(
    () => analyzeDiscoveryWorkspaceState({ project, sites, vlans, state: resolveDiscoveryWorkspaceState(projectId, project) }),
    [projectId, project, sites, vlans],
  );

  const platformFoundation = useMemo(
    () => synthesizePlatformBomFoundation({ project, sites, vlans, profile: requirementsProfile, synthesized, state: resolvePlatformProfileState(projectId, project) }),
    [projectId, project, sites, vlans, requirementsProfile, synthesized],
  );
  const focusPlan = useMemo(() => buildRecoveryFocusPlan(projectId, synthesized, errorCount), [projectId, synthesized, errorCount]);
  const recoveryCompletion = useMemo(() => buildRecoveryCompletionPlan(projectId, synthesized, errorCount), [projectId, synthesized, errorCount]);
  const selectedSection = new URLSearchParams(location.search).get("section");
  const isFocusedSectionView = Boolean(selectedSection);
  const issueNotice = parseWorkspaceIssueNotice(location.search);
  const focusKey = issueNotice?.focus;
  const focusClass = (key: string) => `panel workspace-focus-target ${focusKey === key ? "active" : ""}`.trim();

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading logical design" message="Preparing the synthesized HLD, LLD, and addressing outputs." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load logical design"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this project right now."}
      />
    );
  }

  if (!selectedSection) {
    return (
      <section style={{ display: "grid", gap: 18 }}>
        <div className="panel workspace-selection-blank">
          <p className="workspace-detail-kicker">Design Package</p>
          <h2 style={{ margin: "0 0 8px 0" }}>Select a card from the left pane</h2>
          <p className="muted" style={{ margin: 0 }}>Choose a design-package card from the left pane to open that focused engineering slice.</p>
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested project could not be found or may no longer be available."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  const decisions = synthesized.designReview.filter((item) => item.kind === "decision");
  const assumptions = synthesized.designReview.filter((item) => item.kind === "assumption");
  const risks = synthesized.designReview.filter((item) => item.kind === "risk");
  const focusedSectionTitle = selectedSection === "summary"
    ? "Design summary"
    : selectedSection === "topology"
      ? "Topology blueprint"
      : selectedSection === "truth"
        ? "Unified design truth"
        : selectedSection === "lld"
          ? "Site low-level design"
          : selectedSection === "traceability"
            ? "Traceability and implementation next steps"
            : "Logical design";

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Logical Design"
        description="This workspace should read like an engineer's HLD/LLD package: architecture intent, logical domains, per-site low-level design, and the addressing model that supports implementation later."
        actions={
          <div className="overview-actions-shell">
            <div className="overview-primary-actions">
              <Link to={focusPlan.primaryAction.path} className="link-button">{focusPlan.primaryAction.label}</Link>
              {focusPlan.supportActions.slice(0, 2).map((action) => (
                <Link key={action.key} to={action.path} className="link-button link-button-subtle">{action.label}</Link>
              ))}
            </div>
            <details className="overview-more-actions">
              <summary>Supporting workspace links</summary>
              <div className="overview-more-actions-grid">
                <Link to={`/projects/${projectId}/core-model`} className="link-button link-button-subtle">Core Model</Link>
                <Link to={`/projects/${projectId}/addressing`} className="link-button link-button-subtle">Addressing</Link>
                <Link to={`/projects/${projectId}/security`} className="link-button link-button-subtle">Security</Link>
                <Link to={`/projects/${projectId}/routing`} className="link-button link-button-subtle">Routing</Link>
                <Link to={`/projects/${projectId}/diagram`} className="link-button link-button-subtle">Diagram</Link>
                <Link to={`/projects/${projectId}/report`} className="link-button link-button-subtle">Report</Link>
                <Link to={`/projects/${projectId}/validation`} className="link-button link-button-subtle">Validation</Link>
              </div>
            </details>
          </div>
        }
      />

      {isFocusedSectionView ? (
        <div className="panel workspace-detail-hero">
          <div>
            <p className="workspace-detail-kicker">Design Package</p>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>{focusedSectionTitle}</h2>
            <p className="muted" style={{ margin: 0 }}>Focused design view so the right pane only shows one strong design slice at a time.</p>
          </div>
        </div>
      ) : null}

      <WorkspaceIssueBanner notice={issueNotice} />

      <div className={`${focusClass("traceability")} recovery-focus-panel`} style={{ display: selectedSection && selectedSection !== "summary" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Current recovery focus</h2>
          <p className="muted" style={{ margin: 0 }}>{focusPlan.summary}</p>
        </div>
        <div className="recovery-focus-grid">
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>{focusPlan.headline}</strong>
            <div className="form-actions">
              <Link to={focusPlan.primaryAction.path} className="link-button">{focusPlan.primaryAction.label}</Link>
              {focusPlan.supportActions.slice(0, 2).map((action) => (
                <Link key={action.key} to={action.path} className="link-button link-button-subtle">{action.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Why this is still the right focus</strong>
            <ul className="recovery-focus-signal-list" style={{ margin: 0 }}>
              {focusPlan.focusSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "summary" ? "none" : "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
          <span className="badge-soft">Organization block {synthesized.organizationBlock}</span>
          <span className="badge-soft">Validation {validationHealthLabel(errorCount, warningCount)}</span>
          <span className="badge-soft">Requirements {requirementsReadiness.completionLabel}</span>
          {synthesized.organizationBlockAssumed ? <span className="badge-soft">Working range assumed</span> : null}
        </div>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>{project.name}</h2>
          <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization name set"}</p>
          <p className="muted" style={{ marginTop: 8 }}>{project.description || "No description yet."}</p>
        </div>
      </div>

      {phase19AiDraftHelper && (!selectedSection || selectedSection === "summary") ? (
        <div className="panel" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Phase 19 AI draft/helper boundary — PHASE19_AI_DRAFT_HELPER_CONTRACT</h2>
              <p className="muted" style={{ margin: 0 }}>AI is draft-only. It can seed reviewed structured inputs, but it is not engineering authority for addressing, routing, security, reports, diagrams, or implementation.</p>
            </div>
            <span className={phase19AiDraftHelper.overallReadiness === "BLOCKED" ? "badge badge-danger" : phase19AiDraftHelper.overallReadiness === "REVIEW_REQUIRED" ? "badge badge-warning" : "badge-soft"}>{phase19AiDraftHelper.overallReadiness}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge-soft">Authority {phase19AiDraftHelper.aiAuthority}</span>
            <span className="badge-soft">AI objects {phase19AiDraftHelper.aiDerivedObjectCount}</span>
            <span className="badge-soft">Review required {phase19AiDraftHelper.reviewRequiredObjectCount}</span>
            <span className="badge-soft">Gates {phase19AiDraftHelper.enforcedGateCount}/{phase19AiDraftHelper.gateCount}</span>
          </div>
          {phase19AiDraftHelper.draftObjectRows.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {phase19AiDraftHelper.draftObjectRows.slice(0, 5).map((item) => <li key={item.objectId}><strong>{item.objectLabel}</strong> — {item.state} / {item.proofStatus}</li>)}
            </ul>
          ) : <p className="muted" style={{ margin: 0 }}>No saved AI-derived object markers detected.</p>}
        </div>
      ) : null}

      {phase20FinalProofPass && (!selectedSection || selectedSection === "summary") ? (
        <div className="panel" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Phase 20 final proof pass — PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT</h2>
              <p className="muted" style={{ margin: 0 }}>This is the final cross-engine proof gate. It proves scenarios, engine contracts, release gates, report/export truth, and diagram/frontend boundaries without claiming A+ authority.</p>
            </div>
            <span className={phase20FinalProofPass.overallReadiness === "BLOCKED" ? "badge badge-danger" : phase20FinalProofPass.overallReadiness === "REVIEW_REQUIRED" ? "badge badge-warning" : "badge-soft"}>{phase20FinalProofPass.overallReadiness}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge-soft">Target {phase20FinalProofPass.releaseTarget}</span>
            <span className="badge-soft">Scenarios {phase20FinalProofPass.scenarioProofReadyCount}/{phase20FinalProofPass.scenarioCount}</span>
            <span className="badge-soft">Engine rows {phase20FinalProofPass.engineProofReadyCount}/{phase20FinalProofPass.engineProofCount}</span>
            <span className="badge-soft">Gates {phase20FinalProofPass.passedGateCount}/{phase20FinalProofPass.gateCount}</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {phase20FinalProofPass.releaseGates.slice(0, 4).map((gate) => <li key={gate.gateKey}><strong>{gate.gate}</strong> — {gate.state}</li>)}
          </ul>
          <p className="muted" style={{ margin: 0 }}>Blocked scenarios: {phase20FinalProofPass.scenarioBlockedCount}. Review-required scenarios: {phase20FinalProofPass.scenarioReviewCount}. This panel is deliberately a proof status, not a marketing badge.</p>
        </div>
      ) : null}

      {!isFocusedSectionView ? (
        <UsageBanner
          planTier={authQuery.data?.user.planTier}
          siteCount={sites.length}
          vlanCount={vlans.length}
        />
      ) : null}

      <div className="panel" style={{ display: selectedSection && selectedSection !== "summary" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Recovery completion before the master roadmap</h2>
          <p className="muted" style={{ margin: 0 }}>{recoveryCompletion.summary}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Completion {recoveryCompletion.percentComplete}%</span>
          <span className={recoveryCompletion.status === "ready-for-master" ? "badge badge-info" : recoveryCompletion.status === "near-transition" ? "badge badge-warning" : "badge badge-error"}>
            {recoveryCompletion.status === "ready-for-master" ? "Ready for master roadmap" : recoveryCompletion.status === "near-transition" ? "Near transition" : "Stay on recovery"}
          </span>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Must finish next</h3>
            {recoveryCompletion.mustFinish.length === 0 ? <p className="muted" style={{ margin: 0 }}>No major must-finish recovery items are currently surfacing.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {recoveryCompletion.mustFinish.slice(0, 3).map((task) => (
                  <li key={task.id} style={{ marginBottom: 8 }}><strong>{task.title}:</strong> {task.detail}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Evidence behind the gate</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recoveryCompletion.evidence.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={focusClass("site-authority")} style={{ display: selectedSection && selectedSection !== "topology" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Explicit topology model</h2>
          <p className="muted" style={{ margin: 0 }}>
            Requirements should become explicit placement, path, boundary, and addressing evidence instead of generic report wording. This section shows how the current topology choice is being resolved inside the design engine foundation.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {summaryCard("Topology", synthesized.topology.topologyLabel)}
          {summaryCard("Breakout", synthesized.topology.internetBreakout)}
          {summaryCard("Primary site", synthesized.topology.primarySiteName || "TBD")}
          {summaryCard("Redundancy", synthesized.topology.redundancyModel)}
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Placement highlights</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {synthesized.sitePlacements.slice(0, 6).map((item) => (
                <li key={item.id} style={{ marginBottom: 8 }}><strong>{item.siteName}:</strong> {item.role} — {item.placement}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Critical flow paths</h3>
            {synthesized.trafficFlows.length === 0 ? <p className="muted" style={{ margin: 0 }}>No explicit flow paths resolved yet.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {synthesized.trafficFlows.slice(0, 5).map((item) => (
                  <li key={item.id} style={{ marginBottom: 8 }}>
                    <strong>{item.flowName}:</strong> {item.path.join(" → ")}
                    <div className="muted" style={{ marginTop: 4 }}>{item.routeModel}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "truth" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Unified design truth layer</h2>
          <p className="muted" style={{ margin: 0 }}>
            This workspace uses a shared model that links site topology, route domains, service placement, security boundaries, WAN adjacencies, and flow contracts so every review area reads from one connected engineering layer.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          {summaryCard("Site nodes", synthesized.designTruthModel.siteNodes.length)}
          {summaryCard("Route domains", synthesized.designTruthModel.routeDomains.length)}
          {summaryCard("Boundary domains", synthesized.designTruthModel.boundaryDomains.length)}
          {summaryCard("Flow contracts", synthesized.designTruthModel.flowContracts.length)}
          {summaryCard("Unresolved refs", synthesized.designTruthModel.unresolvedReferences.length)}
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Why this matters</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 8 }}>Diagram, routing, security, and report work can now point to the same linked design objects.</li>
              <li style={{ marginBottom: 8 }}>Site, zone, and service drift become easier to detect before implementation details are written.</li>
              <li style={{ marginBottom: 0 }}>The next engineering step should strengthen this model instead of stacking more disconnected review helpers.</li>
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Current model status</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {synthesized.designTruthModel.coverage.map((item) => (
                <li key={item.label} style={{ marginBottom: 8 }}><strong>{item.label}:</strong> {item.status} — {item.detail}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "truth" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Current-state discovery foundation</h2>
          <p className="muted" style={{ margin: 0 }}>
            The design package is stronger when it starts from what exists today. This snapshot shows whether discovery has enough current-state context to support migration-ready decisions.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {summaryCard("Discovery sections", `${discoverySummary.filledSections}/9`)}
          {summaryCard("Current device refs", discoverySummary.deviceMentions)}
          {summaryCard("Routing signals", discoverySummary.routingProtocols.length)}
          {summaryCard("Migration complexity", discoverySummary.migrationComplexity)}
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Current-state highlights</h3>
            {discoverySummary.currentStateHighlights.length === 0 ? <p className="muted" style={{ margin: 0 }}>No discovery baseline has been saved yet.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {discoverySummary.currentStateHighlights.slice(0, 4).map((item) => (
                  <li key={item} style={{ marginBottom: 8 }}>{item}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Discovery risks</h3>
            {discoverySummary.inferredRisks.length === 0 ? <p className="muted" style={{ margin: 0 }}>No discovery risks surfaced yet.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {discoverySummary.inferredRisks.slice(0, 4).map((item) => (
                  <li key={item} style={{ marginBottom: 8 }}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div>
          <Link to={`/projects/${projectId}/discovery`} className="link-button">Open Discovery & Current State</Link>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "truth" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>{synthesized.designEngineFoundation.stageLabel}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {synthesized.designEngineFoundation.summary}
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {summaryCard("Addressing rows", synthesized.designEngineFoundation.objectCounts.addressingRows)}
          {summaryCard("Placement objects", synthesized.designEngineFoundation.objectCounts.topologyPlacements)}
          {summaryCard("Security boundaries", synthesized.designEngineFoundation.objectCounts.securityBoundaries)}
          {summaryCard("Traffic flows", synthesized.designEngineFoundation.objectCounts.trafficFlows)}
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Coverage snapshot</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {synthesized.designEngineFoundation.coverage.map((item) => (
                <li key={item.label} style={{ marginBottom: 8 }}>
                  <strong>{item.label}:</strong> {item.detail}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Current strongest layer</h3>
            <p style={{ marginTop: 0 }}>{synthesized.designEngineFoundation.strongestLayer}</p>
            <h3 style={{ marginBottom: 8 }}>Next priority</h3>
            <p className="muted" style={{ margin: 0 }}>{synthesized.designEngineFoundation.nextPriority}</p>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {summaryCard("Sites in design", synthesized.siteSummaries.length)}
        {summaryCard("Logical domains", synthesized.logicalDomains.length)}
        {summaryCard("Address plan rows", synthesized.addressingPlan.length)}
        {summaryCard("Configured segments", synthesized.stats.configuredSegments)}
        {summaryCard("Transit links", synthesized.wanLinks.length)}
        {summaryCard("Security zones", synthesized.securityZones.length)}
        {summaryCard("Placement objects", synthesized.sitePlacements.length)}
        {summaryCard("Traffic flows", synthesized.trafficFlows.length)}
        {summaryCard("Routing policies", synthesized.routePolicies.length)}
        {summaryCard("Routing identities", synthesized.routingPlan.filter((item) => item.loopbackCidr).length)}
        {summaryCard("Service placements", synthesized.servicePlacements.length)}
        {summaryCard("Boundary rows", synthesized.securityBoundaries.length)}
        {summaryCard("Config templates", synthesized.configurationTemplates.length)}
        {summaryCard("BOM line items", platformFoundation.totals.lineItems)}
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "truth" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Platform profile and BOM foundation</h2>
          <p className="muted" style={{ margin: 0 }}>
            The design package becomes more deliverable when it also states the target platform posture and the first role-based material estimate behind it. This is not final procurement output yet, but it is the foundation a senior engineer would use before model selection and quoting.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {summaryCard("Deployment class", platformFoundation.platformSummary.deploymentClass)}
          {summaryCard("Hardware categories", platformFoundation.totals.hardwareCategories)}
          {summaryCard("Review items", platformFoundation.totals.reviewItems)}
          {summaryCard("Operations fit", platformFoundation.platformSummary.operationsFit)}
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Platform fit</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {platformFoundation.platformSummary.compatibilityNotes.slice(0, 4).map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>BOM assumptions</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {platformFoundation.bomAssumptions.slice(0, 3).map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <Link to={`/projects/${projectId}/platform`} className="link-button">Open Platform & BOM</Link>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "topology" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>High-Level Design blueprint</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is the architecture layer of SubnetOps: it should answer what kind of network is being built, how sites relate to each other,
            how trust boundaries are separated, and what the routing and operations posture should be before anyone starts writing configs.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {designFactCard("Architecture pattern", synthesized.highLevelDesign.architecturePattern)}
          {designFactCard("Layer model", synthesized.highLevelDesign.layerModel)}
          {designFactCard("WAN architecture", synthesized.highLevelDesign.wanArchitecture)}
          {designFactCard("Cloud / hybrid", synthesized.highLevelDesign.cloudArchitecture)}
          {designFactCard("Data center / services", synthesized.highLevelDesign.dataCenterArchitecture)}
          {designFactCard("Redundancy model", synthesized.highLevelDesign.redundancyModel)}
          {designFactCard("Routing strategy", synthesized.highLevelDesign.routingStrategy)}
          {designFactCard("Switching strategy", synthesized.highLevelDesign.switchingStrategy)}
          {designFactCard("Segmentation strategy", synthesized.highLevelDesign.segmentationStrategy)}
          {designFactCard("Security architecture", synthesized.highLevelDesign.securityArchitecture)}
          {designFactCard("Wireless architecture", synthesized.highLevelDesign.wirelessArchitecture)}
          {designFactCard("Operations posture", synthesized.highLevelDesign.operationsArchitecture)}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {synthesized.highLevelDesign.rationale.map((item) => (
            <div key={item} className="trust-note">
              <p className="muted" style={{ margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "topology" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Routing and switching design intent</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is the control-plane and access-layer part of the design package: the internal routing model, the provider or cloud edge posture,
            the route-policy boundaries, the switching/L2 fault-domain strategy, and the QoS assumptions that should exist before configuration work begins.
          </p>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Protocol / transport</th>
                  <th align="left">Scope</th>
                  <th align="left">Purpose</th>
                  <th align="left">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.routingProtocols.map((item) => (
                  <tr key={item.protocol + item.scope}>
                    <td>{item.protocol}</td>
                    <td>{item.scope}</td>
                    <td>{item.purpose}</td>
                    <td>{item.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {synthesized.switchingDesign.map((item) => (
              <div key={item.topic} className="trust-note">
                <strong>{item.topic}</strong>
                <p className="muted" style={{ margin: "8px 0" }}>{item.recommendation}</p>
                <p className="muted" style={{ margin: "0 0 8px" }}><strong>Implementation hint:</strong> {item.implementationHint}</p>
                <p className="muted" style={{ margin: 0 }}><strong>Why:</strong> {item.rationale}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Route-policy topic</th>
                  <th align="left">Scope</th>
                  <th align="left">Intent</th>
                  <th align="left">Recommendation</th>
                  <th align="left">Risk if skipped</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.routePolicies.map((item) => (
                  <tr key={item.policyName}>
                    <td>{item.policyName}</td>
                    <td>{item.scope}</td>
                    <td>{item.intent}</td>
                    <td>{item.recommendation}</td>
                    <td>{item.riskIfSkipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <h3 style={{ marginTop: 0 }}>QoS and traffic treatment</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {synthesized.qosPlan.map((item) => (
                  <div key={item.trafficClass} className="trust-note">
                    <strong>{item.trafficClass}</strong>
                    <p className="muted" style={{ margin: "8px 0" }}>{item.treatment}</p>
                    <p className="muted" style={{ margin: "0 0 8px" }}><strong>Marking:</strong> {item.marking}</p>
                    <p className="muted" style={{ margin: 0 }}><strong>Scope:</strong> {item.scope}. {item.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <h3 style={{ marginTop: 0 }}>Routing and switching review</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {synthesized.routingSwitchingReview.map((item) => (
                  <div key={item.title} className="trust-note">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                      <strong>{item.title}</strong>
                      <span className={item.severity === "critical" ? "badge badge-error" : item.severity === "warning" ? "badge badge-warning" : "badge badge-info"}>{item.severity}</span>
                    </div>
                    <p className="muted" style={{ margin: "0 0 8px" }}>{item.detail}</p>
                    {item.affected.length > 0 ? <p className="muted" style={{ margin: 0 }}><strong>Affected:</strong> {item.affected.join(", ")}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "topology" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Logical domains and trust boundaries</h2>
          <p className="muted" style={{ margin: 0 }}>
            A senior-level design package should show more than VLANs. It should show which logical domains exist, why they exist, and where each belongs in the architecture.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Logical domain</th>
                <th align="left">Segments</th>
                <th align="left">Purpose</th>
                <th align="left">Placement</th>
                <th align="left">Policy intent</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.logicalDomains.map((domain) => (
                <tr key={domain.name}>
                  <td>{domain.name}</td>
                  <td>{domain.segments.length > 0 ? domain.segments.join(", ") : "—"}</td>
                  <td>{domain.purpose}</td>
                  <td>{domain.placement}</td>
                  <td>{domain.policy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "topology" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Security architecture and segmentation intent</h2>
          <p className="muted" style={{ margin: 0 }}>
            This section makes the trust model explicit: the zones the design expects, the controls that should exist, and the findings that still need security review before implementation.
          </p>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Security zone</th>
                  <th align="left">Type</th>
                  <th align="left">Segments</th>
                  <th align="left">Enforcement</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.securityZones.map((zone) => (
                  <tr key={zone.zoneName}>
                    <td>{zone.zoneName}</td>
                    <td>{zone.zoneType}</td>
                    <td>{zone.segments.join(", ") || "—"}</td>
                    <td>{zone.enforcement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {synthesized.segmentationReview.map((item) => (
              <div key={`${item.severity}-${item.title}`} className="trust-note">
                <p style={{ margin: "0 0 6px" }}><strong>{item.title}</strong> • {item.severity}</p>
                <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={focusClass("lld")} style={{ display: selectedSection && selectedSection !== "lld" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Low-Level Design by site</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is the per-site engineering starter: each site should show its role, layer model, routing intent, segment footprint, and what still needs to be resolved before implementation.
          </p>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {synthesized.lowLevelDesign.map((site) => (
            <div key={site.siteId} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: 6 }}>{site.siteName}{site.siteCode ? ` • ${site.siteCode}` : ""}</h3>
                  <p className="muted" style={{ margin: 0 }}>{site.siteRole}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge-soft">Segments {site.localSegmentCount}</span>
                  <span className="badge-soft">Transit links {site.transitAdjacencyCount}</span>
                  <span className="badge-soft">Summary {site.summaryRoute || "Pending"}</span>
                  <span className="badge-soft">Loopback {site.loopbackCidr || "Pending"}</span>
                </div>
              </div>

              <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 14 }}>
                {designFactCard("Layer model", site.layerModel)}
                {designFactCard("Routing role", site.routingRole)}
                {designFactCard("Switching profile", site.switchingProfile)}
                {designFactCard("Security boundary", site.securityBoundary)}
                {designFactCard("Local service model", site.localServiceModel)}
                {designFactCard("Wireless model", site.wirelessModel)}
                {designFactCard("Physical assumption", site.physicalAssumption)}
                {designFactCard("Segment footprint", site.localSegments.length > 0 ? site.localSegments.join(", ") : "No routed local segments yet")}
              </div>

              <div className="grid-2" style={{ alignItems: "start", marginTop: 14 }}>
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 8 }}>Implementation focus</h4>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {site.implementationFocus.map((item) => (
                      <li key={item} style={{ marginBottom: 8 }}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 8 }}>Site notes</h4>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {site.notes.map((item) => (
                      <li key={item} style={{ marginBottom: 8 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className={focusClass("traceability")} style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Requirement-to-design traceability</h2>
          <p className="muted" style={{ margin: 0 }}>
            This section is important because the tool should explain why it proposed a design, not just what it proposed.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Design topic</th>
                  <th align="left">Requirement trigger</th>
                  <th align="left">Design outcome</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.traceability.map((item) => (
                  <tr key={item.title}>
                    <td>{item.title}</td>
                    <td>{item.requirement}</td>
                    <td>{item.designOutcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 1 truth source ledger</h2>
          {designCore?.phase1TraceabilityControl ? (
            <>
              <div className="summary-grid">
                {summaryCard("Label coverage", `${designCore.phase1TraceabilityControl.outputLabelCoverage.labelledOutputCount}/${designCore.phase1TraceabilityControl.outputLabelCoverage.requiredOutputCount}`)}
                {summaryCard("Review outputs", designCore.phase1TraceabilityControl.outputLabelCoverage.reviewRequiredCount)}
                {summaryCard("Captured lineage", designCore.phase1TraceabilityControl.requirementLineageCoverage.capturedCount)}
                {summaryCard("Full lineage", designCore.phase1TraceabilityControl.requirementLineageCoverage.fullCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 1 labels backend outputs by source, confidence, proof status, requirement lineage, and consumer path. This prevents saved form data, inferred objects, and computed review evidence from pretending to be implementation-ready truth.
              </p>
              {designCore.phase1TraceabilityControl.outputLabelCoverage.missingLabelCount > 0 ? (
                <div className="trust-note warning">
                  <strong>Missing output labels</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>
                    {designCore.phase1TraceabilityControl.outputLabelCoverage.missingLabels.join(", ")}
                  </p>
                </div>
              ) : (
                <div className="trust-note success">
                  <strong>Major backend output groups have Phase 1 source/proof labels.</strong>
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Output</th>
                      <th align="left">Source type</th>
                      <th align="left">Proof</th>
                      <th align="left">Consumers</th>
                      <th align="left">Review reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase1TraceabilityControl.outputLabels.slice(0, 14).map((item) => (
                      <tr key={item.outputKey}>
                        <td>{item.outputLabel}<br /><span className="muted">{item.sourceEngine}</span></td>
                        <td>{item.sourceType}</td>
                        <td>{item.proofStatus}<br /><span className="muted">{item.confidence}</span></td>
                        <td>{item.consumerPath.slice(0, 4).join(", ")}</td>
                        <td>{item.reviewReason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 1 truth source ledger is not available in this backend snapshot yet.</p>
          )}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 2 requirements materialization policy</h2>
          {designCore?.phase2RequirementsMaterialization ? (
            <>
              <div className="summary-grid">
                {summaryCard("Policy rows", designCore.phase2RequirementsMaterialization.totalPolicyCount)}
                {summaryCard("Active fields", designCore.phase2RequirementsMaterialization.activeFieldCount)}
                {summaryCard("Materialized", designCore.phase2RequirementsMaterialization.materializedObjectCount)}
                {summaryCard("Review/blocker", designCore.phase2RequirementsMaterialization.reviewItemCount + designCore.phase2RequirementsMaterialization.validationBlockerCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 2 forces every saved requirement into a declared materialization policy: materialized object, backend input signal, validation blocker, review item, explicit no-op, or unsupported. The UI only shows backend-declared outcomes.
              </p>
              {designCore.phase2RequirementsMaterialization.silentDropCount > 0 ? (
                <div className="trust-note warning">
                  <strong>Active requirements with no materialization path</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>
                    {designCore.phase2RequirementsMaterialization.silentDropKeys.join(", ")}
                  </p>
                </div>
              ) : (
                <div className="trust-note success">
                  <strong>No active requirement is silently dropped by the Phase 2 policy ledger.</strong>
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Policy</th>
                      <th align="left">Status</th>
                      <th align="left">Evidence / review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase2RequirementsMaterialization.fieldOutcomes.filter((item) => item.captured).slice(0, 16).map((item) => (
                      <tr key={item.key}>
                        <td>{item.label}<br /><span className="muted">{item.key}</span></td>
                        <td>{item.expectedDisposition}<br /><span className="muted">{item.confidence}</span></td>
                        <td>{item.materializationStatus}<br /><span className="muted">{item.sourceValue}</span></td>
                        <td>{item.actualEvidence.slice(0, 2).join(" ") || item.reviewReason || item.noOpReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 2 materialization policy ledger is not available in this backend snapshot yet.</p>
          )}
        </div>



        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 3 requirements closure matrix</h2>
          {designCore?.phase3RequirementsClosure ? (
            <>
              <div className="summary-grid">
                {summaryCard("Active requirements", designCore.phase3RequirementsClosure.activeRequirementCount)}
                {summaryCard("Full propagation", designCore.phase3RequirementsClosure.fullPropagatedCount)}
                {summaryCard("Review/blocking", designCore.phase3RequirementsClosure.reviewRequiredCount + designCore.phase3RequirementsClosure.blockedCount)}
                {summaryCard("Missing consumers", designCore.phase3RequirementsClosure.missingConsumerCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 3 is the nothing-got-lost checker. Each active requirement must prove capture, normalization, materialization or explicit review, backend consumption, readiness impact, frontend visibility, report/export evidence, and diagram impact when relevant. Missing consumers stay visible instead of being hidden.
              </p>
              {designCore.phase3RequirementsClosure.blockedCount > 0 || designCore.phase3RequirementsClosure.reviewRequiredCount > 0 ? (
                <div className="trust-note warning">
                  <strong>Some requirements are still blocked or review-required.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>
                    {designCore.phase3RequirementsClosure.blockedCount} blocked, {designCore.phase3RequirementsClosure.reviewRequiredCount} review-required, {designCore.phase3RequirementsClosure.partialPropagatedCount} partially propagated.
                  </p>
                </div>
              ) : (
                <div className="trust-note success">
                  <strong>Phase 3 found no blocked or review-required active requirement rows.</strong>
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Lifecycle</th>
                      <th align="left">Readiness</th>
                      <th align="left">Actual engines</th>
                      <th align="left">Missing consumers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase3RequirementsClosure.closureMatrix.filter((item) => item.active || item.consumerCoverage.captured).slice(0, 18).map((item) => (
                      <tr key={item.requirementId}>
                        <td>{item.label}<br /><span className="muted">{item.key}</span></td>
                        <td>{item.lifecycleStatus}<br /><span className="muted">{item.sourceValue}</span></td>
                        <td>{item.readinessImpact}</td>
                        <td>{item.actualAffectedEngines.slice(0, 5).join(", ") || "—"}</td>
                        <td>{item.missingConsumers.slice(0, 5).join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Golden scenario</th>
                      <th align="left">Status</th>
                      <th align="left">Required keys</th>
                      <th align="left">Blocking / review keys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase3RequirementsClosure.goldenScenarioClosures.filter((item) => item.relevant).slice(0, 10).map((scenario) => (
                      <tr key={scenario.id}>
                        <td>{scenario.label}</td>
                        <td>{scenario.lifecycleStatus}</td>
                        <td>{scenario.requiredRequirementKeys.slice(0, 6).join(", ")}</td>
                        <td>{[...scenario.blockingRequirementKeys, ...scenario.reviewRequirementKeys].slice(0, 8).join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 3 requirements closure matrix is not available in this backend snapshot yet.</p>
          )}
        </div>


        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 4 CIDR/addressing truth</h2>
          {designCore?.phase4CidrAddressingTruth ? (
            <>
              <div className="summary-grid">
                {summaryCard("Address rows", designCore.phase4CidrAddressingTruth.totalAddressRowCount)}
                {summaryCard("Undersized", designCore.phase4CidrAddressingTruth.undersizedSubnetCount)}
                {summaryCard("Gateway issues", designCore.phase4CidrAddressingTruth.gatewayIssueCount)}
                {summaryCard("Requirement gaps", designCore.phase4CidrAddressingTruth.requirementAddressingGapCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 4 is the Engine 1 proof gate: CIDR canonicalization, invalid CIDR rejection, /0-/32 edge behavior, role-aware gateway safety, deterministic allocator evidence, and requirement-driven subnet sizing. It does not pretend to be Enterprise IPAM; that is Phase 5.
              </p>
              {designCore.phase4CidrAddressingTruth.requirementAddressingGapCount > 0 ? (
                <div className="trust-note warning">
                  <strong>Some active requirements still lack concrete addressing evidence.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>
                    {designCore.phase4CidrAddressingTruth.requirementAddressingGapCount} addressing requirement row(s) are review-required or blocking.
                  </p>
                </div>
              ) : (
                <div className="trust-note success">
                  <strong>Phase 4 found no active requirement-to-addressing gaps.</strong>
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Readiness</th>
                      <th align="left">Affected roles</th>
                      <th align="left">Evidence / missing proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase4CidrAddressingTruth.requirementAddressingMatrix.filter((item) => item.active).slice(0, 16).map((item) => (
                      <tr key={item.requirementKey}>
                        <td>{item.requirementKey}<br /><span className="muted">{item.sourceValue}</span></td>
                        <td>{item.readinessImpact}</td>
                        <td>{item.affectedRoles.slice(0, 6).join(", ")}</td>
                        <td>{item.materializedAddressingEvidence[0] || item.missingAddressingEvidence[0] || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">VLAN</th>
                      <th align="left">CIDR</th>
                      <th align="left">Capacity</th>
                      <th align="left">Gateway / site block</th>
                      <th align="left">Blockers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase4CidrAddressingTruth.addressingTruthRows.slice(0, 18).map((row) => (
                      <tr key={row.rowId}>
                        <td>{row.siteName} VLAN {row.vlanId}<br /><span className="muted">{row.vlanName} / {row.role}</span></td>
                        <td>{row.canonicalSubnetCidr || row.sourceSubnetCidr}<br /><span className="muted">proposal {row.proposedSubnetCidr || "—"}</span></td>
                        <td>{row.capacityState}<br /><span className="muted">/{row.recommendedPrefix ?? "—"} for {row.requiredUsableHosts ?? "—"} usable</span></td>
                        <td>{row.gatewayState}<br /><span className="muted">site block {String(row.inSiteBlock)}</span></td>
                        <td>{row.blockers.slice(0, 4).join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">CIDR proof</th>
                      <th align="left">Status</th>
                      <th align="left">Selftest</th>
                      <th align="left">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase4CidrAddressingTruth.edgeCaseProofs.map((proof) => (
                      <tr key={proof.id}>
                        <td>{proof.label}</td>
                        <td>{proof.status}</td>
                        <td>{proof.selftest}</td>
                        <td>{proof.evidence[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 4 CIDR/addressing truth control is not available in this backend snapshot yet.</p>
          )}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 5 Enterprise IPAM durable authority</h2>
          {designCore?.phase5EnterpriseIpamTruth ? (
            <>
              <div className="summary-grid">
                {summaryCard("Readiness", designCore.phase5EnterpriseIpamTruth.overallReadiness)}
                {summaryCard("Proposal-only", designCore.phase5EnterpriseIpamTruth.engine1ProposalOnlyCount)}
                {summaryCard("Approved", designCore.phase5EnterpriseIpamTruth.approvedAllocationCount)}
                {summaryCard("Block/review", designCore.phase5EnterpriseIpamTruth.conflictBlockerCount + designCore.phase5EnterpriseIpamTruth.reviewRequiredCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 5 reconciles Engine 1 planned addressing with Engine 2 durable IPAM authority. Engine 1 remains the mathematical planner; Engine 2 owns route domains, pools, allocations, DHCP scopes, reservations, brownfield conflicts, approvals, and the ledger. A subnet cannot look implementation-ready while Engine 2 says it is proposal-only, stale, conflicted, or review-required.
              </p>
              {designCore.phase5EnterpriseIpamTruth.overallReadiness === "BLOCKING" ? (
                <div className="trust-note danger">
                  <strong>Engine 2 has blocking durable-IPAM issues.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>Resolve pool/allocation/brownfield/DHCP/reservation/approval blockers before implementation readiness.</p>
                </div>
              ) : designCore.phase5EnterpriseIpamTruth.overallReadiness === "REVIEW_REQUIRED" ? (
                <div className="trust-note warning">
                  <strong>Engine 2 still needs durable allocation review.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>Proposal-only rows are not durable IPAM authority.</p>
                </div>
              ) : (
                <div className="trust-note success"><strong>Phase 5 found no active Engine 2 authority gaps.</strong></div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">VLAN / role</th>
                      <th align="left">Engine 1</th>
                      <th align="left">Engine 2</th>
                      <th align="left">State</th>
                      <th align="left">Review proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase5EnterpriseIpamTruth.reconciliationRows.slice(0, 18).map((row) => (
                      <tr key={row.rowId}>
                        <td>{row.siteName} VLAN {row.vlanId}<br /><span className="muted">{row.vlanName} / {row.role}</span></td>
                        <td>{row.engine1PlannedCidr}<br /><span className="muted">proposal {row.engine1ProposedCidr || "—"}</span></td>
                        <td>{row.engine2AllocationCidr || "—"}<br /><span className="muted">{row.engine2PoolName || "no pool"} / {row.routeDomainKey}</span></td>
                        <td>{row.reconciliationState}<br /><span className="muted">{row.readinessImpact}</span></td>
                        <td>{row.blockers[0] || row.reviewReasons[0] || row.evidence[0] || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Readiness</th>
                      <th align="left">Counts</th>
                      <th align="left">Evidence / missing proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase5EnterpriseIpamTruth.requirementIpamMatrix.filter((item) => item.active).slice(0, 16).map((item) => (
                      <tr key={item.requirementKey}>
                        <td>{item.requirementKey}<br /><span className="muted">{item.label}</span></td>
                        <td>{item.readinessImpact}</td>
                        <td>{item.approvedAllocationCount} approved / {item.durableCandidateCount} candidate / {item.engine1ProposalOnlyCount} proposal-only</td>
                        <td>{item.materializedIpamEvidence[0] || item.missingIpamEvidence[0] || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Engine 2 finding</th>
                      <th align="left">Severity</th>
                      <th align="left">Readiness</th>
                      <th align="left">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase5EnterpriseIpamTruth.conflictRows.slice(0, 18).map((finding) => (
                      <tr key={finding.id}>
                        <td>{finding.code}<br /><span className="muted">{finding.title}</span></td>
                        <td>{finding.severity}</td>
                        <td>{finding.readinessImpact}</td>
                        <td>{finding.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 5 Enterprise IPAM durable authority control is not available in this backend snapshot yet.</p>
          )}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 6 design-core orchestrator control</h2>
          {designCore?.phase6DesignCoreOrchestrator ? (
            <>
              <div className="summary-grid">
                {summaryCard("Sections", `${designCore.phase6DesignCoreOrchestrator.presentSnapshotSectionCount}/${designCore.phase6DesignCoreOrchestrator.requiredSnapshotSectionCount}`)}
                {summaryCard("Readiness", designCore.phase6DesignCoreOrchestrator.overallReadiness)}
                {summaryCard("Boundary findings", designCore.phase6DesignCoreOrchestrator.boundaryFindings.length)}
                {summaryCard("Frontend truth risks", designCore.phase6DesignCoreOrchestrator.frontendIndependentTruthRiskCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 6 is the design-core coordinator contract. It proves the snapshot is organized into named backend-owned sections: source inputs, materialized objects, addressing truth, durable IPAM truth, object/graph truth, routing, security, implementation, report, diagram, and readiness. The frontend displays this ledger; it does not compute engineering truth independently.
              </p>
              {designCore.phase6DesignCoreOrchestrator.overallReadiness === "BLOCKED" ? (
                <div className="trust-note danger">
                  <strong>Design-core orchestration has blocking boundary issues.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>Missing snapshot sections or upstream blockers must stay visible; downstream pages must not paper over them.</p>
                </div>
              ) : designCore.phase6DesignCoreOrchestrator.overallReadiness === "REVIEW_REQUIRED" ? (
                <div className="trust-note warning">
                  <strong>Design-core orchestration is present but review-gated.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>The coordinator is working, but some sections carry review-required evidence from upstream engines.</p>
                </div>
              ) : (
                <div className="trust-note success"><strong>Phase 6 found no missing orchestrator snapshot sections.</strong></div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Snapshot section</th>
                      <th align="left">Owner</th>
                      <th align="left">Readiness</th>
                      <th align="left">Consumers</th>
                      <th align="left">Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase6DesignCoreOrchestrator.sectionRows.slice(0, 16).map((row) => (
                      <tr key={row.sectionKey}>
                        <td>{row.label}<br /><span className="muted">{row.snapshotPath}</span></td>
                        <td>{row.ownerEngine}<br /><span className="muted">{row.sourceType}</span></td>
                        <td>{row.readiness}<br /><span className="muted">{row.blockerCount} block / {row.reviewCount} review</span></td>
                        <td>{row.downstreamConsumers.slice(0, 4).join(", ")}</td>
                        <td>{row.proofGates.slice(0, 3).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Dependency</th>
                      <th align="left">Path</th>
                      <th align="left">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase6DesignCoreOrchestrator.dependencyEdges.slice(0, 12).map((edge) => (
                      <tr key={edge.id}>
                        <td>{edge.relationship}</td>
                        <td>{edge.sourceSectionKey} → {edge.targetSectionKey}</td>
                        <td>{edge.evidence.slice(0, 2).join(" ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {designCore.phase6DesignCoreOrchestrator.boundaryFindings.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th align="left">Finding</th>
                        <th align="left">Severity</th>
                        <th align="left">Path</th>
                        <th align="left">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {designCore.phase6DesignCoreOrchestrator.boundaryFindings.slice(0, 12).map((finding) => (
                        <tr key={finding.id}>
                          <td>{finding.code}<br /><span className="muted">{finding.title}</span></td>
                          <td>{finding.severity}<br /><span className="muted">{finding.readinessImpact}</span></td>
                          <td>{finding.affectedSnapshotPath}</td>
                          <td>{finding.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 6 design-core orchestrator control is not available in this backend snapshot yet.</p>
          )}
        </div>



        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 7 standards rulebook control</h2>
          {designCore?.phase7StandardsRulebookControl ? (
            <>
              <div className="summary-grid">
                {summaryCard("Readiness", designCore.phase7StandardsRulebookControl.overallReadiness)}
                {summaryCard("Applicable rules", `${designCore.phase7StandardsRulebookControl.applicableRuleCount}/${designCore.phase7StandardsRulebookControl.ruleCount}`)}
                {summaryCard("Blockers", designCore.phase7StandardsRulebookControl.blockingRuleCount)}
                {summaryCard("Req-linked rules", designCore.phase7StandardsRulebookControl.requirementActivatedRuleCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 7 makes standards active: every standards row carries applicability, severity, affected engines/objects, remediation, exception policy, and requirement relationships. This page displays backend standards truth; it does not invent pass/fail status.
              </p>
              {designCore.phase7StandardsRulebookControl.overallReadiness === "BLOCKED" ? (
                <div className="trust-note danger">
                  <strong>Standards blockers remain.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>Required standards failures must block false implementation readiness until remediated or explicitly exception-reviewed.</p>
                </div>
              ) : designCore.phase7StandardsRulebookControl.overallReadiness === "REVIEW_REQUIRED" ? (
                <div className="trust-note warning">
                  <strong>Standards are active but review-gated.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>Some rules need engineering review or exception evidence before the design can be treated as clean.</p>
                </div>
              ) : (
                <div className="trust-note success"><strong>Phase 7 found no standards blockers or review-required rule gaps.</strong></div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Rule</th>
                      <th align="left">State</th>
                      <th align="left">Requirement relationship</th>
                      <th align="left">Affected engines</th>
                      <th align="left">Remediation / exception</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase7StandardsRulebookControl.ruleRows.slice(0, 18).map((row) => (
                      <tr key={row.ruleId}>
                        <td>{row.ruleId}<br /><span className="muted">{row.title}</span></td>
                        <td>{row.enforcementState}<br /><span className="muted">{row.severity} / {row.strength}</span></td>
                        <td>{row.requirementRelationships.slice(0, 5).join(", ") || "—"}</td>
                        <td>{row.affectedEngines.slice(0, 4).join(", ") || "—"}</td>
                        <td>{row.remediationGuidance}<br /><span className="muted">Exception: {row.exceptionPolicy}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Lifecycle</th>
                      <th align="left">Readiness</th>
                      <th align="left">Activated rules</th>
                      <th align="left">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase7StandardsRulebookControl.requirementActivations.slice(0, 14).map((item) => (
                      <tr key={item.requirementKey}>
                        <td>{item.requirementKey}<br /><span className="muted">{item.requirementValue}</span></td>
                        <td>{item.lifecycleStatus}</td>
                        <td>{item.readinessImpact}</td>
                        <td>{item.activatedRuleIds.slice(0, 6).join(", ") || "—"}</td>
                        <td>{item.evidence[0] || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {designCore.phase7StandardsRulebookControl.findings.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th align="left">Finding</th>
                        <th align="left">Severity</th>
                        <th align="left">Affected engine</th>
                        <th align="left">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {designCore.phase7StandardsRulebookControl.findings.slice(0, 12).map((finding) => (
                        <tr key={finding.id}>
                          <td>{finding.ruleId}<br /><span className="muted">{finding.title}</span></td>
                          <td>{finding.severity}<br /><span className="muted">{finding.code}</span></td>
                          <td>{finding.affectedEngine}</td>
                          <td>{finding.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 7 standards rulebook control is not available in this backend snapshot yet.</p>
          )}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 8 validation readiness authority</h2>
          {designCore?.phase8ValidationReadiness ? (
            <>
              <div className="summary-grid">
                {summaryCard("Readiness", designCore.phase8ValidationReadiness.overallReadiness)}
                {summaryCard("Blockers", designCore.phase8ValidationReadiness.blockingFindingCount)}
                {summaryCard("Review required", designCore.phase8ValidationReadiness.reviewRequiredFindingCount)}
                {summaryCard("Impl gate", designCore.phase8ValidationReadiness.validationGateAllowsImplementation ? "allowed" : "blocked/review")}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Phase 8 is the strict validation gate across requirements, addressing, durable IPAM, standards, routing, security, implementation, report truth, and diagram truth. It does not create new design facts; it exposes whether upstream truth is clean enough to claim readiness.
              </p>
              {designCore.phase8ValidationReadiness.overallReadiness === "BLOCKING" ? (
                <div className="trust-note danger">
                  <strong>Implementation readiness is blocked.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>At least one Phase 8 blocking finding exists. Do not ship the design as implementation-ready.</p>
                </div>
              ) : designCore.phase8ValidationReadiness.overallReadiness === "REVIEW_REQUIRED" ? (
                <div className="trust-note warning">
                  <strong>Implementation readiness is review-gated.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>The design may have visible outputs, but at least one requirement or engine truth chain still needs review.</p>
                </div>
              ) : designCore.phase8ValidationReadiness.overallReadiness === "WARNING" ? (
                <div className="trust-note warning"><strong>Non-blocking validation warnings remain.</strong></div>
              ) : (
                <div className="trust-note success"><strong>Phase 8 found no blockers or review-required readiness gaps.</strong></div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Domain</th>
                      <th align="left">Readiness</th>
                      <th align="left">Counts</th>
                      <th align="left">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase8ValidationReadiness.coverageRows.slice(0, 14).map((row) => (
                      <tr key={row.domain}>
                        <td>{row.domain}<br /><span className="muted">{row.sourceSnapshotPath}</span></td>
                        <td>{row.readiness}</td>
                        <td>{row.blockerCount} block / {row.reviewRequiredCount} review / {row.warningCount} warning</td>
                        <td>{row.evidence.slice(0, 2).join(" ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Lifecycle</th>
                      <th align="left">Readiness</th>
                      <th align="left">Missing consumers</th>
                      <th align="left">Validation rules</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.phase8ValidationReadiness.requirementGateRows.slice(0, 14).map((row) => (
                      <tr key={row.requirementId}>
                        <td>{row.requirementKey}</td>
                        <td>{row.lifecycleStatus}</td>
                        <td>{row.readinessImpact}</td>
                        <td>{row.missingConsumers.slice(0, 4).join(", ") || "—"}</td>
                        <td>{row.validationRuleCodes.slice(0, 4).join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {designCore.phase8ValidationReadiness.findings.filter((finding) => finding.category !== "PASSED").length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th align="left">Finding</th>
                        <th align="left">Category</th>
                        <th align="left">Source</th>
                        <th align="left">Remediation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {designCore.phase8ValidationReadiness.findings.filter((finding) => finding.category !== "PASSED").slice(0, 12).map((finding) => (
                        <tr key={finding.id}>
                          <td>{finding.ruleCode}<br /><span className="muted">{finding.title}</span></td>
                          <td>{finding.category}</td>
                          <td>{finding.sourceEngine}<br /><span className="muted">{finding.sourceSnapshotPath}</span></td>
                          <td>{finding.remediation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Phase 8 validation readiness authority is not available in this backend snapshot yet.</p>
          )}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 9 network object model truth</h2>
          {designCore?.phase9NetworkObjectModel ? (
            <>
              <div className="summary-grid">
                {summaryCard("Readiness", designCore.phase9NetworkObjectModel.overallReadiness)}
                {summaryCard("Objects", designCore.phase9NetworkObjectModel.objectCount)}
                {summaryCard("Metadata gaps", designCore.phase9NetworkObjectModel.metadataGapObjectCount)}
                {summaryCard("Lineage gaps", designCore.phase9NetworkObjectModel.requirementLineageGapCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>Phase 9 makes every generated device, interface, link, zone, policy, NAT intent, DHCP pool, and IP reservation carry source, confidence, proof, readiness, validation impact, report/export impact, and diagram-impact labels.</p>
              <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Object</th><th align="left">Type / role</th><th align="left">Truth</th><th align="left">Readiness</th><th align="left">Requirements</th></tr></thead><tbody>{designCore.phase9NetworkObjectModel.objectLineage.slice(0, 18).map((row) => (<tr key={row.objectId}><td>{row.displayName}<br /><span className="muted">{row.objectId}</span></td><td>{row.objectType}<br /><span className="muted">{row.objectRole}</span></td><td>{row.truthState}<br /><span className="muted">{row.sourceType} / {row.confidence}</span></td><td>{row.implementationReadiness}<br /><span className="muted">{row.proofStatus}</span></td><td>{row.sourceRequirementIds.slice(0, 4).join(", ") || "—"}</td></tr>))}</tbody></table></div>
              <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Requirement</th><th align="left">Lifecycle</th><th align="left">Readiness</th><th align="left">Actual objects</th><th align="left">Missing objects</th></tr></thead><tbody>{designCore.phase9NetworkObjectModel.requirementObjectLineage.slice(0, 14).map((row) => (<tr key={row.requirementId}><td>{row.sourceKey}</td><td>{row.lifecycleStatus}</td><td>{row.readinessImpact}</td><td>{row.actualObjectTypes.join(", ") || "—"}</td><td>{row.missingObjectTypes.join(", ") || "—"}</td></tr>))}</tbody></table></div>
            </>
          ) : (<p className="muted" style={{ margin: 0 }}>Phase 9 network object model truth is not available in this backend snapshot yet.</p>)}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 10 design graph dependency integrity</h2>
          {designCore?.phase10DesignGraph ? (<>
            <div className="summary-grid">{summaryCard("Readiness", designCore.phase10DesignGraph.overallReadiness)}{summaryCard("Graph nodes", designCore.phase10DesignGraph.graphNodeCount)}{summaryCard("Graph edges", designCore.phase10DesignGraph.graphEdgeCount)}{summaryCard("Object gaps", designCore.phase10DesignGraph.objectCoverageGapCount)}</div>
            <p className="muted" style={{ margin: 0 }}>Phase 10 proves dependency paths from requirements to backend objects, object relationships, validation impact, frontend display, report/export sections, and diagram impact. Diagram-only topology or orphaned graph objects are treated as readiness gaps.</p>
            <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Requirement</th><th align="left">Lifecycle</th><th align="left">Readiness</th><th align="left">Graph nodes</th><th align="left">Missing</th></tr></thead><tbody>{designCore.phase10DesignGraph.requirementDependencyPaths.slice(0, 14).map((row) => (<tr key={row.requirementId}><td>{row.sourceKey}<br /><span className="muted">{row.requirementId}</span></td><td>{row.lifecycleStatus}</td><td>{row.readinessImpact}</td><td>{row.actualGraphNodeIds.slice(0, 4).join(", ") || "—"}</td><td>{[...row.missingGraphNodeIds, ...row.missingRelationshipTypes, ...row.missingConsumerSurfaces].slice(0, 5).join(", ") || "—"}</td></tr>))}</tbody></table></div>
            <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Object</th><th align="left">Type</th><th align="left">Dependency</th><th align="left">Relationships</th><th align="left">Consumers</th></tr></thead><tbody>{designCore.phase10DesignGraph.objectCoverage.slice(0, 18).map((row) => (<tr key={row.objectId}><td>{row.displayName}<br /><span className="muted">{row.objectId}</span></td><td>{row.objectType}<br /><span className="muted">{row.truthState}</span></td><td>{row.dependencyState}</td><td>{row.relationshipTypes.slice(0, 4).join(", ") || "—"}</td><td>{row.consumerSurfaces.slice(0, 4).join(", ") || "—"}</td></tr>))}</tbody></table></div>
          </>) : (<p className="muted" style={{ margin: 0 }}>Phase 10 design graph dependency integrity is not available in this backend snapshot yet.</p>)}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 11 routing segmentation protocol-aware planning</h2>
          {designCore?.phase11RoutingSegmentation ? (<>
            <div className="summary-grid">{summaryCard("Readiness", designCore.phase11RoutingSegmentation.overallReadiness)}{summaryCard("Protocol rows", designCore.phase11RoutingSegmentation.protocolIntentCount)}{summaryCard("Simulation unavailable", designCore.phase11RoutingSegmentation.simulationUnavailableCount)}{summaryCard("Requirement gaps", designCore.phase11RoutingSegmentation.activeRequirementRoutingGapCount)}</div>
            <p className="muted" style={{ margin: 0 }}>Phase 11 separates routing intent, routing review, routing blockers, and simulation-unavailable behavior. Connected/default/static/summary routes are planning evidence; OSPF, BGP, ECMP, redistribution, route leaking, cloud route tables, and asymmetric routing stay review-gated unless backend evidence exists.</p>
            <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Requirement</th><th align="left">Active</th><th align="left">Readiness</th><th align="left">Actual protocol rows</th><th align="left">Missing</th></tr></thead><tbody>{designCore.phase11RoutingSegmentation.requirementRoutingMatrix.slice(0, 14).map((row) => (<tr key={row.requirementKey}><td>{row.requirementLabel}<br /><span className="muted">{row.requirementKey}</span></td><td>{row.active ? "yes" : "no"}</td><td>{row.readinessImpact}</td><td>{row.actualProtocolIntentIds.slice(0, 4).join(", ") || "—"}</td><td>{row.missingProtocolCategories.slice(0, 5).join(", ") || "—"}</td></tr>))}</tbody></table></div>
            <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Protocol/review row</th><th align="left">Category</th><th align="left">State</th><th align="left">Readiness</th><th align="left">Review reason</th></tr></thead><tbody>{designCore.phase11RoutingSegmentation.protocolIntents.slice(0, 18).map((row) => (<tr key={row.id}><td>{row.name}<br /><span className="muted">{row.id}</span></td><td>{row.category}</td><td>{row.controlState}</td><td>{row.readinessImpact}</td><td>{row.reviewReason || "—"}</td></tr>))}</tbody></table></div>
          </>) : (<p className="muted" style={{ margin: 0 }}>Phase 11 routing segmentation protocol-aware planning is not available in this backend snapshot yet.</p>)}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Phase 12 security policy flow</h2>
          {designCore?.phase12SecurityPolicyFlow ? (<>
            <div className="summary-grid">{summaryCard("Readiness", designCore.phase12SecurityPolicyFlow.overallReadiness)}{summaryCard("Flow consequences", designCore.phase12SecurityPolicyFlow.flowConsequenceCount)}{summaryCard("Requirement gaps", designCore.phase12SecurityPolicyFlow.activeRequirementSecurityGapCount)}{summaryCard("NAT/logging gaps", `${designCore.phase12SecurityPolicyFlow.missingNatCount}/${designCore.phase12SecurityPolicyFlow.loggingGapCount}`)}</div>
            <p className="muted" style={{ margin: 0 }}>Phase 12 renders backend security policy flow evidence only. Zone-to-zone posture, business service dependencies, NAT, logging, broad permits, duplicate/shadowed intent, and policy consequence summaries are review-gated planning evidence, not firewall configuration.</p>
            <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Requirement</th><th align="left">Active</th><th align="left">Readiness</th><th align="left">Actual flows</th><th align="left">Missing security categories</th></tr></thead><tbody>{designCore.phase12SecurityPolicyFlow.requirementSecurityMatrix.slice(0, 14).map((row) => (<tr key={row.requirementKey}><td>{row.requirementLabel}<br /><span className="muted">{row.requirementKey}</span></td><td>{row.active ? "yes" : "no"}</td><td>{row.readinessImpact}</td><td>{row.actualFlowRequirementIds.slice(0, 4).join(", ") || "—"}</td><td>{row.missingSecurityCategories.slice(0, 5).join(", ") || "—"}</td></tr>))}</tbody></table></div>
            <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Flow consequence</th><th align="left">Source</th><th align="left">Destination</th><th align="left">Action</th><th align="left">Phase 12 state</th><th align="left">Review reason</th></tr></thead><tbody>{designCore.phase12SecurityPolicyFlow.flowConsequences.slice(0, 18).map((row) => (<tr key={row.id}><td>{row.name}<br /><span className="muted">{row.flowRequirementId}</span></td><td>{row.sourceZoneName}</td><td>{row.destinationZoneName}</td><td>{row.expectedAction}</td><td>{row.phase12PolicyState}</td><td>{row.reviewReason || row.consequenceSummary}</td></tr>))}</tbody></table></div>
          </>) : (<p className="muted" style={{ margin: 0 }}>Phase 12 security policy flow control is not available in this backend snapshot yet.</p>)}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Requirement impact closure</h2>
          {designCore?.requirementsImpactClosure ? (
            <>
              <div className="summary-grid">
                {summaryCard("Status", designCore.requirementsImpactClosure.completionStatus)}
                {summaryCard("Captured fields", `${designCore.requirementsImpactClosure.capturedFieldCount}/${designCore.requirementsImpactClosure.totalFieldCount}`)}
                {summaryCard("Concrete outputs", designCore.requirementsImpactClosure.concreteFieldCount)}
                {summaryCard("Policy consequences", designCore.requirementsImpactClosure.policyFieldCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                This closes the gap between selected requirements and actual plan evidence. Direct requirements should appear as sites, VLANs, policy flows, object-model evidence, or explicit review evidence.
              </p>
              {designCore.requirementsImpactClosure.directCapturedTraceableOnlyKeys.length > 0 ? (
                <div className="trust-note warning">
                  <strong>Direct fields still needing deeper concrete output</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>
                    {designCore.requirementsImpactClosure.directCapturedTraceableOnlyKeys.join(", ")}
                  </p>
                </div>
              ) : (
                <div className="trust-note success">
                  <strong>Captured direct requirements have concrete or policy evidence.</strong>
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Status</th>
                      <th align="left">Concrete evidence</th>
                      <th align="left">Visible in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.requirementsImpactClosure.fieldOutcomes.slice(0, 16).map((item) => (
                      <tr key={item.key}>
                        <td>{item.label}<br /><span className="muted">{item.key}</span></td>
                        <td>{item.reflectionStatus}</td>
                        <td>{item.concreteOutputs.slice(0, 4).join(", ") || "—"}</td>
                        <td>{item.visibleIn.slice(0, 4).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Requirement impact closure is not available in this backend snapshot yet.</p>
          )}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Requirement scenario proof</h2>
          {designCore?.requirementsScenarioProof ? (
            <>
              <div className="summary-grid">
                {summaryCard("Scenario", designCore.requirementsScenarioProof.scenarioName)}
                {summaryCard("Status", designCore.requirementsScenarioProof.status)}
                {summaryCard("Passed signals", `${designCore.requirementsScenarioProof.passedSignalCount}/${designCore.requirementsScenarioProof.expectedSignalCount}`)}
                {summaryCard("Missing", designCore.requirementsScenarioProof.missingSignalCount)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                This proves selected high-impact requirements are reflected in the actual backend evidence model, not just stored in the requirements form.
              </p>
              {designCore.requirementsScenarioProof.status === "passed" ? (
                <div className="trust-note success">
                  <strong>Scenario drivers have backend-visible design evidence.</strong>
                </div>
              ) : (
                <div className="trust-note warning">
                  <strong>Scenario proof still has gaps.</strong>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>
                    {designCore.requirementsScenarioProof.blockerCount} blocker signal(s), {designCore.requirementsScenarioProof.reviewCount} review signal(s).
                  </p>
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Signal</th>
                      <th align="left">Result</th>
                      <th align="left">Requirement keys</th>
                      <th align="left">Evidence</th>
                      <th align="left">Missing evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designCore.requirementsScenarioProof.signals.map((signal) => (
                      <tr key={signal.id}>
                        <td>{signal.label}</td>
                        <td>{signal.passed ? "pass" : signal.severity}</td>
                        <td>{signal.requirementKeys.join(", ")}</td>
                        <td>{signal.evidence.slice(0, 5).join(", ") || "—"}</td>
                        <td>{signal.missingEvidence.join("; ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Requirement scenario proof is not available in this backend snapshot yet.</p>
          )}
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Design decisions, assumptions, and risks</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Decisions</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {decisions.map((item) => (
                  <div key={item.title} className="validation-card">
                    <strong>{item.title}</strong>
                    <p className="muted" style={{ margin: "6px 0 0 0" }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Assumptions</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {assumptions.length === 0 ? <p className="muted" style={{ margin: 0 }}>No major assumptions surfaced right now.</p> : assumptions.map((item) => (
                  <div key={item.title} className="validation-card">
                    <strong>{item.title}</strong>
                    <p className="muted" style={{ margin: "6px 0 0 0" }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Risks</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {risks.length === 0 ? <p className="muted" style={{ margin: 0 }}>No major risks surfaced right now.</p> : risks.map((item) => (
                  <div key={item.title} className="validation-card">
                    <strong>{item.title}</strong>
                    <p className="muted" style={{ margin: "6px 0 0 0" }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Address hierarchy snapshot</h2>
          <p className="muted" style={{ margin: 0 }}>
            The HLD/LLD output still depends on a clean address hierarchy. Review this quickly here, then use the Addressing Plan workspace for full detail.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Site</th>
                  <th align="left">Site block</th>
                  <th align="left">Allocated</th>
                  <th align="left">Headroom</th>
                  <th align="left">Summary target</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.siteHierarchy.map((site) => (
                  <tr key={site.id}>
                    <td>{site.name}{site.siteCode ? ` • ${site.siteCode}` : ""}</td>
                    <td>{site.siteBlockCidr || "—"}</td>
                    <td>{site.allocatedSegmentAddresses}</td>
                    <td>{site.blockHeadroomAddresses}</td>
                    <td>{site.summarizationTarget || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Link to={`/projects/${projectId}/addressing`} className="link-button">Open full Addressing Plan</Link>
          </div>
        </div>

        <div className="panel" style={{ display: selectedSection && selectedSection !== "traceability" ? "none" : "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Implementation next steps</h2>
          <p className="muted" style={{ margin: 0 }}>Rollout: {synthesized.implementationPlan.rolloutStrategy}</p>
          <p className="muted" style={{ margin: 0 }}>Validation: {synthesized.implementationPlan.validationApproach}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {synthesized.implementationNextSteps.map((step) => (
              <li key={step} style={{ marginBottom: 8 }}>{step}</li>
            ))}
          </ul>
          <div>
            <Link to={`/projects/${projectId}/implementation`} className="link-button">Open full Implementation Plan</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
