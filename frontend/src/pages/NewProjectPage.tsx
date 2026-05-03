import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProjectForm } from "../features/projects/components/ProjectForm";
import { useOrganizations } from "../features/organizations/hooks";
import { useCreateProject } from "../features/projects/hooks";
import type { AIUseDraftOptions } from "../features/ai/components/AIPlanningPanel";
import type { AIPlanDraft, Site } from "../lib/types";
import { createSite } from "../features/sites/api";
import { createVlan } from "../features/vlans/api";
import { SectionHeader } from "../components/app/SectionHeader";
import { runValidation } from "../features/validation/api";
import { HelpTip } from "../components/app/HelpTip";
import {
  buildNamingPreviewExamples,
  buildProjectSummaryDescription,
  buildGuidedDescription,
  conditionalSections,
  defaultRequirementsProfile,
  planningSignals,
  planningTracks,
  planningTrackStatuses,
  planningReadinessSummary,
  stringifyRequirementsProfile,
  type RequirementsProfile,
} from "../lib/requirementsProfile";

const AI_DRAFT_STORAGE_KEY = "subnetops.aiDraftSelection";
const PHASE19_AI_DRAFT_CONTRACT = "PHASE19_AI_DRAFT_HELPER_CONTRACT";
const PHASE19_AI_APPLIED_MARKER = "PHASE19_AI_DRAFT_APPLIED_REVIEW_REQUIRED";

const defaultUseOptions: AIUseDraftOptions = {
  applyProjectFields: true,
  applySites: true,
  applyVlans: true,
};

type WizardStep = {
  key: string;
  title: string;
  description: string;
};

const wizardSteps: WizardStep[] = [
  {
    key: "core",
    title: "Core requirements",
    description: "Define the network type, project stage, environment, and basic scope before shaping the design.",
  },
  {
    key: "priorities",
    title: "Design priorities",
    description: "Set the security, wireless, voice, cloud, and resilience direction that should shape the plan.",
  },
  {
    key: "addressing",
    title: "Addressing and subnet strategy",
    description: "Set the hierarchy, gateway approach, and growth model that will guide subnetting later.",
  },
  {
    key: "operations",
    title: "Operations and manageability",
    description: "Capture the naming, monitoring, logging, and ownership model expected for the environment.",
  },
  {
    key: "physical",
    title: "Physical layout and endpoints",
    description: "Describe the site structure and endpoint counts so the plan reflects real device demand and edge footprint.",
  },
  {
    key: "apps",
    title: "Applications, WAN, and performance",
    description: "Model the traffic profile, service sensitivity, and performance expectations that influence the design.",
  },
  {
    key: "implementation",
    title: "Implementation and output",
    description: "Capture delivery constraints, audience, and the kind of handoff package the plan needs to support.",
  },
  {
    key: "review",
    title: "Review and create plan",
    description: "Review the plan snapshot and create the project once the core planning inputs are in place.",
  },
];

function selectedSummary(options: AIUseDraftOptions) {
  const parts: string[] = [];
  if (options.applyProjectFields) parts.push("project fields");
  if (options.applySites) parts.push("sites");
  if (options.applyVlans) parts.push("VLANs");
  return parts.length > 0 ? parts.join(", ") : "nothing selected";
}

function appendPhase19AiReviewMarker(notes?: string) {
  const marker = `${PHASE19_AI_APPLIED_MARKER}: AI-created suggestion imported from the AI workspace. Review required; not authoritative until requirements materialization, validation, Engine 1 addressing, Engine 2 IPAM where relevant, standards, and traceability checks pass.`;
  if (!notes || notes.trim().length === 0) return marker;
  if (notes.includes(PHASE19_AI_APPLIED_MARKER)) return notes;
  return `${notes.trim()}\n${marker}`;
}

function buildRequirementsJsonForCreate(guided: RequirementsProfile, aiDraft: AIPlanDraft | null, options: AIUseDraftOptions) {
  const raw = stringifyRequirementsProfile(guided);
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(raw);
    parsed = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    parsed = {};
  }

  if (aiDraft) {
    parsed.phase19AiDraft = {
      contract: PHASE19_AI_DRAFT_CONTRACT,
      state: "AI_DRAFT",
      provider: aiDraft.provider,
      selected: {
        applyProjectFields: options.applyProjectFields,
        applySites: options.applySites,
        applyVlans: options.applyVlans,
      },
      reviewRequired: true,
      notAuthoritative: true,
      createdFrom: "AIWorkspacePage",
      gate: aiDraft.authority?.conversionGates || [],
    };
  }

  return JSON.stringify(parsed);
}

function trackStatusLabel(status: "READY" | "REVIEW" | "INACTIVE") {
  if (status === "READY") return "Ready";
  if (status === "REVIEW") return "Needs review";
  return "Not needed";
}

