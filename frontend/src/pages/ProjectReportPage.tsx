import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { UsageBanner } from "../components/app/UsageBanner";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { ValidationList } from "../features/validation/components/ValidationList";
import { ValidationSummaryChart } from "../features/report/components/ValidationSummaryChart";
import { ActivityFeed } from "../features/report/components/ActivityFeed";
import { apiUrl } from "../lib/api";
import { classifySegmentRole, subnetFacts, utilizationForCidr } from "../lib/networkValidators";
import { parseRequirementsProfile, planningReadinessSummary } from "../lib/requirementsProfile";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";

function reportStatus(errors: number, warnings: number, approvalStatus?: string) {
  if (approvalStatus === "APPROVED") return { label: "Approved", className: "badge badge-info" };
  if (approvalStatus === "IN_REVIEW") return { label: "In Review", className: "badge badge-warning" };
  if (errors > 0) return { label: "Needs Attention", className: "badge badge-error" };
  if (warnings > 0) return { label: "Review Recommended", className: "badge badge-warning" };
  return { label: "Ready", className: "badge badge-info" };
}

function categoryForRule(ruleCode: string) {
  if (ruleCode.includes("OVERLAP") || ruleCode.includes("SITE_BLOCK") || ruleCode.includes("NONCANONICAL")) return "Addressing";
  if (ruleCode.includes("GATEWAY")) return "Gateway";
  if (ruleCode.includes("HOST_CAPACITY") || ruleCode.includes("RIGHTSIZE")) return "Capacity";
  if (ruleCode.includes("SLASH31") || ruleCode.includes("SLASH32")) return "Segment Role";
  if (ruleCode.includes("INVALID")) return "Input Quality";
  return "General";
}

function generatedSummary({ projectName, environmentType, siteCount, vlanCount, errors, warnings }: { projectName: string; environmentType?: string; siteCount: number; vlanCount: number; errors: number; warnings: number; }) {
  const environment = environmentType || "custom environment";
  const readiness = errors > 0
    ? `The current design still has ${errors} validation error${errors === 1 ? "" : "s"} that should be resolved before handoff or implementation.`
    : warnings > 0
      ? `The design is broadly usable, but ${warnings} warning${warnings === 1 ? "" : "s"} should be reviewed before sign-off.`
      : "The current design is in a clean state with no active validation blockers.";

  return `${projectName} is a ${environment.toLowerCase()} network plan covering ${siteCount} site${siteCount === 1 ? "" : "s"} and ${vlanCount} planned segment${vlanCount === 1 ? "" : "s"}. ${readiness}`;
}

