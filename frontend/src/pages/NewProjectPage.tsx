import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectForm } from "../features/projects/components/ProjectForm";
import { useOrganizations } from "../features/organizations/hooks";
import { useCreateProject } from "../features/projects/hooks";
import { AIPlanningPanel, type AIUseDraftOptions } from "../features/ai/components/AIPlanningPanel";
import type { AIPlanDraft, Site } from "../lib/types";
import { createSite } from "../features/sites/api";
import { createVlan } from "../features/vlans/api";
import { SectionHeader } from "../components/app/SectionHeader";
import {
  buildGuidedDescription,
  buildGuidedPrompt,
  conditionalSections,
  defaultRequirementsProfile,
  planningSignals,
  planningTracks,
  planningTrackStatuses,
  planningReadinessSummary,
  stringifyRequirementsProfile,
  type RequirementsProfile,
} from "../lib/requirementsProfile";

const defaultUseOptions: AIUseDraftOptions = {
  applyProjectFields: true,
  applySites: true,
  applyVlans: true,
};

function selectedSummary(options: AIUseDraftOptions) {
  const parts: string[] = [];
  if (options.applyProjectFields) parts.push("project fields");
  if (options.applySites) parts.push("sites");
  if (options.applyVlans) parts.push("VLANs");
  return parts.length > 0 ? parts.join(", ") : "nothing selected";
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const mutation = useCreateProject();
  const orgsQuery = useOrganizations();
  const [aiDraft, setAiDraft] = useState<AIPlanDraft | null>(null);
  const [useOptions, setUseOptions] = useState<AIUseDraftOptions>(defaultUseOptions);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [seedPrompt, setSeedPrompt] = useState("");
  const [guided, setGuided] = useState<RequirementsProfile>({ ...defaultRequirementsProfile });

  const guidedDescription = useMemo(() => buildGuidedDescription(guided), [guided]);
  const scenario = useMemo(() => conditionalSections(guided), [guided]);
  const activeTracks = useMemo(() => planningTracks(guided), [guided]);
  const trackStatuses = useMemo(() => planningTrackStatuses(guided), [guided]);
  const readinessSummary = useMemo(() => planningReadinessSummary(guided), [guided]);
  const multiSitePlanning = Number(guided.siteCount || "0") > 1 || guided.internetModel !== "internet at each site";
  const wirelessPlanning = guided.wireless || guided.guestWifi;
  const voicePlanning = guided.voice || Number(guided.phoneCount || "0") > 0;

  const initialValues = useMemo(() => {
    if (!aiDraft || !useOptions.applyProjectFields) {
      return {
        name: guided.planningFor === "Custom" ? "" : `${guided.planningFor} Network Plan`,
        description: guidedDescription,
        environmentType: guided.environmentType,
      };
    }
    return {
      name: aiDraft.project.name,
      description: aiDraft.project.description,
      organizationName: aiDraft.project.organizationName,
      environmentType: aiDraft.project.environmentType,
      basePrivateRange: aiDraft.project.basePrivateRange,
    };
  }, [aiDraft, useOptions.applyProjectFields, guided.planningFor, guided.environmentType, guidedDescription]);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Start a network plan"
        description="Begin with realistic planning context first, then use AI and forms to turn that into a stronger first draft."
      />

      <section className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0" }}>Requirements-driven start</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is the first step toward the full requirements workspace. Capture the use case, environment, security direction, and operational context before you start drawing VLANs and subnets.
          </p>
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
            </select>
          </label>

          <label>
            <span>Project phase</span>
            <select value={guided.projectPhase} onChange={(event) => setGuided((current) => ({ ...current, projectPhase: event.target.value }))}>
              <option>Greenfield</option>
              <option>Redesign</option>
              <option>Expansion</option>
            </select>
          </label>

          <label>
            <span>What kind of environment are you planning?</span>
            <select value={guided.environmentType} onChange={(event) => setGuided((current) => ({ ...current, environmentType: event.target.value }))}>
              <option>On-prem</option>
              <option>Hybrid</option>
              <option>Public cloud connected</option>
              <option>Private cloud connected</option>
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
            </select>
          </label>

          <label>
            <span>Server / service placement</span>
            <select value={guided.serverPlacement} onChange={(event) => setGuided((current) => ({ ...current, serverPlacement: event.target.value }))}>
              <option>centralized servers or services</option>
              <option>mixed local and centralized services</option>
              <option>mostly cloud-hosted services</option>
            </select>
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            <span>Primary design goal</span>
            <select value={guided.primaryGoal} onChange={(event) => setGuided((current) => ({ ...current, primaryGoal: event.target.value }))}>
              <option>security and segmentation</option>
              <option>simplicity and manageability</option>
              <option>performance and user experience</option>
              <option>availability and redundancy</option>
              <option>hybrid connectivity and flexibility</option>
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

        {(scenario.security || scenario.wireless || scenario.voice || scenario.cloud || scenario.resilience) ? (
          <section className="panel" style={{ display: "grid", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>Scenario-based planning fields</h3>
              <p className="muted" style={{ margin: 0 }}>Additional fields appear here because the current selections imply more detailed planning choices.</p>
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
                      </select>
                    </label>
                  ) : null}

                  <label>
                    <span>Security posture</span>
                    <select value={guided.securityPosture} onChange={(event) => setGuided((current) => ({ ...current, securityPosture: event.target.value }))}>
                      <option>segmented by function and trust level</option>
                      <option>high isolation for sensitive and administrative systems</option>
                      <option>balanced segmentation with simpler operations</option>
                    </select>
                  </label>

                  <label>
                    <span>Trust boundary model</span>
                    <select value={guided.trustBoundaryModel} onChange={(event) => setGuided((current) => ({ ...current, trustBoundaryModel: event.target.value }))}>
                      <option>internal users, guests, management, and services separated</option>
                      <option>staff, infrastructure, and external access clearly separated</option>
                      <option>minimal zones with focused administrative separation</option>
                    </select>
                  </label>

                  <label>
                    <span>Privileged admin boundary</span>
                    <select value={guided.adminBoundary} onChange={(event) => setGuided((current) => ({ ...current, adminBoundary: event.target.value }))}>
                      <option>privileged administration isolated from user access</option>
                      <option>dedicated admin jump path for management actions</option>
                      <option>small-team admin access with strict management VLAN boundaries</option>
                    </select>
                  </label>

                  <label>
                    <span>Identity model</span>
                    <select value={guided.identityModel} onChange={(event) => setGuided((current) => ({ ...current, identityModel: event.target.value }))}>
                      <option>central identity for staff and administrators</option>
                      <option>central identity plus stronger admin controls</option>
                      <option>separate privileged identity path for administration</option>
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
                    </select>
                  </label>
                  <label>
                    <span>Cloud connectivity pattern</span>
                    <select value={guided.cloudConnectivity} onChange={(event) => setGuided((current) => ({ ...current, cloudConnectivity: event.target.value }))}>
                      <option>site-to-cloud VPN</option>
                      <option>private connectivity / direct circuit</option>
                      <option>SD-WAN integrated cloud edge</option>
                      <option>internet-only access to cloud services</option>
                    </select>
                  </label>
                  <label>
                    <span>Cloud identity boundary</span>
                    <select value={guided.cloudIdentityBoundary} onChange={(event) => setGuided((current) => ({ ...current, cloudIdentityBoundary: event.target.value }))}>
                      <option>shared identity between on-prem and cloud</option>
                      <option>cloud-integrated identity with restricted admin roles</option>
                      <option>separate cloud administration boundary</option>
                    </select>
                  </label>
                  <label>
                    <span>Cloud traffic boundary</span>
                    <select value={guided.cloudTrafficBoundary} onChange={(event) => setGuided((current) => ({ ...current, cloudTrafficBoundary: event.target.value }))}>
                      <option>private application traffic separated from public internet access</option>
                      <option>internet-facing services separated from internal workloads</option>
                      <option>hybrid application traffic isolated through dedicated connectivity</option>
                    </select>
                  </label>
                  <label>
                    <span>Cloud hosting model</span>
                    <select value={guided.cloudHostingModel} onChange={(event) => setGuided((current) => ({ ...current, cloudHostingModel: event.target.value }))}>
                      <option>selected services extended into cloud while core users remain on-prem</option>
                      <option>hybrid application split between on-prem and cloud workloads</option>
                      <option>mostly cloud-hosted services with retained on-prem edge and identity</option>
                    </select>
                  </label>
                  <label>
                    <span>Cloud network model</span>
                    <select value={guided.cloudNetworkModel} onChange={(event) => setGuided((current) => ({ ...current, cloudNetworkModel: event.target.value }))}>
                      <option>provider VNet/VPC with private application address space</option>
                      <option>shared services network plus segmented application subnets</option>
                      <option>hub-and-spoke cloud network with controlled spoke access</option>
                    </select>
                  </label>
                  <label>
                    <span>Cloud routing model</span>
                    <select value={guided.cloudRoutingModel} onChange={(event) => setGuided((current) => ({ ...current, cloudRoutingModel: event.target.value }))}>
                      <option>summarized site routes and controlled cloud prefixes</option>
                      <option>private connectivity with selected route advertisement only</option>
                      <option>segmented hybrid routing with explicit trust boundaries</option>
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
                  </select>
                </label>
              ) : null}
            </div>
          </section>
        ) : null}

        
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ margin: "0 0 8px 0" }}>Addressing and subnetting strategy</h3>
            <p className="muted" style={{ margin: 0 }}>
              Set the higher-level addressing policy here so the design can evolve around organization blocks, site blocks, gateway conventions, and future growth instead of only one subnet at a time.
            </p>
          </div>

          <div className="guided-grid">
            <label>
              <span>Address hierarchy model</span>
              <select value={guided.addressHierarchyModel} onChange={(event) => setGuided((current) => ({ ...current, addressHierarchyModel: event.target.value }))}>
                <option>organization block to site block to segment subnet hierarchy</option>
                <option>site-first hierarchy with summarized regional blocks</option>
                <option>compact single-site hierarchy with reserved future blocks</option>
              </select>
            </label>

            <label>
              <span>Site block strategy</span>
              <select value={guided.siteBlockStrategy} onChange={(event) => setGuided((current) => ({ ...current, siteBlockStrategy: event.target.value }))}>
                <option>reserve consistent site blocks for clean summarization</option>
                <option>allocate right-sized site blocks with reserved expansion space</option>
                <option>use larger core sites and smaller branch blocks</option>
              </select>
            </label>

            <label>
              <span>Gateway convention</span>
              <select value={guided.gatewayConvention} onChange={(event) => setGuided((current) => ({ ...current, gatewayConvention: event.target.value }))}>
                <option>first usable address as default gateway</option>
                <option>standardized .1 gateway model where possible</option>
                <option>infrastructure-reserved low addresses with documented gateway slots</option>
              </select>
            </label>

            <label>
              <span>Growth buffer model</span>
              <select value={guided.growthBufferModel} onChange={(event) => setGuided((current) => ({ ...current, growthBufferModel: event.target.value }))}>
                <option>leave headroom for expansion in each site and segment</option>
                <option>conservative allocation with explicit future subnet space</option>
                <option>balanced allocation based on current needs plus moderate growth</option>
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span>Reserved range policy</span>
              <select value={guided.reservedRangePolicy} onChange={(event) => setGuided((current) => ({ ...current, reservedRangePolicy: event.target.value }))}>
                <option>reserve infrastructure and management ranges inside each site block</option>
                <option>reserve low-address space for gateways, switches, firewalls, and services</option>
                <option>reserve dedicated address ranges for management, edge, and future growth</option>
              </select>
            </label>
          </div>
        </section>

      
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ margin: "0 0 8px 0" }}>Operations and manageability</h3>
            <p className="muted" style={{ margin: 0 }}>
              Capture how the network will be named, monitored, logged, backed up, and managed so the design reflects real operational ownership instead of stopping at topology.
            </p>
          </div>

          <div className="guided-grid">
            <label>
              <span>Management IP policy</span>
              <select value={guided.managementIpPolicy} onChange={(event) => setGuided((current) => ({ ...current, managementIpPolicy: event.target.value }))}>
                <option>dedicated management IP space per site and device role</option>
                <option>centralized management ranges with site-based allocation</option>
                <option>small environment with tightly reserved admin addressing</option>
              </select>
            </label>

            <label>
              <span>Naming standard</span>
              <select value={guided.namingStandard} onChange={(event) => setGuided((current) => ({ ...current, namingStandard: event.target.value }))}>
                <option>site-role-device naming with consistent short codes</option>
                <option>site-floor-role numbering with structured device labels</option>
                <option>compact naming for smaller environments with role prefixes</option>
              </select>
            </label>

            <label>
              <span>Monitoring model</span>
              <select value={guided.monitoringModel} onChange={(event) => setGuided((current) => ({ ...current, monitoringModel: event.target.value }))}>
                <option>central monitoring with device health, interfaces, and alerts</option>
                <option>lightweight monitoring focused on uptime and critical events</option>
                <option>monitoring plus performance trending for core services and WAN</option>
              </select>
            </label>

            <label>
              <span>Logging model</span>
              <select value={guided.loggingModel} onChange={(event) => setGuided((current) => ({ ...current, loggingModel: event.target.value }))}>
                <option>central syslog and event retention for infrastructure devices</option>
                <option>critical-event logging with retained admin actions</option>
                <option>security-focused logging for edge, access, and remote access events</option>
              </select>
            </label>

            <label>
              <span>Backup policy</span>
              <select value={guided.backupPolicy} onChange={(event) => setGuided((current) => ({ ...current, backupPolicy: event.target.value }))}>
                <option>scheduled configuration backups for key network devices</option>
                <option>central backup workflow for infrastructure configurations</option>
                <option>manual approval plus periodic backup snapshots</option>
              </select>
            </label>

            <label>
              <span>Operations ownership</span>
              <select value={guided.operationsOwnerModel} onChange={(event) => setGuided((current) => ({ ...current, operationsOwnerModel: event.target.value }))}>
                <option>internal IT ownership with documented admin responsibilities</option>
                <option>shared internal and managed-service ownership model</option>
                <option>small-team ownership with simplified operational controls</option>
              </select>
            </label>
          </div>
        </section>

      
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ margin: "0 0 8px 0" }}>Physical layout and endpoint profile</h3>
            <p className="muted" style={{ margin: 0 }}>
              Capture the shape of each site and the rough device counts so the plan feels tied to real space, real ports, real wireless coverage, and real endpoint demand.
            </p>
          </div>

          <div className="guided-grid">
            <label>
              <span>Site layout model</span>
              <select value={guided.siteLayoutModel} onChange={(event) => setGuided((current) => ({ ...current, siteLayoutModel: event.target.value }))}>
                <option>single building or floor per site with a simple edge layout</option>
                <option>multi-floor site with access closets and distributed edge</option>
                <option>branch-style site with compact infrastructure and limited edge space</option>
              </select>
            </label>

            <label>
              <span>Physical scope notes</span>
              <select value={guided.physicalScope} onChange={(event) => setGuided((current) => ({ ...current, physicalScope: event.target.value }))}>
                <option>basic site layout without detailed closet mapping yet</option>
                <option>needs future MDF / IDF or closet-aware planning</option>
                <option>distributed physical layout with multiple access areas</option>
              </select>
            </label>

            <label>
              <span>Site role</span>
              <select value={guided.siteRoleModel} onChange={(event) => setGuided((current) => ({ ...current, siteRoleModel: event.target.value }))}>
                <option>primary office or main site</option>
                <option>branch or satellite site</option>
                <option>specialty site with focused local services</option>
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
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span>Edge footprint</span>
              <select value={guided.edgeFootprint} onChange={(event) => setGuided((current) => ({ ...current, edgeFootprint: event.target.value }))}>
                <option>compact access edge with limited local infrastructure</option>
                <option>moderate access edge with local switching and AP density</option>
                <option>larger edge footprint requiring distributed access planning</option>
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
              </select>
            </label>
            ) : null}
          </div>
        </section>

      
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ margin: "0 0 8px 0" }}>Applications, WAN, and performance</h3>
            <p className="muted" style={{ margin: 0 }}>
              Capture the traffic profile and business sensitivity of the network so the design reflects shared services, WAN behavior, bandwidth expectations, and responsiveness requirements.
            </p>
          </div>

          <div className="guided-grid">
            <label style={{ gridColumn: "1 / -1" }}>
              <span>Application profile</span>
              <select value={guided.applicationProfile} onChange={(event) => setGuided((current) => ({ ...current, applicationProfile: event.target.value }))}>
                <option>general business apps, collaboration, file access, and internet browsing</option>
                <option>voice, collaboration, cloud apps, and shared file services</option>
                <option>mixed office plus specialty systems and internal services</option>
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span>Critical services model</span>
              <select value={guided.criticalServicesModel} onChange={(event) => setGuided((current) => ({ ...current, criticalServicesModel: event.target.value }))}>
                <option>directory, DHCP/DNS, file access, and internet edge are important services</option>
                <option>cloud identity, shared apps, and WAN edge are critical service dependencies</option>
                <option>mixed local and centralized services require controlled failover behavior</option>
              </select>
            </label>

            {multiSitePlanning ? (
            <label>
              <span>Inter-site traffic model</span>
              <select value={guided.interSiteTrafficModel} onChange={(event) => setGuided((current) => ({ ...current, interSiteTrafficModel: event.target.value }))}>
                <option>moderate inter-site traffic for shared services and administration</option>
                <option>light inter-site traffic with mostly local internet use</option>
                <option>heavy inter-site traffic due to centralized services and shared apps</option>
              </select>
            </label>
            ) : null}

            <label>
              <span>Bandwidth profile</span>
              <select value={guided.bandwidthProfile} onChange={(event) => setGuided((current) => ({ ...current, bandwidthProfile: event.target.value }))}>
                <option>balanced branch and user bandwidth with normal business traffic</option>
                <option>higher WAN and internet demand due to cloud and collaboration</option>
                <option>lighter steady-state usage with some peak traffic windows</option>
              </select>
            </label>

            {voicePlanning || guided.primaryGoal === "performance and user experience" ? (
            <label>
              <span>Latency sensitivity</span>
              <select value={guided.latencySensitivity} onChange={(event) => setGuided((current) => ({ ...current, latencySensitivity: event.target.value }))}>
                <option>voice and interactive apps should remain responsive</option>
                <option>some business apps are latency-sensitive across sites</option>
                <option>latency is moderate but reliability matters more than speed</option>
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
              </select>
            </label>
            ) : null}

            <label>
              <span>Outage tolerance</span>
              <select value={guided.outageTolerance} onChange={(event) => setGuided((current) => ({ ...current, outageTolerance: event.target.value }))}>
                <option>short outages acceptable but critical services should recover quickly</option>
                <option>low outage tolerance for WAN and core business services</option>
                <option>moderate outage tolerance with planned recovery expectations</option>
              </select>
            </label>

            <label>
              <span>Growth horizon</span>
              <select value={guided.growthHorizon} onChange={(event) => setGuided((current) => ({ ...current, growthHorizon: event.target.value }))}>
                <option>plan for 1 to 3 years of moderate growth</option>
                <option>plan for near-term growth with later redesign flexibility</option>
                <option>plan for aggressive growth and heavier service demand</option>
              </select>
            </label>
          </div>
        </section>

      
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ margin: "0 0 8px 0" }}>Implementation constraints and outputs</h3>
            <p className="muted" style={{ margin: 0 }}>
              Capture delivery realities and handoff expectations so the design fits budget, rollout constraints, team capability, and the kind of package the user actually needs.
            </p>
          </div>

          <div className="guided-grid">
            <label style={{ gridColumn: "1 / -1" }}>
              <span>Budget model</span>
              <select value={guided.budgetModel} onChange={(event) => setGuided((current) => ({ ...current, budgetModel: event.target.value }))}>
                <option>balanced budget with room for core security and reliability controls</option>
                <option>cost-sensitive design with practical compromises</option>
                <option>higher assurance budget for resilience and manageability</option>
              </select>
            </label>

            <label>
              <span>Vendor preference</span>
              <select value={guided.vendorPreference} onChange={(event) => setGuided((current) => ({ ...current, vendorPreference: event.target.value }))}>
                <option>vendor-flexible with preference for practical supportable options</option>
                <option>prefer mainstream enterprise vendors and documented support paths</option>
                <option>mixed vendor approach with interoperability in mind</option>
              </select>
            </label>

            <label>
              <span>Implementation timeline</span>
              <select value={guided.implementationTimeline} onChange={(event) => setGuided((current) => ({ ...current, implementationTimeline: event.target.value }))}>
                <option>normal phased project timeline</option>
                <option>fast delivery with focused scope and controlled tradeoffs</option>
                <option>longer staged timeline with validation at each step</option>
              </select>
            </label>

            <label>
              <span>Rollout model</span>
              <select value={guided.rolloutModel} onChange={(event) => setGuided((current) => ({ ...current, rolloutModel: event.target.value }))}>
                <option>phased rollout with validation before wider deployment</option>
                <option>pilot site first, then broader rollout</option>
                <option>single implementation window with strong preparation</option>
              </select>
            </label>

            <label>
              <span>Downtime constraint</span>
              <select value={guided.downtimeConstraint} onChange={(event) => setGuided((current) => ({ ...current, downtimeConstraint: event.target.value }))}>
                <option>limited downtime should be planned and communicated</option>
                <option>minimal downtime is required for user-facing systems</option>
                <option>maintenance windows are available for planned changes</option>
              </select>
            </label>

            <label>
              <span>Team capability</span>
              <select value={guided.teamCapability} onChange={(event) => setGuided((current) => ({ ...current, teamCapability: event.target.value }))}>
                <option>small to mid-sized internal team with practical support needs</option>
                <option>strong internal technical team comfortable with richer design controls</option>
                <option>limited internal staff with need for simpler maintainable design</option>
              </select>
            </label>

            <label>
              <span>Output package</span>
              <select value={guided.outputPackage} onChange={(event) => setGuided((current) => ({ ...current, outputPackage: event.target.value }))}>
                <option>technical handoff plus stakeholder summary</option>
                <option>implementation-focused technical package</option>
                <option>review-oriented planning summary with design rationale</option>
              </select>
            </label>

            <label>
              <span>Primary audience</span>
              <select value={guided.primaryAudience} onChange={(event) => setGuided((current) => ({ ...current, primaryAudience: event.target.value }))}>
                <option>internal IT team and technical reviewers</option>
                <option>mixed technical and management audience</option>
                <option>client-facing or stakeholder review audience</option>
              </select>
            </label>
          </div>
        </section>

      

      <div className="summary-grid">
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
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Planner tracks currently active</h3>
          <p className="muted" style={{ margin: 0 }}>SubnetOps is starting to branch more dynamically. These are the planning tracks currently active for this scenario.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {activeTracks.map((item) => <span key={item} className="badge-soft">{item}</span>)}
        </div>
      </div>


      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Track status and review guidance</h3>
          <p className="muted" style={{ margin: 0 }}>This is an early step toward a fuller dynamic branching planner. Active tracks now also show whether the current scenario looks review-ready or still needs attention.</p>
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

      <div className="grid-2" style={{ alignItems: "start", gridTemplateColumns: "1.2fr 1fr" }}>
          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Requirements preview</h3>
            <p className="muted" style={{ margin: 0 }}>{guidedDescription}</p>
          </div>

          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Planning signals</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {planningSignals(guided).map((item) => <span key={item} className="badge-soft">{item}</span>)}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          {scenario.security ? (
            <div className="panel" style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Security-driven fields active</h3>
              <p className="muted" style={{ margin: 0 }}>Because guest, management, IoT, camera, or remote-access needs are present, the design should expect stronger segmentation and policy boundaries.</p>
            </div>
          ) : null}
          {scenario.cloud ? (
            <div className="panel" style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Cloud / hybrid fields active</h3>
              <p className="muted" style={{ margin: 0 }}>Because this scenario is not purely on-prem, later versions should surface connectivity, boundary, and overlap planning between on-prem and cloud spaces.</p>
            </div>
          ) : null}
          {scenario.wireless ? (
            <div className="panel" style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Wireless planning matters here</h3>
              <p className="muted" style={{ margin: 0 }}>Guest or staff wireless should influence SSID separation, DHCP behavior, access design, and diagram storytelling.</p>
            </div>
          ) : null}
          {scenario.resilience ? (
            <div className="panel" style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Resilience planning matters here</h3>
              <p className="muted" style={{ margin: 0 }}>Dual ISP or redundancy expectations should later affect WAN, validation, and handoff sections.</p>
            </div>
          ) : null}
        </div>

        <div className="trust-note">
          <strong>What this will eventually drive</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            These answers are the start of the realistic planning model: use case, security posture, environment type, WAN style, and operational needs should shape the logical network plan before detailed IP work begins.
          </p>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => setSeedPrompt(buildGuidedPrompt(guided))}>Use requirements to seed AI</button>
        </div>
      </section>

      <AIPlanningPanel
        seedPrompt={seedPrompt}
        onUseDraft={(draft, options) => {
          setAiDraft(draft);
          setUseOptions(options);
          setGenerationStatus(`Draft applied from ${draft.provider}. Selected: ${selectedSummary(options)}.`);
        }}
      />

      <section className="panel">
        <div className="trust-note">
          <strong>How the AI works</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            The AI generates a first draft. You stay in control and can change every field before the project is saved.
          </p>
        </div>

        {generationStatus ? <p className="muted">{generationStatus}</p> : null}

        {aiDraft ? (
          <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Applied AI selections</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Project fields: {useOptions.applyProjectFields ? "Yes" : "No"}</li>
              <li>Auto-create sites: {useOptions.applySites ? "Yes" : "No"}</li>
              <li>Auto-create VLANs: {useOptions.applyVlans ? "Yes" : "No"}</li>
            </ul>
          </div>
        ) : null}

        <ProjectForm
          initialValues={initialValues}
          organizations={orgsQuery.data ?? []}
          isSubmitting={mutation.isPending}
          onSubmit={async (values) => {
            const project = await mutation.mutateAsync({ ...values, requirementsJson: stringifyRequirementsProfile(guided) });

            if (aiDraft && (useOptions.applySites || useOptions.applyVlans)) {
              const createdSitesByName = new Map<string, Site>();

              if (useOptions.applySites) {
                for (const siteDraft of aiDraft.sites) {
                  const site = await createSite({
                    projectId: project.id,
                    name: siteDraft.name,
                    location: siteDraft.location,
                    siteCode: siteDraft.siteCode,
                    defaultAddressBlock: siteDraft.defaultAddressBlock,
                    notes: siteDraft.notes,
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
                    notes: vlanDraft.notes,
                  });
                }
              }
            }

            navigate(`/projects/${project.id}/requirements`);
          }}
        />
      </section>
    </section>
  );
}
