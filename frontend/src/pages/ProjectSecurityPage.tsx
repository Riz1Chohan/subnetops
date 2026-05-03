import { Link, useLocation, useParams } from "react-router-dom";
import { useMemo } from "react";
import { SectionHeader } from "../components/app/SectionHeader";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { LoadingState } from "../components/app/LoadingState";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useAuthoritativeDesign } from "../features/designCore/hooks";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { buildRecoveryRoadmapStatus } from "../lib/recoveryRoadmap";
import { WorkspaceIssueBanner } from "../components/app/WorkspaceIssueBanner";
import { parseWorkspaceIssueNotice } from "../lib/workspaceIssue";
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
  const { synthesized, designCore, authority } = useAuthoritativeDesign(projectId, project, sites, vlans, requirementsProfile);

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
  const backendSecurityFlow = designCore?.networkObjectModel?.securityPolicyFlow;
  const V1SecurityPolicy = designCore?.V1SecurityPolicyFlow;
  const backendPolicyMatrix = backendSecurityFlow?.policyMatrix ?? [];
  const backendRuleOrderReviews = backendSecurityFlow?.ruleOrderReviews ?? [];
  const backendNatReviews = backendSecurityFlow?.natReviews ?? [];

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
      <DesignAuthorityBanner authority={authority} compact />

      <div className="panel" style={{ display: selectedSection && selectedSection !== "overview" ? "none" : "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Security zones {synthesized.securityZones.length}</span>
          <span className="badge-soft">Controls {synthesized.securityControls.length}</span>
          <span className="badge-soft">Backend policy rows {backendPolicyMatrix.length || synthesized.securityPolicyMatrix.length}</span>
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
            {recovery.stages.filter((stage) => stage.key === "stage-f" || stage.key === "stage-b" || stage.key === "stage-e").map((stage) => (
              <div key={stage.key} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <strong>{stage.label}</strong>
                  <span className={stage.status === "ready" ? "badge badge-info" : stage.status === "partial" ? "badge badge-warning" : "badge badge-error"}>{stage.status}</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>{stage.detail}</p>
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
        {summaryCard("Backend policy rows", backendPolicyMatrix.length || synthesized.securityPolicyMatrix.length, "Backend security matrix rows carried by the authoritative design-core snapshot.")}
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
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Backend security policy engine</h2>
          <p className="muted" style={{ margin: 0 }}>
            These rows come from the backend design-core security engine. The frontend is only rendering the matrix, rule-order review, and NAT review; it is not creating firewall policy.
          </p>
        </div>
        {backendSecurityFlow ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={backendSecurityFlow.summary.policyReadiness === "blocked" ? "badge badge-error" : backendSecurityFlow.summary.policyReadiness === "review" ? "badge badge-warning" : "badge badge-info"}>policy {backendSecurityFlow.summary.policyReadiness}</span>
              <span className={backendSecurityFlow.summary.natReadiness === "blocked" ? "badge badge-error" : backendSecurityFlow.summary.natReadiness === "review" ? "badge badge-warning" : "badge badge-info"}>nat {backendSecurityFlow.summary.natReadiness}</span>
              <span className="badge-soft">implicit deny gaps {backendSecurityFlow.summary.implicitDenyGapCount}</span>
              <span className="badge-soft">shadowed rules {backendSecurityFlow.summary.shadowedRuleCount}</span>
              <span className="badge-soft">logging gaps {backendSecurityFlow.summary.loggingGapCount}</span>
              {V1SecurityPolicy ? <span className={V1SecurityPolicy.overallReadiness === "BLOCKED" ? "badge badge-error" : V1SecurityPolicy.overallReadiness === "REVIEW_REQUIRED" ? "badge badge-warning" : "badge badge-info"}>V1 {V1SecurityPolicy.overallReadiness}</span> : null}
              {V1SecurityPolicy ? <span className="badge-soft">flow consequences {V1SecurityPolicy.flowConsequenceCount}</span> : null}
              {V1SecurityPolicy ? <span className="badge-soft">requirement gaps {V1SecurityPolicy.activeRequirementSecurityGapCount}</span> : null}
            </div>

            {V1SecurityPolicy ? (
              <div className="panel" style={{ background: "rgba(255,255,255,0.02)", display: "grid", gap: 12 }}>
                <div><h3 style={{ marginTop: 0, marginBottom: 6 }}>V1 security policy flow control</h3><p className="muted" style={{ margin: 0 }}>This is the strict backend control layer for zone-to-zone matrix, service dependencies, NAT, logging, broad permits, shadowing, and explicit requirement-to-flow consequences. It is not firewall command generation.</p></div>
                <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Requirement</th><th align="left">Active</th><th align="left">Readiness</th><th align="left">Actual flows</th><th align="left">Missing</th></tr></thead><tbody>{V1SecurityPolicy.requirementSecurityMatrix.slice(0, 10).map((row) => (<tr key={row.requirementKey}><td>{row.requirementLabel}<br /><span className="muted">{row.requirementKey}</span></td><td>{row.active ? "yes" : "no"}</td><td>{row.readinessImpact}</td><td>{row.actualFlowRequirementIds.slice(0, 4).join(", ") || "—"}</td><td>{row.missingSecurityCategories.slice(0, 5).join(", ") || "—"}</td></tr>))}</tbody></table></div>
                <div style={{ overflowX: "auto" }}><table><thead><tr><th align="left">Flow consequence</th><th align="left">Source</th><th align="left">Destination</th><th align="left">Action</th><th align="left">V1 state</th><th align="left">Review reason</th></tr></thead><tbody>{V1SecurityPolicy.flowConsequences.slice(0, 12).map((row) => (<tr key={row.id}><td>{row.name}<br /><span className="muted">{row.flowRequirementId}</span></td><td>{row.sourceZoneName}</td><td>{row.destinationZoneName}</td><td>{row.expectedAction}</td><td>{row.V1PolicyState}</td><td>{row.reviewReason || row.consequenceSummary}</td></tr>))}</tbody></table></div>
              </div>
            ) : null}

            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th align="left">Source</th>
                    <th align="left">Destination</th>
                    <th align="left">Default posture</th>
                    <th align="left">State</th>
                    <th align="left">Explicit rules</th>
                    <th align="left">Required flows</th>
                    <th align="left">NAT flows</th>
                  </tr>
                </thead>
                <tbody>
                  {backendPolicyMatrix.slice(0, 12).map((row) => (
                    <tr key={row.id}>
                      <td>{row.sourceZoneName}</td>
                      <td>{row.destinationZoneName}</td>
                      <td>{row.defaultPosture}</td>
                      <td>{row.state}</td>
                      <td>{row.explicitPolicyRuleIds.length}</td>
                      <td>{row.requiredFlowIds.length}</td>
                      <td>{row.natRequiredFlowIds.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid-2" style={{ alignItems: "start" }}>
              <div style={{ overflowX: "auto" }}>
                <h3 style={{ marginTop: 0 }}>Rule-order review</h3>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Seq</th>
                      <th align="left">Rule</th>
                      <th align="left">Action</th>
                      <th align="left">Services</th>
                      <th align="left">State</th>
                      <th align="left">Shadowed by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backendRuleOrderReviews.slice(0, 10).map((row) => (
                      <tr key={row.id}>
                        <td>{row.sequence}</td>
                        <td>{row.ruleName}</td>
                        <td>{row.action}</td>
                        <td>{row.services.join(", ")}</td>
                        <td>{row.state}</td>
                        <td>{row.shadowedByRuleIds.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ overflowX: "auto" }}>
                <h3 style={{ marginTop: 0 }}>NAT review</h3>
                <table>
                  <thead>
                    <tr>
                      <th align="left">Rule</th>
                      <th align="left">Source</th>
                      <th align="left">Destination</th>
                      <th align="left">Mode</th>
                      <th align="left">State</th>
                      <th align="left">Covered flows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backendNatReviews.slice(0, 10).map((row) => (
                      <tr key={row.id}>
                        <td>{row.natRuleName}</td>
                        <td>{row.sourceZoneName}</td>
                        <td>{row.destinationZoneName || "review"}</td>
                        <td>{row.translatedAddressMode}</td>
                        <td>{row.state}</td>
                        <td>{row.coveredFlowRequirementIds.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No backend security engine output"
            message="SubnetOps cannot render authoritative security policy rows until the backend design-core snapshot is available."
          />
        )}
      </div>

      <div className="panel" style={{ display: selectedSection && selectedSection !== "policy" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Legacy policy-intent display</h2>
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
