import { Link, useLocation, useParams } from "react-router-dom";
import { useMemo } from "react";
import { SectionHeader } from "../components/app/SectionHeader";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { LoadingState } from "../components/app/LoadingState";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { buildRecoveryRoadmapStatus } from "../lib/recoveryRoadmap";
import { WorkspaceIssueBanner } from "../components/app/WorkspaceIssueBanner";
import { parseWorkspaceIssueNotice } from "../lib/workspaceIssue";

function summaryCard(label: string, value: number | string, detail?: string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      {detail ? <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{detail}</p> : null}
    </div>
  );
}

function controlBadge(status: "required" | "recommended" | "optional") {
  if (status === "required") return "badge badge-error";
  if (status === "recommended") return "badge badge-warning";
  return "badge badge-info";
}

function reviewBadge(severity: "critical" | "warning" | "info") {
  if (severity === "critical") return "badge badge-error";
  if (severity === "warning") return "badge badge-warning";
  return "badge badge-info";
}

export function ProjectSecurityPage() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const synthesized = useMemo(
    () => synthesizeLogicalDesign(project, sites, vlans, requirementsProfile),
    [project, sites, vlans, requirementsProfile],
  );

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading security architecture" message="Composing security zones, control recommendations, and policy intent." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load security architecture"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load the security architecture view right now."}
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

  const recovery = buildRecoveryRoadmapStatus(synthesized);
  const selectedSection = new URLSearchParams(location.search).get("section");
  const isFocusedSectionView = Boolean(selectedSection);
  const issueNotice = parseWorkspaceIssueNotice(location.search);
  const focusKey = issueNotice?.focus;
  const focusClass = (key: string) => `panel workspace-focus-target ${focusKey === key ? "active" : ""}`.trim();
  const focusedSectionTitle = selectedSection === "boundaries" ? "Security boundaries" : selectedSection === "policy" ? "Policy-intent matrix" : selectedSection === "controls" ? "Controls and segmentation review" : "Security overview";

  const criticalFindings = synthesized.segmentationReview.filter((item) => item.severity === "critical").length;
  const warningFindings = synthesized.segmentationReview.filter((item) => item.severity === "warning").length;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Security Architecture"
        description="This workspace turns the logical design into explicit trust zones, security controls, policy-intent flows, and segmentation review findings before implementation begins."
        actions={
          <>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Logical Design</Link>
            <Link to={`/projects/${projectId}/core-model`} className="link-button">Core Model</Link>
            <Link to={`/projects/${projectId}/addressing`} className="link-button">Addressing Plan</Link>
            <Link to={`/projects/${projectId}/validation`} className="link-button">Validation</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Report</Link>
          </>
        }
      />

      {isFocusedSectionView ? (
        <div className="panel workspace-detail-hero">
          <div>
            <p className="workspace-detail-kicker">Design Package</p>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>{focusedSectionTitle}</h2>
            <p className="muted" style={{ margin: 0 }}>Focused security view so the right pane stays on one trust or policy slice at a time.</p>
          </div>
        </div>
      ) : null}

      <WorkspaceIssueBanner notice={issueNotice} />

      <div className="panel" style={{ display: selectedSection && selectedSection !== "overview" ? "none" : "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Security zones {synthesized.securityZones.length}</span>
          <span className="badge-soft">Controls {synthesized.securityControls.length}</span>
          <span className="badge-soft">Policy flows {synthesized.securityPolicyMatrix.length}</span>
          <span className="badge-soft">Segmentation review {criticalFindings} critical / {warningFindings} warning</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          A real planning tool should not stop at VLANs. It should show the trust model, the expected control points, the allowed flows between zones,
          and the security findings that still need review before anyone writes production firewall or routing policy.
        </p>
      </div>

      <div className="grid-2" style={{ display: selectedSection && selectedSection !== "overview" ? "none" : "grid", alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Security recovery status</h2>
            <p className="muted" style={{ margin: 0 }}>This keeps the security workspace tied to the recovery roadmap so zones, boundaries, and policy paths stay grounded in explicit design objects.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={recovery.overallStatus === "ready" ? "badge badge-info" : recovery.overallStatus === "partial" ? "badge badge-warning" : "badge badge-error"}>{recovery.overallStatus}</span>
            <span className="badge-soft">ready {recovery.completedCount}</span>
            <span className="badge-soft">partial {recovery.partialCount}</span>
            <span className="badge-soft">pending {recovery.pendingCount}</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {recovery.phases.filter((phase) => phase.key === "phase-f" || phase.key === "phase-b" || phase.key === "phase-e").map((phase) => (
              <div key={phase.key} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <strong>{phase.label}</strong>
                  <span className={phase.status === "ready" ? "badge badge-info" : phase.status === "partial" ? "badge badge-warning" : "badge badge-error"}>{phase.status}</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>{phase.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Top remaining blocker</h2>
            <p className="muted" style={{ margin: 0 }}>This is the strongest currently visible recovery blocker affecting this workspace.</p>
          </div>
          <div className="trust-note">
            <strong>{recovery.topBlockers[0] || "No major blocker currently surfaced"}</strong>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ display: selectedSection && selectedSection !== "boundaries" ? "none" : "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {summaryCard("Security zones", synthesized.securityZones.length, "Distinct trust boundaries carried in the logical design.")}
        {summaryCard("Required controls", synthesized.securityControls.filter((item) => item.status === "required").length, "Controls that should not be skipped for the saved scope.")}
        {summaryCard("Policy-intent flows", synthesized.securityPolicyMatrix.length, "Reviewed inter-zone flow expectations before implementation.")}
        {summaryCard("Open security findings", synthesized.segmentationReview.filter((item) => item.severity !== "info").length, "Critical and warning findings that still need engineering review.")}
      </div>

      <div className={focusClass("boundary-truth")} style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Boundary truth layer from the core model</h2>
          <p className="muted" style={{ margin: 0 }}>
            The security workspace is now being tied back to explicit or inferred boundary domains. This helps keep segmentation, service placement, and flow enforcement inside one model instead of leaving them as separate review layers.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Boundary</th>
                <th align="left">Source</th>
                <th align="left">Route domain</th>
                <th align="left">Device</th>
                <th align="left">Inside relationships</th>
                <th align="left">Outside relationships</th>
                <th align="left">Published services</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.securityBoundaries.map((boundary) => (
                <tr key={`${boundary.siteName}-${boundary.zoneName}`}>
                  <td>{boundary.siteName} / {boundary.zoneName}</td>
                  <td>{synthesized.designTruthModel.boundaryDomains.find((item) => item.siteName === boundary.siteName && item.zoneName === boundary.zoneName)?.sourceModel || 'explicit'}</td>
                  <td>{boundary.routeDomain || 'TBD'}</td>
                  <td>{boundary.attachedDevice}</td>
                  <td>{boundary.insideRelationships.join(', ') || '—'}</td>
                  <td>{boundary.outsideRelationships.join(', ') || '—'}</td>
                  <td>{boundary.publishedServices.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "boundaries" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Security zones and trust boundaries</h2>
          <p className="muted" style={{ margin: 0 }}>
            These zones describe how the design should separate trusted users, services, management, guest access, specialty devices, remote access, transport, and cloud boundaries.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Zone</th>
                <th align="left">Type</th>
                <th align="left">Segments</th>
                <th align="left">Trust level</th>
                <th align="left">Enforcement</th>
                <th align="left">North-south policy</th>
                <th align="left">East-west policy</th>
                <th align="left">Identity / monitoring</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.securityZones.map((zone) => (
                <tr key={zone.zoneName}>
                  <td>{zone.zoneName}</td>
                  <td>{zone.zoneType}</td>
                  <td>{zone.segments.join(", ") || "—"}</td>
                  <td>{zone.trustLevel}</td>
                  <td>{zone.enforcement}</td>
                  <td>{zone.northSouthPolicy}</td>
                  <td>{zone.eastWestPolicy}</td>
                  <td>{zone.identityControl}. {zone.monitoringExpectation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ display: selectedSection && selectedSection !== "controls" ? "none" : "grid", alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Control recommendations</h2>
            <p className="muted" style={{ margin: 0 }}>
              These controls reflect the minimum security and operational posture implied by the current requirements and logical design.
            </p>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {synthesized.securityControls.map((item) => (
              <div key={item.control} className="trust-note">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  <strong>{item.control}</strong>
                  <span className={controlBadge(item.status)}>{item.status}</span>
                </div>
                <p className="muted" style={{ margin: "0 0 8px" }}>{item.rationale}</p>
                <p className="muted" style={{ margin: 0 }}><strong>Implementation hint:</strong> {item.implementationHint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={focusClass("segmentation-review")} style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Segmentation review</h2>
            <p className="muted" style={{ margin: 0 }}>
              This review highlights whether the designed trust model is actually coherent for the saved scope.
            </p>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {synthesized.segmentationReview.map((item) => (
              <div key={`${item.severity}-${item.title}`} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  <strong>{item.title}</strong>
                  <span className={reviewBadge(item.severity)}>{item.severity}</span>
                </div>
                <p className="muted" style={{ margin: "0 0 8px" }}>{item.detail}</p>
                {item.affected.length > 0 ? <p className="muted" style={{ margin: 0 }}><strong>Affected:</strong> {item.affected.join(", ")}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "policy" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Policy-intent matrix</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is not a final firewall rulebase. It is the engineering policy intent that should guide detailed access rules, ACLs, and security platform implementation.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Source zone</th>
                <th align="left">Target zone</th>
                <th align="left">Default action</th>
                <th align="left">Allowed flows</th>
                <th align="left">Control point</th>
                <th align="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.securityPolicyMatrix.map((row) => (
                <tr key={`${row.sourceZone}-${row.targetZone}`}>
                  <td>{row.sourceZone}</td>
                  <td>{row.targetZone}</td>
                  <td>{row.defaultAction}</td>
                  <td>{row.allowedFlows}</td>
                  <td>{row.controlPoint}</td>
                  <td>{row.notes.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
