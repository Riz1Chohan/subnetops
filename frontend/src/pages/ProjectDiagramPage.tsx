import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { useProject, useProjectVlans } from "../features/projects/hooks";
import { useProjectComments } from "../features/comments/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { buildNamingPreviewExamples, parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { useValidationResults } from "../features/validation/hooks";
import { buildValidationFixPath, validationFixLabel } from "../lib/validationFixLink";
import { buildDiagramEngineeringPack } from "../lib/diagramReviewModel";
import { buildDiagramObjectModelPack } from "../lib/diagramObjectModel";
import { buildDiagramProofPack } from "../lib/diagramProofPack";
import { buildDesignAuthorityLedger } from "../lib/designAuthorityLedger";

type DiagramSectionKey = "canvas" | "topology" | "sites" | "paths" | "naming" | "fixes";

type DiagramWorkspaceLink = {
  key: DiagramSectionKey;
  label: string;
  description: string;
};

const diagramSections: DiagramWorkspaceLink[] = [
  { key: "canvas", label: "Canvas", description: "Interactive topology surface, overlays, and exports." },
  { key: "topology", label: "Topology posture", description: "Architecture rules, authority, and placement direction." },
  { key: "sites", label: "Site review", description: "Per-site anchors, device roles, and low-level posture." },
  { key: "paths", label: "Paths & boundaries", description: "Critical flows, reachability, and trust boundaries." },
  { key: "naming", label: "Naming & symbols", description: "Naming previews, icon direction, and role counts." },
  { key: "fixes", label: "Open issues", description: "Validation findings, task counts, and correction links." },
];

function selectedDiagramSection(value: string | null): DiagramSectionKey {
  const match = diagramSections.find((section) => section.key === value);
  return match?.key ?? "canvas";
}

