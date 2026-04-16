import { Link, useParams } from "react-router-dom";
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
import { buildDiagramSemanticsPack } from "../lib/diagramSemanticsPack";
import { buildDiagramGovernancePack } from "../lib/diagramGovernancePack";
import { buildDiagramBehaviorPack } from "../lib/diagramBehaviorPack";
import { buildDiagramScenarioPack } from "../lib/diagramScenarioPack";
import { buildDiagramProofPack } from "../lib/diagramProofPack";
import { buildDiagramReviewLedger } from "../lib/diagramReviewLedger";

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
  const synthesized = synthesizeLogicalDesign(enrichedProject, enrichedProject.sites, vlans, requirementsProfile);

  const openSiteTasks = comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === "SITE").length;
  const openVlanTasks = comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === "VLAN").length;
  const cloudContext = requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected;
  const topValidationItems = validations.filter((item) => item.severity !== "INFO").slice(0, 5);
  const namingPreview = buildNamingPreviewExamples(requirementsProfile, enrichedProject.sites.map((site) => ({ name: site.name, siteCode: (site as any).siteCode, location: (site as any).location, buildingLabel: (site as any).buildingLabel, floorLabel: (site as any).floorLabel, closetLabel: (site as any).closetLabel || requirementsProfile.closetModel })) );
  const engineeringPack = buildDiagramEngineeringPack(synthesized);
  const objectModelPack = buildDiagramObjectModelPack(synthesized);
  const semanticsPack = buildDiagramSemanticsPack(synthesized);
  const governancePack = buildDiagramGovernancePack(synthesized);
  const behaviorPack = buildDiagramBehaviorPack(synthesized);
  const scenarioPack = buildDiagramScenarioPack(synthesized);
  const proofPack = buildDiagramProofPack(synthesized);
  const reviewLedger = buildDiagramReviewLedger(synthesized);

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
            <span className="badge-soft">Placements {synthesized.sitePlacements.length}</span>
            <span className="badge-soft">Flows {synthesized.trafficFlows.length}</span>
            <span className="badge-soft">Boundaries {synthesized.securityBoundaries.length}</span>
            <span className="badge-soft">Site tasks {openSiteTasks}</span>
            <span className="badge-soft">VLAN tasks {openVlanTasks}</span>
            <span className="badge-soft">Naming {requirementsProfile.deviceNamingConvention}</span>
            <span className="badge-soft">Token {requirementsProfile.namingTokenPreference}</span>
            <span className="badge-soft">Hierarchy {requirementsProfile.namingHierarchy}</span>
            {requirementsProfile.customNamingPattern ? <span className="badge-soft">Custom pattern {requirementsProfile.customNamingPattern}</span> : null}
          </div>
          <p className="muted" style={{ margin: 0 }}>
            This cumulative build continues the diagram realism pass from the recovery roadmap by treating this stage as a device-aware topology workspace with topology-specific rendering behavior, clearer link meaning, stronger overlay review, and a more explicit object model behind the diagram itself.
          </p>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="panel diagram-foundation-card">
            <strong style={{ display: "block", marginBottom: 8 }}>Topology realism foundation</strong>
            <div className="diagram-foundation-metrics">
              <div><span>Topology</span><strong>{synthesized.topology.topologyType}</strong></div>
              <div><span>WAN</span><strong>{synthesized.topology.wanPattern || (synthesized.wanLinks.length ? "WAN present" : "Local only")}</strong></div>
              <div><span>Cloud</span><strong>{synthesized.topology.cloudConnected ? (synthesized.topology.cloudProvider || "Cloud attached") : "Not attached"}</strong></div>
              <div><span>Primary site</span><strong>{synthesized.topology.primarySiteName || "Not assigned"}</strong></div>
            </div>
            <p className="muted" style={{ margin: "10px 0 0 0" }}>
              The topology object now drives diagram reading more explicitly: which site acts as the hub or shared-service anchor, where breakout is expected, and whether cloud/WAN edges should be visible.
            </p>
          </div>

          <div className="panel diagram-foundation-card">
            <strong style={{ display: "block", marginBottom: 8 }}>What this stage should answer</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 6 }}>What device roles exist at each site and where the edge sits.</li>
              <li style={{ marginBottom: 6 }}>Which zones and services hang off which device/domain.</li>
              <li style={{ marginBottom: 6 }}>How branch, cloud, internet, DMZ, and management paths are expected to traverse.</li>
              <li style={{ marginBottom: 0 }}>Which diagram view or overlay best supports the review you are doing.</li>
            </ul>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginTop: 14 }}>
          <div className="panel diagram-foundation-card">
            <strong style={{ display: "block", marginBottom: 8 }}>Symbol direction</strong>
            <p className="muted" style={{ margin: 0 }}>
              Device visuals are now being pushed toward real-looking network symbols: firewall, router, stacked switch, wireless, server, cloud edge, and internet edge. The target is a diagram that feels closer to a professional network drawing than a generic node map.
            </p>
          </div>
          <div className="panel diagram-foundation-card">
            <strong style={{ display: "block", marginBottom: 8 }}>Overlay review direction</strong>
            <p className="muted" style={{ margin: 0 }}>
              Use placement first, then addressing, then security, then flows. That sequence keeps the diagram readable while still letting you verify subnets, trust boundaries, and traffic paths against the rest of the design package.
            </p>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginTop: 14 }}>
          <div className="panel diagram-foundation-card">
            <strong style={{ display: "block", marginBottom: 8 }}>Topology object direction</strong>
            <p className="muted" style={{ margin: 0 }}>
              The diagram stage should now read more like a topology object review: what pattern was selected, which site acts as the primary edge, where breakout occurs, and which services or trust boundaries must appear because of that choice.
            </p>
          </div>
          <div className="panel diagram-foundation-card">
            <strong style={{ display: "block", marginBottom: 8 }}>Link semantics and rendering direction</strong>
            <p className="muted" style={{ margin: 0 }}>
              Link styles should now be reviewed as explicit rendering types: routed handoff, trunk/switched carriage, internet/public edge, tunnel/VPN, HA or restricted-control movement, and highlighted traffic-flow review paths.
            </p>
          </div>
        </div>

        <div className="diagram-canvas-panel">
          <ProjectDiagram project={enrichedProject} comments={comments} validations={validations} />
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Device-aware topology inventory</strong>
            <p className="muted" style={{ margin: 0 }}>These are the synthesized placements currently driving the diagram. This is the bridge from page narrative to real topology objects.</p>
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
            <strong style={{ display: "block", marginBottom: 6 }}>Path and boundary review</strong>
            <p className="muted" style={{ margin: 0 }}>Use these generated flows and boundaries to verify that the diagram reflects how traffic is actually meant to move.</p>
          </div>
          <div className="diagram-path-review-grid">
            {synthesized.trafficFlows.slice(0, 4).map((flow) => (
              <div key={flow.id} className="diagram-path-card">
                <strong>{flow.flowLabel}</strong>
                <p>{flow.sourceZone} → {flow.destinationZone}</p>
                <span>{flow.path.join(" → ")}</span>
              </div>
            ))}
            {synthesized.securityBoundaries.slice(0, 4).map((boundary) => (
              <div key={`${boundary.siteName}-${boundary.zoneName}`} className="diagram-path-card">
                <strong>{boundary.zoneName}</strong>
                <p>{boundary.siteName} • {boundary.attachedDevice}</p>
                <span>{boundary.controlPoint}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Topology pattern rule</strong>
            <p className="muted" style={{ margin: 0 }}>This turns the selected topology into a review rule so the diagram does not drift into a generic layout.</p>
          </div>
          <div className="diagram-pattern-rule-card">
            <strong>{engineeringPack.patternRule.title}</strong>
            <div className="network-chip-list" style={{ marginTop: 10 }}>
              {engineeringPack.patternRule.reviewPriority.map((item) => <span key={item} className="badge-soft">{item}</span>)}
            </div>
            <ul style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
              {engineeringPack.patternRule.signals.map((signal) => <li key={signal} style={{ marginBottom: 6 }}>{signal}</li>)}
            </ul>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Device role count snapshot</strong>
            <p className="muted" style={{ margin: 0 }}>Use this as a quick sanity check that the topology has real edge, switching, wireless, server, and cloud objects behind it.</p>
          </div>
          <div className="diagram-role-count-grid">
            {engineeringPack.deviceRoleCounts.map((item) => (
              <div key={item.role} className="diagram-role-count-card">
                <span>{item.role}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Topology domain objects</strong>
            <p className="muted" style={{ margin: 0 }}>The diagram should now be explainable as explicit domain objects: site domains, zones, service domains, and route domains.</p>
          </div>
          <div className="diagram-domain-grid">
            {objectModelPack.domains.slice(0, 12).map((domain) => (
              <div key={domain.id} className="diagram-domain-card">
                <div className="diagram-site-review-head">
                  <strong>{domain.title}</strong>
                  <span className="badge-soft">{domain.domainType}</span>
                </div>
                <p className="muted" style={{ margin: "0 0 8px 0" }}>{domain.reviewIntent}</p>
                <div className="diagram-review-sublist">
                  <strong>Anchor</strong>
                  <ul>
                    <li>{domain.anchor}</li>
                  </ul>
                </div>
                <div className="diagram-review-sublist">
                  <strong>Members</strong>
                  <ul>
                    {domain.members.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Rendering directives</strong>
            <p className="muted" style={{ margin: 0 }}>These directives keep the topology from drifting back into generic boxes and unlabeled lines.</p>
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

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div>
          <strong style={{ display: "block", marginBottom: 6 }}>Site topology review cards</strong>
          <p className="muted" style={{ margin: 0 }}>These cards summarize what each site should look like in the topology, what should anchor it, and which overlay matters most there.</p>
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
            <strong style={{ display: "block", marginBottom: 6 }}>Link object review matrix</strong>
            <p className="muted" style={{ margin: 0 }}>The diagram should increasingly be reviewable as explicit connection objects, not just visible lines.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Category</th>
                  <th align="left">Label</th>
                  <th align="left">From</th>
                  <th align="left">To</th>
                  <th align="left">Semantics</th>
                  <th align="left">Review hint</th>
                </tr>
              </thead>
              <tbody>
                {engineeringPack.linkObjects.map((item) => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td><strong>{item.label}</strong></td>
                    <td>{item.from}</td>
                    <td>{item.to}</td>
                    <td>{item.semantics}</td>
                    <td>{item.reviewHint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Overlay evidence package</strong>
            <p className="muted" style={{ margin: 0 }}>Each overlay should be defendable by real generated objects. This shows the evidence currently supporting each one.</p>
          </div>
          <div className="diagram-overlay-evidence-grid">
            {engineeringPack.overlays.map((overlay) => (
              <div key={overlay.overlay} className="diagram-overlay-evidence-card">
                <div className="diagram-site-review-head">
                  <strong>{overlay.overlay}</strong>
                  <span className="badge-soft">{overlay.count}</span>
                </div>
                <p className="muted" style={{ margin: "0 0 8px 0" }}>{overlay.reviewQuestion}</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {overlay.evidence.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Adjacency and control review</strong>
            <p className="muted" style={{ margin: 0 }}>Review adjacencies as explicit relationships with transport and control meaning, not just line art.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Source</th>
                  <th align="left">Target</th>
                  <th align="left">Relationship</th>
                  <th align="left">Transport</th>
                  <th align="left">Control point</th>
                  <th align="left">Expected behavior</th>
                </tr>
              </thead>
              <tbody>
                {objectModelPack.adjacencies.map((row) => (
                  <tr key={row.id}>
                    <td>{row.source}</td>
                    <td>{row.target}</td>
                    <td><strong>{row.relationship}</strong></td>
                    <td>{row.transport}</td>
                    <td>{row.controlPoint}</td>
                    <td>{row.expectedBehavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Published edge paths</strong>
            <p className="muted" style={{ margin: 0 }}>DMZ, cloud, and externally published services should show believable ingress and delivery anchors.</p>
          </div>
          <div className="diagram-published-path-grid">
            {objectModelPack.publishedPaths.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No explicit published edge paths are present yet.</p>
            ) : objectModelPack.publishedPaths.map((item) => (
              <div key={item.id} className="diagram-published-path-card">
                <div className="diagram-site-review-head">
                  <strong>{item.serviceName}</strong>
                  <span className="badge-soft">{item.exposureType}</span>
                </div>
                <div className="diagram-site-review-lines">
                  <div><span>Site</span><strong>{item.siteName}</strong></div>
                  <div><span>Ingress</span><strong>{item.ingressAnchor}</strong></div>
                  <div><span>Delivery</span><strong>{item.deliveryAnchor}</strong></div>
                </div>
                <p className="muted" style={{ margin: "8px 0 0 0" }}>{item.reviewNote}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div>
          <strong style={{ display: "block", marginBottom: 6 }}>Diagram review sequence</strong>
          <p className="muted" style={{ margin: 0 }}>This sequence turns the topology stage into a repeatable review workflow rather than a one-shot visual check.</p>
        </div>
        <div className="diagram-sequence-grid">
          {objectModelPack.sequence.map((step) => (
            <div key={step.step} className="diagram-sequence-card">
              <div className="diagram-site-review-head">
                <strong>Step {step.step}</strong>
                <span className="badge-soft">{step.title}</span>
              </div>
              <p className="muted" style={{ margin: "0 0 8px 0" }}>{step.whyItMatters}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {step.evidence.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div>
          <strong style={{ display: "block", marginBottom: 6 }}>Diagram naming preview</strong>
          <p className="muted" style={{ margin: 0 }}>The same naming standard should now flow into device labels on the diagram and into the report. Use this preview to confirm whether site code or full location tokens read better before deeper review.</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">Token</th>
                <th align="left">Building</th>
                <th align="left">Floor</th>
                <th align="left">Closet</th>
                <th align="left">FW01 / FW02</th>
                <th align="left">SW01 / SW02</th>
                <th align="left">AP01 / AP02</th>
                <th align="left">Other roles</th>
              </tr>
            </thead>
            <tbody>
              {namingPreview.map((item) => (
                <tr key={item.siteLabel}>
                  <td>{item.siteLabel}</td>
                  <td><code>{item.token}</code></td>
                  <td>{item.buildingLabel}</td>
                  <td>{item.floorLabel}</td><td>{item.closetLabel}</td>
                  <td><code>{item.firewall}</code><br /><code>{item.firewallSecondary}</code></td>
                  <td><code>{item.switchName}</code><br /><code>{item.switchSecondary}</code></td>
                  <td><code>{item.accessPoint}</code><br /><code>{item.accessPointSecondary}</code></td><td><code>{item.routerName}</code><br /><code>{item.controllerName}</code><br /><code>{item.serverName}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
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




      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Service reachability proof</strong>
          <div style={{ display: "grid", gap: 12 }}>
            {proofPack.reachability.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No reachability proof rows are available yet.</p>
            ) : proofPack.reachability.map((item) => (
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
                <p className="muted" style={{ margin: '8px 0 0 0' }}><strong>Path:</strong> {item.pathSummary}</p>
                <p className="muted" style={{ margin: '4px 0 0 0' }}><strong>Boundary:</strong> {item.boundarySummary}</p>
                <p className="muted" style={{ margin: '6px 0 0 0' }}>{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Dependency proof cards</strong>
          <div className="diagram-proof-grid">
            {proofPack.dependencyProofs.map((item) => (
              <div key={item.id} className="diagram-proof-card">
                <div className="diagram-site-review-head">
                  <strong>{item.siteName}</strong>
                  <span className="badge-soft">{item.siteRole}</span>
                </div>
                <div className="diagram-review-sublist">
                  <strong>Dependencies</strong>
                  <ul>
                    {(item.dependencies.length ? item.dependencies : ['No explicit upstream dependencies captured yet']).map((dep) => <li key={dep}>{dep}</li>)}
                  </ul>
                </div>
                <div className="diagram-review-sublist">
                  <strong>Evidence</strong>
                  <ul>
                    {item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}
                  </ul>
                </div>
                <p className="muted" style={{ margin: '8px 0 0 0' }}>{item.trustStatement}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Overlay audit trail</strong>
          <div className="diagram-proof-grid">
            {proofPack.overlayAudit.map((row) => (
              <div key={row.overlay} className="diagram-proof-card">
                <div className="diagram-site-review-head">
                  <strong>{row.overlay}</strong>
                  <span className="badge-soft">Audit</span>
                </div>
                <p className="muted" style={{ margin: '0 0 8px 0' }}>{row.objective}</p>
                <div className="diagram-review-sublist">
                  <strong>Available evidence</strong>
                  <ul>
                    {(row.availableEvidence.length ? row.availableEvidence : ['No overlay evidence captured yet']).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="diagram-review-sublist">
                  <strong>Missing evidence</strong>
                  <ul>
                    {(row.missingEvidence.length ? row.missingEvidence : ['No major evidence gaps flagged']).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <p className="muted" style={{ margin: '8px 0 0 0' }}>{row.reviewAction}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Topology consistency checks</strong>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Site</th>
                  <th align="left">Pattern</th>
                  <th align="left">Observed posture</th>
                  <th align="left">Consistency</th>
                  <th align="left">Drift risk</th>
                  <th align="left">Next check</th>
                </tr>
              </thead>
              <tbody>
                {proofPack.consistencyRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.siteName}</td>
                    <td>{row.selectedPattern}</td>
                    <td>{row.observedPosture}</td>
                    <td><span className={`diagram-consistency-chip diagram-consistency-${row.consistency}`}>{row.consistency}</span></td>
                    <td>{row.driftRisk}</td>
                    <td>{row.nextCheck}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <strong style={{ display: "block", marginBottom: 10 }}>Rendering confidence roadmap</strong>
        <div className="diagram-proof-grid">
          {proofPack.renderingConfidence.map((row) => (
            <div key={row.area} className="diagram-proof-card">
              <div className="diagram-site-review-head">
                <strong>{row.area}</strong>
                <span className="badge-soft">Next</span>
              </div>
              <p className="muted" style={{ margin: '0 0 8px 0' }}>{row.currentSignal}</p>
              <p className="muted" style={{ margin: 0 }}><strong>Upgrade direction:</strong> {row.nextUpgrade}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel diagram-foundation-card">
          <strong style={{ display: "block", marginBottom: 8 }}>Topology-specific review priority</strong>
          <p className="muted" style={{ margin: 0 }}>
            The diagram should now be reviewed according to the selected pattern, and the symbols themselves should increasingly look like real network devices. Hub-and-spoke should emphasize hub concentration and branch dependency, while campus or collapsed-core should emphasize local edge, segmentation, switch hierarchy, and realistic device placement.
          </p>
        </div>

        <div className="panel diagram-foundation-card">
          <strong style={{ display: "block", marginBottom: 8 }}>Future auth / onboarding roadmap note</strong>
          <p className="muted" style={{ margin: 0 }}>
            The roadmap should now carry a future onboarding improvement: add an optional <strong>Continue with Google</strong> sign-in path alongside email/password to reduce signup friction without replacing local account control. That remains a future auth/onboarding item while the current build track stays focused on the design engine and topology workspace.
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Route-domain review pack</strong>
          <div style={{ display: "grid", gap: 12 }}>
            {semanticsPack.routeDomains.map((domain) => (
              <div key={domain.id} className="diagram-semantic-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>{domain.title}</strong>
                  <span className="badge-soft">{domain.anchor}</span>
                </div>
                <p className="muted" style={{ margin: "6px 0 8px 0" }}>{domain.defaultBehavior}</p>
                <div className="diagram-chip-row">
                  {domain.summaries.map((item) => <span key={item} className="badge-soft">{item}</span>)}
                </div>
                <div className="diagram-chip-row" style={{ marginTop: 8 }}>
                  {domain.transit.map((item) => <span key={item} className="badge-soft">{item}</span>)}
                </div>
                <p className="muted" style={{ margin: "8px 0 0 0" }}>{domain.reviewNote}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Service publication and exposure review</strong>
          <div style={{ display: "grid", gap: 12 }}>
            {semanticsPack.serviceExposure.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No externally exposed, DMZ, cloud, or shared services are synthesized yet.</p>
            ) : semanticsPack.serviceExposure.map((item) => (
              <div key={item.id} className="diagram-semantic-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>{item.serviceName}</strong>
                  <span className="badge-soft">{item.siteName}</span>
                </div>
                <div className="diagram-chip-row" style={{ marginTop: 8 }}>
                  {item.exposurePath.map((segment) => <span key={segment} className="badge-soft">{segment}</span>)}
                </div>
                <p className="muted" style={{ margin: "8px 0 0 0" }}><strong>Control boundary:</strong> {item.controlBoundary}</p>
                <p className="muted" style={{ margin: "4px 0 0 0" }}><strong>Consumers:</strong> {item.consumerModel}</p>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>{item.reviewNote}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Overlay preset packs</strong>
          <div className="diagram-semantic-grid">
            {semanticsPack.overlayPresets.map((preset) => (
              <div key={preset.key} className="diagram-semantic-card">
                <strong>{preset.title}</strong>
                <div className="diagram-chip-row" style={{ marginTop: 8 }}>
                  {preset.focus.map((item) => <span key={item} className="badge-soft">{item}</span>)}
                </div>
                <ul style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
                  {preset.verify.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Rendering semantics guide</strong>
          <div className="diagram-semantic-grid">
            {semanticsPack.renderingSemantics.map((item) => (
              <div key={item.id} className="diagram-semantic-card">
                <strong>{item.title}</strong>
                <p className="muted" style={{ margin: "8px 0 0 0" }}><strong>Meaning:</strong> {item.lineMeaning}</p>
                <p className="muted" style={{ margin: "6px 0 0 0" }}><strong>When:</strong> {item.whenToUse}</p>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>{item.expectedVisibleSignal}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <strong style={{ display: "block", marginBottom: 10 }}>Site posture review matrix</strong>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">Placement posture</th>
                <th align="left">Edge posture</th>
                <th align="left">Service posture</th>
                <th align="left">Control posture</th>
                <th align="left">Routing posture</th>
              </tr>
            </thead>
            <tbody>
              {semanticsPack.sitePostures.map((row) => (
                <tr key={row.siteId}>
                  <td>{row.siteName}</td>
                  <td>{row.placementPosture}</td>
                  <td>{row.edgePosture}</td>
                  <td>{row.servicePosture}</td>
                  <td>{row.controlPosture}</td>
                  <td>{row.routingPosture}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 16 }}>
        <strong>Cross-site path contracts</strong>
        <div className="diagram-chip-row">
          {behaviorPack.crossSitePaths.slice(0, 3).map((item) => (
            <span key={item.id} className={`diagram-mini-chip diagram-mini-chip-${item.reviewPriority}`}>{item.flowLabel}</span>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Flow</th>
                <th align="left">Source</th>
                <th align="left">Target</th>
                <th align="left">Route expectation</th>
                <th align="left">Boundary steps</th>
                <th align="left">Priority</th>
              </tr>
            </thead>
            <tbody>
              {behaviorPack.crossSitePaths.length ? behaviorPack.crossSitePaths.map((item) => (
                <tr key={item.id}>
                  <td>{item.flowLabel}</td>
                  <td>{item.sourceSite}</td>
                  <td>{item.targetSite}</td>
                  <td>{item.routeExpectation}</td>
                  <td>{item.boundarySteps.join(" → ")}</td>
                  <td>{item.reviewPriority}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="muted">No cross-site critical paths are explicit yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <strong>Boundary enforcement review</strong>
          <div className="diagram-review-grid">
            {behaviorPack.boundaryEnforcement.slice(0, 6).map((item) => (
              <article key={item.id} className="diagram-review-card">
                <div className="diagram-review-card-header">
                  <span>{item.siteName}</span>
                  <span className="diagram-review-chip">{item.zoneName}</span>
                </div>
                <div className="diagram-review-card-title">{item.boundaryName}</div>
                <p className="muted" style={{ margin: 0 }}>
                  Control point: <strong>{item.controlPoint}</strong>
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Allowed peers: {item.allowedPeers.length ? item.allowedPeers.join(", ") : "None explicit yet"}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Denied / restricted intent: {item.deniedIntent}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Evidence: {item.evidence.join(" • ")}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <strong>Site anchor gap review</strong>
          <div className="diagram-review-grid">
            {behaviorPack.siteAnchorGaps.map((item) => (
              <article key={item.siteId} className="diagram-review-card">
                <div className="diagram-review-card-header">
                  <span>{item.siteName}</span>
                  <span className="diagram-review-chip">{item.missingAnchors.length ? "Needs work" : "Anchored"}</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  Missing anchors: {item.missingAnchors.length ? item.missingAnchors.join(", ") : "None major"}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Weak signals: {item.weakSignals.length ? item.weakSignals.join(", ") : "No major weak signals"}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Next best fix: {item.nextBestAnchor}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <strong>Overlay choreography</strong>
          <div className="diagram-review-grid">
            {behaviorPack.overlayChoreography.map((step) => (
              <article key={step.id} className="diagram-review-card">
                <div className="diagram-review-card-title">{step.title}</div>
                <ol style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
                  {step.sequence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
                <p className="muted" style={{ margin: 0 }}>
                  Look for: {step.lookFor.join(" • ")}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Evidence: {step.evidence.join(" • ")}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <strong>Render intent rules</strong>
          <div className="diagram-review-grid">
            {behaviorPack.renderIntentRules.map((rule) => (
              <article key={rule.id} className="diagram-review-card">
                <div className="diagram-review-card-title">{rule.scenario}</div>
                <p className="muted" style={{ margin: 0 }}>
                  Placement: {rule.placementRule}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Paths: {rule.pathRule}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Boundaries: {rule.boundaryRule}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  Icon direction: {rule.iconIntent}
                </p>
              </article>
            ))}
          </div>
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
    
<div className="diagram-page-grid diagram-page-grid--two">
  <article className="surface-card">
    <div className="diagram-review-kicker">Service-consumer paths</div>
    <h3 style={{ marginTop: 8 }}>Consumer path review</h3>
    <p className="diagram-panel-note">
      This pack checks whether major services can be explained from consumer to delivery point through a visible path and boundary anchor.
    </p>
    <div className="diagram-service-path-list">
      {scenarioPack.serviceConsumerPaths.map((item) => (
        <div key={`${item.service}-${item.consumer}`} className="diagram-service-path-card">
          <div className="diagram-service-path-header">
            <strong>{item.service}</strong>
            <span className={`diagram-confidence-pill diagram-confidence-pill--${item.confidence.toLowerCase()}`}>{item.confidence}</span>
          </div>
          <div className="diagram-service-path-line">{item.consumer}</div>
          <div className="diagram-service-path-line">{item.path}</div>
          <div className="diagram-service-path-line"><strong>Boundary:</strong> {item.boundary}</div>
          <p className="diagram-panel-note" style={{ marginTop: 8 }}>{item.note}</p>
        </div>
      ))}
    </div>
  </article>

  <article className="surface-card">
    <div className="diagram-review-kicker">Dependency and hotspot review</div>
    <h3 style={{ marginTop: 8 }}>Site dependency chains</h3>
    <p className="diagram-panel-note">
      The diagram stage should also show where sites depend on upstream services, path anchors, and policy boundaries.
    </p>
    <div className="diagram-dependency-list">
      {scenarioPack.dependencyChains.map((item) => (
        <div key={item.name} className="diagram-dependency-card">
          <strong>{item.name}</strong>
          <div className="diagram-chip-row" style={{ marginTop: 8 }}>
            {item.dependsOn.map((dependency) => (
              <span key={dependency} className="diagram-chip">{dependency}</span>
            ))}
          </div>
          <p className="diagram-panel-note" style={{ marginTop: 8 }}>{item.risk}</p>
          <p className="diagram-panel-note">{item.evidence}</p>
        </div>
      ))}
    </div>
  </article>
</div>

<div className="diagram-page-grid diagram-page-grid--two">
  <article className="surface-card">
    <div className="diagram-review-kicker">Overlay evidence ledger</div>
    <h3 style={{ marginTop: 8 }}>Evidence by overlay</h3>
    <div className="diagram-overlay-ledger">
      {scenarioPack.overlayLedger.map((row) => (
        <div key={row.overlay} className="diagram-overlay-ledger-card">
          <div className="diagram-service-path-header">
            <strong>{row.overlay}</strong>
            <span className={`diagram-confidence-pill diagram-confidence-pill--${row.confidence.toLowerCase()}`}>{row.confidence}</span>
          </div>
          <div className="diagram-chip-row" style={{ marginTop: 8 }}>
            {row.evidence.map((item) => (
              <span key={item} className="diagram-chip">{item}</span>
            ))}
          </div>
          <p className="diagram-panel-note" style={{ marginTop: 8 }}>{row.nextCheck}</p>
        </div>
      ))}
    </div>
  </article>

  <article className="surface-card">
    <div className="diagram-review-kicker">Hotspot and risk focus</div>
    <h3 style={{ marginTop: 8 }}>Current scenario summary</h3>
    <div className="diagram-semantics-grid">
      <div className="diagram-semantics-card">
        <strong>Pattern</strong>
        <div className="diagram-panel-note" style={{ marginTop: 6 }}>{scenarioPack.scenarioSummary.pattern}</div>
      </div>
      <div className="diagram-semantics-card">
        <strong>Primary risk</strong>
        <div className="diagram-panel-note" style={{ marginTop: 6 }}>{scenarioPack.scenarioSummary.primaryRisk}</div>
      </div>
      <div className="diagram-semantics-card">
        <strong>Strongest evidence</strong>
        <div className="diagram-panel-note" style={{ marginTop: 6 }}>{scenarioPack.scenarioSummary.strongestEvidence}</div>
      </div>
    </div>
    <div className="diagram-hotspot-list" style={{ marginTop: 12 }}>
      {scenarioPack.hotspots.map((item) => (
        <div key={`${item.site}-${item.area}`} className="diagram-hotspot-card">
          <div className="diagram-service-path-header">
            <strong>{item.site}</strong>
            <span className="diagram-chip">{item.area}</span>
          </div>
          <p className="diagram-panel-note" style={{ marginTop: 8 }}><strong>Reason:</strong> {item.reason}</p>
          <p className="diagram-panel-note"><strong>Impact:</strong> {item.impact}</p>
          <p className="diagram-panel-note"><strong>Next move:</strong> {item.nextMove}</p>
        </div>
      ))}
    </div>
  </article>
</div>



      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Site dependency chains</strong>
            <p className="muted" style={{ margin: 0 }}>Use these chains to see whether each site has enough upstream and downstream anchors to support believable topology review.</p>
          </div>
          <div className="review-ledger-grid">
            {reviewLedger.dependencyChains.map((item) => (
              <div key={item.siteName} className="review-ledger-card">
                <div className="network-chip-list" style={{ marginBottom: 8 }}>
                  <span className={`badge-soft confidence-${item.confidence}`}>{item.confidence} confidence</span>
                  <span className="badge-soft">{item.siteName}</span>
                </div>
                <strong>{item.siteName}</strong>
                <p className="muted" style={{ margin: "6px 0 8px 0" }}>{item.note}</p>
                <div className="review-chain-list">
                  {item.chain.map((step) => <span key={step} className="review-chain-step">{step}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Boundary drift review</strong>
            <p className="muted" style={{ margin: 0 }}>This keeps trust boundaries from becoming decorative labels by showing posture, control point, and next action together.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Site</th>
                  <th align="left">Boundary</th>
                  <th align="left">Posture</th>
                  <th align="left">Control</th>
                  <th align="left">Risk</th>
                  <th align="left">Next action</th>
                </tr>
              </thead>
              <tbody>
                {reviewLedger.boundaryDrift.map((item) => (
                  <tr key={`${item.siteName}-${item.boundaryName}`}>
                    <td>{item.siteName}</td>
                    <td><strong>{item.boundaryName}</strong></td>
                    <td>{item.posture}</td>
                    <td>{item.controlPoint}</td>
                    <td><span className={`badge-soft risk-${item.driftRisk}`}>{item.driftRisk}</span></td>
                    <td>{item.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Flow coverage ledger</strong>
            <p className="muted" style={{ margin: 0 }}>A path should not only exist. It should have enough site, control, and behavior detail to support review.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Flow</th>
                  <th align="left">From</th>
                  <th align="left">To</th>
                  <th align="left">Path steps</th>
                  <th align="left">Control steps</th>
                  <th align="left">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {reviewLedger.flowCoverage.map((item) => (
                  <tr key={item.flowLabel}>
                    <td><strong>{item.flowLabel}</strong><br /><span className="muted">{item.note}</span></td>
                    <td>{item.sourceSite}</td>
                    <td>{item.destinationSite}</td>
                    <td>{item.pathSteps}</td>
                    <td>{item.controlSteps}</td>
                    <td><span className={`badge-soft coverage-${item.coverage}`}>{item.coverage}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Visual upgrade track</strong>
            <p className="muted" style={{ margin: 0 }}>This keeps the direction explicit: more realistic symbols, clearer connection meaning, and stronger trust in the topology stage.</p>
          </div>
          <div className="review-ledger-grid">
            {reviewLedger.visualUpgradeTrack.map((item) => (
              <div key={item.area} className="review-ledger-card">
                <strong>{item.area}</strong>
                <p className="muted" style={{ margin: "6px 0" }}>{item.currentState}</p>
                <div className="review-next-move">{item.nextMove}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

</section>
  );
}