function PlanSidebar({
  guided,
  currentStep,
  setCurrentStep,
}: {
  guided: RequirementsProfile;
  currentStep: number;
  setCurrentStep: (index: number) => void;
}) {
  const scenario = conditionalSections(guided);
  const activeTracks = planningTracks(guided);
  const trackStatuses = planningTrackStatuses(guided);
  const readinessSummary = planningReadinessSummary(guided);
  const namingPreview = buildNamingPreviewExamples(guided);
  const snapshotItems = [
    { label: "Planning for", value: guided.planningFor },
    { label: "Environment", value: guided.environmentType },
    { label: "Sites", value: guided.siteCount },
    { label: "Users per site", value: guided.usersPerSite },
    { label: "Design priority", value: guided.primaryGoal },
  ];

  const scenarioSignals = [
    scenario.security ? "Security" : null,
    scenario.cloud ? "Cloud / Hybrid" : null,
    scenario.wireless ? "Wireless" : null,
    scenario.voice ? "Voice / QoS" : null,
    scenario.resilience ? "Resilience" : null,
  ].filter(Boolean) as string[];

  return (
    <aside className="planner-sidebar panel">
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h3 style={{ margin: "0 0 6px 0" }}>Plan setup</h3>
          <p className="muted" style={{ margin: 0 }}>Move through the planning sections in order, then review the snapshot before creating the project.</p>
          <div className="planner-sidebar-links">
            <Link to="/dashboard/help" className="link-button">Help</Link>
            <Link to="/dashboard/faq" className="link-button">FAQ</Link>
            <Link to="/ai" className="link-button">AI workspace</Link>
          </div>
        </div>
        <div className="planner-step-list">
          {wizardSteps.map((step, index) => (
            <button
              key={step.key}
              type="button"
              className={`planner-step-link${currentStep === index ? " current" : ""}${index < currentStep ? " complete" : ""}`}
              onClick={() => setCurrentStep(index)}
            >
              <span className="planner-step-number">{index + 1}</span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Plan snapshot</h3>
        <div className="planner-snapshot-list">
          {snapshotItems.map((item) => (
            <div key={item.label} className="planner-snapshot-row">
              <span>{item.label}</span>
              <strong>{item.value || "—"}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Active planning areas</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {activeTracks.map((item) => <span key={item} className="badge-soft">{item}</span>)}
        </div>
      </div>

      {scenarioSignals.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Scenario signals</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {scenarioSignals.map((item) => <span key={item} className="badge-soft">{item}</span>)}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Planning status</h3>
        <div className="planner-status-grid">
          <div className="summary-card" style={{ padding: 14 }}>
            <div className="muted">Readiness</div>
            <div className="value" style={{ fontSize: "1.1rem" }}>{readinessSummary.completionLabel}</div>
          </div>
          <div className="summary-card" style={{ padding: 14 }}>
            <div className="muted">Ready</div>
            <div className="value" style={{ fontSize: "1.1rem" }}>{readinessSummary.readyCount}</div>
          </div>
          <div className="summary-card" style={{ padding: 14 }}>
            <div className="muted">Needs review</div>
            <div className="value" style={{ fontSize: "1.1rem" }}>{readinessSummary.reviewCount}</div>
          </div>
        </div>
        <div className="planner-track-summary">
          {trackStatuses.map((track) => (
            <div key={track.key} className="planner-track-row">
              <strong>{track.label}</strong>
              <span className="badge-soft">{trackStatusLabel(track.status)}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function WizardFooter({
  currentStep,
  canProceed,
  onBack,
  onNext,
}: {
  currentStep: number;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="planner-footer-actions">
      <button type="button" className="link-button button-flow-back" onClick={onBack} disabled={currentStep === 0}>
        Back
      </button>
      <button type="button" className="button-primary button-flow-next" onClick={onNext} disabled={!canProceed}>
        {currentStep === wizardSteps.length - 1 ? "Stay on review" : "Next"}
      </button>
    </div>
  );
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const mutation = useCreateProject();
  const orgsQuery = useOrganizations();
  const [aiDraft, setAiDraft] = useState<AIPlanDraft | null>(null);
  const [useOptions, setUseOptions] = useState<AIUseDraftOptions>(defaultUseOptions);
  const [generationStatus, setGenerationStatus] = useState("");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [guided, setGuided] = useState<RequirementsProfile>({ ...defaultRequirementsProfile, projectPhase: "New network build" });
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  useEffect(() => {
    const raw = sessionStorage.getItem(AI_DRAFT_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { draft: AIPlanDraft; options: AIUseDraftOptions };
      setAiDraft(parsed.draft);
      setUseOptions(parsed.options);
      setGenerationStatus(`AI draft ready. Selected: ${selectedSummary(parsed.options)}.`);
    } catch {
      sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY);
      return;
    }
    sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY);
  }, []);

  const guidedDescription = useMemo(() => buildGuidedDescription(guided), [guided]);
  const guidedSummaryDescription = useMemo(() => buildProjectSummaryDescription(guided), [guided]);
  const scenario = useMemo(() => conditionalSections(guided), [guided]);
  const readinessSummary = useMemo(() => planningReadinessSummary(guided), [guided]);
  const namingPreview = useMemo(() => buildNamingPreviewExamples(guided), [guided]);
  const multiSitePlanning = Number(guided.siteCount || "0") > 1 || guided.internetModel !== "internet at each site";
  const wirelessPlanning = guided.wireless || guided.guestWifi;
  const voicePlanning = guided.voice || Number(guided.phoneCount || "0") > 0;

  const initialValues = useMemo(() => {
    if (!aiDraft || !useOptions.applyProjectFields) {
      return {
        name: guided.planningFor === "Custom" ? "" : `${guided.planningFor} Network Plan`,
        description: guidedSummaryDescription,
        environmentType: guided.environmentType,
      };
    }
    return {
      name: aiDraft.project.name,
      description: (aiDraft.project.description || "").slice(0, 320),
      organizationName: aiDraft.project.organizationName,
      environmentType: aiDraft.project.environmentType,
      basePrivateRange: aiDraft.project.basePrivateRange,
    };
  }, [aiDraft, useOptions.applyProjectFields, guided.planningFor, guided.environmentType, guidedDescription]);

  const canProceed = useMemo(() => {
    if (currentStep === 0) {
      return [guided.planningFor, guided.projectPhase, guided.environmentType, guided.complianceProfile, guided.siteCount, guided.usersPerSite].every((item) => item && String(item).trim().length > 0);
    }
    return true;
  }, [currentStep, guided]);

  const nextReviewAreas = readinessSummary.nextReviewLabels.length > 0 ? readinessSummary.nextReviewLabels.join(", ") : "Core requirements";

  const renderStepContent = () => {
    switch (wizardSteps[currentStep].key) {
      case "core":
        return (
          <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Core requirements</h2><HelpTip title="Core requirements">Start with the business context, environment, scale, and compliance expectations. These answers set the base for the rest of the plan.</HelpTip></div>
              <p className="muted" style={{ margin: 0 }}>Start with the planning context that defines what the network needs to support before deeper design work begins.</p>
            </div>
            <div className="guided-grid">
              <label>
                <span>What are you planning a network for?</span>
                <select value={guided.planningFor} onChange={(event) => setGuided((current) => ({ ...current, planningFor: event.target.value }))}>
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
                <span>Project stage</span>
                <select value={guided.projectPhase} onChange={(event) => setGuided((current) => ({ ...current, projectPhase: event.target.value }))}>
                  <option>New network build</option>
                  <option>Existing network redesign</option>
                  <option>Network expansion</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Environment type</span>
                <select value={guided.environmentType} onChange={(event) => setGuided((current) => ({ ...current, environmentType: event.target.value }))}>
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
                <select value={guided.complianceProfile} onChange={(event) => setGuided((current) => ({ ...current, complianceProfile: event.target.value }))}>
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
                <input value={guided.siteCount} onChange={(event) => setGuided((current) => ({ ...current, siteCount: event.target.value }))} />
              </label>
              <label>
                <span>Approximate users per site</span>
                <input value={guided.usersPerSite} onChange={(event) => setGuided((current) => ({ ...current, usersPerSite: event.target.value }))} />
              </label>
              <label>
                <span>Internet / WAN model</span>
                <select value={guided.internetModel} onChange={(event) => setGuided((current) => ({ ...current, internetModel: event.target.value }))}>
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
                <select value={guided.serverPlacement} onChange={(event) => setGuided((current) => ({ ...current, serverPlacement: event.target.value }))}>
                  <option>centralized servers or services</option>
                  <option>mixed local and centralized services</option>
                  <option>mostly cloud-hosted services</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        );
      case "priorities":
        return (
          <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Design priorities</h2><HelpTip title="Design priorities">Use this step to signal what the network needs to emphasize, such as segmentation, wireless access, resilience, or hybrid connectivity.</HelpTip></div>
              <p className="muted" style={{ margin: 0 }}>Set the planning priorities that should shape security, resilience, voice, wireless, and cloud decisions.</p>
            </div>
            <div className="guided-grid">
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Primary design goal</span>
                <select value={guided.primaryGoal} onChange={(event) => setGuided((current) => ({ ...current, primaryGoal: event.target.value }))}>
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
              <label><input type="checkbox" checked={guided.guestWifi} onChange={(event) => setGuided((current) => ({ ...current, guestWifi: event.target.checked }))} /> Guest Wi-Fi</label>
              <label><input type="checkbox" checked={guided.voice} onChange={(event) => setGuided((current) => ({ ...current, voice: event.target.checked }))} /> Voice</label>
              <label><input type="checkbox" checked={guided.management} onChange={(event) => setGuided((current) => ({ ...current, management: event.target.checked }))} /> Management network</label>
              <label><input type="checkbox" checked={guided.printers} onChange={(event) => setGuided((current) => ({ ...current, printers: event.target.checked }))} /> Printers</label>
              <label><input type="checkbox" checked={guided.iot} onChange={(event) => setGuided((current) => ({ ...current, iot: event.target.checked }))} /> IoT devices</label>
              <label><input type="checkbox" checked={guided.cameras} onChange={(event) => setGuided((current) => ({ ...current, cameras: event.target.checked }))} /> Cameras / security devices</label>
              <label><input type="checkbox" checked={guided.wireless} onChange={(event) => setGuided((current) => ({ ...current, wireless: event.target.checked }))} /> Wireless access</label>
              <label><input type="checkbox" checked={guided.remoteAccess} onChange={(event) => setGuided((current) => ({ ...current, remoteAccess: event.target.checked }))} /> Remote access / VPN</label>
              <label><input type="checkbox" checked={guided.dualIsp} onChange={(event) => setGuided((current) => ({ ...current, dualIsp: event.target.checked }))} /> Dual ISP / redundancy</label>
              <label><input type="checkbox" checked={guided.cloudConnected} onChange={(event) => setGuided((current) => ({ ...current, cloudConnected: event.target.checked }))} /> Cloud-connected services</label>
            </div>
            <div className="guided-grid">
              {scenario.security ? (
                <>
                  {guided.guestWifi ? (
                    <label>
                      <span>Guest access policy</span>
                      <select value={guided.guestPolicy} onChange={(event) => setGuided((current) => ({ ...current, guestPolicy: event.target.value }))}>
                        <option>internet-only isolated guest access</option>
                        <option>guest internet with captive portal</option>
                        <option>guest access with sponsor workflow</option>
                      <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                    </label>
                  ) : null}
                  {guided.management ? (
                    <label>
                      <span>Management access policy</span>
                      <select value={guided.managementAccess} onChange={(event) => setGuided((current) => ({ ...current, managementAccess: event.target.value }))}>
                        <option>management reachable only from trusted admin networks</option>
                        <option>management reachable through jump host or bastion only</option>
                        <option>management reachable from dedicated IT VLAN only</option>
                      <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                    </label>
                  ) : null}
                  {guided.remoteAccess ? (
                    <label>
                      <span>Remote access method</span>
                      <select value={guided.remoteAccessMethod} onChange={(event) => setGuided((current) => ({ ...current, remoteAccessMethod: event.target.value }))}>
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
                    <select value={guided.securityPosture} onChange={(event) => setGuided((current) => ({ ...current, securityPosture: event.target.value }))}>
                      <option>segmented by function and trust level</option>
                      <option>high isolation for sensitive and administrative systems</option>
                      <option>balanced segmentation with simpler operations</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                  <label>
                    <span>Trust boundary model</span>
                    <select value={guided.trustBoundaryModel} onChange={(event) => setGuided((current) => ({ ...current, trustBoundaryModel: event.target.value }))}>
                      <option>internal users, guests, management, and services separated</option>
                      <option>staff, infrastructure, and external access clearly separated</option>
                      <option>minimal zones with focused administrative separation</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                  <label>
                    <span>Privileged admin boundary</span>
                    <select value={guided.adminBoundary} onChange={(event) => setGuided((current) => ({ ...current, adminBoundary: event.target.value }))}>
                      <option>privileged administration isolated from user access</option>
                      <option>dedicated admin jump path for management actions</option>
                      <option>small-team admin access with strict management VLAN boundaries</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                  <label>
                    <span>Identity model</span>
                    <select value={guided.identityModel} onChange={(event) => setGuided((current) => ({ ...current, identityModel: event.target.value }))}>
                      <option>central identity for staff and administrators</option>
                      <option>central identity plus stronger admin controls</option>
                      <option>separate privileged identity path for administration</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                </>
              ) : null}
              {scenario.wireless ? (
                <label>
                  <span>Wireless / SSID model</span>
                  <select value={guided.wirelessModel} onChange={(event) => setGuided((current) => ({ ...current, wirelessModel: event.target.value }))}>
                    <option>separate staff and guest SSIDs</option>
                    <option>staff, guest, and IoT SSIDs</option>
                    <option>single staff SSID plus isolated guest SSID</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}
              {scenario.voice ? (
                <label>
                  <span>Voice / QoS treatment</span>
                  <select value={guided.voiceQos} onChange={(event) => setGuided((current) => ({ ...current, voiceQos: event.target.value }))}>
                    <option>voice prioritized over standard user traffic</option>
                    <option>voice and video prioritized</option>
                    <option>basic voice separation without advanced QoS</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}
              {scenario.cloud ? (
                <>
                  <label>
                    <span>Cloud provider</span>
                    <select value={guided.cloudProvider} onChange={(event) => setGuided((current) => ({ ...current, cloudProvider: event.target.value }))}>
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
                    <select value={guided.cloudConnectivity} onChange={(event) => setGuided((current) => ({ ...current, cloudConnectivity: event.target.value }))}>
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
                    <select value={guided.cloudIdentityBoundary} onChange={(event) => setGuided((current) => ({ ...current, cloudIdentityBoundary: event.target.value }))}>
                      <option>shared identity between on-prem and cloud</option>
                      <option>cloud-integrated identity with restricted admin roles</option>
                      <option>separate cloud administration boundary</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                  <label>
                    <span>Cloud traffic boundary</span>
                    <select value={guided.cloudTrafficBoundary} onChange={(event) => setGuided((current) => ({ ...current, cloudTrafficBoundary: event.target.value }))}>
                      <option>private application traffic separated from public internet access</option>
                      <option>internet-facing services separated from internal workloads</option>
                      <option>hybrid application traffic isolated through dedicated connectivity</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                  <label>
                    <span>Cloud hosting model</span>
                    <select value={guided.cloudHostingModel} onChange={(event) => setGuided((current) => ({ ...current, cloudHostingModel: event.target.value }))}>
                      <option>selected services extended into cloud while core users remain on-prem</option>
                      <option>hybrid application split between on-prem and cloud workloads</option>
                      <option>mostly cloud-hosted services with retained on-prem edge and identity</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                  <label>
                    <span>Cloud network model</span>
                    <select value={guided.cloudNetworkModel} onChange={(event) => setGuided((current) => ({ ...current, cloudNetworkModel: event.target.value }))}>
                      <option>provider VNet/VPC with private application address space</option>
                      <option>shared services network plus segmented application subnets</option>
                      <option>hub-and-spoke cloud network with controlled spoke access</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                  <label>
                    <span>Cloud routing model</span>
                    <select value={guided.cloudRoutingModel} onChange={(event) => setGuided((current) => ({ ...current, cloudRoutingModel: event.target.value }))}>
                      <option>summarized site routes and controlled cloud prefixes</option>
                      <option>private connectivity with selected route advertisement only</option>
                      <option>segmented hybrid routing with explicit trust boundaries</option>
                    <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                  </label>
                </>
              ) : null}
              {scenario.resilience ? (
                <label>
                  <span>Resilience target</span>
                  <select value={guided.resilienceTarget} onChange={(event) => setGuided((current) => ({ ...current, resilienceTarget: event.target.value }))}>
                    <option>single ISP acceptable</option>
                    <option>dual ISP with basic failover</option>
                    <option>high availability internet edge</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}
            </div>
          </section>
        );
      case "addressing":
        return (
          <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Addressing and subnet strategy</h2><HelpTip title="Addressing strategy">Pick a structure that can scale cleanly across sites and segments. The goal is not only valid subnets, but a maintainable addressing hierarchy.</HelpTip></div>
              <p className="muted" style={{ margin: 0 }}>Set the addressing policy now so later subnetting and logical design follow a consistent structure.</p>
            </div>
            <div className="guided-grid">
              <label>
                <span>Address hierarchy model</span>
                <select value={guided.addressHierarchyModel} onChange={(event) => setGuided((current) => ({ ...current, addressHierarchyModel: event.target.value }))}>
                  <option>organization block to site block to segment subnet hierarchy</option>
                  <option>site-first hierarchy with summarized regional blocks</option>
                  <option>compact single-site hierarchy with reserved future blocks</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Site block strategy</span>
                <select value={guided.siteBlockStrategy} onChange={(event) => setGuided((current) => ({ ...current, siteBlockStrategy: event.target.value }))}>
                  <option>reserve consistent site blocks for clean summarization</option>
                  <option>allocate right-sized site blocks with reserved expansion space</option>
                  <option>use larger core sites and smaller branch blocks</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Gateway convention</span>
                <select value={guided.gatewayConvention} onChange={(event) => setGuided((current) => ({ ...current, gatewayConvention: event.target.value }))}>
                  <option>first usable address as default gateway</option>
                  <option>standardized .1 gateway model where possible</option>
                  <option>infrastructure-reserved low addresses with documented gateway slots</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Growth buffer model</span>
                <select value={guided.growthBufferModel} onChange={(event) => setGuided((current) => ({ ...current, growthBufferModel: event.target.value }))}>
                  <option>leave headroom for expansion in each site and segment</option>
                  <option>conservative allocation with explicit future subnet space</option>
                  <option>balanced allocation based on current needs plus moderate growth</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Reserved range policy</span>
                <select value={guided.reservedRangePolicy} onChange={(event) => setGuided((current) => ({ ...current, reservedRangePolicy: event.target.value }))}>
                  <option>reserve infrastructure and management ranges inside each site block</option>
                  <option>reserve low-address space for gateways, switches, firewalls, and services</option>
                  <option>reserve dedicated address ranges for management, edge, and future growth</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        );
      case "operations":
        return (
          <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Operations and manageability</h2><HelpTip title="Operations">Capture how the network will be named, monitored, logged, backed up, and administered after deployment.</HelpTip></div>
              <p className="muted" style={{ margin: 0 }}>Capture the operational model so the plan reflects how the network will be managed after deployment.</p>
            </div>
            <div className="guided-grid">
              <label>
                <span>Management IP policy</span>
                <select value={guided.managementIpPolicy} onChange={(event) => setGuided((current) => ({ ...current, managementIpPolicy: event.target.value }))}>
                  <option>dedicated management IP space per site and device role</option>
                  <option>centralized management ranges with site-based allocation</option>
                  <option>small environment with tightly reserved admin addressing</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Site identity capture</span>
                <select value={guided.siteIdentityCapture} onChange={(event) => setGuided((current) => ({ ...current, siteIdentityCapture: event.target.value }))}>
                  <option>capture site name, city or location label, and optional street address for each site</option>
                  <option>capture formal branch or campus name plus concise location label</option>
                  <option>capture real street address for implementation and shipping context</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Naming standard</span>
                <select value={guided.namingStandard} onChange={(event) => setGuided((current) => ({ ...current, namingStandard: event.target.value }))}>
                  <option>site-role-device naming with consistent short codes</option>
                  <option>site-floor-role numbering with structured device labels</option>
                  <option>compact naming for smaller environments with role prefixes</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Device naming convention</span>
                <select value={guided.deviceNamingConvention} onChange={(event) => setGuided((current) => ({ ...current, deviceNamingConvention: event.target.value }))}>
                  <option>automatic short-code standard (SW_TOR_01 / FW_TOR_01)</option>
                  <option>automatic readable standard (Toronto-SW1 / Toronto-FW1)</option>
                  <option>automatic location-role-index standard (TOR-SW-01 / TOR-FW-01)</option>
                  <option>no preference - generate automatically from site names and roles</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Naming token preference</span>
                <select value={guided.namingTokenPreference} onChange={(event) => setGuided((current) => ({ ...current, namingTokenPreference: event.target.value }))}>
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
                <select value={guided.namingHierarchy} onChange={(event) => setGuided((current) => ({ ...current, namingHierarchy: event.target.value }))}>
                  <option>site → building → floor → role → index when available</option>
                  <option>site → role → index only</option>
                  <option>site → building → role → index</option>
                  <option>site → floor → role → index</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Custom naming pattern</span>
                <input value={guided.customNamingPattern} onChange={(event) => setGuided((current) => ({ ...current, customNamingPattern: event.target.value }))} placeholder="Example: {site}_{building}_{floor}_{role}_{index}" />
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
                <select value={guided.monitoringModel} onChange={(event) => setGuided((current) => ({ ...current, monitoringModel: event.target.value }))}>
                  <option>central monitoring with device health, interfaces, and alerts</option>
                  <option>lightweight monitoring focused on uptime and critical events</option>
                  <option>monitoring plus performance trending for core services and WAN</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Logging model</span>
                <select value={guided.loggingModel} onChange={(event) => setGuided((current) => ({ ...current, loggingModel: event.target.value }))}>
                  <option>central syslog and event retention for infrastructure devices</option>
                  <option>critical-event logging with retained admin actions</option>
                  <option>security-focused logging for edge, access, and remote access events</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Backup policy</span>
                <select value={guided.backupPolicy} onChange={(event) => setGuided((current) => ({ ...current, backupPolicy: event.target.value }))}>
                  <option>scheduled configuration backups for key network devices</option>
                  <option>central backup workflow for infrastructure configurations</option>
                  <option>manual approval plus periodic backup snapshots</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Operations ownership</span>
                <select value={guided.operationsOwnerModel} onChange={(event) => setGuided((current) => ({ ...current, operationsOwnerModel: event.target.value }))}>
                  <option>internal IT ownership with documented admin responsibilities</option>
                  <option>shared internal and managed-service ownership model</option>
                  <option>small-team ownership with simplified operational controls</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        );
      case "physical":
        return (
          <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Physical layout and endpoint profile</h2><HelpTip title="Physical profile">Use this step to reflect site structure, endpoint demand, wireless footprint, and edge complexity more realistically.</HelpTip></div>
              <p className="muted" style={{ margin: 0 }}>Capture the site structure and endpoint counts so the plan reflects real ports, closets, access points, and device demand.</p>
            </div>
            <div className="guided-grid">
              <label>
                <span>Site layout model</span>
                <select value={guided.siteLayoutModel} onChange={(event) => setGuided((current) => ({ ...current, siteLayoutModel: event.target.value }))}>
                  <option>single building or floor per site with a simple edge layout</option>
                  <option>multi-floor site with access closets and distributed edge</option>
                  <option>branch-style site with compact infrastructure and limited edge space</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Physical scope</span>
                <select value={guided.physicalScope} onChange={(event) => setGuided((current) => ({ ...current, physicalScope: event.target.value }))}>
                  <option>basic site layout without detailed closet mapping yet</option>
                  <option>needs future MDF / IDF or closet-aware planning</option>
                  <option>distributed physical layout with multiple access areas</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Site role</span>
                <select value={guided.siteRoleModel} onChange={(event) => setGuided((current) => ({ ...current, siteRoleModel: event.target.value }))}>
                  <option>primary office or main site</option>
                  <option>branch or satellite site</option>
                  <option>specialty site with focused local services</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Buildings</span>
                <input value={guided.buildingCount} onChange={(event) => setGuided((current) => ({ ...current, buildingCount: event.target.value }))} />
              </label>
              <label>
                <span>Floors</span>
                <input value={guided.floorCount} onChange={(event) => setGuided((current) => ({ ...current, floorCount: event.target.value }))} />
              </label>
              <label>
                <span>Closet / distribution model</span>
                <select value={guided.closetModel} onChange={(event) => setGuided((current) => ({ ...current, closetModel: event.target.value }))}>
                  <option>single small edge/closet footprint</option>
                  <option>MDF plus one or more IDF or access closets</option>
                  <option>distributed edge with multiple access zones</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Edge footprint</span>
                <select value={guided.edgeFootprint} onChange={(event) => setGuided((current) => ({ ...current, edgeFootprint: event.target.value }))}>
                  <option>compact access edge with limited local infrastructure</option>
                  <option>moderate access edge with local switching and AP density</option>
                  <option>larger edge footprint requiring distributed access planning</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Approximate printers</span>
                <input value={guided.printerCount} onChange={(event) => setGuided((current) => ({ ...current, printerCount: event.target.value }))} />
              </label>
              {voicePlanning ? (
                <label>
                  <span>Approximate phones</span>
                  <input value={guided.phoneCount} onChange={(event) => setGuided((current) => ({ ...current, phoneCount: event.target.value }))} />
                </label>
              ) : null}
              {wirelessPlanning ? (
                <label>
                  <span>Approximate access points</span>
                  <input value={guided.apCount} onChange={(event) => setGuided((current) => ({ ...current, apCount: event.target.value }))} />
                </label>
              ) : null}
              {guided.cameras ? (
                <label>
                  <span>Approximate cameras</span>
                  <input value={guided.cameraCount} onChange={(event) => setGuided((current) => ({ ...current, cameraCount: event.target.value }))} />
                </label>
              ) : null}
              <label>
                <span>Approximate servers</span>
                <input value={guided.serverCount} onChange={(event) => setGuided((current) => ({ ...current, serverCount: event.target.value }))} />
              </label>
              {guided.iot ? (
                <label>
                  <span>Approximate IoT / specialty devices</span>
                  <input value={guided.iotDeviceCount} onChange={(event) => setGuided((current) => ({ ...current, iotDeviceCount: event.target.value }))} />
                </label>
              ) : null}
              {wirelessPlanning ? (
                <label style={{ gridColumn: "1 / -1" }}>
                  <span>Wired / wireless mix</span>
                  <select value={guided.wiredWirelessMix} onChange={(event) => setGuided((current) => ({ ...current, wiredWirelessMix: event.target.value }))}>
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
        );
      case "apps":
        return (
          <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Applications, WAN, and performance</h2><HelpTip title="Applications and WAN">Describe the traffic the network needs to carry and how sensitive key services are to latency, outages, and bandwidth limits.</HelpTip></div>
              <p className="muted" style={{ margin: 0 }}>Describe what traffic the network needs to carry and how sensitive that traffic is to outages, latency, and bandwidth changes.</p>
            </div>
            <div className="guided-grid">
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Application profile</span>
                <select value={guided.applicationProfile} onChange={(event) => setGuided((current) => ({ ...current, applicationProfile: event.target.value }))}>
                  <option>general business apps, collaboration, file access, and internet browsing</option>
                  <option>voice, collaboration, cloud apps, and shared file services</option>
                  <option>mixed office plus specialty systems and internal services</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Critical services model</span>
                <select value={guided.criticalServicesModel} onChange={(event) => setGuided((current) => ({ ...current, criticalServicesModel: event.target.value }))}>
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
                  <select value={guided.interSiteTrafficModel} onChange={(event) => setGuided((current) => ({ ...current, interSiteTrafficModel: event.target.value }))}>
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
                <select value={guided.bandwidthProfile} onChange={(event) => setGuided((current) => ({ ...current, bandwidthProfile: event.target.value }))}>
                  <option>balanced branch and user bandwidth with normal business traffic</option>
                  <option>higher WAN and internet demand due to cloud and collaboration</option>
                  <option>lighter steady-state usage with some peak traffic windows</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              {voicePlanning || guided.primaryGoal === "performance and user experience" ? (
                <label>
                  <span>Latency sensitivity</span>
                  <select value={guided.latencySensitivity} onChange={(event) => setGuided((current) => ({ ...current, latencySensitivity: event.target.value }))}>
                    <option>voice and interactive apps should remain responsive</option>
                    <option>some business apps are latency-sensitive across sites</option>
                    <option>latency is moderate but reliability matters more than speed</option>
                  <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
                </label>
              ) : null}
              {voicePlanning || guided.voice ? (
                <label>
                  <span>QoS model</span>
                  <select value={guided.qosModel} onChange={(event) => setGuided((current) => ({ ...current, qosModel: event.target.value }))}>
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
                <select value={guided.outageTolerance} onChange={(event) => setGuided((current) => ({ ...current, outageTolerance: event.target.value }))}>
                  <option>short outages acceptable but critical services should recover quickly</option>
                  <option>low outage tolerance for WAN and core business services</option>
                  <option>moderate outage tolerance with planned recovery expectations</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Growth horizon</span>
                <select value={guided.growthHorizon} onChange={(event) => setGuided((current) => ({ ...current, growthHorizon: event.target.value }))}>
                  <option>plan for 1 to 3 years of moderate growth</option>
                  <option>plan for near-term growth with later redesign flexibility</option>
                  <option>plan for aggressive growth and heavier service demand</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        );
      case "implementation":
        return (
          <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Implementation and output</h2><HelpTip title="Implementation">Capture rollout constraints, audience, and handoff expectations so the plan matches how it will actually be delivered.</HelpTip></div>
              <p className="muted" style={{ margin: 0 }}>Capture delivery constraints and output expectations so the plan fits the rollout model and the audience it is intended for.</p>
            </div>
            <div className="guided-grid">
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Budget model</span>
                <select value={guided.budgetModel} onChange={(event) => setGuided((current) => ({ ...current, budgetModel: event.target.value }))}>
                  <option>balanced budget with room for core security and reliability controls</option>
                  <option>cost-sensitive design with practical compromises</option>
                  <option>higher assurance budget for resilience and manageability</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Vendor preference</span>
                <select value={guided.vendorPreference} onChange={(event) => setGuided((current) => ({ ...current, vendorPreference: event.target.value }))}>
                  <option>vendor-flexible with preference for practical supportable options</option>
                  <option>prefer mainstream enterprise vendors and documented support paths</option>
                  <option>mixed vendor approach with interoperability in mind</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Implementation timeline</span>
                <select value={guided.implementationTimeline} onChange={(event) => setGuided((current) => ({ ...current, implementationTimeline: event.target.value }))}>
                  <option>normal phased project timeline</option>
                  <option>fast delivery with focused scope and controlled tradeoffs</option>
                  <option>longer staged timeline with validation at each step</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Rollout model</span>
                <select value={guided.rolloutModel} onChange={(event) => setGuided((current) => ({ ...current, rolloutModel: event.target.value }))}>
                  <option>phased rollout with validation before wider deployment</option>
                  <option>pilot site first, then broader rollout</option>
                  <option>single implementation window with strong preparation</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Downtime constraint</span>
                <select value={guided.downtimeConstraint} onChange={(event) => setGuided((current) => ({ ...current, downtimeConstraint: event.target.value }))}>
                  <option>limited downtime should be planned and communicated</option>
                  <option>minimal downtime is required for user-facing systems</option>
                  <option>maintenance windows are available for planned changes</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Team capability</span>
                <select value={guided.teamCapability} onChange={(event) => setGuided((current) => ({ ...current, teamCapability: event.target.value }))}>
                  <option>small to mid-sized internal team with practical support needs</option>
                  <option>strong internal technical team comfortable with richer design controls</option>
                  <option>limited internal staff with need for simpler maintainable design</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Output package</span>
                <select value={guided.outputPackage} onChange={(event) => setGuided((current) => ({ ...current, outputPackage: event.target.value }))}>
                  <option>technical handoff plus stakeholder summary</option>
                  <option>implementation-focused technical package</option>
                  <option>review-oriented planning summary with design rationale</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Primary audience</span>
                <select value={guided.primaryAudience} onChange={(event) => setGuided((current) => ({ ...current, primaryAudience: event.target.value }))}>
                  <option>internal IT team and technical reviewers</option>
                  <option>mixed technical and management audience</option>
                  <option>client-facing or stakeholder review audience</option>
                <option value="Not applicable / none">N/A / none</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
            </div>
          </section>
        );
      case "review":
        return (
          <section className="planner-review-grid">
            <section className="panel planner-step-panel" style={{ display: "grid", gap: 16 }}>
              <div>
                <div className="planner-step-heading"><h2 style={{ margin: 0 }}>Review and create plan</h2><HelpTip title="Review">Use the review step to confirm that the planning snapshot matches the intended environment before the project is created.</HelpTip></div>
                <p className="muted" style={{ margin: 0 }}>Review the structured summary below, then create the project. The form stays editable before the plan is saved.</p>
              </div>

              <div className="summary-grid">
                <div className="summary-card"><div className="muted">Requirements readiness</div><div className="value">{readinessSummary.completionLabel}</div></div>
                <div className="summary-card"><div className="muted">Tracks ready</div><div className="value">{readinessSummary.readyCount}</div></div>
                <div className="summary-card"><div className="muted">Needs review</div><div className="value">{readinessSummary.reviewCount}</div></div>
                <div className="summary-card"><div className="muted">Next review areas</div><div className="value" style={{ fontSize: "1rem" }}>{nextReviewAreas}</div></div>
              </div>

              <div className="grid-2" style={{ alignItems: "start" }}>
                <div className="panel" style={{ display: "grid", gap: 8 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Plan snapshot</h3>
                  <div className="planner-snapshot-list">
                    <div className="planner-snapshot-row"><span>Planning type</span><strong>{guided.planningFor}</strong></div>
                    <div className="planner-snapshot-row"><span>Project stage</span><strong>{guided.projectPhase}</strong></div>
                    <div className="planner-snapshot-row"><span>Environment</span><strong>{guided.environmentType}</strong></div>
                    <div className="planner-snapshot-row"><span>Sites</span><strong>{guided.siteCount}</strong></div>
                    <div className="planner-snapshot-row"><span>Users per site</span><strong>{guided.usersPerSite}</strong></div>
                    <div className="planner-snapshot-row"><span>Primary goal</span><strong>{guided.primaryGoal}</strong></div>
                    <div className="planner-snapshot-row"><span>Output package</span><strong>{guided.outputPackage}</strong></div>
                    {guided.customRequirementsNotes ? <div className="planner-snapshot-row"><span>Custom notes</span><strong>{guided.customRequirementsNotes}</strong></div> : null}
                  </div>
                </div>
                <div className="panel" style={{ display: "grid", gap: 8 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Planning signals</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {planningSignals(guided).map((item) => <span key={item} className="badge-soft">{item}</span>)}
                  </div>
                  <h3 style={{ marginTop: 8, marginBottom: 0 }}>AI planning</h3>
                  <p className="muted" style={{ margin: 0 }}>AI planning now lives in its own workspace so it can stay separate from the guided planner.</p>
                  <div className="form-actions">
                    <Link to="/ai" className="link-button">Open AI workspace</Link>
                  </div>
                </div>
              </div>

              {generationStatus ? <p className="muted" style={{ margin: 0 }}>{generationStatus}</p> : null}

              {aiDraft ? (
                <div className="panel" style={{ padding: 14 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>Applied AI selections</h3>
                  <p className="muted" style={{ marginTop: 0 }}>Phase 19 marker will be saved on AI-created objects: AI_DRAFT / REVIEW_REQUIRED / NOT_AUTHORITATIVE.</p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Project fields: {useOptions.applyProjectFields ? "Yes" : "No"}</li>
                    <li>Auto-create sites: {useOptions.applySites ? "Yes" : "No"}</li>
                    <li>Auto-create VLANs: {useOptions.applyVlans ? "Yes" : "No"}</li>
                  </ul>
                </div>
              ) : null}

              {submitMessage ? <div className="panel" style={{ padding: 12, borderColor: "rgba(40,167,69,0.35)", background: "rgba(40,167,69,0.08)" }}><strong style={{ display: "block", marginBottom: 4 }}>{submitMessage}</strong><span className="muted">Redirecting you back to the dashboard so the new project is easy to find.</span></div> : null}
              {submitError ? <div className="panel" style={{ padding: 12, borderColor: "rgba(220,53,69,0.35)", background: "rgba(220,53,69,0.08)" }}><strong style={{ display: "block", marginBottom: 4 }}>Project creation did not finish</strong><span className="muted">{submitError}</span></div> : null}

              <ProjectForm
                initialValues={initialValues}
                organizations={orgsQuery.data ?? []}
                isSubmitting={mutation.isPending}
                onSubmit={async (values) => {
                  setSubmitMessage(null);
                  setSubmitError(null);

                  try {
                    const project = await mutation.mutateAsync({ ...values, description: (values.description || guidedSummaryDescription).slice(0, 320), requirementsJson: buildRequirementsJsonForCreate(guided, aiDraft, useOptions) });
                    let importWarning = "";

                    if (aiDraft && (useOptions.applySites || useOptions.applyVlans)) {
                      const createdSitesByName = new Map<string, Site>();

                      try {
                        if (useOptions.applySites) {
                          for (const siteDraft of aiDraft.sites) {
                            const site = await createSite({
                              projectId: project.id,
                              name: siteDraft.name,
                              location: siteDraft.location,
                              siteCode: siteDraft.siteCode,
                              defaultAddressBlock: siteDraft.defaultAddressBlock,
                              notes: appendPhase19AiReviewMarker(siteDraft.notes),
                            });
                            createdSitesByName.set(siteDraft.name, site);
                          }
                        }

                        if (useOptions.applyVlans) {
                          for (const vlanDraft of aiDraft.vlans) {
                            const site = createdSitesByName.get(vlanDraft.siteName);
                            if (!site) continue;
                            await createVlan({
                              siteId: site.id,
                              vlanId: vlanDraft.vlanId,
                              vlanName: vlanDraft.vlanName,
                              purpose: vlanDraft.purpose,
                              subnetCidr: vlanDraft.subnetCidr,
                              gatewayIp: vlanDraft.gatewayIp,
                              dhcpEnabled: vlanDraft.dhcpEnabled,
                              estimatedHosts: vlanDraft.estimatedHosts,
                              department: vlanDraft.department,
                              notes: appendPhase19AiReviewMarker(vlanDraft.notes),
                            });
                          }
                        }
                      } catch (error) {
                        importWarning = error instanceof Error ? error.message : "The project was created, but some AI-generated sites or VLANs could not be imported.";
                      }
                    }

                    try {
                      await runValidation(project.id);
                    } catch {}

                    setSubmitMessage(`Project "${project.name}" created successfully.`);
                    const params = new URLSearchParams({ created: "1", projectId: project.id, name: project.name });
                    if (importWarning) params.set("warning", importWarning);
                    navigate(`/dashboard?${params.toString()}`);
                  } catch (error) {
                    setSubmitError(error instanceof Error ? error.message : "SubnetOps could not create the project right now.");
                  }
                }}
              />
            </section>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Start a network plan"
        description="Move through the planning steps in order. Each section captures the context needed before logical design, validation, and handoff begin."
        actions={<Link to="/ai" className="link-button">Use AI to start a plan</Link>}
      />

      <div className="planner-page-grid">
        <PlanSidebar guided={guided} currentStep={currentStep} setCurrentStep={setCurrentStep} />
        <div style={{ display: "grid", gap: 16 }}>
          <section className="panel planner-step-intro">
            <div>
              <span className="badge-soft">Step {currentStep + 1} of {wizardSteps.length}</span>
              <h1 style={{ margin: "10px 0 8px 0", fontSize: "1.75rem" }}>{wizardSteps[currentStep].title}</h1>
              <p className="muted" style={{ margin: 0 }}>{wizardSteps[currentStep].description}</p>
            </div>
          </section>

          {renderStepContent()}

          <WizardFooter
            currentStep={currentStep}
            canProceed={canProceed}
            onBack={() => setCurrentStep((value) => Math.max(0, value - 1))}
            onNext={() => setCurrentStep((value) => Math.min(wizardSteps.length - 1, value + 1))}
          />
        </div>
      </div>
    </section>
  );
}
