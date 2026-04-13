import { Link, useParams } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { UsageBanner } from "../components/app/UsageBanner";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import type { Vlan } from "../lib/types";
import { utilizationForCidr } from "../lib/networkValidators";
import { parseRequirementsProfile, planningReadinessSummary } from "../lib/requirementsProfile";

function summaryCard(label: string, value: number | string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
    </div>
  );
}

function vlanCategory(vlan: Vlan) {
  const text = `${vlan.vlanName} ${vlan.purpose || ""} ${vlan.department || ""}`.toLowerCase();
  if (text.includes("guest")) return "Guest";
  if (text.includes("server")) return "Servers";
  if (text.includes("management") || text.includes("mgmt")) return "Management";
  if (text.includes("voice")) return "Voice";
  if (text.includes("clinical") || text.includes("medical")) return "Clinical";
  if (text.includes("admin")) return "Admin";
  return "Other";
}

function validationHealthLabel(errorCount: number, warningCount: number) {
  if (errorCount === 0 && warningCount === 0) return "Clean";
  if (errorCount === 0) return `Warnings only (${warningCount})`;
  return `${errorCount} error${errorCount === 1 ? "" : "s"}`;
}

export function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  const authQuery = useCurrentUser();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validationItems = validationQuery.data ?? [];

  const errorCount = validationItems.filter((item) => item.severity === "ERROR").length;
  const warningCount = validationItems.filter((item) => item.severity === "WARNING").length;
  const dhcpCount = vlans.filter((item) => item.dhcpEnabled).length;
  const categoryCounts = vlans.reduce<Record<string, number>>((acc, vlan) => {
    const category = vlanCategory(vlan);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const requirementsReadiness = planningReadinessSummary(requirementsProfile);
  const mostLoadedSegment = [...vlans]
    .map((vlan) => ({ vlan, utilization: utilizationForCidr(vlan.subnetCidr, vlan.estimatedHosts) }))
    .filter((entry) => Boolean(entry.utilization))
    .sort((a, b) => (b.utilization?.utilization || 0) - (a.utilization?.utilization || 0))[0];

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading overview" message="Preparing the project summary, actions, and key metrics." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load project overview"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this project right now."}
      />
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

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Logical Design"
        description="Use this workspace to move from requirements into sites, VLANs, subnetting, and design structure."
        actions={
          <>
            <Link to={`/projects/${projectId}/validation`} className="link-button">Open Validation</Link>
            <Link to={`/projects/${projectId}/diagram`} className="link-button">Open Diagram</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Open Report</Link>
            {project.canEdit ? <Link to={`/projects/${projectId}/settings`} className="link-button">Settings</Link> : null}
          </>
        }
      />

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
          {project.basePrivateRange ? <span className="badge-soft">Base range {project.basePrivateRange}</span> : null}
          <span className="badge-soft">Validation {validationHealthLabel(errorCount, warningCount)}</span>
        </div>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>{project.name}</h2>
          <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization name set"}</p>
          <p className="muted" style={{ marginTop: 8 }}>{project.description || "No description yet."}</p>
        </div>
      </div>

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        siteCount={sites.length}
        vlanCount={vlans.length}
      />

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {summaryCard("Sites", sites.length)}
        {summaryCard("Segments", vlans.length)}
        {summaryCard("DHCP-enabled segments", dhcpCount)}
        {summaryCard("Validation health", validationHealthLabel(errorCount, warningCount))}
      </div>

      <div className="summary-grid">
        <div className="summary-card"><div className="muted">Requirements readiness</div><div className="value">{requirementsReadiness.completionLabel}</div></div>
        <div className="summary-card"><div className="muted">Tracks ready</div><div className="value">{requirementsReadiness.readyCount}</div></div>
        <div className="summary-card"><div className="muted">Need review</div><div className="value">{requirementsReadiness.reviewCount}</div></div>
        <div className="summary-card"><div className="muted">Inactive</div><div className="value">{requirementsReadiness.inactiveCount}</div></div>
      </div>

      <div className="grid-2" style={{ alignItems: "start", gridTemplateColumns: "1.2fr 1fr" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Network profile</h2>
            <p className="muted" style={{ margin: 0 }}>
              Use this summary to understand how the design is segmented before reviewing the detailed VLAN workspace.
            </p>
          </div>

          <div className="network-chip-list">
            {categoryEntries.length === 0 ? <span className="muted">No segment categories identified yet.</span> : categoryEntries.map(([label, count]) => (
              <span key={label} className="badge-soft">{label}: {count}</span>
            ))}
          </div>

          <div className="trust-note">
            <strong>Most loaded segment</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              {mostLoadedSegment?.utilization
                ? `${mostLoadedSegment.vlan.vlanName} at ${mostLoadedSegment.vlan.site?.name || "its site"} is using about ${Math.round(mostLoadedSegment.utilization.utilization * 100)}% of its usable host space.`
                : "Add estimated host counts to surface utilization pressure and capacity risk here."}
            </p>
          </div>

          <div className="trust-note">
            <strong>Addressing policy</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              This project is using {requirementsProfile.addressHierarchyModel}, with {requirementsProfile.siteBlockStrategy}, a gateway convention of {requirementsProfile.gatewayConvention}, and a growth model of {requirementsProfile.growthBufferModel}.
            </p>
          </div>

          <div className="trust-note">
            <strong>Operations model</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              The design assumes {requirementsProfile.managementIpPolicy}, {requirementsProfile.monitoringModel}, {requirementsProfile.loggingModel}, and {requirementsProfile.backupPolicy}. Ownership is planned as {requirementsProfile.operationsOwnerModel}.
            </p>
          </div>

          <div className="trust-note">
            <strong>Physical and endpoint profile</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              This plan assumes {requirementsProfile.siteLayoutModel}, serving a {requirementsProfile.siteRoleModel}, with {requirementsProfile.buildingCount} building(s), {requirementsProfile.floorCount} floor(s), a {requirementsProfile.closetModel}, and an edge footprint of {requirementsProfile.edgeFootprint}. It also assumes roughly {requirementsProfile.apCount} APs, {requirementsProfile.printerCount} printers, {requirementsProfile.phoneCount} phones, {requirementsProfile.cameraCount} cameras, {requirementsProfile.serverCount} servers, and {requirementsProfile.iotDeviceCount} IoT or specialty devices.
            </p>
          </div>

          <div className="trust-note">
            <strong>Application and WAN profile</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              The design assumes {requirementsProfile.applicationProfile}, with {requirementsProfile.criticalServicesModel}, {requirementsProfile.interSiteTrafficModel}, {requirementsProfile.bandwidthProfile}, and {requirementsProfile.qosModel}. Outage tolerance is {requirementsProfile.outageTolerance} and the growth horizon is {requirementsProfile.growthHorizon}.
            </p>
          </div>

          <div className="trust-note">
            <strong>Implementation and handoff model</strong>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              This plan assumes {requirementsProfile.budgetModel}, {requirementsProfile.vendorPreference}, {requirementsProfile.implementationTimeline}, and {requirementsProfile.rolloutModel}. The final package is aimed at {requirementsProfile.primaryAudience} with an output style of {requirementsProfile.outputPackage}.
            </p>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Requirements snapshot</h2>
          <p className="muted" style={{ margin: 0 }}>Use case: {requirementsProfile.planningFor} • Phase: {requirementsProfile.projectPhase} • Goal: {requirementsProfile.primaryGoal}</p>
          <p className="muted" style={{ margin: 0 }}>WAN: {requirementsProfile.internetModel} • Compliance: {requirementsProfile.complianceProfile}</p>
          <p className="muted" style={{ margin: 0 }}>Security posture: {requirementsProfile.securityPosture}</p>
          <p className="muted" style={{ margin: 0 }}>Trust boundary: {requirementsProfile.trustBoundaryModel}</p>
          <p className="muted" style={{ margin: 0 }}>Identity model: {requirementsProfile.identityModel}</p>
          <p className="muted" style={{ margin: 0 }}>Cloud posture: {(requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected) ? `${requirementsProfile.cloudProvider} over ${requirementsProfile.cloudConnectivity}` : "On-prem focused"}</p>
          <p className="muted" style={{ margin: 0 }}>Cloud hosting: {(requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected) ? requirementsProfile.cloudHostingModel : "No hybrid hosting model selected"}</p>
          <p className="muted" style={{ margin: 0 }}>Address hierarchy: {requirementsProfile.addressHierarchyModel}</p>
          <p className="muted" style={{ margin: 0 }}>Site block strategy: {requirementsProfile.siteBlockStrategy}</p>
          <p className="muted" style={{ margin: 0 }}>Monitoring model: {requirementsProfile.monitoringModel}</p>
          <p className="muted" style={{ margin: 0 }}>Naming standard: {requirementsProfile.namingStandard}</p>
          <p className="muted" style={{ margin: 0 }}>Site layout: {requirementsProfile.siteLayoutModel}</p>
          <p className="muted" style={{ margin: 0 }}>Site role: {requirementsProfile.siteRoleModel}</p>
          <p className="muted" style={{ margin: 0 }}>Buildings / floors: {requirementsProfile.buildingCount} / {requirementsProfile.floorCount}</p>
          <p className="muted" style={{ margin: 0 }}>Endpoint mix: {requirementsProfile.wiredWirelessMix}</p>
          <p className="muted" style={{ margin: 0 }}>Application profile: {requirementsProfile.applicationProfile}</p>
          <p className="muted" style={{ margin: 0 }}>WAN / performance: {requirementsProfile.interSiteTrafficModel}</p>
          <p className="muted" style={{ margin: 0 }}>Implementation: {requirementsProfile.rolloutModel}</p>
          <p className="muted" style={{ margin: 0 }}>Output package: {requirementsProfile.outputPackage}</p>
          <h2 style={{ marginTop: 8, marginBottom: 0 }}>What to review next</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Check validation before treating the design as final.</li>
            <li>Use the diagram page to explain logical vs physical structure.</li>
            <li>Use the report page when the plan needs a cleaner stakeholder handoff.</li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Logical design workspaces</h2>
        <div className="grid-2">
          <Link to={`/projects/${projectId}/sites`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Sites</h3>
            <p className="muted">Manage site boundaries, labels, and address blocks.</p>
          </Link>

          <Link to={`/projects/${projectId}/vlans`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>VLANs</h3>
            <p className="muted">Plan segments, gateways, subnet sizing, and DHCP behavior.</p>
          </Link>

          <Link to={`/projects/${projectId}/validation`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Validation</h3>
            <p className="muted">Surface overlap, gateway, and capacity issues before handoff.</p>
          </Link>

          <Link to={`/projects/${projectId}/diagram`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Diagram</h3>
            <p className="muted">Review the network visually in logical and physical-style views.</p>
          </Link>

          <Link to={`/projects/${projectId}/tasks`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Tasks</h3>
            <p className="muted">Track technical review work, ownership, and overdue items.</p>
          </Link>

          <Link to={`/projects/${projectId}/report`} className="panel" style={{ textDecoration: "none" }}>
            <h3 style={{ marginTop: 0 }}>Report</h3>
            <p className="muted">Open the handoff surface for cleaner stakeholder review and export.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
