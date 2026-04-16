import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { SectionHeader } from "../components/app/SectionHeader";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { LoadingState } from "../components/app/LoadingState";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { buildRecoveryRoadmapStatus } from "../lib/recoveryRoadmap";
import { buildRecoveryFocusPlan } from "../lib/recoveryFocus";
import { buildDesignAuthorityLedger } from "../lib/designAuthorityLedger";

function summaryCard(label: string, value: number | string, detail?: string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      {detail ? <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{detail}</p> : null}
    </div>
  );
}

function coverageBadge(status: "ready" | "partial" | "pending") {
  if (status === "ready") return "badge badge-info";
  if (status === "partial") return "badge badge-warning";
  return "badge badge-error";
}


function authorityBadge(status: "strong" | "mixed" | "weak") {
  if (status === "strong") return "badge badge-info";
  if (status === "mixed") return "badge badge-warning";
  return "badge badge-error";
}

export function ProjectCoreModelPage() {
  const { projectId = "" } = useParams();
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
    return <LoadingState title="Loading unified design model" message="Linking topology, routing, service placement, boundaries, and flows into one engineering view." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load unified design model"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load the unified model right now."}
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

  const truth = synthesized.designTruthModel;
  const explicitRouteDomains = truth.routeDomains.filter((route) => route.sourceModel === "explicit").length;
  const inferredRouteDomains = truth.routeDomains.filter((route) => route.sourceModel === "inferred").length;
  const explicitBoundaryDomains = truth.boundaryDomains.filter((boundary) => boundary.sourceModel === "explicit").length;
  const inferredBoundaryDomains = truth.boundaryDomains.filter((boundary) => boundary.sourceModel === "inferred").length;
  const savedRouteDomains = truth.routeDomains.filter((route) => route.authoritySource === "saved-design").length;
  const discoveryRouteDomains = truth.routeDomains.filter((route) => route.authoritySource === "discovery-derived").length;
  const plannerRouteDomains = truth.routeDomains.filter((route) => route.authoritySource === "planner-preview").length;
  const savedBoundaryDomains = truth.boundaryDomains.filter((boundary) => boundary.authoritySource === "saved-design").length;
  const discoveryBoundaryDomains = truth.boundaryDomains.filter((boundary) => boundary.authoritySource === "discovery-derived").length;
  const plannerBoundaryDomains = truth.boundaryDomains.filter((boundary) => boundary.authoritySource === "planner-preview").length;
  const recovery = buildRecoveryRoadmapStatus(synthesized);
  const focusPlan = buildRecoveryFocusPlan(projectId, synthesized);
  const authorityLedger = buildDesignAuthorityLedger(projectId, synthesized);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Unified Design Model"
        description="This workspace shows the shared engineering truth layer behind the design package so topology, routing, service placement, boundaries, and flows can be reviewed as one connected model instead of isolated helper views."
        actions={
          <div className="overview-actions-shell">
            <div className="overview-primary-actions">
              <Link to={focusPlan.primaryAction.path} className="link-button">{focusPlan.primaryAction.label}</Link>
              {focusPlan.supportActions.slice(0, 2).map((action) => (
                <Link key={action.key} to={action.path} className="link-button link-button-subtle">{action.label}</Link>
              ))}
            </div>
          </div>
        }
      />

      <div className="panel recovery-focus-panel">
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Authority cleanup focus</h2>
          <p className="muted" style={{ margin: 0 }}>{focusPlan.summary}</p>
        </div>
        <div className="recovery-focus-grid">
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>{focusPlan.headline}</strong>
            <ul className="recovery-focus-signal-list" style={{ margin: 0 }}>
              {focusPlan.focusSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Defer until the model is steadier</strong>
            <ul className="recovery-focus-signal-list" style={{ margin: 0 }}>
              {focusPlan.deferredActions.map((action) => (
                <li key={action.key}>{action.label} — {action.reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Topology {truth.topologyLabel}</span>
          <span className="badge-soft">Breakout {truth.internetBreakout}</span>
          <span className="badge-soft">Primary site {truth.primarySiteName || "Not assigned"}</span>
          <span className="badge-soft">Route domains {truth.routeDomains.length}</span>
          <span className="badge-soft">Boundary domains {truth.boundaryDomains.length}</span>
          <span className="badge-soft">Flow contracts {truth.flowContracts.length}</span>
          <span className="badge-soft">Unresolved refs {truth.unresolvedReferences.length}</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>{truth.summary}</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Authority-source ledger</h2>
            <p className="muted" style={{ margin: 0 }}>
              This ledger keeps the shared model honest about where its trust is coming from. It separates stronger saved design truth from discovery-backed, planner-preview, and still inferred anchors instead of treating every object as equally real.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={authorityBadge(authorityLedger.status)}>{authorityLedger.confidenceLabel}</span>
            <span className="badge-soft">Confidence {authorityLedger.confidenceScore}%</span>
            <span className="badge-soft">Explicit core {authorityLedger.masterEvidence.explicitCoreObjects}</span>
            <span className="badge-soft">Inferred core {authorityLedger.masterEvidence.inferredCoreObjects}</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>{authorityLedger.summary}</p>
          <div style={{ display: "grid", gap: 10 }}>
            {authorityLedger.sourceMix.filter((item) => item.count > 0).map((item) => (
              <div key={item.source} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <strong>{item.label}</strong>
                  <span className="badge-soft">{item.count}</span>
                  <span className="badge-soft">{Math.round(item.share * 100)}%</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
              </div>
            ))}
          </div>
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Top authority debt</strong>
            {authorityLedger.debtItems.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No major authority debt is being flagged from the shared model right now.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {authorityLedger.debtItems.slice(0, 4).map((item) => (
                  <li key={item.id} style={{ marginBottom: 8 }}>
                    <strong>{item.title}</strong> — {item.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Per-site truth pressure</h2>
            <p className="muted" style={{ margin: 0 }}>
              Site-level authority should become visible before the design is treated as truly unified. This keeps the core model from looking strong overall while one or two sites are still thin.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge-soft">Pending sites {authorityLedger.masterEvidence.pendingSites}</span>
            <span className="badge-soft">Partial sites {authorityLedger.masterEvidence.partialSites}</span>
            <span className="badge-soft">Required flows ready {authorityLedger.masterEvidence.requiredFlowsReady}/{authorityLedger.masterEvidence.requiredFlowsTotal}</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {authorityLedger.siteReviews.map((site) => (
              <div key={site.siteId} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <strong>{site.siteName}</strong>
                  <span className={coverageBadge(site.status)}>{site.status}</span>
                  <span className="badge-soft">{site.strongestSourceLabel}</span>
                  <span className="badge-soft">Debt {site.debtCount}</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>{site.detail}</p>
                {site.blockers.length ? (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {site.blockers.slice(0, 3).map((item) => (
                      <li key={item} style={{ marginBottom: 6 }}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Recovery roadmap status</h2>
            <p className="muted" style={{ margin: 0 }}>
              This scorecard turns the recovery roadmap into a live engineering check. It shows which recovery phases now look stronger inside the current build and which ones still need deeper work before the master roadmap fully takes over.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={coverageBadge(recovery.overallStatus)}>{recovery.overallStatus}</span>
            <span className="badge-soft">ready {recovery.completedCount}</span>
            <span className="badge-soft">partial {recovery.partialCount}</span>
            <span className="badge-soft">pending {recovery.pendingCount}</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {recovery.phases.map((phase) => (
              <div key={phase.key} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  <strong>{phase.label}</strong>
                  <span className={coverageBadge(phase.status)}>{phase.status}</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>{phase.detail}</p>
                {phase.blockers.length ? (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {phase.blockers.slice(0, 2).map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Priority repair list</h2>
            <p className="muted" style={{ margin: 0 }}>
              These are the most important remaining repairs before the recovery roadmap can honestly be considered complete.
            </p>
          </div>
          {recovery.topBlockers.length === 0 ? (
            <div className="trust-note">
              <strong>No major recovery blockers are currently being flagged</strong>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                The current build is not seeing an obvious high-priority blocker from the roadmap scorecard.
              </p>
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recovery.topBlockers.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
          )}
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Next moves</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recovery.nextMoves.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {summaryCard("Site nodes", truth.siteNodes.length, "Each site should now carry routing, service, boundary, and flow references.")}
        {summaryCard("Segments", truth.segments.length, "Addressing rows promoted into linked segment objects.")}
        {summaryCard("Route domains", truth.routeDomains.length, "Per-site routing intent and summary ownership.")}
        {summaryCard("Boundary domains", truth.boundaryDomains.length, "Concrete site and zone control points.")}
        {summaryCard("Service domains", truth.serviceDomains.length, "Shared, local, cloud, DMZ, and management services.")}
        {summaryCard("Relationship edges", truth.relationshipEdges.length, "Cross-object links inside the shared model.")}
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Authority split</h2>
            <p className="muted" style={{ margin: 0 }}>
              The recovery goal is not just to have more model objects. It is to make the model authoritative. These counts show both the raw explicit-vs-inferred split and where the explicit pressure is now coming from.
            </p>
          </div>
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {summaryCard("Explicit route domains", explicitRouteDomains)}
            {summaryCard("Inferred route domains", inferredRouteDomains)}
            {summaryCard("Explicit boundaries", explicitBoundaryDomains)}
            {summaryCard("Inferred boundaries", inferredBoundaryDomains)}
          </div>
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {summaryCard("Saved route anchors", savedRouteDomains, "Backed by saved routing objects.")}
            {summaryCard("Discovery route anchors", discoveryRouteDomains, "Promoted from current-state evidence.")}
            {summaryCard("Planner route anchors", plannerRouteDomains, "Held by planner/addressing truth until saved routing records catch up.")}
          </div>
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {summaryCard("Saved boundaries", savedBoundaryDomains, "Backed by saved boundary objects.")}
            {summaryCard("Discovery boundaries", discoveryBoundaryDomains, "Promoted from security or addressing discovery evidence.")}
            {summaryCard("Planner boundaries", plannerBoundaryDomains, "Held by planner/addressing truth until saved boundary records catch up.")}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Generation notes</h2>
            <p className="muted" style={{ margin: 0 }}>
              These notes explain how the current model was completed when the saved design still lacked some explicit routing or boundary objects.
            </p>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {truth.generationNotes.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Model coverage</h2>
          <p className="muted" style={{ margin: 0 }}>
            These checks show whether the unified model is strong enough to drive other workspaces without drifting back into disconnected review-only layers.
          </p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {truth.coverage.map((item) => (
            <div key={item.label} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                <strong>{item.label}</strong>
                <span className={coverageBadge(item.status)}>{item.status}</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Required flow coverage</h2>
          <p className="muted" style={{ margin: 0 }}>
            The recovery roadmap expects certain traffic patterns to exist explicitly, not just as general narrative. This view shows whether the current flow engine is covering the scenario paths that matter for the saved design scope.
          </p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {synthesized.flowCoverage.map((item) => (
            <div key={item.id} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                <strong>{item.label}</strong>
                <span className={coverageBadge(item.status)}>{item.status}</span>
                <span className="badge-soft">{item.required ? 'required' : 'not required'}</span>
                <span className="badge-soft">paths {item.matchedFlowIds.length}</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Site unification table</h2>
            <p className="muted" style={{ margin: 0 }}>
              This table shows whether each site is carrying the objects expected from a real design engine: placements, segments, services, boundaries, flows, WAN, and route ownership.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Site</th>
                  <th align="left">Topology role</th>
                  <th align="left">Route domain</th>
                  <th align="left">Placements</th>
                  <th align="left">Segments</th>
                  <th align="left">Services</th>
                  <th align="left">Boundaries</th>
                  <th align="left">Flows</th>
                  <th align="left">WAN</th>
                  <th align="left">Authority</th>
                </tr>
              </thead>
              <tbody>
                {truth.siteNodes.map((site) => {
                  const route = truth.routeDomains.find((item) => item.id === site.routeDomainId);
                  return (
                    <tr key={site.id}>
                      <td><strong>{site.siteName}</strong>{site.siteCode ? <><br /><span className="muted">{site.siteCode}</span></> : null}</td>
                      <td>{site.topologyRole}</td>
                      <td>{route ? `${route.siteName} (${route.authoritySource})` : "Missing"}</td>
                      <td>{site.placementIds.length}</td>
                      <td>{site.segmentIds.length}</td>
                      <td>{site.serviceIds.length}</td>
                      <td>{site.boundaryIds.length}</td>
                      <td>{site.flowIds.length}</td>
                      <td>{site.wanAdjacencyIds.length}</td>
                      <td>
                        <span className={coverageBadge(site.authorityStatus)}>{site.authorityStatus}</span>
                        {site.authorityNotes.length > 0 ? <><br /><span className="muted">{site.authorityNotes[0]}</span></> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Unresolved references</h2>
            <p className="muted" style={{ margin: 0 }}>
              These are the places where the shared model is still thinner than it should be. This is the right repair list before future report, security, routing, or diagram work.
            </p>
          </div>
          {truth.unresolvedReferences.length === 0 ? (
            <div className="trust-note">
              <strong>No unresolved references detected</strong>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                The current shared model linked its known topology, route, service, boundary, and flow objects without an obvious cross-reference gap.
              </p>
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {truth.unresolvedReferences.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Route and WAN linkage</h2>
            <p className="muted" style={{ margin: 0 }}>
              Route domains should now be the routing anchor for site summaries, loopbacks, flows, and WAN adjacencies.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Route domain</th>
                  <th align="left">Source</th>
                  <th align="left">Summary</th>
                  <th align="left">Loopback</th>
                  <th align="left">Local segments</th>
                  <th align="left">WAN links</th>
                  <th align="left">Flows</th>
                </tr>
              </thead>
              <tbody>
                {truth.routeDomains.map((route) => (
                  <tr key={route.id}>
                    <td>{route.siteName}</td>
                    <td>{route.sourceModel}</td>
                    <td>{route.summaryAdvertisement || "—"}</td>
                    <td>{route.loopbackCidr || "—"}</td>
                    <td>{route.localSegmentIds.length}</td>
                    <td>{route.transitWanAdjacencyIds.length}</td>
                    <td>{route.flowIds.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Boundary and service linkage</h2>
            <p className="muted" style={{ margin: 0 }}>
              Services should now land behind named boundaries and devices rather than floating separately from the trust model.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Boundary</th>
                  <th align="left">Source</th>
                  <th align="left">Attached device</th>
                  <th align="left">Segments</th>
                  <th align="left">Services</th>
                  <th align="left">Flows</th>
                  <th align="left">Policy</th>
                </tr>
              </thead>
              <tbody>
                {truth.boundaryDomains.map((boundary) => (
                  <tr key={boundary.id}>
                    <td><strong>{boundary.siteName}</strong><br /><span className="muted">{boundary.zoneName}</span></td>
                    <td>{boundary.sourceModel}</td>
                    <td>{boundary.attachedDevice}</td>
                    <td>{boundary.segmentIds.length}</td>
                    <td>{boundary.serviceIds.length}</td>
                    <td>{boundary.flowIds.length}</td>
                    <td>{boundary.inboundPolicy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
