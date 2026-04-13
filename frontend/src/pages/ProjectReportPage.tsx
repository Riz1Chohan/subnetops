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
  const status = reportStatus(errorCount, warningCount, project.approvalStatus);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h1 style={{ marginBottom: 8 }}>{project.reportHeader || `${project.name} Report`}</h1>
            <p className="muted" style={{ margin: 0 }}>{project.organizationName || "No organization name set"}</p>
            <p className="muted">Prepared summary for design review, planning, and export.</p>
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
      </div>

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        siteCount={sites.length}
        vlanCount={vlans.length}
      />

      <div className="trust-note">
        <strong>Report purpose</strong>
        <p className="muted" style={{ margin: "6px 0 0 0" }}>
          Use this view for design review, exports, and client-facing handoff. Use the workspace pages for editing.
        </p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="muted">Sites</div>
          <div className="value">{sites.length}</div>
        </div>
        <div className="summary-card">
          <div className="muted">VLANs</div>
          <div className="value">{vlans.length}</div>
        </div>
        <div className="summary-card">
          <div className="muted">Validation Errors</div>
          <div className="value">{errorCount}</div>
        </div>
        <div className="summary-card">
          <div className="muted">Warnings</div>
          <div className="value">{warningCount}</div>
        </div>
        <div className="summary-card">
          <div className="muted">Info</div>
          <div className="value">{infoCount}</div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Project Summary</h2>
        <p><strong>Environment:</strong> {project.environmentType || "Custom"}</p>
        <p><strong>Base Private Range:</strong> {project.basePrivateRange || "Not set"}</p>
        <p><strong>Description:</strong> {project.description || "No description yet"}</p>
      </div>

      <ValidationSummaryChart errors={errorCount} warnings={warningCount} info={infoCount} />

      <ProjectDiagram project={enrichedProject} />

      <div className="panel report-section">
        <h2>Site Summary</h2>
        {sites.length === 0 ? (
<EmptyState title="No sites added yet" message="Add sites in the workspace to populate the report-ready site summary." />
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
        <h2>VLAN Summary</h2>
        {vlans.length === 0 ? (
<EmptyState title="No VLANs added yet" message="Add VLANs in the workspace to populate the report-ready segmentation summary." />
        ) : (
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">VLAN ID</th>
                <th align="left">Name</th>
                <th align="left">Subnet</th>
                <th align="left">Gateway</th>
                <th align="left">DHCP</th>
              </tr>
            </thead>
            <tbody>
              {vlans.map((vlan) => (
                <tr key={vlan.id}>
                  <td>{vlan.site?.name || "—"}</td>
                  <td>{vlan.vlanId}</td>
                  <td>{vlan.vlanName}</td>
                  <td>{vlan.subnetCidr}</td>
                  <td>{vlan.gatewayIp}</td>
                  <td>{vlan.dhcpEnabled ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel report-section">
        <h2>Validation Results</h2>
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