export function ProjectDiagramPage() {
  const { projectId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const section = selectedDiagramSection(searchParams.get("section"));
  const projectQuery = useProject(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const commentsQuery = useProjectComments(projectId);
  const validationQuery = useValidationResults(projectId);

  const project = projectQuery.data;
  const vlans = vlansQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const validations = validationQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);

  if (projectQuery.isLoading) return <LoadingState title="Loading diagram" message="Preparing the diagram workspace." />;
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

  const synthesized = synthesizeLogicalDesign(enrichedProject, enrichedProject.sites, vlans, requirementsProfile);
  const namingPreview = buildNamingPreviewExamples(
    requirementsProfile,
    enrichedProject.sites.map((site) => ({
      name: site.name,
      siteCode: (site as any).siteCode,
      location: (site as any).location,
      buildingLabel: (site as any).buildingLabel,
      floorLabel: (site as any).floorLabel,
      closetLabel: (site as any).closetLabel || requirementsProfile.closetModel,
    }))
  );
  const engineeringPack = buildDiagramEngineeringPack(synthesized);
  const objectModelPack = buildDiagramObjectModelPack(synthesized);
  const proofPack = buildDiagramProofPack(synthesized);
  const authorityLedger = buildDesignAuthorityLedger(projectId, synthesized);

  const openSiteTasks = comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === "SITE").length;
  const openVlanTasks = comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === "VLAN").length;
  const topValidationItems = validations.filter((item) => item.severity !== "INFO").slice(0, 6);
  const topologySummary = synthesized.topology.topologyType === "collapsed-core"
    ? "Single-site or collapsed-core posture with local breakout and local edge emphasis."
    : synthesized.topology.internetBreakout === "centralized"
      ? "Multi-site posture with centralized breakout and shared-service anchoring."
      : "Multi-site posture with distributed breakout and site-local edge behavior.";

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Diagram workspace"
        description="Use the diagram as a focused topology workspace: choose one review track on the left, then work only that slice on the right."
        actions={(
          <div className="overview-actions-shell">
            <div className="overview-primary-actions">
              <Link to={`/projects/${projectId}/report?section=topology`} className="link-button">Open report</Link>
              <Link to={`/projects/${projectId}/logical-design?section=topology`} className="link-button link-button-subtle">Open design package</Link>
            </div>
          </div>
        )}
      />

      {section === "canvas" ? null : (
      <div className="panel diagram-header-summary-panel">
        <div className="network-chip-list">
          <span className="badge-soft">Sites {enrichedProject.sites.length}</span>
          <span className="badge-soft">VLANs {vlans.length}</span>
          <span className="badge-soft">Placements {synthesized.sitePlacements.length}</span>
          <span className="badge-soft">Flows {synthesized.trafficFlows.length}</span>
          <span className="badge-soft">Boundaries {synthesized.securityBoundaries.length}</span>
          <span className="badge-soft">Open issues {topValidationItems.length}</span>
        </div>
      </div>
      )}

      <div className="project-stage-workspace">
        <div className="panel project-stage-nav-pane">
          <div className="project-stage-nav-header">
            <div>
              <strong style={{ display: "block", marginBottom: 4 }}>Diagram navigator</strong>
              <p className="muted" style={{ margin: 0 }}>Pick one review slice. The right pane shows only that selected part of the diagram workspace.</p>
            </div>
          </div>

          <div className="project-stage-nav-list">
            {diagramSections.map((item) => (
              <Link
                key={item.key}
                to={`/projects/${projectId}/diagram?section=${item.key}`}
                className={section === item.key ? "project-stage-nav-link active" : "project-stage-nav-link"}
              >
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </Link>
            ))}
          </div>

          <details className="project-action-center" open={section === "fixes" && topValidationItems.length > 0}>
            <summary>
              <span>Open diagram issues</span>
              <span className="badge-soft">{topValidationItems.length}</span>
            </summary>
            <div className="project-action-center-list">
              {topValidationItems.length === 0 ? (
                <div className="project-action-center-link"><strong>No active blockers</strong><span>The main validation feed is currently clear for the diagram workspace.</span></div>
              ) : topValidationItems.map((item) => (
                <Link key={item.id} to={buildValidationFixPath(projectId, item)} className={`project-action-center-link ${item.severity === "ERROR" ? "primary" : "warning"}`}>
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                </Link>
              ))}
            </div>
          </details>

          <div className="project-stage-nav-footer">
            <Link to={`/projects/${projectId}/report?section=topology`} className="link-button link-button-subtle">Report</Link>
            <Link to={`/projects/${projectId}/core-model?section=sites`} className="link-button link-button-subtle">Core model</Link>
          </div>
        </div>

        <div className="project-stage-content-pane">
          {section === "canvas" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="diagram-canvas-panel">
                <ProjectDiagram project={enrichedProject} comments={comments} validations={validations} compact />
              </div>
              <div className="panel diagram-foundation-card">
                <div className="network-chip-list">
                  <span className="badge-soft">Confidence {authorityLedger.confidenceScore}%</span>
                  <span className="badge-soft">Weak sites {authorityLedger.siteReviews.filter((item) => item.status !== "ready").length}</span>
                  <span className="badge-soft">Unresolved refs {synthesized.designTruthModel.unresolvedReferences.length}</span>
                </div>
                <p className="muted" style={{ margin: "10px 0 0 0" }}>Use the control strip inside the canvas to change view, overlay, scope, device focus, link focus, and labels.</p>
              </div>
            </div>
          ) : null}

          {section === "topology" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div className="panel diagram-foundation-card">
                  <strong style={{ display: "block", marginBottom: 8 }}>Topology pattern rule</strong>
                  <strong>{engineeringPack.patternRule.title}</strong>
                  <div className="network-chip-list" style={{ marginTop: 10 }}>
                    {engineeringPack.patternRule.reviewPriority.map((item) => <span key={item} className="badge-soft">{item}</span>)}
                  </div>
                  <ul style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
                    {engineeringPack.patternRule.signals.map((signal) => <li key={signal} style={{ marginBottom: 6 }}>{signal}</li>)}
                  </ul>
                </div>
                <div className="panel diagram-foundation-card">
                  <strong style={{ display: "block", marginBottom: 8 }}>Topology authority mix</strong>
                  <div className="network-chip-list">
                    <span className="badge-soft">Saved {synthesized.designTruthModel.routeDomains.filter((item) => item.authoritySource === "saved-design").length + synthesized.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "saved-design").length}</span>
                    <span className="badge-soft">Discovery {synthesized.designTruthModel.routeDomains.filter((item) => item.authoritySource === "discovery-derived").length + synthesized.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "discovery-derived").length}</span>
                    <span className="badge-soft">Planner {synthesized.designTruthModel.routeDomains.filter((item) => item.authoritySource === "planner-preview").length + synthesized.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "planner-preview").length}</span>
                    <span className="badge-soft">Inferred {synthesized.designTruthModel.routeDomains.filter((item) => item.authoritySource === "inferred").length + synthesized.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "inferred").length}</span>
                  </div>
                  <p className="muted" style={{ margin: "10px 0 0 0" }}>A stronger diagram needs more saved and discovery-backed anchors, not just inferred structure.</p>
                </div>
              </div>

              <div className="grid-2" style={{ alignItems: "start" }}>
                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Topology views and main gaps</strong>
                    <p className="muted" style={{ margin: 0 }}>These views should stay consistent with the chosen pattern and with the actual addressing, service, and routing model behind the page.</p>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {objectModelPack.topologyViews.map((item) => (
                      <div key={item.id} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                          <strong>{item.label}</strong>
                          <span className={item.status === "ready" ? "badge badge-info" : item.status === "partial" ? "badge badge-warning" : "badge badge-error"}>{item.status}</span>
                        </div>
                        <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Rendering directives</strong>
                    <p className="muted" style={{ margin: 0 }}>These directives keep the topology from drifting back into generic nodes and unlabeled lines.</p>
                  </div>
                  <div className="diagram-directive-grid">
                    {objectModelPack.directives.map((directive) => (
                      <div key={directive.title} className="diagram-directive-card">
                        <strong>{directive.title}</strong>
                        <div className="diagram-mini-chip-group" style={{ marginTop: 10 }}>
                          {directive.focus.map((item) => <span key={item} className="badge-soft">{item}</span>)}
                        </div>
                        <ul style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
                          {directive.expectedSignals.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {section === "sites" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="panel" style={{ display: "grid", gap: 12 }}>
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Site review cards</strong>
                  <p className="muted" style={{ margin: 0 }}>Review one site at a time: edge anchor, switching anchor, wireless presence, service anchors, and trust anchors.</p>
                </div>
                <div className="diagram-site-review-grid">
                  {engineeringPack.siteCards.map((card) => (
                    <div key={card.siteId} className="diagram-site-review-card">
                      <div className="diagram-site-review-head">
                        <strong>{card.siteName}</strong>
                        <span className="badge-soft">{card.siteTier}</span>
                      </div>
                      <p className="muted" style={{ margin: "0 0 10px 0" }}>{card.topologyRole}</p>
                      <div className="diagram-site-review-lines">
                        <div><span>Edge</span><strong>{card.edgeAnchor}</strong></div>
                        <div><span>Switching</span><strong>{card.switchingAnchor}</strong></div>
                        <div><span>Wireless</span><strong>{card.wirelessAnchor}</strong></div>
                        <div><span>Path emphasis</span><strong>{card.pathEmphasis}</strong></div>
                      </div>
                      <div className="diagram-mini-chip-group">
                        {card.overlayFocus.map((item) => <span key={item} className="badge-soft">{item}</span>)}
                      </div>
                      <div className="diagram-review-sublist">
                        <strong>Service anchors</strong>
                        <ul>
                          {(card.serviceAnchor.length ? card.serviceAnchor : ["No explicit service anchors yet"]).map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="diagram-review-sublist">
                        <strong>Trust anchors</strong>
                        <ul>
                          {(card.trustAnchor.length ? card.trustAnchor : ["No explicit trust anchors yet"]).map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2" style={{ alignItems: "start" }}>
                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Device-aware topology inventory</strong>
                    <p className="muted" style={{ margin: 0 }}>These placements are the concrete objects driving the diagram and site-level topology behavior.</p>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th align="left">Site</th>
                          <th align="left">Device</th>
                          <th align="left">Role</th>
                          <th align="left">Zones</th>
                          <th align="left">Subnets / labels</th>
                          <th align="left">Uplink</th>
                        </tr>
                      </thead>
                      <tbody>
                        {synthesized.sitePlacements.slice(0, 18).map((placement) => (
                          <tr key={placement.id}>
                            <td>{placement.siteName}</td>
                            <td><strong>{placement.deviceName}</strong><br /><span className="muted">{placement.deviceType}</span></td>
                            <td>{placement.role}</td>
                            <td>{placement.connectedZones.join(", ") || "—"}</td>
                            <td>{placement.connectedSubnets.join(", ") || placement.interfaceLabels.join(", ") || "—"}</td>
                            <td>{placement.uplinkTarget || "Local / none"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Sites needing more proof</strong>
                    <p className="muted" style={{ margin: 0 }}>These sites still need stronger saved or discovery-backed design anchors before the diagram can be treated as fully trustworthy.</p>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {authorityLedger.siteReviews.slice(0, 6).map((site) => (
                      <div key={site.siteId} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                          <strong>{site.siteName}</strong>
                          <span className={site.status === "ready" ? "badge badge-info" : site.status === "partial" ? "badge badge-warning" : "badge badge-error"}>{site.status}</span>
                          <span className="badge-soft">{site.strongestSourceLabel}</span>
                        </div>
                        <p className="muted" style={{ margin: 0 }}>{site.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {section === "paths" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Critical paths and boundaries</strong>
                    <p className="muted" style={{ margin: 0 }}>Use these flows and boundary objects to verify that the canvas matches how traffic is actually expected to move.</p>
                  </div>
                  <div className="diagram-path-review-grid">
                    {synthesized.trafficFlows.slice(0, 6).map((flow) => (
                      <div key={flow.id} className="diagram-path-card">
                        <strong>{flow.flowLabel}</strong>
                        <p>{flow.sourceZone} → {flow.destinationZone}</p>
                        <span>{flow.path.join(" → ")}</span>
                      </div>
                    ))}
                    {synthesized.securityBoundaries.slice(0, 6).map((boundary) => (
                      <div key={`${boundary.siteName}-${boundary.zoneName}`} className="diagram-path-card">
                        <strong>{boundary.zoneName}</strong>
                        <p>{boundary.siteName} • {boundary.attachedDevice}</p>
                        <span>{boundary.controlPoint}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Service reachability proof</strong>
                    <p className="muted" style={{ margin: 0 }}>These cards are useful when a path looks visually correct but the underlying service reachability still needs proof.</p>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {proofPack.reachability.length === 0 ? (
                      <p className="muted" style={{ margin: 0 }}>No reachability proof rows are available yet.</p>
                    ) : proofPack.reachability.slice(0, 6).map((item) => (
                      <div key={item.id} className="diagram-proof-card">
                        <div className="diagram-site-review-head">
                          <strong>{item.serviceName}</strong>
                          <span className={`diagram-consistency-chip diagram-consistency-${item.confidence}`}>{item.confidence}</span>
                        </div>
                        <div className="diagram-site-review-lines">
                          <div><span>Consumer</span><strong>{item.consumer}</strong></div>
                          <div><span>Source</span><strong>{item.sourceSite}</strong></div>
                          <div><span>Target</span><strong>{item.targetSite}</strong></div>
                        </div>
                        <p className="muted" style={{ margin: "8px 0 0 0" }}><strong>Path:</strong> {item.pathSummary}</p>
                        <p className="muted" style={{ margin: "4px 0 0 0" }}><strong>Boundary:</strong> {item.boundarySummary}</p>
                        <p className="muted" style={{ margin: "6px 0 0 0" }}>{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {section === "naming" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Naming preview</strong>
                    <p className="muted" style={{ margin: 0 }}>Use these previews to keep device names consistent between the canvas, the design package, and the report.</p>
                  </div>
                  <div className="diagram-proof-grid">
                    {namingPreview.map((item) => (
                      <div key={item.siteLabel} className="diagram-proof-card">
                        <div className="diagram-site-review-head">
                          <strong>{item.siteLabel}</strong>
                          <span className="badge-soft">{item.token}</span>
                        </div>
                        <div className="diagram-site-review-lines">
                          <div><span>Firewall</span><strong>{item.firewall}</strong></div>
                          <div><span>Core / switch</span><strong>{item.switchName}</strong></div>
                          <div><span>Router</span><strong>{item.routerName}</strong></div>
                          <div><span>Controller</span><strong>{item.controllerName}</strong></div>
                          <div><span>AP</span><strong>{item.accessPoint}</strong></div>
                          <div><span>Server</span><strong>{item.serverName}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Symbol and role direction</strong>
                    <p className="muted" style={{ margin: 0 }}>The rebuilt icon family should read as real networking objects, not generic blocks: firewall, router, switching layers, wireless, servers, cloud edge, and internet edge.</p>
                  </div>
                  <div className="diagram-role-count-grid">
                    {engineeringPack.deviceRoleCounts.map((item) => (
                      <div key={item.role} className="diagram-role-count-card">
                        <span>{item.role}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <strong style={{ display: "block", marginBottom: 8 }}>Icon family direction</strong>
                    <p className="muted" style={{ margin: 0 }}>Use the canvas for the actual symbols and line types. Use this section to review whether the naming and icon roles still line up with the logical design package.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {section === "fixes" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Validation items to keep beside the diagram</strong>
                    <p className="muted" style={{ margin: 0 }}>If the canvas looks wrong, start from the fix links below and correct the underlying design object rather than forcing a visual workaround.</p>
                  </div>
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

                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>Correction support</strong>
                    <p className="muted" style={{ margin: 0 }}>These are the most common non-validation blockers that still affect the diagram workspace.</p>
                  </div>
                  <div className="network-chip-list">
                    <span className="badge-soft">Open site tasks {openSiteTasks}</span>
                    <span className="badge-soft">Open VLAN tasks {openVlanTasks}</span>
                    <span className="badge-soft">Weak site reviews {authorityLedger.siteReviews.filter((item) => item.status !== "ready").length}</span>
                    <span className="badge-soft">Unresolved refs {synthesized.designTruthModel.unresolvedReferences.length}</span>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {authorityLedger.debtItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <strong style={{ display: "block", marginBottom: 6 }}>{item.title}</strong>
                        <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
