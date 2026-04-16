import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";
import { EmptyState } from "../components/app/EmptyState";
import { useProject, useProjectSites, useProjectVlans, useUpdateProject } from "../features/projects/hooks";
import {
  buildNamingPreviewExamples,
  buildProjectSummaryDescription,
  buildGuidedDescription,
  conditionalSections,
  defaultRequirementsProfile,
  parseRequirementsProfile,
  planningSignals,
  planningTracks,
  planningTrackStatuses,
  planningReadinessSummary,
  stringifyRequirementsProfile,
  type RequirementsProfile,
} from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { buildRecoveryMasterRoadmapGate, buildRecoveryRoadmapStatus } from "../lib/recoveryRoadmap";
import { WorkspaceIssueBanner } from "../components/app/WorkspaceIssueBanner";
import { parseWorkspaceIssueNotice } from "../lib/workspaceIssue";

export function ProjectRequirementsPage() {
  const { projectId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const requestedStep = searchParams.get("step");
  const isFocusedStepView = Boolean(requestedStep);
  const issueNotice = parseWorkspaceIssueNotice(`?${searchParams.toString()}`);
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const updateMutation = useUpdateProject(projectId);
  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const draftStorageKey = useMemo(() => `subnetops:requirements-draft:${projectId}`, [projectId]);

  const initialProfile = useMemo(() => parseRequirementsProfile(project?.requirementsJson), [project?.requirementsJson]);
  const [requirements, setRequirements] = useState<RequirementsProfile>({ ...defaultRequirementsProfile });
  const [currentStepKey, setCurrentStepKey] = useState("core");
  const [draftSavedAt, setDraftSavedAt] = useState<string>("");
  const [saveConfidenceNote, setSaveConfidenceNote] = useState<string>("");
  const lastServerSaveRef = useRef(stringifyRequirementsProfile(initialProfile));
  const hasHydratedDraftRef = useRef(false);

  useEffect(() => {
    lastServerSaveRef.current = stringifyRequirementsProfile(initialProfile);
    if (!projectId) {
      setRequirements(initialProfile);
      return;
    }

    if (!hasHydratedDraftRef.current) {
      const savedDraft = window.localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft) as { requirements?: RequirementsProfile; savedAt?: string };
          if (parsed?.requirements) {
            setRequirements(parsed.requirements);
            setDraftSavedAt(parsed.savedAt ?? "");
            setSaveConfidenceNote(parsed.savedAt ? `Recovered local draft from ${new Date(parsed.savedAt).toLocaleString()}.` : "Recovered local draft from this browser.");
            hasHydratedDraftRef.current = true;
            return;
          }
        } catch {
          window.localStorage.removeItem(draftStorageKey);
        }
      }
    }

    setRequirements(initialProfile);
    hasHydratedDraftRef.current = true;
  }, [draftStorageKey, initialProfile, projectId]);

  const description = useMemo(() => buildGuidedDescription(requirements), [requirements]);
  const summaryDescription = useMemo(() => buildProjectSummaryDescription(requirements), [requirements]);
  const scenario = useMemo(() => conditionalSections(requirements), [requirements]);
  const activeTracks = useMemo(() => planningTracks(requirements), [requirements]);
  const trackStatuses = useMemo(() => planningTrackStatuses(requirements), [requirements]);
  const readinessSummary = useMemo(() => planningReadinessSummary(requirements), [requirements]);
  const namingPreview = useMemo(() => buildNamingPreviewExamples(requirements, project?.sites?.map((site) => ({ name: site.name, siteCode: (site as any).siteCode, location: (site as any).location, buildingLabel: (site as any).buildingLabel, floorLabel: (site as any).floorLabel, closetLabel: (site as any).closetLabel || requirements.closetModel })) ), [requirements, project?.sites]);
  const synthesizedPreview = useMemo(() => synthesizeLogicalDesign(project, sites, vlans, requirements), [project, sites, vlans, requirements]);
  const recoveryPreview = useMemo(() => buildRecoveryRoadmapStatus(synthesizedPreview), [synthesizedPreview]);
  const masterGate = useMemo(() => buildRecoveryMasterRoadmapGate(recoveryPreview), [recoveryPreview]);
  const previewDiscoveryRouteAnchors = useMemo(() => synthesizedPreview.designTruthModel.routeDomains.filter((item) => item.authoritySource === "discovery-derived").length, [synthesizedPreview]);
  const previewPlannerRouteAnchors = useMemo(() => synthesizedPreview.designTruthModel.routeDomains.filter((item) => item.authoritySource === "planner-preview").length, [synthesizedPreview]);
  const previewDiscoveryBoundaryAnchors = useMemo(() => synthesizedPreview.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "discovery-derived").length, [synthesizedPreview]);
  const previewPlannerBoundaryAnchors = useMemo(() => synthesizedPreview.designTruthModel.boundaryDomains.filter((item) => item.authoritySource === "planner-preview").length, [synthesizedPreview]);

  const multiSitePlanning = Number(requirements.siteCount || "0") > 1 || requirements.internetModel !== "internet at each site";
  const wirelessPlanning = requirements.wireless || requirements.guestWifi;
  const voicePlanning = requirements.voice || Number(requirements.phoneCount || "0") > 0;
  const specialtyPlanning = requirements.iot || requirements.cameras || Number(requirements.iotDeviceCount || "0") > 0 || Number(requirements.cameraCount || "0") > 0;
  const performancePlanning = multiSitePlanning || scenario.cloud || voicePlanning || requirements.primaryGoal === "performance and user experience" || requirements.primaryGoal === "availability and redundancy";
  const advancedScenario = scenario.security || scenario.cloud || scenario.wireless || scenario.voice || scenario.resilience;

  const saveRequirements = () => updateMutation.mutate({
    requirementsJson: stringifyRequirementsProfile(requirements),
    environmentType: requirements.environmentType,
    description: summaryDescription,
  }, {
    onSuccess: () => {
      lastServerSaveRef.current = stringifyRequirementsProfile(requirements);
      window.localStorage.removeItem(draftStorageKey);
      setDraftSavedAt("");
      setSaveConfidenceNote(`Saved to project data at ${new Date().toLocaleString()}.`);
    },
    onError: () => {
      setSaveConfidenceNote("Save failed. Your browser draft is still kept locally so you do not lose work.");
    },
  });

  const currentSerializedRequirements = useMemo(() => stringifyRequirementsProfile(requirements), [requirements]);
  const hasUnsavedChanges = currentSerializedRequirements !== lastServerSaveRef.current;

  useEffect(() => {
    if (!projectId || !hasHydratedDraftRef.current) return;
    if (!hasUnsavedChanges) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }

    const payload = JSON.stringify({ requirements, savedAt: new Date().toISOString() });
    window.localStorage.setItem(draftStorageKey, payload);
    const now = new Date().toISOString();
    setDraftSavedAt(now);
  }, [draftStorageKey, hasUnsavedChanges, projectId, requirements]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const clearLocalDraft = () => {
    window.localStorage.removeItem(draftStorageKey);
    setDraftSavedAt("");
    setRequirements(initialProfile);
    setSaveConfidenceNote("Discarded local draft and restored the last saved project version.");
  };

  const readinessPercent = useMemo(() => {
    const total = Math.max(1, readinessSummary.readyCount + readinessSummary.reviewCount);
    return Math.round((readinessSummary.readyCount / total) * 100);
  }, [readinessSummary.readyCount, readinessSummary.reviewCount]);

  const nextReviewStepLookup: Record<string, string> = {
    "Core": "core",
    "Scenario": "scenario",
    "Security": "security",
    "Cloud": "cloud",
    "Edge": "edge",
    "Addressing": "addressing",
    "Operations": "operations",
    "Constraints": "constraints",
    "Naming": "naming",
  };

  const nextReviewSteps = useMemo(
    () => readinessSummary.nextReviewLabels
      .map((label) => ({ label, key: nextReviewStepLookup[label] }))
      .filter((item): item is { label: string; key: string } => Boolean(item.key)),
    [readinessSummary.nextReviewLabels],
  );

  const stepDefinitions = useMemo(() => {
    const defs = [
      {
        key: "core",
        title: "Core brief",
        summary: "Use case, environment, sites, and major planning triggers.",
        panel: (
          <div className="planner-step-panel" style={{ display: "grid", gap: 18 }}>
            <div className="trust-note planner-step-intro">
              <strong>Why this step matters</strong>
              <p className="muted" style={{ margin: "6px 0 0 0" }}>
                Start with the planning brief before shaping addressing, validation, or diagrams. The choices below decide whether the workflow should open cloud, security, WAN, wireless, and resilience branches later.
              </p>
            </div>

            <div className="trust-note">
              <strong>Methodology note</strong>
              <p className="muted" style={{ margin: "6px 0 0 0" }}>
                SubnetOps is meant to behave like a planning workspace, not a generic form. The first answers should control what later stages even need to be reviewed.
              </p>
            </div>

            <section id="requirements-core" className="panel section-anchor" style={{ display: "grid", gap: 14 }}>
              <div className="planner-step-heading">
                <div>
                  <h3 style={{ margin: "0 0 8px 0" }}>Core requirements</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    Capture the main scenario before branching into more specific planning areas.
                  </p>
                </div>
                <span className="badge-soft">Step 1</span>
              </div>

              <div className="guided-grid">
                <label>
                  <span>What are you planning a network for?</span>
                  <select value={requirements.planningFor} onChange={(event) => setRequirements((current) => ({ ...current, planningFor: event.target.value }))}>
                    <option>Office</option>
                    <option>Clinic</option>
                    <option>School / Lab</option>
                    <option>Warehouse</option>
                    <option>Multi-site business</option>
                    <option>Custom</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>

                <label>
                  <span>Project phase</span>
                  <select value={requirements.projectPhase} onChange={(event) => setRequirements((current) => ({ ...current, projectPhase: event.target.value }))}>
                    <option>New network build</option>
                    <option>Redesign</option>
                    <option>Expansion</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>

                <label>
                  <span>Environment type</span>
                  <select value={requirements.environmentType} onChange={(event) => setRequirements((current) => ({ ...current, environmentType: event.target.value }))}>
                    <option>On-prem</option>
                    <option>Hybrid</option>
                    <option>Public cloud connected</option>
                    <option>Private cloud connected</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>

                <label>
                  <span>Compliance / policy context</span>
                  <select value={requirements.complianceProfile} onChange={(event) => setRequirements((current) => ({ ...current, complianceProfile: event.target.value }))}>
                    <option>General business</option>
                    <option>Healthcare-oriented</option>
                    <option>Education-oriented</option>
                    <option>Retail / transactional</option>
                    <option>Internal / low sensitivity</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>

                <label>
                  <span>How many sites?</span>
                  <input value={requirements.siteCount} onChange={(event) => setRequirements((current) => ({ ...current, siteCount: event.target.value }))} />
                </label>

                <label>
                  <span>Approximate users per site</span>
                  <input value={requirements.usersPerSite} onChange={(event) => setRequirements((current) => ({ ...current, usersPerSite: event.target.value }))} />
                </label>

                <label>
                  <span>Internet / WAN model</span>
                  <select value={requirements.internetModel} onChange={(event) => setRequirements((current) => ({ ...current, internetModel: event.target.value }))}>
                    <option>internet at each site</option>
                    <option>centralized breakout</option>
                    <option>site-to-site VPN</option>
                    <option>SD-WAN or managed WAN</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>

                <label>
                  <span>Server / service placement</span>
                  <select value={requirements.serverPlacement} onChange={(event) => setRequirements((current) => ({ ...current, serverPlacement: event.target.value }))}>
                    <option>centralized servers or services</option>
                    <option>mixed local and centralized services</option>
                    <option>mostly cloud-hosted services</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  <span>Primary design goal</span>
                  <select value={requirements.primaryGoal} onChange={(event) => setRequirements((current) => ({ ...current, primaryGoal: event.target.value }))}>
                    <option>security and segmentation</option>
                    <option>simplicity and manageability</option>
                    <option>performance and user experience</option>
                    <option>availability and redundancy</option>
                    <option>hybrid connectivity and flexibility</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              </div>

              <div className="guided-checks">
                <label><input type="checkbox" checked={requirements.guestWifi} onChange={(event) => setRequirements((current) => ({ ...current, guestWifi: event.target.checked }))} /> Guest Wi-Fi</label>
                <label><input type="checkbox" checked={requirements.voice} onChange={(event) => setRequirements((current) => ({ ...current, voice: event.target.checked }))} /> Voice</label>
                <label><input type="checkbox" checked={requirements.management} onChange={(event) => setRequirements((current) => ({ ...current, management: event.target.checked }))} /> Management network</label>
                <label><input type="checkbox" checked={requirements.printers} onChange={(event) => setRequirements((current) => ({ ...current, printers: event.target.checked }))} /> Printers</label>
                <label><input type="checkbox" checked={requirements.iot} onChange={(event) => setRequirements((current) => ({ ...current, iot: event.target.checked }))} /> IoT devices</label>
                <label><input type="checkbox" checked={requirements.cameras} onChange={(event) => setRequirements((current) => ({ ...current, cameras: event.target.checked }))} /> Cameras / security devices</label>
                <label><input type="checkbox" checked={requirements.wireless} onChange={(event) => setRequirements((current) => ({ ...current, wireless: event.target.checked }))} /> Wireless access</label>
                <label><input type="checkbox" checked={requirements.remoteAccess} onChange={(event) => setRequirements((current) => ({ ...current, remoteAccess: event.target.checked }))} /> Remote access / VPN</label>
                <label><input type="checkbox" checked={requirements.dualIsp} onChange={(event) => setRequirements((current) => ({ ...current, dualIsp: event.target.checked }))} /> Dual ISP / redundancy</label>
                <label><input type="checkbox" checked={requirements.cloudConnected} onChange={(event) => setRequirements((current) => ({ ...current, cloudConnected: event.target.checked }))} /> Cloud-connected services</label>
              </div>
            </section>
          </div>
        ),
      },
    ];

    if (advancedScenario) {
      defs.push({
        key: "scenario",
        title: "Scenario triggers",
        summary: "Review which branches are active and why the workflow changed.",
        panel: (
          <section id="requirements-scenario" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div className="planner-step-heading">
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>Scenario-based planning fields</h3>
                <p className="muted" style={{ margin: 0 }}>
                  This version now changes the visible workflow based on the scenario. Later steps appear only when the brief makes them relevant.
                </p>
              </div>
              <span className="badge-soft">Dynamic step</span>
            </div>

            <div className="planner-status-grid">
              <div className="summary-card"><div className="muted">Security branch</div><div className="value">{scenario.security ? "On" : "Off"}</div></div>
              <div className="summary-card"><div className="muted">Cloud branch</div><div className="value">{scenario.cloud ? "On" : "Off"}</div></div>
              <div className="summary-card"><div className="muted">Edge branch</div><div className="value">{scenario.wireless || scenario.voice || scenario.resilience ? "On" : "Off"}</div></div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {planningSignals(requirements).map((item) => <span key={item} className="badge-soft">{item}</span>)}
            </div>

            <div className="grid-2" style={{ alignItems: "start" }}>
              {scenario.security ? <div className="panel"><h3 style={{ marginTop: 0 }}>Security conditions active</h3><p className="muted" style={{ marginBottom: 0 }}>Guest, management, remote access, or sensitive device choices mean the planner now expects stronger trust boundaries and access controls.</p></div> : null}
              {scenario.cloud ? <div className="panel"><h3 style={{ marginTop: 0 }}>Cloud / hybrid conditions active</h3><p className="muted" style={{ marginBottom: 0 }}>The planner now keeps cloud identity, connectivity, and routing assumptions visible instead of treating them as optional notes.</p></div> : null}
              {(scenario.wireless || scenario.voice || scenario.resilience) ? <div className="panel"><h3 style={{ marginTop: 0 }}>Access / edge conditions active</h3><p className="muted" style={{ marginBottom: 0 }}>Wireless, voice, specialty devices, or dual ISP requirements now influence later edge, QoS, and resilience planning.</p></div> : null}
              {multiSitePlanning ? <div className="panel"><h3 style={{ marginTop: 0 }}>WAN / multi-site conditions active</h3><p className="muted" style={{ marginBottom: 0 }}>Because the scenario is not single-site simple internet breakout, WAN and route summarization stay visible later in the workflow.</p></div> : null}
            </div>
          </section>
        ),
      });
    }

    if (scenario.security) {
      defs.push({
        key: "security",
        title: "Security and trust",
        summary: "Trust boundaries, admin isolation, guest policy, and remote access.",
        panel: (
          <section id="requirements-security" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div className="planner-step-heading">
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>Security posture and trust boundaries</h3>
                <p className="muted" style={{ margin: 0 }}>
                  This step only appears when the scenario needs stronger separation between user access, guest access, management, or sensitive device groups.
                </p>
              </div>
              <span className="badge-soft">Conditional</span>
            </div>

            <div className="guided-grid">
              {requirements.guestWifi ? (
                <label>
                  <span>Guest access policy</span>
                  <select value={requirements.guestPolicy} onChange={(event) => setRequirements((current) => ({ ...current, guestPolicy: event.target.value }))}>
                    <option>internet-only isolated guest access</option>
                    <option>guest internet with captive portal</option>
                    <option>guest access with sponsor workflow</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              {requirements.management ? (
                <label>
                  <span>Management access policy</span>
                  <select value={requirements.managementAccess} onChange={(event) => setRequirements((current) => ({ ...current, managementAccess: event.target.value }))}>
                    <option>management reachable only from trusted admin networks</option>
                    <option>management reachable through jump host or bastion only</option>
                    <option>management reachable from dedicated IT VLAN only</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              {requirements.remoteAccess ? (
                <label>
                  <span>Remote access method</span>
                  <select value={requirements.remoteAccessMethod} onChange={(event) => setRequirements((current) => ({ ...current, remoteAccessMethod: event.target.value }))}>
                    <option>SSL VPN or modern remote access gateway</option>
                    <option>IPsec remote access</option>
                    <option>identity-aware zero trust access</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              <label>
                <span>Security posture</span>
                <select value={requirements.securityPosture} onChange={(event) => setRequirements((current) => ({ ...current, securityPosture: event.target.value }))}>
                  <option>segmented by function and trust level</option>
                  <option>high isolation for sensitive and administrative systems</option>
                  <option>balanced segmentation with simpler operations</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Trust boundary model</span>
                <select value={requirements.trustBoundaryModel} onChange={(event) => setRequirements((current) => ({ ...current, trustBoundaryModel: event.target.value }))}>
                  <option>internal users, guests, management, and services separated</option>
                  <option>staff, infrastructure, and external access clearly separated</option>
                  <option>minimal zones with focused administrative separation</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Privileged admin boundary</span>
                <select value={requirements.adminBoundary} onChange={(event) => setRequirements((current) => ({ ...current, adminBoundary: event.target.value }))}>
                  <option>privileged administration isolated from user access</option>
                  <option>dedicated admin jump path for management actions</option>
                  <option>small-team admin access with strict management VLAN boundaries</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Identity model</span>
                <select value={requirements.identityModel} onChange={(event) => setRequirements((current) => ({ ...current, identityModel: event.target.value }))}>
                  <option>central identity for staff and administrators</option>
                  <option>central identity plus stronger admin controls</option>
                  <option>separate privileged identity path for administration</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        ),
      });
    }

    if (scenario.cloud) {
      defs.push({
        key: "cloud",
        title: "Cloud and hybrid",
        summary: "Provider, connectivity, routing, and cloud trust boundary choices.",
        panel: (
          <section id="requirements-cloud" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div className="planner-step-heading">
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>Cloud and hybrid planning</h3>
                <p className="muted" style={{ margin: 0 }}>
                  This step appears because the project is hybrid, cloud-connected, or not purely on-prem. It keeps cloud assumptions visible before the design moves downstream.
                </p>
              </div>
              <span className="badge-soft">Conditional</span>
            </div>

            <div className="guided-grid">
              <label>
                <span>Cloud provider</span>
                <select value={requirements.cloudProvider} onChange={(event) => setRequirements((current) => ({ ...current, cloudProvider: event.target.value }))}>
                  <option>Azure</option>
                  <option>AWS</option>
                  <option>GCP</option>
                  <option>Private cloud / VMware</option>
                  <option>Multi-cloud</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Cloud connectivity pattern</span>
                <select value={requirements.cloudConnectivity} onChange={(event) => setRequirements((current) => ({ ...current, cloudConnectivity: event.target.value }))}>
                  <option>site-to-cloud VPN</option>
                  <option>private connectivity / direct circuit</option>
                  <option>SD-WAN integrated cloud edge</option>
                  <option>internet-only access to cloud services</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Cloud identity boundary</span>
                <select value={requirements.cloudIdentityBoundary} onChange={(event) => setRequirements((current) => ({ ...current, cloudIdentityBoundary: event.target.value }))}>
                  <option>shared identity between on-prem and cloud</option>
                  <option>cloud-integrated identity with restricted admin roles</option>
                  <option>separate cloud administration boundary</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Cloud traffic boundary</span>
                <select value={requirements.cloudTrafficBoundary} onChange={(event) => setRequirements((current) => ({ ...current, cloudTrafficBoundary: event.target.value }))}>
                  <option>private application traffic separated from public internet access</option>
                  <option>internet-facing services separated from internal workloads</option>
                  <option>hybrid application traffic isolated through dedicated connectivity</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Cloud hosting model</span>
                <select value={requirements.cloudHostingModel} onChange={(event) => setRequirements((current) => ({ ...current, cloudHostingModel: event.target.value }))}>
                  <option>selected services extended into cloud while core users remain on-prem</option>
                  <option>hybrid application split between on-prem and cloud workloads</option>
                  <option>mostly cloud-hosted services with retained on-prem edge and identity</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Cloud network model</span>
                <select value={requirements.cloudNetworkModel} onChange={(event) => setRequirements((current) => ({ ...current, cloudNetworkModel: event.target.value }))}>
                  <option>provider VNet/VPC with private application address space</option>
                  <option>shared services network plus segmented application subnets</option>
                  <option>hub-and-spoke cloud network with controlled spoke access</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Cloud routing model</span>
                <select value={requirements.cloudRoutingModel} onChange={(event) => setRequirements((current) => ({ ...current, cloudRoutingModel: event.target.value }))}>
                  <option>summarized site routes and controlled cloud prefixes</option>
                  <option>private connectivity with selected route advertisement only</option>
                  <option>segmented hybrid routing with explicit trust boundaries</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        ),
      });
    }

    if (scenario.wireless || scenario.voice || scenario.resilience || specialtyPlanning) {
      defs.push({
        key: "edge",
        title: "Access edge and services",
        summary: "Wireless, voice, specialty devices, and resilience expectations.",
        panel: (
          <section id="requirements-edge" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div className="planner-step-heading">
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>Access edge, wireless, voice, and specialty services</h3>
                <p className="muted" style={{ margin: 0 }}>
                  This step appears because the edge is not just simple user access. The design needs extra direction for SSIDs, voice treatment, specialty devices, or internet-edge resilience.
                </p>
              </div>
              <span className="badge-soft">Conditional</span>
            </div>

            <div className="guided-grid">
              {wirelessPlanning ? (
                <label>
                  <span>Wireless / SSID model</span>
                  <select value={requirements.wirelessModel} onChange={(event) => setRequirements((current) => ({ ...current, wirelessModel: event.target.value }))}>
                    <option>separate staff and guest SSIDs</option>
                    <option>staff, guest, and IoT SSIDs</option>
                    <option>single staff SSID plus isolated guest SSID</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              {voicePlanning ? (
                <label>
                  <span>Voice / QoS treatment</span>
                  <select value={requirements.voiceQos} onChange={(event) => setRequirements((current) => ({ ...current, voiceQos: event.target.value }))}>
                    <option>voice prioritized over standard user traffic</option>
                    <option>voice and video prioritized</option>
                    <option>basic voice separation without advanced QoS</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              {scenario.resilience ? (
                <label>
                  <span>Resilience target</span>
                  <select value={requirements.resilienceTarget} onChange={(event) => setRequirements((current) => ({ ...current, resilienceTarget: event.target.value }))}>
                    <option>single ISP acceptable</option>
                    <option>dual ISP with basic failover</option>
                    <option>high availability internet edge</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              {voicePlanning ? (
                <label>
                  <span>QoS model</span>
                  <select value={requirements.qosModel} onChange={(event) => setRequirements((current) => ({ ...current, qosModel: event.target.value }))}>
                    <option>basic prioritization for voice and critical interactive traffic</option>
                    <option>structured QoS for voice, video, and business-critical apps</option>
                    <option>minimal QoS beyond simple edge prioritization</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              {wirelessPlanning ? (
                <label>
                  <span>Approximate access points</span>
                  <input value={requirements.apCount} onChange={(event) => setRequirements((current) => ({ ...current, apCount: event.target.value }))} />
                </label>
              ) : null}

              {voicePlanning ? (
                <label>
                  <span>Approximate phones</span>
                  <input value={requirements.phoneCount} onChange={(event) => setRequirements((current) => ({ ...current, phoneCount: event.target.value }))} />
                </label>
              ) : null}

              {requirements.cameras ? (
                <label>
                  <span>Approximate cameras</span>
                  <input value={requirements.cameraCount} onChange={(event) => setRequirements((current) => ({ ...current, cameraCount: event.target.value }))} />
                </label>
              ) : null}

              {requirements.iot ? (
                <label>
                  <span>Approximate IoT / specialty devices</span>
                  <input value={requirements.iotDeviceCount} onChange={(event) => setRequirements((current) => ({ ...current, iotDeviceCount: event.target.value }))} />
                </label>
              ) : null}
            </div>
          </section>
        ),
      });
    }

    defs.push(
      {
        key: "addressing",
        title: "Addressing strategy",
        summary: "Address hierarchy, site blocks, gateway rules, and growth reserve.",
        panel: (
          <section id="requirements-addressing" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>Addressing and subnetting strategy</h3>
              <p className="muted" style={{ margin: 0 }}>
                Set the higher-level addressing policy here so the design can evolve around organization blocks, site blocks, gateway conventions, and future growth instead of only one subnet at a time.
              </p>
            </div>

            <div className="guided-grid">
              <label>
                <span>Address hierarchy model</span>
                <select value={requirements.addressHierarchyModel} onChange={(event) => setRequirements((current) => ({ ...current, addressHierarchyModel: event.target.value }))}>
                  <option>organization block to site block to segment subnet hierarchy</option>
                  <option>site-first hierarchy with summarized regional blocks</option>
                  <option>compact single-site hierarchy with reserved future blocks</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Site block strategy</span>
                <select value={requirements.siteBlockStrategy} onChange={(event) => setRequirements((current) => ({ ...current, siteBlockStrategy: event.target.value }))}>
                  <option>reserve consistent site blocks for clean summarization</option>
                  <option>allocate right-sized site blocks with reserved expansion space</option>
                  <option>use larger core sites and smaller branch blocks</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Gateway convention</span>
                <select value={requirements.gatewayConvention} onChange={(event) => setRequirements((current) => ({ ...current, gatewayConvention: event.target.value }))}>
                  <option>first usable address as default gateway</option>
                  <option>standardized .1 gateway model where possible</option>
                  <option>infrastructure-reserved low addresses with documented gateway slots</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Growth buffer model</span>
                <select value={requirements.growthBufferModel} onChange={(event) => setRequirements((current) => ({ ...current, growthBufferModel: event.target.value }))}>
                  <option>leave headroom for expansion in each site and segment</option>
                  <option>conservative allocation with explicit future subnet space</option>
                  <option>balanced allocation based on current needs plus moderate growth</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Reserved range policy</span>
                <select value={requirements.reservedRangePolicy} onChange={(event) => setRequirements((current) => ({ ...current, reservedRangePolicy: event.target.value }))}>
                  <option>reserve infrastructure and management ranges inside each site block</option>
                  <option>keep gateway, infra, and dynamic ranges explicitly separated</option>
                  <option>compact reserved ranges with documented exceptions</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        ),
      },
      {
        key: "operations",
        title: "Operations",
        summary: "Management IPs, naming, monitoring, logging, and backups.",
        panel: (
          <section id="requirements-operations" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>Operations and manageability</h3>
              <p className="muted" style={{ margin: 0 }}>
                Capture how the network will be named, monitored, logged, backed up, and managed so the design reflects real operational ownership instead of stopping at topology.
              </p>
            </div>

            <div className="guided-grid">
              <label>
                <span>Management IP policy</span>
                <select value={requirements.managementIpPolicy} onChange={(event) => setRequirements((current) => ({ ...current, managementIpPolicy: event.target.value }))}>
                  <option>dedicated management IP space per site and device role</option>
                  <option>centralized management ranges with site-based allocation</option>
                  <option>small environment with tightly reserved admin addressing</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Site identity capture</span>
                <select value={requirements.siteIdentityCapture} onChange={(event) => setRequirements((current) => ({ ...current, siteIdentityCapture: event.target.value }))}>
                  <option>capture site name, city or location label, and optional street address for each site</option>
                  <option>capture formal branch or campus name plus concise location label</option>
                  <option>capture real street address for implementation and shipping context</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Naming standard</span>
                <select value={requirements.namingStandard} onChange={(event) => setRequirements((current) => ({ ...current, namingStandard: event.target.value }))}>
                  <option>site-role-device naming with consistent short codes</option>
                  <option>site-floor-role numbering with structured device labels</option>
                  <option>compact naming for smaller environments with role prefixes</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Device naming convention</span>
                <select value={requirements.deviceNamingConvention} onChange={(event) => setRequirements((current) => ({ ...current, deviceNamingConvention: event.target.value }))}>
                  <option>automatic short-code standard (SW_TOR_01 / FW_TOR_01)</option>
                  <option>automatic readable standard (Toronto-SW1 / Toronto-FW1)</option>
                  <option>automatic location-role-index standard (TOR-SW-01 / TOR-FW-01)</option>
                  <option>no preference - generate automatically from site names and roles</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Naming token preference</span>
                <select value={requirements.namingTokenPreference} onChange={(event) => setRequirements((current) => ({ ...current, namingTokenPreference: event.target.value }))}>
                  <option>prefer site code when available, otherwise derive from the location or site name</option>
                  <option>always prefer site code as the primary token</option>
                  <option>always prefer full location name as the primary token</option>
                  <option>prefer site + building + floor tokens when available</option>
                  <option>prefer site + building tokens when available</option>
                  <option>prefer site + floor tokens when available</option>
                </select>
              </label>
              <label>
                <span>Naming hierarchy</span>
                <select value={requirements.namingHierarchy} onChange={(event) => setRequirements((current) => ({ ...current, namingHierarchy: event.target.value }))}>
                  <option>site → building → floor → role → index when available</option>
                  <option>site → role → index only</option>
                  <option>site → building → role → index</option>
                  <option>site → floor → role → index</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Custom naming pattern</span>
                <input value={requirements.customNamingPattern} onChange={(event) => setRequirements((current) => ({ ...current, customNamingPattern: event.target.value }))} placeholder="Example: {site}_{building}_{floor}_{role}_{index}" />
                <small className="muted">Use placeholders like <code>{"{site}"}</code>, <code>{"{siteCode}"}</code>, <code>{"{siteName}"}</code>, <code>{"{building}"}</code>, <code>{"{floor}"}</code>, <code>{"{role}"}</code>, and <code>{"{index}"}</code> when custom naming is selected.</small>
              </label>
              <div className="panel" style={{ gridColumn: '1 / -1', display: 'grid', gap: 10, background: 'rgba(15,23,42,0.03)' }}>
                <div>
                  <strong style={{ display: 'block', marginBottom: 6 }}>Naming preview</strong>
                  <p className="muted" style={{ margin: 0 }}>These examples update immediately so users can see whether site code or full location naming will read better before saving the plan.</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th align="left">Site</th>
                        <th align="left">Primary token</th>
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
                          <td>{item.token}</td>
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

              <label>
                <span>Monitoring model</span>
                <select value={requirements.monitoringModel} onChange={(event) => setRequirements((current) => ({ ...current, monitoringModel: event.target.value }))}>
                  <option>central monitoring with device health, interfaces, and alerts</option>
                  <option>lightweight monitoring focused on uptime and critical events</option>
                  <option>monitoring plus performance trending for core services and WAN</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Logging model</span>
                <select value={requirements.loggingModel} onChange={(event) => setRequirements((current) => ({ ...current, loggingModel: event.target.value }))}>
                  <option>central syslog and event retention for infrastructure devices</option>
                  <option>critical-event logging with retained admin actions</option>
                  <option>security-focused logging for edge, access, and remote access events</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Backup policy</span>
                <select value={requirements.backupPolicy} onChange={(event) => setRequirements((current) => ({ ...current, backupPolicy: event.target.value }))}>
                  <option>scheduled configuration backups for key network devices</option>
                  <option>central backup workflow for infrastructure configurations</option>
                  <option>manual approval plus periodic backup snapshots</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Operations ownership</span>
                <select value={requirements.operationsOwnerModel} onChange={(event) => setRequirements((current) => ({ ...current, operationsOwnerModel: event.target.value }))}>
                  <option>internal IT ownership with documented admin responsibilities</option>
                  <option>shared internal and managed-service ownership model</option>
                  <option>small-team ownership with simplified operational controls</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        ),
      },
      {
        key: "physical",
        title: "Physical and endpoints",
        summary: "Buildings, floors, closets, endpoint counts, and access footprint.",
        panel: (
          <section id="requirements-physical" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>Physical layout and endpoint profile</h3>
              <p className="muted" style={{ margin: 0 }}>
                Capture the shape of each site and the rough device counts so the plan feels tied to real space, real ports, real wireless coverage, and real endpoint demand.
              </p>
            </div>

            <div className="guided-grid">
              <label>
                <span>Site layout model</span>
                <select value={requirements.siteLayoutModel} onChange={(event) => setRequirements((current) => ({ ...current, siteLayoutModel: event.target.value }))}>
                  <option>single building or floor per site with a simple edge layout</option>
                  <option>multi-floor site with access closets and distributed edge</option>
                  <option>branch-style site with compact infrastructure and limited edge space</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Physical scope notes</span>
                <select value={requirements.physicalScope} onChange={(event) => setRequirements((current) => ({ ...current, physicalScope: event.target.value }))}>
                  <option>basic site layout without detailed closet mapping yet</option>
                  <option>needs future MDF / IDF or closet-aware planning</option>
                  <option>distributed physical layout with multiple access areas</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Site role</span>
                <select value={requirements.siteRoleModel} onChange={(event) => setRequirements((current) => ({ ...current, siteRoleModel: event.target.value }))}>
                  <option>primary office or main site</option>
                  <option>branch or satellite site</option>
                  <option>specialty site with focused local services</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Buildings</span>
                <input value={requirements.buildingCount} onChange={(event) => setRequirements((current) => ({ ...current, buildingCount: event.target.value }))} />
              </label>

              <label>
                <span>Floors</span>
                <input value={requirements.floorCount} onChange={(event) => setRequirements((current) => ({ ...current, floorCount: event.target.value }))} />
              </label>

              <label>
                <span>Closet / distribution model</span>
                <select value={requirements.closetModel} onChange={(event) => setRequirements((current) => ({ ...current, closetModel: event.target.value }))}>
                  <option>single small edge/closet footprint</option>
                  <option>MDF plus one or more IDF or access closets</option>
                  <option>distributed edge with multiple access zones</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Edge footprint</span>
                <select value={requirements.edgeFootprint} onChange={(event) => setRequirements((current) => ({ ...current, edgeFootprint: event.target.value }))}>
                  <option>compact access edge with limited local infrastructure</option>
                  <option>moderate access edge with local switching and AP density</option>
                  <option>larger edge footprint requiring distributed access planning</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Approximate printers</span>
                <input value={requirements.printerCount} onChange={(event) => setRequirements((current) => ({ ...current, printerCount: event.target.value }))} />
              </label>

              <label>
                <span>Approximate servers</span>
                <input value={requirements.serverCount} onChange={(event) => setRequirements((current) => ({ ...current, serverCount: event.target.value }))} />
              </label>

              {voicePlanning ? (
                <label>
                  <span>Approximate phones</span>
                  <input value={requirements.phoneCount} onChange={(event) => setRequirements((current) => ({ ...current, phoneCount: event.target.value }))} />
                </label>
              ) : null}

              {wirelessPlanning ? (
                <label>
                  <span>Approximate access points</span>
                  <input value={requirements.apCount} onChange={(event) => setRequirements((current) => ({ ...current, apCount: event.target.value }))} />
                </label>
              ) : null}

              {requirements.cameras ? (
                <label>
                  <span>Approximate cameras</span>
                  <input value={requirements.cameraCount} onChange={(event) => setRequirements((current) => ({ ...current, cameraCount: event.target.value }))} />
                </label>
              ) : null}

              {requirements.iot ? (
                <label>
                  <span>Approximate IoT / specialty devices</span>
                  <input value={requirements.iotDeviceCount} onChange={(event) => setRequirements((current) => ({ ...current, iotDeviceCount: event.target.value }))} />
                </label>
              ) : null}

              {wirelessPlanning ? (
                <label style={{ gridColumn: "1 / -1" }}>
                  <span>Wired / wireless mix</span>
                  <select value={requirements.wiredWirelessMix} onChange={(event) => setRequirements((current) => ({ ...current, wiredWirelessMix: event.target.value }))}>
                    <option>mostly wireless users with wired infrastructure and shared devices</option>
                    <option>balanced wired and wireless access across users</option>
                    <option>mostly wired users with focused wireless coverage</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}
            </div>
          </section>
        ),
      }
    );

    if (performancePlanning) {
      defs.push({
        key: "apps-wan",
        title: "Apps, WAN, and performance",
        summary: "Traffic profile, critical services, WAN sensitivity, and growth.",
        panel: (
          <section id="requirements-apps-wan" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>Applications, WAN, and performance</h3>
              <p className="muted" style={{ margin: 0 }}>
                Capture the traffic profile and business sensitivity of the network so the design reflects shared services, WAN behavior, bandwidth expectations, and responsiveness requirements.
              </p>
            </div>

            <div className="guided-grid">
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Application profile</span>
                <select value={requirements.applicationProfile} onChange={(event) => setRequirements((current) => ({ ...current, applicationProfile: event.target.value }))}>
                  <option>general business apps, collaboration, file access, and internet browsing</option>
                  <option>voice, collaboration, cloud apps, and shared file services</option>
                  <option>mixed office plus specialty systems and internal services</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Critical services model</span>
                <select value={requirements.criticalServicesModel} onChange={(event) => setRequirements((current) => ({ ...current, criticalServicesModel: event.target.value }))}>
                  <option>directory, DHCP/DNS, file access, and internet edge are important services</option>
                  <option>cloud identity, shared apps, and WAN edge are critical service dependencies</option>
                  <option>mixed local and centralized services require controlled failover behavior</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              {multiSitePlanning ? (
                <label>
                  <span>Inter-site traffic model</span>
                  <select value={requirements.interSiteTrafficModel} onChange={(event) => setRequirements((current) => ({ ...current, interSiteTrafficModel: event.target.value }))}>
                    <option>moderate inter-site traffic for shared services and administration</option>
                    <option>light inter-site traffic with mostly local internet use</option>
                    <option>heavy inter-site traffic due to centralized services and shared apps</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              <label>
                <span>Bandwidth profile</span>
                <select value={requirements.bandwidthProfile} onChange={(event) => setRequirements((current) => ({ ...current, bandwidthProfile: event.target.value }))}>
                  <option>balanced branch and user bandwidth with normal business traffic</option>
                  <option>higher WAN and internet demand due to cloud and collaboration</option>
                  <option>lighter steady-state usage with some peak traffic windows</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              {(voicePlanning || requirements.primaryGoal === "performance and user experience") ? (
                <label>
                  <span>Latency sensitivity</span>
                  <select value={requirements.latencySensitivity} onChange={(event) => setRequirements((current) => ({ ...current, latencySensitivity: event.target.value }))}>
                    <option>voice and interactive apps should remain responsive</option>
                    <option>some business apps are latency-sensitive across sites</option>
                    <option>latency is moderate but reliability matters more than speed</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              {(voicePlanning || requirements.voice) ? (
                <label>
                  <span>QoS model</span>
                  <select value={requirements.qosModel} onChange={(event) => setRequirements((current) => ({ ...current, qosModel: event.target.value }))}>
                    <option>basic prioritization for voice and critical interactive traffic</option>
                    <option>structured QoS for voice, video, and business-critical apps</option>
                    <option>minimal QoS beyond simple edge prioritization</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}

              <label>
                <span>Outage tolerance</span>
                <select value={requirements.outageTolerance} onChange={(event) => setRequirements((current) => ({ ...current, outageTolerance: event.target.value }))}>
                  <option>short outages acceptable but critical services should recover quickly</option>
                  <option>low outage tolerance for WAN and core business services</option>
                  <option>moderate outage tolerance with planned recovery expectations</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Growth horizon</span>
                <select value={requirements.growthHorizon} onChange={(event) => setRequirements((current) => ({ ...current, growthHorizon: event.target.value }))}>
                  <option>plan for 1 to 3 years of moderate growth</option>
                  <option>plan for near-term growth with later redesign flexibility</option>
                  <option>plan for aggressive growth and heavier service demand</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        ),
      });
    }

    defs.push(
      {
        key: "implementation",
        title: "Delivery and outputs",
        summary: "Budget, rollout, downtime, team capability, and handoff package.",
        panel: (
          <section id="requirements-implementation" className="panel section-anchor planner-step-panel" style={{ display: "grid", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>Implementation constraints and outputs</h3>
              <p className="muted" style={{ margin: 0 }}>
                Capture delivery realities and handoff expectations so the design fits budget, rollout constraints, team capability, and the kind of package the user actually needs.
              </p>
            </div>

            <div className="guided-grid">
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Budget model</span>
                <select value={requirements.budgetModel} onChange={(event) => setRequirements((current) => ({ ...current, budgetModel: event.target.value }))}>
                  <option>balanced budget with room for core security and reliability controls</option>
                  <option>cost-sensitive design with practical compromises</option>
                  <option>higher assurance budget for resilience and manageability</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Vendor preference</span>
                <select value={requirements.vendorPreference} onChange={(event) => setRequirements((current) => ({ ...current, vendorPreference: event.target.value }))}>
                  <option>vendor-flexible with preference for practical supportable options</option>
                  <option>prefer mainstream enterprise vendors and documented support paths</option>
                  <option>mixed vendor approach with interoperability in mind</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Implementation timeline</span>
                <select value={requirements.implementationTimeline} onChange={(event) => setRequirements((current) => ({ ...current, implementationTimeline: event.target.value }))}>
                  <option>normal phased project timeline</option>
                  <option>fast delivery with focused scope and controlled tradeoffs</option>
                  <option>longer staged timeline with validation at each step</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Rollout model</span>
                <select value={requirements.rolloutModel} onChange={(event) => setRequirements((current) => ({ ...current, rolloutModel: event.target.value }))}>
                  <option>phased rollout with validation before wider deployment</option>
                  <option>pilot site first, then broader rollout</option>
                  <option>single implementation window with strong preparation</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Downtime constraint</span>
                <select value={requirements.downtimeConstraint} onChange={(event) => setRequirements((current) => ({ ...current, downtimeConstraint: event.target.value }))}>
                  <option>limited downtime should be planned and communicated</option>
                  <option>minimal downtime is required for user-facing systems</option>
                  <option>maintenance windows are available for planned changes</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Team capability</span>
                <select value={requirements.teamCapability} onChange={(event) => setRequirements((current) => ({ ...current, teamCapability: event.target.value }))}>
                  <option>small to mid-sized internal team with practical support needs</option>
                  <option>strong internal technical team comfortable with richer design controls</option>
                  <option>limited internal staff with need for simpler maintainable design</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Output package</span>
                <select value={requirements.outputPackage} onChange={(event) => setRequirements((current) => ({ ...current, outputPackage: event.target.value }))}>
                  <option>technical handoff plus stakeholder summary</option>
                  <option>implementation-focused technical package</option>
                  <option>review-oriented planning summary with design rationale</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label>
                <span>Primary audience</span>
                <select value={requirements.primaryAudience} onChange={(event) => setRequirements((current) => ({ ...current, primaryAudience: event.target.value }))}>
                  <option>internal IT team and technical reviewers</option>
                  <option>mixed technical and management audience</option>
                  <option>client-facing or stakeholder review audience</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Custom requirement notes</span>
                <textarea
                  rows={4}
                  value={requirements.customRequirementsNotes}
                  onChange={(event) => setRequirements((current) => ({ ...current, customRequirementsNotes: event.target.value }))}
                  placeholder="Use this when a menu needs a custom answer, a special exception, or a real-world note that does not fit the preset options."
                />
              </label>
            </div>
          </section>
        ),
      },
      {
        key: "review",
        title: "Readiness review",
        summary: "Check active tracks, readiness, and the current planning summary.",
        panel: (
          <div className="planner-step-panel planner-review-grid">
            <div id="requirements-readiness" className="summary-grid section-anchor">
              <div className="summary-card"><div className="muted">Requirements readiness</div><div className="value">{readinessSummary.completionLabel}</div></div>
              <div className="summary-card"><div className="muted">Tracks ready</div><div className="value">{readinessSummary.readyCount}</div></div>
              <div className="summary-card"><div className="muted">Tracks needing review</div><div className="value">{readinessSummary.reviewCount}</div></div>
              <div className="summary-card"><div className="muted">Inactive tracks</div><div className="value">{readinessSummary.inactiveCount}</div></div>
            </div>

            {readinessSummary.nextReviewLabels.length > 0 ? (
              <div className="trust-note">
                <strong>Recommended next review areas</strong>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>
                  Focus next on {readinessSummary.nextReviewLabels.join(", ")} so the plan is shaped more consistently before deeper validation and handoff.
                </p>
              </div>
            ) : null}

            <div className="panel" style={{ display: "grid", gap: 10 }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Active planning areas</h3>
                <p className="muted" style={{ margin: 0 }}>These are the planning areas currently active for this scenario.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {activeTracks.map((item) => <span key={item} className="badge-soft">{item}</span>)}
              </div>
            </div>

            <div className="panel" style={{ display: "grid", gap: 12 }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Planning status</h3>
                <p className="muted" style={{ margin: 0 }}>Each active planning area below shows whether it is ready, needs review, or is not needed for this scenario.</p>
              </div>
              <div className="grid-2" style={{ alignItems: "start" }}>
                {trackStatuses.map((track) => (
                  <div key={track.key} className="panel" style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <strong>{track.label}</strong>
                      <span className="badge-soft">{track.active ? "Active" : "Inactive"}</span>
                      <span className="badge-soft">{track.status === "READY" ? "Ready" : track.status === "REVIEW" ? "Needs review" : "Not needed"}</span>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>{track.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="requirements-summary" className="grid-2 section-anchor" style={{ alignItems: "start", gridTemplateColumns: "1.2fr 1fr" }}>
              <div className="panel" style={{ display: "grid", gap: 10 }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Requirements summary</h3>
                <p className="muted" style={{ margin: 0 }}>{description}</p>
              </div>
              <div className="panel" style={{ display: "grid", gap: 10 }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Signals</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {planningSignals(requirements).map((item) => <span key={item} className="badge-soft">{item}</span>)}
                </div>
              </div>
            </div>
          </div>
        ),
      }
    );

    return defs;
  }, [
    advancedScenario,
    activeTracks,
    summaryDescription,
    multiSitePlanning,
    performancePlanning,
    readinessSummary.completionLabel,
    readinessSummary.inactiveCount,
    readinessSummary.nextReviewLabels,
    readinessSummary.readyCount,
    readinessPercent,
    readinessSummary.reviewCount,
    requirements,
    scenario.cloud,
    scenario.resilience,
    scenario.security,
    scenario.voice,
    scenario.wireless,
    specialtyPlanning,
    trackStatuses,
    nextReviewSteps,
    voicePlanning,
    wirelessPlanning,
  ]);

  useEffect(() => {
    if (!stepDefinitions.some((step) => step.key === currentStepKey)) {
      setCurrentStepKey(stepDefinitions[0]?.key ?? "core");
    }
  }, [currentStepKey, stepDefinitions]);

  useEffect(() => {
    if (!requestedStep) return;
    if (stepDefinitions.some((step) => step.key === requestedStep)) {
      setCurrentStepKey(requestedStep);
    }
  }, [requestedStep, stepDefinitions]);

  const currentStepIndex = Math.max(0, stepDefinitions.findIndex((step) => step.key === currentStepKey));
  const currentStep = stepDefinitions[currentStepIndex] ?? stepDefinitions[0];
  const previousStep = currentStepIndex > 0 ? stepDefinitions[currentStepIndex - 1] : null;
  const nextStep = currentStepIndex < stepDefinitions.length - 1 ? stepDefinitions[currentStepIndex + 1] : null;

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading requirements" message="Preparing the requirements workspace for this project." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load requirements"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load the requirements workspace right now."}
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  if (!project) {
    return <EmptyState title="Project not found" message="The requirements workspace could not be loaded for this project." action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>} />;
  }

  if (isFocusedStepView) {
    return (
      <section className="workspace-detail-shell">
        <div className="panel workspace-detail-hero">
          <div>
            <p className="workspace-detail-kicker">Requirements</p>
            <h1 style={{ margin: "0 0 8px 0" }}>{currentStep.title}</h1>
            <p className="muted" style={{ margin: 0 }}>{currentStep.summary}</p>
          </div>
          <div className="workspace-detail-actions">
            <button type="button" className="button-primary" onClick={saveRequirements} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Requirements"}
            </button>
          </div>
        </div>

        <div className="panel workspace-detail-status-strip">
          <span className={`badge-soft ${hasUnsavedChanges ? "workspace-detail-warning" : ""}`.trim()}>{hasUnsavedChanges ? "Unsaved changes" : "Saved to project"}</span>
          <span className="badge-soft">{readinessSummary.completionLabel}</span>
          <span className="badge-soft">Step {currentStepIndex + 1} of {stepDefinitions.length}</span>
          {draftSavedAt ? <span className="badge-soft">Draft {new Date(draftSavedAt).toLocaleString()}</span> : null}
        </div>

        <WorkspaceIssueBanner notice={issueNotice} />

        <div className={`panel planner-step-panel planner-step-panel-frame ${issueNotice ? "workspace-focus-target active" : ""}`.trim()} style={{ display: "grid", gap: 12 }}>
          {currentStep.panel}
        </div>

        <div className="panel workspace-detail-footer">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {previousStep ? (
              <Link to={`/projects/${projectId}/requirements?step=${previousStep.key}`} className="button-nav">Back: {previousStep.title}</Link>
            ) : (
              <span className="muted">You are at the first visible requirements card.</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" className="button-secondary" onClick={saveRequirements} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
            {nextStep ? (
              <Link to={`/projects/${projectId}/requirements?step=${nextStep.key}`} className="button-primary">Next: {nextStep.title}</Link>
            ) : (
              <Link to={`/projects/${projectId}/logical-design`} className="link-button">Continue to Logical Design</Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Requirements"
        description="Capture the use case, environment, security direction, and operational context before detailed logical design work begins. This v109 workspace now uses a clearer step-by-step planner with stronger focus, fewer distractions, and more obvious next moves based on the scenario you define."
        actions={
          <>
            <button type="button" className="button-primary" onClick={saveRequirements} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Requirements"}
            </button>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button link-button-subtle">Open Logical Design</Link>
          </>
        }
      />

      <WorkspaceIssueBanner notice={issueNotice} />

      <div className="panel save-confidence-panel">
        <div>
          <strong style={{ display: "block", marginBottom: 6 }}>Save confidence</strong>
          <p className="muted" style={{ margin: 0 }}>This workspace now keeps a browser draft while you edit, warns before accidental refresh or close, and makes it clearer whether the current plan is only local or already saved to project data.</p>
        </div>
        <div className="save-confidence-grid">
          <div className={`save-confidence-pill ${hasUnsavedChanges ? "warning" : "ok"}`.trim()}>
            <strong>{hasUnsavedChanges ? "Unsaved changes" : "Project version up to date"}</strong>
            <span>{hasUnsavedChanges ? "This browser currently has edits that are newer than the shared saved version." : "No newer browser-only edits are waiting to be saved."}</span>
          </div>
          <div className="save-confidence-pill">
            <strong>Local draft</strong>
            <span>{draftSavedAt ? `Browser draft updated ${new Date(draftSavedAt).toLocaleString()}.` : "No newer browser draft is waiting right now."}</span>
          </div>
          <div className="save-confidence-pill">
            <strong>Shared project data</strong>
            <span>{saveConfidenceNote || "Use Save Requirements to write the current planner state into the project record used by later stages."}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="button-secondary" onClick={saveRequirements} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save to Project"}
          </button>
          <button type="button" className="button-nav" onClick={clearLocalDraft} disabled={!draftSavedAt && !hasUnsavedChanges}>Restore Last Saved Version</button>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Early design-engine preview</h2>
          <p className="muted" style={{ margin: 0 }}>
            This preview uses your current planner answers, even before you save, to pressure the app toward explicit design objects earlier in the workflow instead of waiting for later inference-only review.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={masterGate.status === "ready-for-master" ? "badge badge-info" : masterGate.status === "near-transition" ? "badge badge-warning" : "badge-soft"}>
            {masterGate.status === "ready-for-master" ? "Recovery-ready preview" : masterGate.status === "near-transition" ? "Recovery close" : "Recovery still active"}
          </span>
          <span className="badge-soft">Site nodes {synthesizedPreview.designTruthModel.siteNodes.length}</span>
          <span className="badge-soft">Route domains {synthesizedPreview.designTruthModel.routeDomains.length}</span>
          <span className="badge-soft">Boundaries {synthesizedPreview.designTruthModel.boundaryDomains.length}</span>
          <span className="badge-soft">Flows {synthesizedPreview.designTruthModel.flowContracts.length}</span>
          <span className="badge-soft">Discovery route anchors {previewDiscoveryRouteAnchors}</span>
          <span className="badge-soft">Planner route anchors {previewPlannerRouteAnchors}</span>
          <span className="badge-soft">Discovery boundaries {previewDiscoveryBoundaryAnchors}</span>
          <span className="badge-soft">Planner boundaries {previewPlannerBoundaryAnchors}</span>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Per-site authority preview</strong>
            <div style={{ display: "grid", gap: 10 }}>
              {synthesizedPreview.designTruthModel.siteNodes.slice(0, 6).map((site) => (
                <div key={site.id} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                    <strong>{site.siteName}</strong>
                    <span className={site.authorityStatus === "ready" ? "badge badge-info" : site.authorityStatus === "partial" ? "badge badge-warning" : "badge badge-error"}>{site.authorityStatus}</span>
                    <span className="badge-soft">services {site.serviceIds.length}</span>
                    <span className="badge-soft">flows {site.flowIds.length}</span>
                  </div>
                  <p className="muted" style={{ margin: 0 }}>{site.authorityNotes[0] || "Authority is currently supported by linked route, boundary, placement, and service objects."}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>What these answers already trigger</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 8 }}>{masterGate.summary}</li>
              <li style={{ marginBottom: 8 }}>Topology preview: <strong>{synthesizedPreview.topology.topologyLabel}</strong> with <strong>{synthesizedPreview.topology.internetBreakout}</strong> breakout.</li>
              <li style={{ marginBottom: 8 }}>Required flow coverage currently shows <strong>{synthesizedPreview.flowCoverage.filter((item) => item.required && item.status === "ready").length}</strong> ready categories out of <strong>{synthesizedPreview.flowCoverage.filter((item) => item.required).length}</strong>.</li>
              <li style={{ marginBottom: 8 }}>Authority mix: <strong>{previewDiscoveryRouteAnchors + previewDiscoveryBoundaryAnchors}</strong> discovery-backed anchor(s) and <strong>{previewPlannerRouteAnchors + previewPlannerBoundaryAnchors}</strong> planner-preview anchor(s) are already being promoted before save.</li>
              <li style={{ marginBottom: 0 }}>Main blockers: {recoveryPreview.topBlockers.slice(0, 2).join(" • ") || "No major blockers surfaced in this preview."}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="planner-page-grid planner-page-grid-v109">
        <aside className="planner-sidebar">
          <div className="panel planner-progress-card">
            <div className="planner-progress-card-header">
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Planner flow</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Earlier choices now decide which steps appear. Hidden steps are treated as out of scope for the current scenario.
                </p>
              </div>
              <span className="badge-soft">{readinessPercent}% ready</span>
            </div>
            <div className="planner-progress-meter" aria-hidden="true">
              <span style={{ width: `${readinessPercent}%` }} />
            </div>
            <div className="planner-progress-meta">
              <span>{readinessSummary.readyCount} ready</span>
              <span>{readinessSummary.reviewCount} need review</span>
              <span>{stepDefinitions.length} visible steps</span>
            </div>
            <div className="planner-step-list">
              {stepDefinitions.map((step, index) => {
                const isCurrent = step.key === currentStepKey;
                const isComplete = index < currentStepIndex;
                return (
                  <button
                    key={step.key}
                    type="button"
                    className={`planner-step-link ${isCurrent ? "current" : isComplete ? "complete" : ""}`.trim()}
                    onClick={() => setCurrentStepKey(step.key)}
                  >
                    <span className="planner-step-number">{index + 1}</span>
                    <span>
                      <strong>{step.title}</strong>
                      <small>{step.summary}</small>
                    </span>
                    <span className={`planner-step-state ${isCurrent ? "current" : isComplete ? "complete" : "upcoming"}`.trim()}>
                      {isCurrent ? "Current" : isComplete ? "Done" : "Next"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <details className="panel planner-track-summary" open>
            <summary className="planner-details-summary">Scenario snapshot</summary>
            <p className="muted" style={{ marginTop: 0 }}>These tracks are active right now.</p>
            {activeTracks.map((track) => (
              <div key={track} className="planner-track-row">
                <strong>{track}</strong>
                <span className="badge-soft">Active</span>
              </div>
            ))}
          </details>

          <div className="panel planner-snapshot-list">
            <div className="planner-snapshot-row"><span>Readiness</span><strong>{readinessSummary.completionLabel}</strong></div>
            <div className="planner-snapshot-row"><span>Visible steps</span><strong>{stepDefinitions.length}</strong></div>
            <div className="planner-snapshot-row"><span>Review tracks</span><strong>{readinessSummary.reviewCount}</strong></div>
          </div>
        </aside>

        <div style={{ display: "grid", gap: 16 }}>
          <div className="panel planner-step-shell">
            <div className="planner-step-shell-topbar">
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>Current focus</strong>
                <p className="muted" style={{ margin: 0 }}>
                  Work one strong section at a time, then move forward. The planner now keeps the current step, progress, and next move visible without forcing you to scan the whole page.
                </p>
              </div>
              <div className="planner-inline-stats">
                <span className="badge-soft">Step {currentStepIndex + 1} of {stepDefinitions.length}</span>
                <span className="badge-soft">{readinessSummary.completionLabel}</span>
              </div>
            </div>

            {nextReviewSteps.length > 0 ? (
              <div className="planner-next-review-row">
                <strong>Recommended next review areas</strong>
                <div className="planner-next-review-links">
                  {nextReviewSteps.map((item) => (
                    <button key={item.key} type="button" className="button-secondary planner-chip-button" onClick={() => setCurrentStepKey(item.key)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <WorkspaceIssueBanner notice={issueNotice} />

        <div className={`panel planner-step-panel planner-step-panel-frame ${issueNotice ? "workspace-focus-target active" : ""}`.trim()} style={{ display: "grid", gap: 12 }}>
              <div className="planner-step-heading">
                <div>
                  <h2 style={{ margin: 0 }}>{currentStep.title}</h2>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>{currentStep.summary}</p>
                </div>
                <span className="badge-soft">Step {currentStepIndex + 1} of {stepDefinitions.length}</span>
              </div>
              {currentStep.panel}
            </div>
          </div>

          <div className="panel planner-footer-actions planner-footer-actions-v109">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {previousStep ? (
                <button type="button" className="button-nav" onClick={() => setCurrentStepKey(previousStep.key)}>Back: {previousStep.title}</button>
              ) : (
                <span className="muted">You are at the first visible step.</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button type="button" className="button-secondary" onClick={saveRequirements} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
              {nextStep ? (
                <button type="button" className="button-primary" onClick={() => setCurrentStepKey(nextStep.key)}>Next: {nextStep.title}</button>
              ) : (
                <Link to={`/projects/${projectId}/logical-design`} className="link-button">Continue to Logical Design</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
