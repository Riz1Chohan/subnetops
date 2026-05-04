import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { useProject, useProjectSites, useProjectVlans, useUpdateProject } from "../features/projects/hooks";
import { useAuthoritativeDesign } from "../features/designCore/hooks";
import {
  analyzeDiscoveryWorkspaceState,
  clearDiscoveryWorkspaceState,
  emptyDiscoveryWorkspaceState,
  resolveDiscoveryWorkspaceState,
  saveDiscoveryWorkspaceState,
  type DiscoveryWorkspaceState,
} from "../lib/discoveryFoundation";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { buildRecoveryMasterRoadmapGate, buildRecoveryRoadmapStatus } from "../lib/recoveryRoadmap";
import { WorkspaceIssueBanner } from "../components/app/WorkspaceIssueBanner";
import { parseWorkspaceIssueNotice } from "../lib/workspaceIssue";
import { userFacingStatusLabel } from "../lib/userFacingCopy";

function summaryCard(label: string, value: number | string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
    </div>
  );
}

function textareaField(label: string, description: string, value: string, onChange: (next: string) => void, placeholder: string) {
  return (
    <label className="field" style={{ display: "grid", gap: 8 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span className="muted">{description}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={7}
        style={{ resize: "vertical" }}
      />
    </label>
  );
}

export function ProjectDiscoveryPage() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);

  const project = projectQuery.data;
  const selectedSection = new URLSearchParams(location.search).get("section");
  const isFocusedSectionView = Boolean(selectedSection);
  const issueNotice = parseWorkspaceIssueNotice(location.search);
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];

  const updateProjectMutation = useUpdateProject(projectId);
  const [state, setState] = useState<DiscoveryWorkspaceState>(emptyDiscoveryWorkspaceState());
  const [loaded, setLoaded] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string>("");

  useEffect(() => {
    if (!projectId) return;
    const resolved = resolveDiscoveryWorkspaceState(projectId, project);
    setState(resolved);
    setLoaded(true);
  }, [projectId, project?.discoveryJson]);

  const summary = useMemo(
    () => analyzeDiscoveryWorkspaceState({ project, sites, vlans, state }),
    [project, sites, vlans, state],
  );
  const requirementsProfile = useMemo(() => parseRequirementsProfile(project?.requirementsJson), [project?.requirementsJson]);
  const { synthesized, designCore } = useAuthoritativeDesign(projectId, project, sites, vlans, requirementsProfile);
  const recovery = useMemo(() => buildRecoveryRoadmapStatus(synthesized), [synthesized]);
  const masterGate = useMemo(() => buildRecoveryMasterRoadmapGate(recovery), [recovery]);
  const discoveryRouteAnchors = synthesized.designTruthModel.routeDomains.filter((item) => item.authoritySource === "discovery-derived");
  const discoveryBoundaryAnchors = synthesized.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "discovery-derived");
  const backendUnconfirmedRouteAnchors = synthesized.designTruthModel.routeDomains.filter((item) => item.authoritySource === "backend-unconfirmed");
  const backendUnconfirmedBoundaryAnchors = synthesized.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "backend-unconfirmed");
  const V1DiscoveryCurrentState = designCore?.V1DiscoveryCurrentState;

  const updateState = (patch: Partial<DiscoveryWorkspaceState>) => {
    setState((current) => ({ ...current, ...patch }));
    setSaveNotice("");
  };

  const saveNow = async () => {
    const payload: DiscoveryWorkspaceState = {
      ...state,
      lastSavedAt: new Date().toISOString(),
    };
    await updateProjectMutation.mutateAsync({ discoveryJson: JSON.stringify(payload) });
    saveDiscoveryWorkspaceState(projectId, payload);
    setState(payload);
    setSaveNotice(`Saved to shared project data • ${new Date(payload.lastSavedAt || new Date().toISOString()).toLocaleString()}`);
  };

  const clearAll = async () => {
    clearDiscoveryWorkspaceState(projectId);
    await updateProjectMutation.mutateAsync({ discoveryJson: JSON.stringify(emptyDiscoveryWorkspaceState()) });
    setState(emptyDiscoveryWorkspaceState());
    setSaveNotice("Discovery notes cleared from shared project data for this project.");
  };

  if (projectQuery.isLoading || !loaded) {
    return <LoadingState title="Loading discovery workspace" message="Preparing the current-state ingestion foundation for this project." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load discovery workspace"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this project right now."}
      />
    );
  }

  if (!selectedSection) {
    return (
      <section style={{ display: "grid", gap: 18 }}>
        <div className="panel workspace-selection-blank">
          <p className="workspace-detail-kicker">Discovery</p>
          <h2 style={{ margin: "0 0 8px 0" }}>Select a card from the left pane</h2>
          <p className="muted" style={{ margin: 0 }}>Choose a discovery card from the left pane to open that focused workspace.</p>
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

  const focusedSectionTitle = selectedSection === "summary"
    ? "Current state summary"
    : selectedSection === "contract"
      ? "Current-state evidence"
      : selectedSection === "extraction"
        ? "Extraction preview"
        : selectedSection === "authority"
          ? "Route and boundary anchors"
          : selectedSection === "inputs"
            ? "Paste inputs"
            : selectedSection === "coverage"
              ? "Coverage and gaps"
              : "Discovery";

  return (
    <section style={{ display: "grid", gap: 18 }}>
      {isFocusedSectionView ? (
        <div className="panel workspace-detail-hero">
          <div>
            <p className="workspace-detail-kicker">Discovery</p>
            <h1 style={{ margin: "0 0 8px 0" }}>{focusedSectionTitle}</h1>
            <p className="muted" style={{ margin: 0 }}>Work one discovery card at a time. Use the left pane to switch between discovery sections.</p>
          </div>
          <div className="workspace-detail-actions">
            <button type="button" className="button-secondary" onClick={() => void saveNow()} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? "Saving..." : "Save discovery notes"}
            </button>
          </div>
        </div>
      ) : (
      <SectionHeader
        title="Discovery & Current State"
        description="This workspace is the foundation for current-state ingestion. It lets you paste the observed environment, risks, and constraints so the future design can be judged against what exists today instead of only what should exist tomorrow."
        actions={(
          <div className="overview-actions-shell">
            <div className="overview-primary-actions">
              <Link to={`/projects/${projectId}/requirements`} className="link-button">Requirements</Link>
              <Link to={`/projects/${projectId}/implementation`} className="link-button link-button-subtle">Implementation</Link>
              <Link to={`/projects/${projectId}/report`} className="link-button link-button-subtle">Report</Link>
            </div>
          </div>
        )}
      />
      )}

      <div data-discovery-section="summary" className="panel" style={{ display: selectedSection && selectedSection !== "summary" ? "none" : "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
          <span className="badge-soft">Filled sections {summary.filledSections}/9</span>
          <span className="badge-soft">Migration complexity {summary.migrationComplexity}</span>
          <span className="badge-soft">Shared project persistence</span>
          {V1DiscoveryCurrentState ? <span className="badge-soft">{userFacingStatusLabel(V1DiscoveryCurrentState.overallReadiness)}</span> : null}
        </div>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>{project.name}</h2>
          <p className="muted" style={{ margin: 0 }}>
            Use this page for pasted audits, inventory notes, current VLAN/subnet baselines, routing notes, security posture, and pain points. This is the discovery layer that will later feed deeper design and migration intelligence.
          </p>
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={() => void saveNow()} disabled={updateProjectMutation.isPending}>
            {updateProjectMutation.isPending ? "Saving..." : "Save discovery notes"}
          </button>
          <button type="button" className="button button-secondary" onClick={() => void clearAll()} disabled={updateProjectMutation.isPending}>Clear discovery notes</button>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {saveNotice || (state.lastSavedAt ? `Last saved to project data: ${new Date(state.lastSavedAt).toLocaleString()}` : "No shared discovery save yet for this project.")}
        </p>
      </div>

      <div data-discovery-section="contract" className="panel" style={{ display: selectedSection && selectedSection !== "contract" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Current-state evidence contract</h2>
          <p className="muted" style={{ margin: 0 }}>
            Current-state evidence keeps discovery honest: manual notes, imported artifacts, validated evidence, conflicts, and review-required gaps are displayed from saved project data instead of being invented in the browser.
          </p>
        </div>
        {V1DiscoveryCurrentState ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={V1DiscoveryCurrentState.overallReadiness === "BLOCKED" ? "badge badge-danger" : V1DiscoveryCurrentState.overallReadiness === "REVIEW_REQUIRED" ? "badge badge-warning" : "badge-soft"}>Readiness {userFacingStatusLabel(V1DiscoveryCurrentState.overallReadiness)}</span>
              <span className="badge-soft">Source {userFacingStatusLabel(V1DiscoveryCurrentState.currentStateAuthority)}</span>
              <span className="badge-soft">Areas {V1DiscoveryCurrentState.areaRowCount}</span>
              <span className="badge-soft">Import targets {V1DiscoveryCurrentState.importTargetCount}</span>
              <span className="badge-soft">Open tasks {V1DiscoveryCurrentState.openTaskCount}</span>
              <span className="badge-soft">Conflicts {V1DiscoveryCurrentState.conflictingEvidenceCount}</span>
            </div>
            <div className="grid-2" style={{ alignItems: "start" }}>
              <div className="panel" style={{ background: "rgba(255,255,255,0.02)", display: "grid", gap: 10 }}>
                <strong>Discovery areas</strong>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead><tr><th align="left">Area</th><th align="left">State</th><th align="left">Readiness</th><th align="left">Required for</th></tr></thead>
                    <tbody>
                      {V1DiscoveryCurrentState.areaRows.slice(0, 9).map((row) => (
                        <tr key={row.areaKey}>
                          <td>{row.area}</td>
                          <td>{row.state}</td>
                          <td>{row.readinessImpact}</td>
                          <td>{row.requiredFor.join(", ") || "none"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel" style={{ background: "rgba(255,255,255,0.02)", display: "grid", gap: 10 }}>
                <strong>Structured import targets</strong>
                <div style={{ display: "grid", gap: 8 }}>
                  {V1DiscoveryCurrentState.importTargets.slice(0, 8).map((target) => (
                    <div key={target.targetKey} className="trust-note">
                      <p style={{ margin: 0 }}><strong>{target.target}</strong> — {target.state} / {target.readinessImpact}</p>
                      <p className="muted" style={{ margin: "4px 0 0" }}>{target.reconciliationNeed}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid-2" style={{ alignItems: "start" }}>
              <div className="panel" style={{ background: "rgba(255,255,255,0.02)", display: "grid", gap: 10 }}>
                <strong>Requirement-created discovery tasks</strong>
                {V1DiscoveryCurrentState.tasks.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {V1DiscoveryCurrentState.tasks.slice(0, 8).map((task) => <li key={task.taskId} style={{ marginBottom: 8 }}><strong>{task.requirementId}</strong>: {task.title} — {task.state} / {task.readinessImpact}</li>)}
                  </ul>
                ) : <p className="muted" style={{ margin: 0 }}>No discovery tasks have been generated yet.</p>}
              </div>
              <div className="panel" style={{ background: "rgba(255,255,255,0.02)", display: "grid", gap: 10 }}>
                <strong>Evidence boundary</strong>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {V1DiscoveryCurrentState.proofBoundary.map((line) => <li key={line} style={{ marginBottom: 8 }}>{line}</li>)}
                </ul>
              </div>
            </div>
            {V1DiscoveryCurrentState.findings.length ? (
              <div className="panel" style={{ background: "rgba(255,255,255,0.02)", display: "grid", gap: 10 }}>
                <strong>System findings</strong>
                <div style={{ display: "grid", gap: 8 }}>
                  {V1DiscoveryCurrentState.findings.slice(0, 8).map((finding) => (
                    <div key={finding.code} className="validation-card">
                      <p style={{ margin: 0 }}><strong>{finding.severity}</strong> — {finding.title}</p>
                      <p className="muted" style={{ margin: "4px 0 0" }}>{finding.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Current-state evidence is not available yet. That is a blocker, not a browser excuse to fake current-state facts.</p>
        )}
      </div>

      <div data-discovery-section="extraction" className="panel" style={{ display: selectedSection && selectedSection !== "extraction" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Discovery-to-design extraction preview</h2>
          <p className="muted" style={{ margin: 0 }}>
            Discovery should not stay as pasted notes only. This preview shows what the current-state capture is already doing to strengthen the design checks, route/boundary evidence, and recovery handoff decision.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={masterGate.status === "ready-for-master" ? "badge badge-info" : masterGate.status === "near-transition" ? "badge badge-warning" : "badge-soft"}>
            {masterGate.status === "ready-for-master" ? "Recovery-ready" : masterGate.status === "near-transition" ? "Recovery close" : "Recovery still active"}
          </span>
          <span className="badge-soft">Route domains {synthesized.designTruthModel.routeDomains.length}</span>
          <span className="badge-soft">Boundary domains {synthesized.designTruthModel.boundaryDomains.length}</span>
          <span className="badge-soft">Unresolved refs {synthesized.designTruthModel.unresolvedReferences.length}</span>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>What discovery is already reinforcing</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 8 }}>Topology preview: <strong>{synthesized.topology.topologyLabel}</strong></li>
              <li style={{ marginBottom: 8 }}>Current required flow coverage ready: <strong>{synthesized.flowCoverage.filter((item) => item.required && item.status === "ready").length}</strong> / {synthesized.flowCoverage.filter((item) => item.required).length}</li>
              <li style={{ marginBottom: 8 }}>Recovery status: <strong>{recovery.overallStatus}</strong></li>
              <li style={{ marginBottom: 0 }}>{masterGate.summary}</li>
            </ul>
          </div>
          <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Main remaining blockers</strong>
            {masterGate.blockers.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {masterGate.blockers.slice(0, 4).map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>No major recovery blocker is currently surfacing from this preview.</p>
            )}
          </div>
        </div>
      </div>

      <div data-discovery-section="authority" className="panel" style={{ display: selectedSection && selectedSection !== "authority" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Discovery-backed anchors</h2>
          <p className="muted" style={{ margin: 0 }}>
            Discovery is now allowed to strengthen the shared model instead of staying as passive notes only. These counts show where current-state evidence is already promoting route and boundary anchors ahead of later saved design detail.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Discovery route anchors {discoveryRouteAnchors.length}</span>
          <span className="badge-soft">Discovery boundary anchors {discoveryBoundaryAnchors.length}</span>
          <span className="badge-soft">System-draft route anchors {backendUnconfirmedRouteAnchors.length}</span>
          <span className="badge-soft">System-draft boundary anchors {backendUnconfirmedBoundaryAnchors.length}</span>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Discovery-promoted anchors</strong>
            {discoveryRouteAnchors.length === 0 && discoveryBoundaryAnchors.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Current discovery notes are still too thin to promote route or boundary anchors directly.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {discoveryRouteAnchors.slice(0, 3).map((item) => <li key={item.id} style={{ marginBottom: 8 }}>{item.siteName} route anchor — {item.notes[0] || "Discovery-backed route evidence."}</li>)}
                {discoveryBoundaryAnchors.slice(0, 3).map((item) => <li key={item.id} style={{ marginBottom: 8 }}>{item.siteName} / {item.zoneName} boundary — {item.notes[0] || "Discovery-backed boundary evidence."}</li>)}
              </ul>
            )}
          </div>
          <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Still held as system-draft anchors</strong>
            <p className="muted" style={{ margin: 0 }}>
              Planner-preview anchors are useful, but the stronger recovery direction is to replace as many of them as possible with discovery-backed or saved design records.
            </p>
          </div>
        </div>
      </div>

      {!isFocusedSectionView ? <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {summaryCard("Filled sections", `${summary.filledSections}/9`)}
        {summaryCard("Device references", summary.deviceMentions)}
        {summaryCard("Routing protocols", summary.routingProtocols.length)}
        {summaryCard("Gap items", summary.gaps.length)}
      </div> : null}

      <div data-discovery-section="inputs" className="panel" style={{ display: selectedSection && selectedSection !== "inputs" ? "none" : "grid", gap: 14 }}>
        <h2 style={{ margin: 0 }}>Paste current-state inputs</h2>
        <p className="muted" style={{ margin: 0 }}>
          Keep entries short and operational. One line per device, issue, site, subnet, or dependency works well. This page is intentionally flexible so you can paste from audits, spreadsheets, ticket notes, or rough engineering writeups.
        </p>
        <div className="grid-2" style={{ alignItems: "start" }}>
          {textareaField(
            "Topology baseline",
            "Existing sites, WAN model, internet edges, cloud edges, hub/spoke notes, data center or service locations.",
            state.topologyText,
            (next) => updateState({ topologyText: next }),
            "HQ ↔ MPLS ↔ Branch 1\nHQ ↔ VPN ↔ Branch 2\nAzure reachable from HQ firewall pair\nInternet breakout only at HQ today",
          )}
          {textareaField(
            "Inventory and lifecycle",
            "Existing devices, roles, software versions, support status, refresh flags, or platform limits.",
            state.inventoryText,
            (next) => updateState({ inventoryText: next }),
            "2x core switches - aging - EOS next year\nBranch firewall pair - current\nWireless controller - legacy\nWAN edge routers - OSPF capable",
          )}
          {textareaField(
            "Addressing and VLAN baseline",
            "Current VLAN IDs, subnets, gateways, DHCP ranges, summarization issues, or overlap concerns.",
            state.addressingText,
            (next) => updateState({ addressingText: next }),
            "VLAN 10 192.168.10.0/24 gateway .1\nVLAN 20 192.168.20.0/24 gateway .1\nGuest subnet duplicated at two sites\nDHCP on Windows server at HQ",
          )}
          {textareaField(
            "Routing and transport baseline",
            "Current routing protocols, default-route behavior, redistribution, MPLS, SD-WAN, provider edge, VPN, or cloud edge notes.",
            state.routingText,
            (next) => updateState({ routingText: next }),
            "OSPF internally\nStatic default toward ISP\nVPN to Azure\nNo branch summarization today\nMPLS handoff at HQ and Branch 1",
          )}
          {textareaField(
            "Security posture",
            "Firewall zones, NAC, 802.1X, VPN, IDS/IPS, SIEM, logging, remote access, guest isolation, or management controls.",
            state.securityText,
            (next) => updateState({ securityText: next }),
            "Firewall pair at HQ\nGuest isolated only at HQ\nNo NAC today\nVPN for admins\nSIEM collecting syslog\nManagement flat with user access",
          )}
          {textareaField(
            "Wireless baseline",
            "SSID design, WPA2/WPA3, controller model, guest wireless, RF pain points, controller/cloud management.",
            state.wirelessText,
            (next) => updateState({ wirelessText: next }),
            "Corporate SSID + Guest SSID\nWPA2-Enterprise today\nController-based APs\nCoverage gaps in warehouse area",
          )}
          {textareaField(
            "Gaps and pain points",
            "What the current network lacks or where the redesign is expected to improve it.",
            state.gapText,
            (next) => updateState({ gapText: next }),
            "Flat user and printer access\nGuest not isolated consistently\nNo site summarization\nAging core platform\nManual VPN changes",
          )}
          {textareaField(
            "Constraints and dependencies",
            "Maintenance windows, contracts, compliance, provider handoffs, cloud dependencies, staffing, or rollout constraints.",
            state.constraintsText,
            (next) => updateState({ constraintsText: next }),
            "Weekend cutovers only\nSingle engineer available\nProvider lead time 45 days\nMust preserve existing guest internet access during migration",
          )}
        </div>
        {textareaField(
          "Extra notes",
          "Anything that does not fit the other fields but affects discovery, design, migration, or stakeholder review.",
          state.notesText,
          (next) => updateState({ notesText: next }),
          "Customer wants future SD-WAN option\nPossible office expansion next year\nCloud identity already in use",
        )}
      </div>

      <div data-discovery-section="coverage" className="grid-2" style={{ display: selectedSection && selectedSection !== "coverage" ? "none" : "grid", alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Discovery coverage</h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Area</th>
                  <th align="left">Status</th>
                  <th align="left">Why it matters</th>
                </tr>
              </thead>
              <tbody>
                {summary.ingestionCoverage.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td>{item.complete ? "Captured" : "Missing"}</td>
                    <td>{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Current-state highlights</h2>
          {summary.currentStateHighlights.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No meaningful current-state baseline has been captured yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {summary.currentStateHighlights.map((item) => (
                <div key={item} className="trust-note">
                  <p className="muted" style={{ margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isFocusedSectionView ? (<>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Parsed signals</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <strong>Routing and transport</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>{summary.routingProtocols.join(", ") || "No named routing or transport protocols detected yet."}</p>
            </div>
            <div>
              <strong>Security controls</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>{summary.securityControls.join(", ") || "No named security controls detected yet."}</p>
            </div>
            <div>
              <strong>Wireless signals</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>{summary.wirelessSignals.join(", ") || "No named wireless signals detected yet."}</p>
            </div>
            <div>
              <strong>Lifecycle flags</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>{summary.lifecycleFlags.join(" • ") || "No lifecycle warnings detected yet."}</p>
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Gaps and constraints</h2>
          <div className="grid-2" style={{ alignItems: "start" }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Gap analysis inputs</h3>
              {summary.gaps.length === 0 ? <p className="muted" style={{ margin: 0 }}>No explicit gaps captured yet.</p> : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {summary.gaps.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Constraints and dependencies</h3>
              {summary.constraints.length === 0 ? <p className="muted" style={{ margin: 0 }}>No constraints captured yet.</p> : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {summary.constraints.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Discovery risks</h2>
          {summary.inferredRisks.length === 0 ? <p className="muted" style={{ margin: 0 }}>No discovery risks are visible yet.</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {summary.inferredRisks.map((item) => (
                <div key={item} className="validation-card">
                  <p className="muted" style={{ margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Best next inputs</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {summary.suggestedNextInputs.length === 0 ? <li>Discovery coverage is broad enough to continue deeper design and migration planning.</li> : summary.suggestedNextInputs.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
          <div className="form-actions">
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Continue to Logical Design</Link>
            <Link to={`/projects/${projectId}/implementation`} className="link-button">Open Implementation Plan</Link>
          </div>
        </div>
      </div>
      </>) : null}
    </section>
  );
}
