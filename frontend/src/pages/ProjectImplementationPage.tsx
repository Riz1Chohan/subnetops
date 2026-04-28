import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { SectionHeader } from "../components/app/SectionHeader";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { LoadingState } from "../components/app/LoadingState";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useAuthoritativeDesign } from "../features/designCore/hooks";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { DesignAuthorityBanner } from "../lib/designAuthority";

function summaryCard(label: string, value: number | string, detail?: string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      {detail ? <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{detail}</p> : null}
    </div>
  );
}

function severityBadge(severity: "critical" | "warning" | "info") {
  if (severity === "critical") return "badge badge-error";
  if (severity === "warning") return "badge badge-warning";
  return "badge badge-info";
}

export function ProjectImplementationPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const { synthesized, designCore, authority } = useAuthoritativeDesign(projectId, project, sites, vlans, requirementsProfile);

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading implementation plan" message="Preparing rollout phases, rollback triggers, validation tests, and cutover guidance." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load implementation plan"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load the implementation workspace right now."}
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

  const criticalRisks = synthesized.implementationRisks.filter((item) => item.severity === "critical").length;
  const warningRisks = synthesized.implementationRisks.filter((item) => item.severity === "warning").length;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Implementation & Migration"
        description="This workspace turns the logical design into an execution package: rollout approach, phased implementation, cutover checks, rollback triggers, validation evidence, and implementation risks."
        actions={
          <>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Logical Design</Link>
            <Link to={`/projects/${projectId}/security`} className="link-button">Security</Link>
            <Link to={`/projects/${projectId}/routing`} className="link-button">Routing & Switching</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Report</Link>
          </>
        }
      />

      <DesignAuthorityBanner authority={authority} />

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Phases {synthesized.implementationPhases.length}</span>
          <span className="badge-soft">Checklist items {synthesized.cutoverChecklist.length}</span>
          <span className="badge-soft">Rollback triggers {synthesized.rollbackPlan.length}</span>
          <span className="badge-soft">Validation tests {synthesized.validationPlan.length}</span>
          <span className="badge-soft">Risks {criticalRisks} critical / {warningRisks} warning</span>
          {designCore?.networkObjectModel?.implementationPlan ? <span className="badge badge-info">Backend Phase 36C operational-safety implementation plan displayed</span> : <span className="badge badge-warning">Backend plan unavailable</span>}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          A real design package should not stop at topology and addressing. This page renders the backend design-core implementation model when available, including dependencies, blockers, evidence, blast radius, and rollback posture.
        </p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {summaryCard("Implementation phases", synthesized.implementationPhases.length, "Wave-by-wave execution structure for this scope.")}
        {summaryCard("Cutover checks", synthesized.cutoverChecklist.length, "Pre-check, cutover, and post-check controls.")}
        {summaryCard("Rollback triggers", synthesized.rollbackPlan.length, "When to stop and revert before deeper damage occurs.")}
        {summaryCard("Validation tests", synthesized.validationPlan.length, "Evidence-backed tests for acceptance and handoff.")}
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Implementation posture</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <div className="validation-card"><strong>Rollout strategy</strong><p className="muted" style={{ margin: "6px 0 0" }}>{synthesized.implementationPlan.rolloutStrategy}</p></div>
            <div className="validation-card"><strong>Migration strategy</strong><p className="muted" style={{ margin: "6px 0 0" }}>{synthesized.implementationPlan.migrationStrategy}</p></div>
            <div className="validation-card"><strong>Downtime posture</strong><p className="muted" style={{ margin: "6px 0 0" }}>{synthesized.implementationPlan.downtimePosture}</p></div>
            <div className="validation-card"><strong>Validation approach</strong><p className="muted" style={{ margin: "6px 0 0" }}>{synthesized.implementationPlan.validationApproach}</p></div>
            <div className="validation-card"><strong>Rollback posture</strong><p className="muted" style={{ margin: "6px 0 0" }}>{synthesized.implementationPlan.rollbackPosture}</p></div>
            <div className="validation-card"><strong>Handoff package</strong><p className="muted" style={{ margin: "6px 0 0" }}>{synthesized.implementationPlan.handoffPackage}</p></div>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Implementation risks</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {synthesized.implementationRisks.map((risk) => (
              <div key={risk.title} className="validation-card">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={severityBadge(risk.severity)}>{risk.severity}</span>
                  <span className="badge-soft">Owner: {risk.owner}</span>
                </div>
                <strong>{risk.title}</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>{risk.mitigation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Phased execution plan</h2>
          <p className="muted" style={{ margin: 0 }}>
            These phases are meant to guide the change sequence, not just describe it after the fact.
          </p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {synthesized.implementationPhases.map((phase) => (
            <div key={phase.phase} className="trust-note">
              <strong>{phase.phase}</strong>
              <p className="muted" style={{ margin: "8px 0" }}>{phase.objective}</p>
              <p className="muted" style={{ margin: "0 0 8px" }}><strong>Scope:</strong> {phase.scope}</p>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div>
                  <p style={{ marginBottom: 8 }}><strong>Dependencies</strong></p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {phase.dependencies.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p style={{ marginBottom: 8 }}><strong>Success criteria</strong></p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {phase.successCriteria.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Cutover checklist</h2>
            <p className="muted" style={{ margin: 0 }}>
              The checklist keeps the production window disciplined: baseline, execute, validate, and document.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Stage</th>
                  <th align="left">Item</th>
                  <th align="left">Owner</th>
                  <th align="left">Why it matters</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.cutoverChecklist.map((item) => (
                  <tr key={item.stage + item.item}>
                    <td style={{ textTransform: "capitalize" }}>{item.stage}</td>
                    <td>{item.item}</td>
                    <td>{item.owner}</td>
                    <td>{item.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Rollback triggers and actions</h2>
            <p className="muted" style={{ margin: 0 }}>
              Rollback should be explicit before the change starts, not invented after something breaks.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Trigger</th>
                  <th align="left">Action</th>
                  <th align="left">Scope</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.rollbackPlan.map((item) => (
                  <tr key={item.trigger}>
                    <td>{item.trigger}</td>
                    <td>{item.action}</td>
                    <td>{item.scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Validation evidence plan</h2>
          <p className="muted" style={{ margin: 0 }}>
            These tests show what must be proven before the implementation can be considered successful and supportable.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Stage</th>
                <th align="left">Test</th>
                <th align="left">Expected outcome</th>
                <th align="left">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.validationPlan.map((item) => (
                <tr key={item.stage + item.test}>
                  <td>{item.stage}</td>
                  <td>{item.test}</td>
                  <td>{item.expectedOutcome}</td>
                  <td>{item.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
