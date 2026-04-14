import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";
import { EmptyState } from "../components/app/EmptyState";
import { useProject, useUpdateProject } from "../features/projects/hooks";
import {
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

export function ProjectRequirementsPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const updateMutation = useUpdateProject(projectId);
  const project = projectQuery.data;

  const initialProfile = useMemo(() => parseRequirementsProfile(project?.requirementsJson), [project?.requirementsJson]);
  const [requirements, setRequirements] = useState<RequirementsProfile>({ ...defaultRequirementsProfile });
  const [currentStepKey, setCurrentStepKey] = useState("core");

  useEffect(() => {
    setRequirements(initialProfile);
  }, [initialProfile]);

  const description = useMemo(() => buildGuidedDescription(requirements), [requirements]);
  const scenario = useMemo(() => conditionalSections(requirements), [requirements]);
  const activeTracks = useMemo(() => planningTracks(requirements), [requirements]);
  const trackStatuses = useMemo(() => planningTrackStatuses(requirements), [requirements]);
  const readinessSummary = useMemo(() => planningReadinessSummary(requirements), [requirements]);

  const multiSitePlanning = Number(requirements.siteCount || "0") > 1 || requirements.internetModel !== "internet at each site";
  const wirelessPlanning = requirements.wireless || requirements.guestWifi;
  const voicePlanning = requirements.voice || Number(requirements.phoneCount || "0") > 0;
  const specialtyPlanning = requirements.iot || requirements.cameras || Number(requirements.iotDeviceCount || "0") > 0 || Number(requirements.cameraCount || "0") > 0;
  const performancePlanning = multiSitePlanning || scenario.cloud || voicePlanning || requirements.primaryGoal === "performance and user experience" || requirements.primaryGoal === "availability and redundancy";
  const advancedScenario = scenario.security || scenario.cloud || scenario.wireless || scenario.voice || scenario.resilience;

  const saveRequirements = () => updateMutation.mutate({
    requirementsJson: stringifyRequirementsProfile(requirements),
    environmentType: requirements.environmentType,
    description,
  });

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
                  </select>
                </label>

                <label>
                  <span>Project phase</span>
                  <select value={requirements.projectPhase} onChange={(event) => setRequirements((current) => ({ ...current, projectPhase: event.target.value }))}>
                    <option>New network build</option>
                    <option>Redesign</option>
                    <option>Expansion</option>
                  </select>
                </label>

                <label>
                  <span>Environment type</span>
                  <select value={requirements.environmentType} onChange={(event) => setRequirements((current) => ({ ...current, environmentType: event.target.value }))}>
                    <option>On-prem</option>
                    <option>Hybrid</option>
                    <option>Public cloud connected</option>
                    <option>Private cloud connected</option>
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
                  </select>
                </label>

                <label>
                  <span>Server / service placement</span>
                  <select value={requirements.serverPlacement} onChange={(event) => setRequirements((current) => ({ ...current, serverPlacement: event.target.value }))}>
                    <option>centralized servers or services</option>
                    <option>mixed local and centralized services</option>
                    <option>mostly cloud-hosted services</option>
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
                  </select>
                </label>
              ) : null}

              <label>
                <span>Security posture</span>
                <select value={requirements.securityPosture} onChange={(event) => setRequirements((current) => ({ ...current, securityPosture: event.target.value }))}>
                  <option>segmented by function and trust level</option>
                  <option>high isolation for sensitive and administrative systems</option>
                  <option>balanced segmentation with simpler operations</option>
                </select>
              </label>

              <label>
                <span>Trust boundary model</span>
                <select value={requirements.trustBoundaryModel} onChange={(event) => setRequirements((current) => ({ ...current, trustBoundaryModel: event.target.value }))}>
                  <option>internal users, guests, management, and services separated</option>
                  <option>staff, infrastructure, and external access clearly separated</option>
                  <option>minimal zones with focused administrative separation</option>
                </select>
              </label>

              <label>
                <span>Privileged admin boundary</span>
                <select value={requirements.adminBoundary} onChange={(event) => setRequirements((current) => ({ ...current, adminBoundary: event.target.value }))}>
                  <option>privileged administration isolated from user access</option>
                  <option>dedicated admin jump path for management actions</option>
                  <option>small-team admin access with strict management VLAN boundaries</option>
                </select>
              </label>

              <label>
                <span>Identity model</span>
                <select value={requirements.identityModel} onChange={(event) => setRequirements((current) => ({ ...current, identityModel: event.target.value }))}>
                  <option>central identity for staff and administrators</option>
                  <option>central identity plus stronger admin controls</option>
                  <option>separate privileged identity path for administration</option>
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
                </select>
              </label>
              <label>
                <span>Cloud connectivity pattern</span>
                <select value={requirements.cloudConnectivity} onChange={(event) => setRequirements((current) => ({ ...current, cloudConnectivity: event.target.value }))}>
                  <option>site-to-cloud VPN</option>
                  <option>private connectivity / direct circuit</option>
                  <option>SD-WAN integrated cloud edge</option>
                  <option>internet-only access to cloud services</option>
                </select>
              </label>
              <label>
                <span>Cloud identity boundary</span>
                <select value={requirements.cloudIdentityBoundary} onChange={(event) => setRequirements((current) => ({ ...current, cloudIdentityBoundary: event.target.value }))}>
                  <option>shared identity between on-prem and cloud</option>
                  <option>cloud-integrated identity with restricted admin roles</option>
                  <option>separate cloud administration boundary</option>
                </select>
              </label>
              <label>
                <span>Cloud traffic boundary</span>
                <select value={requirements.cloudTrafficBoundary} onChange={(event) => setRequirements((current) => ({ ...current, cloudTrafficBoundary: event.target.value }))}>
                  <option>private application traffic separated from public internet access</option>
                  <option>internet-facing services separated from internal workloads</option>
                  <option>hybrid application traffic isolated through dedicated connectivity</option>
                </select>
              </label>
              <label>
                <span>Cloud hosting model</span>
                <select value={requirements.cloudHostingModel} onChange={(event) => setRequirements((current) => ({ ...current, cloudHostingModel: event.target.value }))}>
                  <option>selected services extended into cloud while core users remain on-prem</option>
                  <option>hybrid application split between on-prem and cloud workloads</option>
                  <option>mostly cloud-hosted services with retained on-prem edge and identity</option>
                </select>
              </label>
              <label>
                <span>Cloud network model</span>
                <select value={requirements.cloudNetworkModel} onChange={(event) => setRequirements((current) => ({ ...current, cloudNetworkModel: event.target.value }))}>
                  <option>provider VNet/VPC with private application address space</option>
                  <option>shared services network plus segmented application subnets</option>
                  <option>hub-and-spoke cloud network with controlled spoke access</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Cloud routing model</span>
                <select value={requirements.cloudRoutingModel} onChange={(event) => setRequirements((current) => ({ ...current, cloudRoutingModel: event.target.value }))}>
                  <option>summarized site routes and controlled cloud prefixes</option>
                  <option>private connectivity with selected route advertisement only</option>
                  <option>segmented hybrid routing with explicit trust boundaries</option>
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
                </select>
              </label>

              <label>
                <span>Site block strategy</span>
                <select value={requirements.siteBlockStrategy} onChange={(event) => setRequirements((current) => ({ ...current, siteBlockStrategy: event.target.value }))}>
                  <option>reserve consistent site blocks for clean summarization</option>
                  <option>allocate right-sized site blocks with reserved expansion space</option>
                  <option>use larger core sites and smaller branch blocks</option>
                </select>
              </label>

              <label>
                <span>Gateway convention</span>
                <select value={requirements.gatewayConvention} onChange={(event) => setRequirements((current) => ({ ...current, gatewayConvention: event.target.value }))}>
                  <option>first usable address as default gateway</option>
                  <option>standardized .1 gateway model where possible</option>
                  <option>infrastructure-reserved low addresses with documented gateway slots</option>
                </select>
              </label>

              <label>
                <span>Growth buffer model</span>
                <select value={requirements.growthBufferModel} onChange={(event) => setRequirements((current) => ({ ...current, growthBufferModel: event.target.value }))}>
                  <option>leave headroom for expansion in each site and segment</option>
                  <option>conservative allocation with explicit future subnet space</option>
                  <option>balanced allocation based on current needs plus moderate growth</option>
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Reserved range policy</span>
                <select value={requirements.reservedRangePolicy} onChange={(event) => setRequirements((current) => ({ ...current, reservedRangePolicy: event.target.value }))}>
                  <option>reserve infrastructure and management ranges inside each site block</option>
                  <option>keep gateway, infra, and dynamic ranges explicitly separated</option>
                  <option>compact reserved ranges with documented exceptions</option>
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
                </select>
              </label>

              <label>
                <span>Naming standard</span>
                <select value={requirements.namingStandard} onChange={(event) => setRequirements((current) => ({ ...current, namingStandard: event.target.value }))}>
                  <option>site-role-device naming with consistent short codes</option>
                  <option>site-floor-role numbering with structured device labels</option>
                  <option>compact naming for smaller environments with role prefixes</option>
                </select>
              </label>

              <label>
                <span>Monitoring model</span>
                <select value={requirements.monitoringModel} onChange={(event) => setRequirements((current) => ({ ...current, monitoringModel: event.target.value }))}>
                  <option>central monitoring with device health, interfaces, and alerts</option>
                  <option>lightweight monitoring focused on uptime and critical events</option>
                  <option>monitoring plus performance trending for core services and WAN</option>
                </select>
              </label>

              <label>
                <span>Logging model</span>
                <select value={requirements.loggingModel} onChange={(event) => setRequirements((current) => ({ ...current, loggingModel: event.target.value }))}>
                  <option>central syslog and event retention for infrastructure devices</option>
                  <option>critical-event logging with retained admin actions</option>
                  <option>security-focused logging for edge, access, and remote access events</option>
                </select>
              </label>

              <label>
                <span>Backup policy</span>
                <select value={requirements.backupPolicy} onChange={(event) => setRequirements((current) => ({ ...current, backupPolicy: event.target.value }))}>
                  <option>scheduled configuration backups for key network devices</option>
                  <option>central backup workflow for infrastructure configurations</option>
                  <option>manual approval plus periodic backup snapshots</option>
                </select>
              </label>

              <label>
                <span>Operations ownership</span>
                <select value={requirements.operationsOwnerModel} onChange={(event) => setRequirements((current) => ({ ...current, operationsOwnerModel: event.target.value }))}>
                  <option>internal IT ownership with documented admin responsibilities</option>
                  <option>shared internal and managed-service ownership model</option>
                  <option>small-team ownership with simplified operational controls</option>
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
                </select>
              </label>

              <label>
                <span>Physical scope notes</span>
                <select value={requirements.physicalScope} onChange={(event) => setRequirements((current) => ({ ...current, physicalScope: event.target.value }))}>
                  <option>basic site layout without detailed closet mapping yet</option>
                  <option>needs future MDF / IDF or closet-aware planning</option>
                  <option>distributed physical layout with multiple access areas</option>
                </select>
              </label>

              <label>
                <span>Site role</span>
                <select value={requirements.siteRoleModel} onChange={(event) => setRequirements((current) => ({ ...current, siteRoleModel: event.target.value }))}>
                  <option>primary office or main site</option>
                  <option>branch or satellite site</option>
                  <option>specialty site with focused local services</option>
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
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Edge footprint</span>
                <select value={requirements.edgeFootprint} onChange={(event) => setRequirements((current) => ({ ...current, edgeFootprint: event.target.value }))}>
                  <option>compact access edge with limited local infrastructure</option>
                  <option>moderate access edge with local switching and AP density</option>
                  <option>larger edge footprint requiring distributed access planning</option>
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
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Critical services model</span>
                <select value={requirements.criticalServicesModel} onChange={(event) => setRequirements((current) => ({ ...current, criticalServicesModel: event.target.value }))}>
                  <option>directory, DHCP/DNS, file access, and internet edge are important services</option>
                  <option>cloud identity, shared apps, and WAN edge are critical service dependencies</option>
                  <option>mixed local and centralized services require controlled failover behavior</option>
                </select>
              </label>

              {multiSitePlanning ? (
                <label>
                  <span>Inter-site traffic model</span>
                  <select value={requirements.interSiteTrafficModel} onChange={(event) => setRequirements((current) => ({ ...current, interSiteTrafficModel: event.target.value }))}>
                    <option>moderate inter-site traffic for shared services and administration</option>
                    <option>light inter-site traffic with mostly local internet use</option>
                    <option>heavy inter-site traffic due to centralized services and shared apps</option>
                  </select>
                </label>
              ) : null}

              <label>
                <span>Bandwidth profile</span>
                <select value={requirements.bandwidthProfile} onChange={(event) => setRequirements((current) => ({ ...current, bandwidthProfile: event.target.value }))}>
                  <option>balanced branch and user bandwidth with normal business traffic</option>
                  <option>higher WAN and internet demand due to cloud and collaboration</option>
                  <option>lighter steady-state usage with some peak traffic windows</option>
                </select>
              </label>

              {(voicePlanning || requirements.primaryGoal === "performance and user experience") ? (
                <label>
                  <span>Latency sensitivity</span>
                  <select value={requirements.latencySensitivity} onChange={(event) => setRequirements((current) => ({ ...current, latencySensitivity: event.target.value }))}>
                    <option>voice and interactive apps should remain responsive</option>
                    <option>some business apps are latency-sensitive across sites</option>
                    <option>latency is moderate but reliability matters more than speed</option>
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
                  </select>
                </label>
              ) : null}

              <label>
                <span>Outage tolerance</span>
                <select value={requirements.outageTolerance} onChange={(event) => setRequirements((current) => ({ ...current, outageTolerance: event.target.value }))}>
                  <option>short outages acceptable but critical services should recover quickly</option>
                  <option>low outage tolerance for WAN and core business services</option>
                  <option>moderate outage tolerance with planned recovery expectations</option>
                </select>
              </label>

              <label>
                <span>Growth horizon</span>
                <select value={requirements.growthHorizon} onChange={(event) => setRequirements((current) => ({ ...current, growthHorizon: event.target.value }))}>
                  <option>plan for 1 to 3 years of moderate growth</option>
                  <option>plan for near-term growth with later redesign flexibility</option>
                  <option>plan for aggressive growth and heavier service demand</option>
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
                </select>
              </label>

              <label>
                <span>Vendor preference</span>
                <select value={requirements.vendorPreference} onChange={(event) => setRequirements((current) => ({ ...current, vendorPreference: event.target.value }))}>
                  <option>vendor-flexible with preference for practical supportable options</option>
                  <option>prefer mainstream enterprise vendors and documented support paths</option>
                  <option>mixed vendor approach with interoperability in mind</option>
                </select>
              </label>

              <label>
                <span>Implementation timeline</span>
                <select value={requirements.implementationTimeline} onChange={(event) => setRequirements((current) => ({ ...current, implementationTimeline: event.target.value }))}>
                  <option>normal phased project timeline</option>
                  <option>fast delivery with focused scope and controlled tradeoffs</option>
                  <option>longer staged timeline with validation at each step</option>
                </select>
              </label>

              <label>
                <span>Rollout model</span>
                <select value={requirements.rolloutModel} onChange={(event) => setRequirements((current) => ({ ...current, rolloutModel: event.target.value }))}>
                  <option>phased rollout with validation before wider deployment</option>
                  <option>pilot site first, then broader rollout</option>
                  <option>single implementation window with strong preparation</option>
                </select>
              </label>

              <label>
                <span>Downtime constraint</span>
                <select value={requirements.downtimeConstraint} onChange={(event) => setRequirements((current) => ({ ...current, downtimeConstraint: event.target.value }))}>
                  <option>limited downtime should be planned and communicated</option>
                  <option>minimal downtime is required for user-facing systems</option>
                  <option>maintenance windows are available for planned changes</option>
                </select>
              </label>

              <label>
                <span>Team capability</span>
                <select value={requirements.teamCapability} onChange={(event) => setRequirements((current) => ({ ...current, teamCapability: event.target.value }))}>
                  <option>small to mid-sized internal team with practical support needs</option>
                  <option>strong internal technical team comfortable with richer design controls</option>
                  <option>limited internal staff with need for simpler maintainable design</option>
                </select>
              </label>

              <label>
                <span>Output package</span>
                <select value={requirements.outputPackage} onChange={(event) => setRequirements((current) => ({ ...current, outputPackage: event.target.value }))}>
                  <option>technical handoff plus stakeholder summary</option>
                  <option>implementation-focused technical package</option>
                  <option>review-oriented planning summary with design rationale</option>
                </select>
              </label>

              <label>
                <span>Primary audience</span>
                <select value={requirements.primaryAudience} onChange={(event) => setRequirements((current) => ({ ...current, primaryAudience: event.target.value }))}>
                  <option>internal IT team and technical reviewers</option>
                  <option>mixed technical and management audience</option>
                  <option>client-facing or stakeholder review audience</option>
                </select>
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
    description,
    multiSitePlanning,
    performancePlanning,
    readinessSummary.completionLabel,
    readinessSummary.inactiveCount,
    readinessSummary.nextReviewLabels,
    readinessSummary.readyCount,
    readinessSummary.reviewCount,
    requirements,
    scenario.cloud,
    scenario.resilience,
    scenario.security,
    scenario.voice,
    scenario.wireless,
    specialtyPlanning,
    trackStatuses,
    voicePlanning,
    wirelessPlanning,
  ]);

  useEffect(() => {
    if (!stepDefinitions.some((step) => step.key === currentStepKey)) {
      setCurrentStepKey(stepDefinitions[0]?.key ?? "core");
    }
  }, [currentStepKey, stepDefinitions]);

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

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Requirements"
        description="Capture the use case, environment, security direction, and operational context before detailed logical design work begins. This v72 workspace now changes its visible steps based on the scenario you define."
        actions={
          <>
            <button type="button" onClick={saveRequirements} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Requirements"}
            </button>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Open Logical Design</Link>
          </>
        }
      />

      <div className="planner-page-grid">
        <aside className="planner-sidebar">
          <div className="panel" style={{ display: "grid", gap: 12 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Planner flow</h3>
              <p className="muted" style={{ margin: 0 }}>
                Earlier choices now decide which steps appear. Hidden steps are treated as out of scope for the current scenario.
              </p>
            </div>
            <div className="planner-step-list">
              {stepDefinitions.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  className={`planner-step-link ${step.key === currentStepKey ? "current" : index < currentStepIndex ? "complete" : ""}`.trim()}
                  onClick={() => setCurrentStepKey(step.key)}
                >
                  <span className="planner-step-number">{index + 1}</span>
                  <span>
                    <strong>{step.title}</strong>
                    <small>{step.summary}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel planner-track-summary">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Scenario snapshot</h3>
              <p className="muted" style={{ margin: 0 }}>These tracks are active right now.</p>
            </div>
            {activeTracks.map((track) => (
              <div key={track} className="planner-track-row">
                <strong>{track}</strong>
                <span className="badge-soft">Active</span>
              </div>
            ))}
          </div>

          <div className="panel planner-snapshot-list">
            <div className="planner-snapshot-row"><span>Readiness</span><strong>{readinessSummary.completionLabel}</strong></div>
            <div className="planner-snapshot-row"><span>Visible steps</span><strong>{stepDefinitions.length}</strong></div>
            <div className="planner-snapshot-row"><span>Review tracks</span><strong>{readinessSummary.reviewCount}</strong></div>
          </div>
        </aside>

        <div style={{ display: "grid", gap: 16 }}>
          <div className="panel planner-step-panel" style={{ display: "grid", gap: 12 }}>
            <div className="planner-step-heading">
              <div>
                <h2 style={{ margin: 0 }}>{currentStep.title}</h2>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>{currentStep.summary}</p>
              </div>
              <span className="badge-soft">Step {currentStepIndex + 1} of {stepDefinitions.length}</span>
            </div>
            {currentStep.panel}
          </div>

          <div className="panel planner-footer-actions">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {previousStep ? (
                <button type="button" onClick={() => setCurrentStepKey(previousStep.key)}>Back: {previousStep.title}</button>
              ) : (
                <span className="muted">You are at the first visible step.</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button type="button" onClick={saveRequirements} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
              {nextStep ? (
                <button type="button" onClick={() => setCurrentStepKey(nextStep.key)}>Next: {nextStep.title}</button>
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