export function ProjectReportPage() {
  const { projectId = "" } = useParams();
  const authQuery = useCurrentUser();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validations = validationQuery.data ?? [];

  const enrichedProject = useMemo(() => {
    if (!project) return null;
    return {
      ...project,
      sites: project.sites.map((site) => ({
        ...site,
        vlans: vlans.filter((vlan) => vlan.site?.id === site.id || vlan.siteId === site.id),
      })),
    };
  }, [project, vlans]);

  if (projectQuery.isLoading) return <LoadingState title="Loading report" message="Preparing the printable project summary and exports." />;
  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load report"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this report right now."}
        action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
      />
    );
  }
  if (!project || !enrichedProject) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested report view could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  const errorCount = validations.filter((item) => item.severity === "ERROR").length;
  const warningCount = validations.filter((item) => item.severity === "WARNING").length;
  const infoCount = validations.filter((item) => item.severity === "INFO").length;
  const dhcpCount = vlans.filter((item) => item.dhcpEnabled).length;
  const status = reportStatus(errorCount, warningCount, project.approvalStatus);
  const requirementsProfile = parseRequirementsProfile(project.requirementsJson);
  const readinessSummary = planningReadinessSummary(requirementsProfile);
  const summary = generatedSummary({
    projectName: project.name,
    environmentType: project.environmentType,
    siteCount: sites.length,
    vlanCount: vlans.length,
    errors: errorCount,
    warnings: warningCount,
  });

  const validationCategories = Array.from(validations.reduce((map, item) => {
    const category = categoryForRule(item.ruleCode);
    map.set(category, (map.get(category) || 0) + 1);
    return map;
  }, new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);

  const topFindings = validations
    .filter((item) => item.severity !== "INFO")
    .sort((a, b) => (a.severity === b.severity ? a.title.localeCompare(b.title) : a.severity === "ERROR" ? -1 : 1))
    .slice(0, 5);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h1 style={{ marginBottom: 8 }}>{project.reportHeader || `${project.name} Handoff Report`}</h1>
            <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization name set"}</p>
            <p className="muted" style={{ marginTop: 8 }}>Prepared for design review, stakeholder communication, and technical handoff.</p>
            {project.logoUrl ? <img src={project.logoUrl} alt="Project logo" style={{ maxWidth: 160, maxHeight: 70, objectFit: "contain", marginTop: 8 }} /> : null}
          </div>
          <div className="actions">
            <span className={status.className}>{status.label}</span>
            <button type="button" onClick={() => window.print()}>Print Report</button>
            <a href={apiUrl(`/export/projects/${projectId}/csv`)} target="_blank" rel="noreferrer" className="link-button">Export CSV</a>
            <a href={apiUrl(`/export/projects/${projectId}/pdf`)} target="_blank" rel="noreferrer" className="link-button">Export PDF</a>
            <Link to={`/projects/${projectId}/overview`} className="link-button">Back to Project</Link>
          </div>
        </div>

        <div className="trust-note">
          <strong>Report purpose</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            This is the handoff surface for review and export. Use the workspace pages for editing, subnetting, validation, and task work.
          </p>
        </div>
      </div>

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        siteCount={sites.length}
        vlanCount={vlans.length}
      />

      <div className="summary-grid">
        <div className="summary-card"><div className="muted">Sites</div><div className="value">{sites.length}</div></div>
        <div className="summary-card"><div className="muted">Segments</div><div className="value">{vlans.length}</div></div>
        <div className="summary-card"><div className="muted">DHCP-enabled</div><div className="value">{dhcpCount}</div></div>
        <div className="summary-card"><div className="muted">Validation Errors</div><div className="value">{errorCount}</div></div>
        <div className="summary-card"><div className="muted">Warnings</div><div className="value">{warningCount}</div></div>
      </div>

      <div className="panel report-section">
        <h2>Requirements Readiness</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}><strong>Status:</strong> {readinessSummary.completionLabel}</p>
          <p style={{ margin: 0 }}><strong>Tracks ready:</strong> {readinessSummary.readyCount}</p>
          <p style={{ margin: 0 }}><strong>Tracks needing review:</strong> {readinessSummary.reviewCount}</p>
          <p style={{ margin: 0 }}><strong>Inactive tracks:</strong> {readinessSummary.inactiveCount}</p>
          <p className="muted" style={{ marginBottom: 0 }}>Next review focus: {readinessSummary.nextReviewLabels.length > 0 ? readinessSummary.nextReviewLabels.join(", ") : "No major track gaps identified."}</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start", gridTemplateColumns: "1.1fr 0.9fr" }}>
        <div className="panel report-section">
          <h2>Executive Summary</h2>
          <p style={{ marginTop: 0 }}>{summary}</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            {project.description || "No project description has been written yet. Use the guided planning flow and settings pages to strengthen the handoff narrative."}
          </p>
        </div>

        <div className="panel report-section">
          <h2>Planning Profile</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0 }}><strong>Environment:</strong> {project.environmentType || "Custom"}</p>
            <p style={{ margin: 0 }}><strong>Base Private Range:</strong> {project.basePrivateRange || "Not set"}</p>
            <p style={{ margin: 0 }}><strong>Approval Status:</strong> {project.approvalStatus || "DRAFT"}</p>
            <p style={{ margin: 0 }}><strong>Report Status:</strong> {status.label}</p>
            <p style={{ margin: 0 }}><strong>Phase:</strong> {requirementsProfile.projectPhase}</p>
            <p style={{ margin: 0 }}><strong>Compliance / policy:</strong> {requirementsProfile.complianceProfile}</p>
            <p style={{ margin: 0 }}><strong>WAN model:</strong> {requirementsProfile.internetModel}</p>
            <p style={{ margin: 0 }}><strong>Guest policy:</strong> {requirementsProfile.guestWifi ? requirementsProfile.guestPolicy : "Not required"}</p>
            <p style={{ margin: 0 }}><strong>Management access:</strong> {requirementsProfile.management ? requirementsProfile.managementAccess : "Not required"}</p>
            <p style={{ margin: 0 }}><strong>Wireless model:</strong> {requirementsProfile.wireless ? requirementsProfile.wirelessModel : "Not required"}</p>
            <p style={{ margin: 0 }}><strong>Remote access:</strong> {requirementsProfile.remoteAccess ? requirementsProfile.remoteAccessMethod : "Not required"}</p>
            <p style={{ margin: 0 }}><strong>Cloud pattern:</strong> {(requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected) ? `${requirementsProfile.cloudProvider} over ${requirementsProfile.cloudConnectivity}` : "On-prem focused"}</p>
            <p style={{ margin: 0 }}><strong>Resilience target:</strong> {requirementsProfile.dualIsp ? requirementsProfile.resilienceTarget : "Single edge / default resilience"}</p>
            <p style={{ margin: 0 }}><strong>Security posture:</strong> {requirementsProfile.securityPosture}</p>
            <p style={{ margin: 0 }}><strong>Trust boundary:</strong> {requirementsProfile.trustBoundaryModel}</p>
            <p style={{ margin: 0 }}><strong>Admin boundary:</strong> {requirementsProfile.adminBoundary}</p>
            <p style={{ margin: 0 }}><strong>Identity model:</strong> {requirementsProfile.identityModel}</p>
            <p style={{ margin: 0 }}><strong>Cloud identity boundary:</strong> {(requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected) ? requirementsProfile.cloudIdentityBoundary : "Not required"}</p>
            <p style={{ margin: 0 }}><strong>Cloud traffic boundary:</strong> {(requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected) ? requirementsProfile.cloudTrafficBoundary : "Not required"}</p>
            <p style={{ margin: 0 }}><strong>Address hierarchy:</strong> {requirementsProfile.addressHierarchyModel}</p>
            <p style={{ margin: 0 }}><strong>Site block strategy:</strong> {requirementsProfile.siteBlockStrategy}</p>
            <p style={{ margin: 0 }}><strong>Gateway convention:</strong> {requirementsProfile.gatewayConvention}</p>
            <p style={{ margin: 0 }}><strong>Growth buffer:</strong> {requirementsProfile.growthBufferModel}</p>
            <p style={{ margin: 0 }}><strong>Reserved ranges:</strong> {requirementsProfile.reservedRangePolicy}</p>
            <p style={{ margin: 0 }}><strong>Management IP policy:</strong> {requirementsProfile.managementIpPolicy}</p>
            <p style={{ margin: 0 }}><strong>Naming standard:</strong> {requirementsProfile.namingStandard}</p>
            <p style={{ margin: 0 }}><strong>Monitoring model:</strong> {requirementsProfile.monitoringModel}</p>
            <p style={{ margin: 0 }}><strong>Logging model:</strong> {requirementsProfile.loggingModel}</p>
            <p style={{ margin: 0 }}><strong>Backup policy:</strong> {requirementsProfile.backupPolicy}</p>
            <p style={{ margin: 0 }}><strong>Operations ownership:</strong> {requirementsProfile.operationsOwnerModel}</p>
            <p style={{ margin: 0 }}><strong>Site layout:</strong> {requirementsProfile.siteLayoutModel}</p>
            <p style={{ margin: 0 }}><strong>Physical scope:</strong> {requirementsProfile.physicalScope}</p>
            <p style={{ margin: 0 }}><strong>Site role:</strong> {requirementsProfile.siteRoleModel}</p>
            <p style={{ margin: 0 }}><strong>Buildings:</strong> {requirementsProfile.buildingCount}</p>
            <p style={{ margin: 0 }}><strong>Floors:</strong> {requirementsProfile.floorCount}</p>
            <p style={{ margin: 0 }}><strong>Closet model:</strong> {requirementsProfile.closetModel}</p>
            <p style={{ margin: 0 }}><strong>Edge footprint:</strong> {requirementsProfile.edgeFootprint}</p>
            <p style={{ margin: 0 }}><strong>Printers:</strong> {requirementsProfile.printerCount}</p>
            <p style={{ margin: 0 }}><strong>Phones:</strong> {requirementsProfile.phoneCount}</p>
            <p style={{ margin: 0 }}><strong>Access points:</strong> {requirementsProfile.apCount}</p>
            <p style={{ margin: 0 }}><strong>Cameras:</strong> {requirementsProfile.cameraCount}</p>
            <p style={{ margin: 0 }}><strong>Servers:</strong> {requirementsProfile.serverCount}</p>
            <p style={{ margin: 0 }}><strong>IoT / specialty devices:</strong> {requirementsProfile.iotDeviceCount}</p>
            <p style={{ margin: 0 }}><strong>Wired / wireless mix:</strong> {requirementsProfile.wiredWirelessMix}</p>
            <p style={{ margin: 0 }}><strong>Application profile:</strong> {requirementsProfile.applicationProfile}</p>
            <p style={{ margin: 0 }}><strong>Critical services:</strong> {requirementsProfile.criticalServicesModel}</p>
            <p style={{ margin: 0 }}><strong>Inter-site traffic:</strong> {requirementsProfile.interSiteTrafficModel}</p>
            <p style={{ margin: 0 }}><strong>Bandwidth profile:</strong> {requirementsProfile.bandwidthProfile}</p>
            <p style={{ margin: 0 }}><strong>Latency sensitivity:</strong> {requirementsProfile.latencySensitivity}</p>
            <p style={{ margin: 0 }}><strong>QoS model:</strong> {requirementsProfile.qosModel}</p>
            <p style={{ margin: 0 }}><strong>Outage tolerance:</strong> {requirementsProfile.outageTolerance}</p>
            <p style={{ margin: 0 }}><strong>Growth horizon:</strong> {requirementsProfile.growthHorizon}</p>
            <p style={{ margin: 0 }}><strong>Budget model:</strong> {requirementsProfile.budgetModel}</p>
            <p style={{ margin: 0 }}><strong>Vendor preference:</strong> {requirementsProfile.vendorPreference}</p>
            <p style={{ margin: 0 }}><strong>Implementation timeline:</strong> {requirementsProfile.implementationTimeline}</p>
            <p style={{ margin: 0 }}><strong>Rollout model:</strong> {requirementsProfile.rolloutModel}</p>
            <p style={{ margin: 0 }}><strong>Downtime constraint:</strong> {requirementsProfile.downtimeConstraint}</p>
            <p style={{ margin: 0 }}><strong>Team capability:</strong> {requirementsProfile.teamCapability}</p>
            <p style={{ margin: 0 }}><strong>Output package:</strong> {requirementsProfile.outputPackage}</p>
            <p style={{ margin: 0 }}><strong>Primary audience:</strong> {requirementsProfile.primaryAudience}</p>
          </div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Methodology and Design Principles</h2>
        <p style={{ marginTop: 0 }}>
          This plan is organized around requirements-first network planning, with emphasis on segmentation, structured addressing, trust boundaries, review before implementation, and clearer operational handoff.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          The intent is to make the design readable and reviewable for both technical and stakeholder audiences, while still preserving realistic detail around security, cloud boundaries, subnet hierarchy, and manageability.
        </p>
      </div>

      {(requirementsProfile.environmentType !== "On-prem" || requirementsProfile.cloudConnected) ? (
        <div className="panel report-section">
          <h2>Cloud / Hybrid Planning Summary</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0 }}><strong>Provider and connectivity:</strong> {requirementsProfile.cloudProvider} over {requirementsProfile.cloudConnectivity}</p>
            <p style={{ margin: 0 }}><strong>Hosting model:</strong> {requirementsProfile.cloudHostingModel}</p>
            <p style={{ margin: 0 }}><strong>Cloud network model:</strong> {requirementsProfile.cloudNetworkModel}</p>
            <p style={{ margin: 0 }}><strong>Cloud routing model:</strong> {requirementsProfile.cloudRoutingModel}</p>
            <p style={{ margin: 0 }}><strong>Identity boundary:</strong> {requirementsProfile.cloudIdentityBoundary}</p>
            <p style={{ margin: 0 }}><strong>Traffic boundary:</strong> {requirementsProfile.cloudTrafficBoundary}</p>
          </div>
        </div>
      ) : null}

      <div className="panel report-section">
        <h2>Applications, WAN, and Performance Summary</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}><strong>Application profile:</strong> {requirementsProfile.applicationProfile}</p>
          <p style={{ margin: 0 }}><strong>Critical services:</strong> {requirementsProfile.criticalServicesModel}</p>
          <p style={{ margin: 0 }}><strong>Inter-site traffic:</strong> {requirementsProfile.interSiteTrafficModel}</p>
          <p style={{ margin: 0 }}><strong>Bandwidth profile:</strong> {requirementsProfile.bandwidthProfile}</p>
          <p style={{ margin: 0 }}><strong>Latency sensitivity:</strong> {requirementsProfile.latencySensitivity}</p>
          <p style={{ margin: 0 }}><strong>QoS model:</strong> {requirementsProfile.qosModel}</p>
          <p style={{ margin: 0 }}><strong>Outage tolerance:</strong> {requirementsProfile.outageTolerance}</p>
          <p style={{ margin: 0 }}><strong>Growth horizon:</strong> {requirementsProfile.growthHorizon}</p>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Implementation Constraints and Output Summary</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}><strong>Budget model:</strong> {requirementsProfile.budgetModel}</p>
          <p style={{ margin: 0 }}><strong>Vendor preference:</strong> {requirementsProfile.vendorPreference}</p>
          <p style={{ margin: 0 }}><strong>Implementation timeline:</strong> {requirementsProfile.implementationTimeline}</p>
          <p style={{ margin: 0 }}><strong>Rollout model:</strong> {requirementsProfile.rolloutModel}</p>
          <p style={{ margin: 0 }}><strong>Downtime constraint:</strong> {requirementsProfile.downtimeConstraint}</p>
          <p style={{ margin: 0 }}><strong>Team capability:</strong> {requirementsProfile.teamCapability}</p>
          <p style={{ margin: 0 }}><strong>Output package:</strong> {requirementsProfile.outputPackage}</p>
          <p style={{ margin: 0 }}><strong>Primary audience:</strong> {requirementsProfile.primaryAudience}</p>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Physical and Endpoint Summary</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}><strong>Site layout:</strong> {requirementsProfile.siteLayoutModel}</p>
          <p style={{ margin: 0 }}><strong>Physical scope:</strong> {requirementsProfile.physicalScope}</p>
          <p style={{ margin: 0 }}><strong>Printers:</strong> {requirementsProfile.printerCount}</p>
          <p style={{ margin: 0 }}><strong>Phones:</strong> {requirementsProfile.phoneCount}</p>
          <p style={{ margin: 0 }}><strong>Access points:</strong> {requirementsProfile.apCount}</p>
          <p style={{ margin: 0 }}><strong>Cameras:</strong> {requirementsProfile.cameraCount}</p>
          <p style={{ margin: 0 }}><strong>Servers:</strong> {requirementsProfile.serverCount}</p>
          <p style={{ margin: 0 }}><strong>IoT / specialty devices:</strong> {requirementsProfile.iotDeviceCount}</p>
          <p style={{ margin: 0 }}><strong>Wired / wireless mix:</strong> {requirementsProfile.wiredWirelessMix}</p>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Operations and Manageability Summary</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}><strong>Management IP policy:</strong> {requirementsProfile.managementIpPolicy}</p>
          <p style={{ margin: 0 }}><strong>Naming standard:</strong> {requirementsProfile.namingStandard}</p>
          <p style={{ margin: 0 }}><strong>Monitoring model:</strong> {requirementsProfile.monitoringModel}</p>
          <p style={{ margin: 0 }}><strong>Logging model:</strong> {requirementsProfile.loggingModel}</p>
          <p style={{ margin: 0 }}><strong>Backup policy:</strong> {requirementsProfile.backupPolicy}</p>
          <p style={{ margin: 0 }}><strong>Operations ownership:</strong> {requirementsProfile.operationsOwnerModel}</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <ValidationSummaryChart errors={errorCount} warnings={warningCount} info={infoCount} />

        <div className="panel report-section">
          <h2>Validation Posture</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {validationCategories.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No validation categories to summarize yet.</p>
            ) : validationCategories.map(([category, count]) => (
              <div key={category} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{category}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Top Findings to Review</h2>
        {topFindings.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No active error or warning findings were found.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {topFindings.map((item) => (
              <div key={item.id} className="validation-card">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={item.severity === "ERROR" ? "badge badge-error" : "badge badge-warning"}>{item.severity}</span>
                  <span className="badge-soft">{item.entityType}</span>
                  <span className="badge-soft">{item.ruleCode}</span>
                </div>
                <strong>{item.title}</strong>
                <p className="muted" style={{ marginBottom: 0 }}>{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel report-section">
        <h2>Diagram Snapshot</h2>
        <p className="muted">Use the logical view for engineering review and the physical/topology view for presentation and handoff.</p>
        <ProjectDiagram project={enrichedProject} />
      </div>

      <div className="panel report-section">
        <h2>Site Inventory</h2>
        {sites.length === 0 ? (
          <EmptyState title="No sites added yet" message="Add sites in the workspace to populate the handoff-ready site inventory." />
        ) : (
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">Location</th>
                <th align="left">Code</th>
                <th align="left">Address Block</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id}>
                  <td>{site.name}</td>
                  <td>{site.location || "—"}</td>
                  <td>{site.siteCode || "—"}</td>
                  <td>{site.defaultAddressBlock || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel report-section">
        <h2>Segmentation and Addressing Summary</h2>
        {vlans.length === 0 ? (
          <EmptyState title="No VLANs added yet" message="Add VLANs in the workspace to populate the handoff-ready segmentation summary." />
        ) : (
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">VLAN</th>
                <th align="left">Purpose</th>
                <th align="left">Subnet</th>
                <th align="left">Gateway</th>
                <th align="left">Usable</th>
                <th align="left">Estimated</th>
                <th align="left">Headroom</th>
                <th align="left">DHCP</th>
              </tr>
            </thead>
            <tbody>
              {vlans.map((vlan) => {
                const role = classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""}`);
                const facts = subnetFacts(vlan.subnetCidr, role);
                const utilization = utilizationForCidr(vlan.subnetCidr, vlan.estimatedHosts, role);
                return (
                  <tr key={vlan.id}>
                    <td>{vlan.site?.name || "—"}</td>
                    <td>{vlan.vlanId} • {vlan.vlanName}</td>
                    <td>{vlan.purpose || role.replace(/_/g, " ")}</td>
                    <td>{facts?.canonicalCidr || vlan.subnetCidr}</td>
                    <td>{vlan.gatewayIp}</td>
                    <td>{facts?.usableAddresses ?? "—"}</td>
                    <td>{vlan.estimatedHosts ?? "—"}</td>
                    <td>{utilization?.headroom ?? "—"}</td>
                    <td>{vlan.dhcpEnabled ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel report-section">
        <h2>Detailed Validation Findings</h2>
        <ValidationList items={validations} />
      </div>

      {project.reviewerNotes ? (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Reviewer Notes</h3>
          <p className="muted" style={{ margin: 0 }}>{project.reviewerNotes}</p>
        </div>
      ) : null}

      {project.changeLogs && project.changeLogs.length > 0 ? (
        <ActivityFeed items={project.changeLogs} />
      ) : null}

      {project.reportFooter ? (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>{project.reportFooter}</p>
        </div>
      ) : null}
    </section>
  );
}
