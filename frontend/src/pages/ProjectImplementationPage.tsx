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
import { userFacingStatusLabel } from "../lib/userFacingCopy";

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
  const V1ImplementationPlanning = designCore?.V1ImplementationPlanning;
  const V1ImplementationTemplates = designCore?.V1ImplementationTemplates;

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading implementation plan" message="Preparing rollout steps, rollback triggers, validation tests, and cutover guidance." />;
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
        description="This workspace turns the logical design into an execution package: rollout approach, ordered implementation, cutover checks, rollback triggers, validation evidence, and implementation risks."
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
          <span className="badge-soft">Steps {synthesized.implementationStages.length}</span>
          <span className="badge-soft">Checklist items {synthesized.cutoverChecklist.length}</span>
          <span className="badge-soft">Rollback triggers {synthesized.rollbackPlan.length}</span>
          <span className="badge-soft">Validation tests {synthesized.validationPlan.length}</span>
          <span className="badge-soft">Risks {criticalRisks} critical / {warningRisks} warning</span>
          {designCore?.networkObjectModel?.implementationPlan ? <span className="badge badge-info">Verified implementation plan displayed</span> : <span className="badge badge-warning">Implementation plan unavailable</span>}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          A real design package should not stop at topology and addressing. This page renders the verified implementation model when available, including dependencies, blockers, evidence, blast radius, and rollback posture.
        </p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {summaryCard("Implementation steps", synthesized.implementationStages.length, "Wave-by-wave execution structure for this scope.")}
        {summaryCard("Cutover checks", synthesized.cutoverChecklist.length, "Pre-check, cutover, and post-check controls.")}
        {summaryCard("Rollback triggers", synthesized.rollbackPlan.length, "When to stop and revert before deeper damage occurs.")}
        {summaryCard("Validation tests", synthesized.validationPlan.length, "Evidence-backed tests for acceptance and handoff.")}
      </div>



      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Implementation planning checks</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>Implementation steps with source objects, requirement lineage, verification evidence, rollback, dependencies, risk, and readiness. This is not vendor command generation.</p>
          </div>
          {V1ImplementationPlanning ? <span className="badge badge-info">{userFacingStatusLabel(V1ImplementationPlanning.overallReadiness)}</span> : <span className="badge badge-warning">Unavailable</span>}
        </div>
        {V1ImplementationPlanning ? (<>
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {summaryCard("Step gates", V1ImplementationPlanning.stepGateCount, `${V1ImplementationPlanning.blockedStepGateCount} blocked / ${V1ImplementationPlanning.reviewStepGateCount} review`)}
            {summaryCard("Step readiness", V1ImplementationPlanning.stageGateCount, "Readiness derived from implementation checks.")}
            {summaryCard("Requirement gaps", V1ImplementationPlanning.requirementLineageGapCount, "No fake execution when lineage is missing.")}
            {summaryCard("Rollback gates", V1ImplementationPlanning.rollbackGateCount, "Rollback evidence required per step.")}
          </div>
        </>) : (<p className="muted" style={{ margin: 0 }}>Implementation checks are unavailable; treat generated implementation text as advisory only.</p>)}
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Vendor-neutral templates</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>Implementation templates with variables, source objects, source requirements, missing-data blockers, neutral actions, evidence requirements, rollback requirements, and command generation disabled. This is not vendor CLI generation.</p>
          </div>
          {V1ImplementationTemplates ? <span className="badge badge-info">{userFacingStatusLabel(V1ImplementationTemplates.overallReadiness)}</span> : <span className="badge badge-warning">Unavailable</span>}
        </div>
        {V1ImplementationTemplates ? (<>
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {summaryCard("Template gates", V1ImplementationTemplates.templateCount, `${V1ImplementationTemplates.blockedTemplateCount} blocked / ${V1ImplementationTemplates.reviewTemplateCount} review`)}
            {summaryCard("Domains", V1ImplementationTemplates.domainCount, "Addressing, VLANs, DHCP, routing, security, NAT, WAN, validation, rollback.")}
            {summaryCard("Lineage gaps", V1ImplementationTemplates.requirementLineageGapCount + V1ImplementationTemplates.sourceObjectGapCount, "Templates without source evidence stay gated.")}
            {summaryCard("Vendor commands", V1ImplementationTemplates.vendorSpecificCommandCount, V1ImplementationTemplates.commandGenerationAllowed ? "Danger: command generation enabled" : "Command generation disabled by design policy.")}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th align="left">Template</th><th align="left">Domain</th><th align="left">Readiness</th><th align="left">Sources</th><th align="left">Requirements</th><th align="left">Rollback</th></tr></thead>
              <tbody>{V1ImplementationTemplates.templateGates.slice(0, 24).map((template) => (<tr key={template.templateId}><td>{template.title}<br /><span className="muted">{template.templateId}</span></td><td>{template.domain}</td><td>{template.readinessImpact}</td><td>{template.sourceObjectIds.slice(0, 3).join(", ") || "none"}</td><td>{template.sourceRequirementIds.slice(0, 3).join(", ") || "none"}</td><td>{template.rollbackRequirement || "missing rollback"}</td></tr>))}</tbody>
            </table>
          </div>
        </>) : (<p className="muted" style={{ margin: 0 }}>Template checks are not available. Do not treat template text as vendor command output.</p>)}
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
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Execution plan</h2>
          <p className="muted" style={{ margin: 0 }}>
            These steps are meant to guide the change sequence, not just describe it after the fact.
          </p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {synthesized.implementationStages.map((stage) => (
            <div key={stage.stage} className="trust-note">
              <strong>{stage.stage}</strong>
              <p className="muted" style={{ margin: "8px 0" }}>{stage.objective}</p>
              <p className="muted" style={{ margin: "0 0 8px" }}><strong>Scope:</strong> {stage.scope}</p>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div>
                  <p style={{ marginBottom: 8 }}><strong>Dependencies</strong></p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {stage.dependencies.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p style={{ marginBottom: 8 }}><strong>Success criteria</strong></p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {stage.successCriteria.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
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
                  <th align="left">Step</th>
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
                <th align="left">Step</th>
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
