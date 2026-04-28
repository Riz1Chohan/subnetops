import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { WorkspaceIssueBanner } from "../components/app/WorkspaceIssueBanner";
import { parseWorkspaceIssueNotice } from "../lib/workspaceIssue";
import { UsageBanner } from "../components/app/UsageBanner";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { ValidationList } from "../features/validation/components/ValidationList";
import { buildNamingPreviewExamples, parseRequirementsProfile, planningReadinessSummary } from "../lib/requirementsProfile";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { analyzeDiscoveryWorkspaceState, resolveDiscoveryWorkspaceState } from "../lib/discoveryFoundation";
import { resolvePlatformProfileState, synthesizePlatformBomFoundation } from "../lib/platformBomFoundation";
import { apiBlob } from "../lib/api";
import { buildValidationFixPath, validationFixLabel } from "../lib/validationFixLink";
import { useAuthoritativeDesign } from "../features/designCore/hooks";
import { designCoreAuthorityDetail, designCoreAuthorityLabel } from "../lib/designCoreSnapshot";
import { DesignAuthorityBanner } from "../lib/designAuthority";
import { buildReportTruthModel, truthBadgeClass } from "../lib/reportDiagramTruth";

function reportStatus(errors: number, warnings: number, approvalStatus?: string) {
  if (approvalStatus === "APPROVED") return { label: "Approved", className: "badge badge-info" };
  if (approvalStatus === "IN_REVIEW") return { label: "In Review", className: "badge badge-warning" };
  if (errors > 0) return { label: "Needs Attention", className: "badge badge-error" };
  if (warnings > 0) return { label: "Review Recommended", className: "badge badge-warning" };
  return { label: "Ready", className: "badge badge-info" };
}

function generatedSummary({ projectName, environmentType, siteCount, rowCount, errors, warnings }: { projectName: string; environmentType?: string; siteCount: number; rowCount: number; errors: number; warnings: number; }) {
  const environment = environmentType || "custom environment";
  const readiness = errors > 0
    ? `The current logical design still has ${errors} validation error${errors === 1 ? "" : "s"} that should be resolved before implementation.`
    : warnings > 0
      ? `The design is usable, but ${warnings} warning${warnings === 1 ? "" : "s"} should be reviewed before sign-off.`
      : "The design is currently in a clean state with no active validation blockers.";

  return `${projectName} is a ${environment.toLowerCase()} network plan covering ${siteCount} site${siteCount === 1 ? "" : "s"} and ${rowCount} addressing plan row${rowCount === 1 ? "" : "s"}. ${readiness}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function summaryCard(label: string, value: string | number) {
  return (
    <div className="summary-card">
      <div className="muted">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function sectionList(items: string[], empty: string) {
  if (items.length === 0) return <p className="muted" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {items.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
    </ul>
  );
}

const PLANNING_ASSUMPTIONS = [
  "Inputs were provided by the user and are not live-discovered network facts.",
  "Subnet allocations are based on declared host counts, saved site blocks, and planning growth buffers.",
  "Security zones are planning recommendations unless verified against actual firewall, identity, and access-control policy.",
  "Device placement is conceptual unless a confirmed hardware inventory and cabling model have been provided.",
  "Routing, WAN, DHCP, monitoring, and redundancy choices must be reviewed against business policy and vendor-specific implementation requirements.",
  "Engineer review is required before implementation or production deployment.",
];

const ENGINEER_REVIEW_STATEMENT =
  "This design package is intended for planning and review. Validate against the live environment, business policy, and vendor-specific implementation requirements before production deployment.";

const ENGINEER_REVIEW_CHECKLIST = [
  "Confirm live inventory.",
  "Confirm WAN/provider constraints.",
  "Confirm firewall policy requirements.",
  "Confirm DHCP/static reservation strategy.",
  "Confirm routing protocol choice.",
  "Confirm redundancy/HA requirements.",
  "Confirm monitoring/SNMP/logging requirements.",
  "Confirm implementation change window.",
];

export function ProjectReportPage() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const authQuery = useCurrentUser();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validations = validationQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const selectedSection = new URLSearchParams(location.search).get("section");
  const isFocusedSectionView = Boolean(selectedSection);
  const issueNotice = parseWorkspaceIssueNotice(location.search);
  const { synthesized, designCore, authority } = useAuthoritativeDesign(projectId, project, sites, vlans, requirementsProfile);
  const reportTruth = useMemo(() => buildReportTruthModel(designCore), [designCore]);

  const discoverySummary = useMemo(
    () => analyzeDiscoveryWorkspaceState({ project, sites, vlans, state: resolveDiscoveryWorkspaceState(projectId, project) }),
    [projectId, project, sites, vlans],
  );

  const platformFoundation = useMemo(
    () => synthesizePlatformBomFoundation({ project, sites, vlans, profile: requirementsProfile, synthesized, state: resolvePlatformProfileState(projectId, project) }),
    [projectId, project, sites, vlans, requirementsProfile, synthesized],
  );

  const enrichedProject = useMemo(() => {
    if (!project) return null;
    return {
      ...project,
      sites: synthesized.siteSummaries.map((site) => ({
        id: site.id,
        name: site.name,
        siteCode: site.siteCode,
        defaultAddressBlock: site.siteBlockCidr,
        location: site.location,
        streetAddress: (site as any).streetAddress,
        notes: site.note,
        projectId: project.id,
        vlans: synthesized.addressingPlan
          .filter((row) => row.siteId === site.id)
          .map((row) => ({
            id: row.id,
            siteId: site.id,
            vlanId: row.vlanId || 0,
            vlanName: row.segmentName,
            purpose: row.purpose,
            subnetCidr: row.subnetCidr,
            gatewayIp: row.gatewayIp,
            dhcpEnabled: row.dhcpEnabled,
            estimatedHosts: row.estimatedHosts,
            notes: row.notes.join(" "),
          })),
      })),
    };
  }, [project, synthesized]);

  if (projectQuery.isLoading) return <LoadingState title="Loading report" message="Preparing the logical design handoff and addressing tables." />;
  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load report"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load this report right now."}
        action={<Link to={`/projects/${projectId}/logical-design`} className="link-button">Back to Logical Design</Link>}
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
  const status = reportStatus(errorCount, warningCount, project.approvalStatus);
  const readinessSummary = planningReadinessSummary(requirementsProfile);
  const namingPreview = buildNamingPreviewExamples(requirementsProfile, synthesized.siteSummaries.map((site) => ({ name: site.name, siteCode: site.siteCode, location: site.location, buildingLabel: (site as any).buildingLabel, floorLabel: (site as any).floorLabel, closetLabel: (site as any).closetLabel || requirementsProfile.closetModel })));

  const summary = generatedSummary({
    projectName: project.name,
    environmentType: project.environmentType,
    siteCount: synthesized.siteSummaries.length,
    rowCount: synthesized.addressingPlan.length,
    errors: errorCount,
    warnings: warningCount,
  });

  const exportBlockers = [
    errorCount > 0 ? `${errorCount} validation blocker${errorCount === 1 ? "" : "s"} still open` : null,
    synthesized.addressingPlan.length === 0 ? "No addressing plan rows generated yet" : null,
    synthesized.siteSummaries.length === 0 ? "No site design has been defined yet" : null,
  ].filter(Boolean) as string[];

  const downloadExport = async (kind: "pdf" | "docx" | "csv") => {
    try {
      setExportMessage(kind === "pdf" ? "Preparing professional PDF report..." : kind === "docx" ? "Preparing professional DOCX report..." : "Preparing Excel-friendly CSV export...");
      const blob = await apiBlob(`/export/projects/${projectId}/${kind}`, {
        method: "POST",
      });
      saveBlob(
        blob,
        kind === "pdf"
          ? `${project.name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase()}-professional-report.pdf`
          : kind === "docx"
            ? `${project.name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase()}-professional-report.docx`
            : `${project.name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase()}-addressing-export.csv`,
      );
      setExportMessage(kind === "pdf" ? "Professional PDF report exported." : kind === "docx" ? "Professional DOCX report exported." : "Excel-friendly CSV exported.");
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Export failed.");
    }
  };

  const reportSectionLinks = [
    { key: "assumptions", label: "Assumptions & constraints", detail: "Start the written package from the design basis and open issues.", path: `/projects/${projectId}/report?section=assumptions` },
    { key: "topology", label: "Topology & placement", detail: "Open the topology narrative and placement story.", path: `/projects/${projectId}/report?section=topology` },
    { key: "addressing", label: "Addressing hierarchy", detail: "Review site blocks, VLANs, and subnet allocations.", path: `/projects/${projectId}/report?section=addressing` },
    { key: "services-security", label: "Services & boundaries", detail: "Check service anchors, trust zones, and DMZ posture.", path: `/projects/${projectId}/report?section=services-security` },
    { key: "routing-flows", label: "Routing & flows", detail: "Review routing posture and required traffic paths.", path: `/projects/${projectId}/report?section=routing-flows` },
    { key: "site-lld", label: "Site low-level design", detail: "Jump into per-site engineering detail and implementation posture.", path: `/projects/${projectId}/report?section=site-lld` },
    { key: "validation", label: "Validation findings", detail: "Review issue, impact, and recommendation for open findings.", path: `/projects/${projectId}/report?section=validation` },
    { key: "implementation", label: "Engineer checklist", detail: "Confirm the review gates before implementation handoff.", path: `/projects/${projectId}/report?section=implementation` },
  ];

  const topValidationItems = validations
    .filter((item) => item.severity !== "INFO")
    .sort((a, b) => (a.severity === b.severity ? a.createdAt.localeCompare(b.createdAt) : a.severity === "ERROR" ? -1 : 1))
    .slice(0, 8);

  if (!selectedSection) {
    return (
      <section style={{ display: "grid", gap: 18 }}>
        <div className="panel workspace-selection-blank report-landing-shell">
          <p className="workspace-detail-kicker">Deliver</p>
          <h2 style={{ margin: "0 0 8px 0" }}>Report workspace</h2>
          <p className="muted" style={{ margin: 0 }}>Pick a section below or use the left pane. This page now opens as a usable report hub instead of a dead-end blank state.</p>
          <div className="trust-note" style={{ marginTop: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              <strong>{designCoreAuthorityLabel(designCore)}:</strong> {designCoreAuthorityDetail(designCore)}
            </p>
          </div>
          <div className="report-landing-metrics">
            {summaryCard("Sites", designCore?.summary.siteCount ?? synthesized.siteSummaries.length)}
            {summaryCard("Address rows", designCore?.summary.vlanCount ?? synthesized.addressingPlan.length)}
            {summaryCard("Errors", errorCount)}
            {summaryCard("Warnings", warningCount)}
          </div>
          <div className="report-section-grid">
            {reportSectionLinks.map((item) => (
              <Link key={item.key} to={item.path} className="report-section-card">
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const focusedSectionTitle = selectedSection === "assumptions"
    ? "Design assumptions and constraints"
    : selectedSection === "naming"
      ? "Naming standard"
      : selectedSection === "topology"
        ? "Topology and placement"
        : selectedSection === "addressing"
          ? "Addressing hierarchy"
          : selectedSection === "services-security"
            ? "Services and boundaries"
            : selectedSection === "routing-flows"
              ? "Routing and traffic flows"
              : selectedSection === "site-lld"
                ? "Site low-level design"
                : selectedSection === "validation"
                  ? "Validation findings"
                  : selectedSection === "implementation"
                    ? "Implementation and cutover"
                    : selectedSection === "issues"
                      ? "Open issues and confirmations"
                      : "Report";

  return (
    <section style={{ display: "grid", gap: 18 }}>
      {isFocusedSectionView ? (
        <>
        <div className="panel workspace-detail-toolbar">
          <div>
            <p className="workspace-detail-kicker">Deliver</p>
            <strong>{focusedSectionTitle}</strong>
          </div>
          <div className="workspace-detail-actions">
            <button type="button" onClick={() => void downloadExport("docx")}>Export DOCX</button>
          </div>
        </div>
        <WorkspaceIssueBanner notice={issueNotice} />
        <DesignAuthorityBanner authority={authority} compact />
        </>
      ) : (
      <header className="panel report-hero">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className={status.className}>{status.label}</span>
            <span className={truthBadgeClass(reportTruth.overallReadiness)}>Backend truth {reportTruth.overallReadinessLabel}</span>
            <span className="badge-soft">Requirements {readinessSummary.completionLabel}</span>
            {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
            <span className="badge-soft">Topology {synthesized.topology.topologyLabel}</span>
            <span className="badge-soft">Organization block {designCore?.organizationBlock?.canonicalCidr ?? synthesized.organizationBlock}</span>
          </div>
          <div>
            <h1 style={{ marginBottom: 8 }}>{project.reportHeader || `${project.name} — Design Package`}</h1>
            <p className="muted" style={{ margin: 0 }}>{summary}</p>
            <p className="muted" style={{ margin: "8px 0 0 0" }}>
              <strong>{designCoreAuthorityLabel(designCore)}:</strong> {designCoreAuthorityDetail(designCore)}
            </p>
          </div>
          <div className="form-actions" style={{ flexWrap: "wrap" }}>
            <button type="button" onClick={() => void downloadExport("pdf")}>Export Professional PDF</button>
            <button type="button" className="link-button" onClick={() => void downloadExport("docx")}>Export Professional DOCX</button>
            <button type="button" className="link-button" onClick={() => void downloadExport("csv")}>Export Excel-friendly CSV</button>
            <button type="button" className="link-button" onClick={() => window.print()}>Print / Save current view</button>
            <Link to={`/projects/${projectId}/diagram`} className="link-button">Open Diagram</Link>
            <Link to={`/projects/${projectId}/validation`} className="link-button">Validation</Link>
          </div>
          {exportMessage ? <div className="panel" style={{ padding: 12, background: "rgba(17,24,39,0.03)" }}><span className="muted">{exportMessage}</span></div> : null}
        </div>
      </header>
      )}

      {!isFocusedSectionView ? <>
        <WorkspaceIssueBanner notice={issueNotice} />
        <DesignAuthorityBanner authority={authority} compact />
      </> : null}

      {!isFocusedSectionView ? <UsageBanner
        planTier={authQuery.data?.user.planTier}
        siteCount={sites.length}
        vlanCount={vlans.length}
      /> : null}


      {!isFocusedSectionView ? <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {summaryCard("Sites", designCore?.summary.siteCount ?? synthesized.siteSummaries.length)}
        {summaryCard("Address rows", designCore?.summary.vlanCount ?? synthesized.addressingPlan.length)}
        {summaryCard("Route domains", reportTruth.summary.routeDomainCount)}
        {summaryCard("Security flows", reportTruth.summary.securityFlowCount)}
        {summaryCard("Implementation steps", reportTruth.summary.implementationStepCount)}
        {summaryCard("Blocked steps", reportTruth.summary.blockedImplementationStepCount)}
        {summaryCard("Verification blocked", reportTruth.summary.blockedVerificationCheckCount)}
        {summaryCard("BOM line items", platformFoundation.totals.lineItems)}
      </div> : null}


      <div data-report-section="assumptions" className="panel report-section" style={{ display: selectedSection && selectedSection !== "assumptions" ? "none" : "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 8px 0" }}>1. Design assumptions and constraints</h2>
            <p className="muted" style={{ margin: 0 }}>
              This report is structured around explicit design facts, clear assumptions, deterministic checks, and engineer review. It should answer what is placed where, which subnets belong to which domains, how traffic moves, and what still needs confirmation.
            </p>
            <p className="muted" style={{ margin: "8px 0 0 0" }}>{ENGINEER_REVIEW_STATEMENT}</p>
          </div>
          <span className="badge-soft">{exportBlockers.length === 0 ? "Export ready" : `${exportBlockers.length} review item${exportBlockers.length === 1 ? "" : "s"}`}</span>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Assumptions</h3>
            {sectionList(
              [...PLANNING_ASSUMPTIONS, ...synthesized.designReview.filter((item) => item.kind === "assumption").map((item) => item.detail)].slice(0, 10),
              "No explicit assumptions surfaced yet.",
            )}
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Constraints and discovery risks</h3>
            {sectionList(
              [...discoverySummary.constraints.slice(0, 4), ...discoverySummary.inferredRisks.slice(0, 4)].slice(0, 6),
              "No major constraints recorded yet.",
            )}
          </div>
        </div>
      </div>


      <div data-report-section="naming" className="panel report-section" style={{ display: selectedSection && selectedSection !== "naming" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>{isFocusedSectionView ? "1A. Naming and site identity standard" : "1A. Naming and site identity standard"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            Device labels, report references, and diagram labels should all follow the same naming pattern. This section makes the chosen naming standard explicit before the report starts referencing device objects deeper in the design.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {summaryCard("Naming standard", requirementsProfile.namingStandard)}
          {summaryCard("Device convention", requirementsProfile.deviceNamingConvention)}
          {summaryCard("Primary token", requirementsProfile.namingTokenPreference)}
          {summaryCard("Naming hierarchy", requirementsProfile.namingHierarchy)}
          {summaryCard("Site identity", requirementsProfile.siteIdentityCapture)}
          {requirementsProfile.customNamingPattern ? summaryCard("Custom pattern", requirementsProfile.customNamingPattern) : null}
        </div>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Primary token</th>
                <th>Building</th>
                <th>Floor</th>
                <th>Closet</th>
                <th>FW01 / FW02</th>
                <th>SW01 / SW02</th>
                <th>AP01 / AP02</th>
                <th>Other roles</th>
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

      <div data-report-section="topology" className="panel report-section" style={{ display: selectedSection && selectedSection !== "topology" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>2. Topology and site placement</h3>
          <p className="muted" style={{ margin: 0 }}>
            This section states the selected topology and where key devices and boundaries are placed. The goal is to stop the report from speaking in generic architecture language without naming the actual site roles and placements.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {summaryCard("Topology", synthesized.topology.topologyLabel)}
          {summaryCard("Breakout", synthesized.topology.internetBreakout)}
          {summaryCard("Primary site", synthesized.topology.primarySiteName || "TBD")}
          {summaryCard("Redundancy", synthesized.topology.redundancyModel)}
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Site placement summary</h3>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Role</th>
                    <th>Device type</th>
                    <th>Placement</th>
                    <th>Zones</th>
                  </tr>
                </thead>
                <tbody>
                  {synthesized.sitePlacements.map((item) => (
                    <tr key={item.id}>
                      <td>{item.siteName}</td>
                      <td>{item.deviceName}<div className="muted" style={{ fontSize: 12 }}>{item.siteTier}{item.uplinkTarget ? ` • uplink ${item.uplinkTarget}` : ""}</div></td>
                      <td>{item.role}</td>
                      <td>{item.placement}</td>
                      <td>{item.connectedZones.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Architecture notes</h3>
            {sectionList(synthesized.topology.notes.slice(0, 6), "No topology notes generated yet.")}
          </div>
        </div>
      </div>

      <div data-report-section="addressing" className="panel report-section" style={{ display: selectedSection && selectedSection !== "addressing" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>3. Addressing hierarchy</h3>
          <p className="muted" style={{ margin: 0 }}>
            This is the addressing backbone for the design. Every row should tie back to a site, a role, a gateway, and eventually a policy and traffic path.
          </p>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {summaryCard("Organization block", synthesized.organizationBlock)}
          {summaryCard("Configured rows", synthesized.stats.configuredSegments)}
          {summaryCard("Proposed rows", synthesized.stats.proposedSegments)}
          {summaryCard("Transit links", synthesized.wanLinks.length)}
        </div>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Segment</th>
                <th>Role</th>
                <th>Subnet</th>
                <th>Gateway</th>
                <th>DHCP / Static</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.addressingPlan.map((row) => (
                <tr key={row.id}>
                  <td>{row.siteName}</td>
                  <td>{row.segmentName}</td>
                  <td>{row.role.replace(/_/g, " ")}</td>
                  <td>{row.subnetCidr}</td>
                  <td>{row.gatewayIp}</td>
                  <td>{row.dhcpRange || row.staticReserve || (row.dhcpEnabled ? "DHCP enabled" : "Static")}</td>
                  <td>{row.notes.slice(0, 2).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div data-report-section="services-security" className="panel report-section" style={{ display: selectedSection && selectedSection !== "services-security" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>4. Service placement and security boundary design</h3>
          <p className="muted" style={{ margin: 0 }}>
            Instead of saying only that a DMZ or service zone exists, this section shows where services are placed, how they are reached, and what boundary or control point sits in front of them.
          </p>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Service placements</h3>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Type</th>
                    <th>Placement</th>
                    <th>Site</th>
                    <th>Zone</th>
                    <th>Subnet</th>
                  </tr>
                </thead>
                <tbody>
                  {synthesized.servicePlacements.map((item) => (
                    <tr key={item.id}>
                      <td>{item.serviceName}</td>
                      <td>{item.serviceType}</td>
                      <td>{item.placementType}</td>
                      <td>{item.siteName}</td>
                      <td>{item.zoneName}</td>
                      <td>{item.subnetCidr || "TBD"}<div className="muted" style={{ fontSize: 12 }}>{item.attachedDevice || "Attachment TBD"}{item.ingressInterface ? ` • ${item.ingressInterface}` : ""}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Boundary details</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {synthesized.securityBoundaries.slice(0, 8).map((item) => (
                <div key={`${item.siteName}-${item.zoneName}`} className="panel" style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    <span className="badge-soft">{item.siteName}</span>
                    <span className="badge-soft">{item.boundaryName}</span>
                    <span className="badge-soft">{item.attachedDevice}</span>
                  </div>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Subnets:</strong> {item.subnetCidrs.join(", ") || "TBD"}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Attachment:</strong> {item.attachedInterface || item.attachedDevice} → {item.upstreamInterface || item.upstreamBoundary}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Peers:</strong> {item.permittedPeers.join(", ") || "Restricted"}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Inside relationships:</strong> {item.insideRelationships.join(", ") || "—"}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Outside relationships:</strong> {item.outsideRelationships.join(", ") || "—"}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Published services:</strong> {item.publishedServices.join(", ") || "—"}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Inbound policy:</strong> {item.inboundPolicy}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>East-west policy:</strong> {item.eastWestPolicy}</p>
                  <p style={{ margin: 0 }}><strong>Management source:</strong> {item.managementSource}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div data-report-section="routing-flows" className="panel report-section" style={{ display: selectedSection && selectedSection !== "routing-flows" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>5. Routing and traffic-flow design</h3>
          <p className="muted" style={{ margin: 0 }}>
            This section answers exactly how traffic should move, which named devices and interfaces it traverses, where policy is enforced, and whether NAT or edge treatment changes the path.
          </p>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Critical traffic paths</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {synthesized.trafficFlows.map((item) => (
                <div key={item.id} className="panel" style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    <span className="badge-soft">{item.flowCategory}</span>
                    <span className="badge-soft">{item.sourceZone}</span>
                    <span className="badge-soft">{item.destinationZone}</span>
                  </div>
                  <h4 style={{ margin: "0 0 8px 0" }}>{item.flowLabel}</h4>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Path:</strong> {item.path.join(" → ")}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Named flow:</strong> {item.flowName}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Subnets:</strong> {item.sourceSubnetCidr || '—'} → {item.destinationSubnetCidr || '—'}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Control points:</strong> {item.controlPoints.join(", ")}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Route model:</strong> {item.routeModel}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>NAT:</strong> {item.natBehavior}</p>
                  <p style={{ margin: 0 }}><strong>Enforcement:</strong> {item.enforcementPolicy}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Routing identities and summaries</h3>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Summary</th>
                    <th>Loopback</th>
                    <th>Transit adjacencies</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {synthesized.routingPlan.map((item) => (
                    <tr key={item.siteId}>
                      <td>{item.siteName}</td>
                      <td>{item.summaryAdvertisement || "—"}</td>
                      <td>{item.loopbackCidr || "—"}</td>
                      <td>{item.transitAdjacencyCount}</td>
                      <td>{item.notes.slice(0, 2).join(" · ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div data-report-section="site-lld" className="panel report-section" style={{ display: selectedSection && selectedSection !== "site-lld" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>6. Site-by-site low-level design</h3>
          <p className="muted" style={{ margin: 0 }}>
            Each site should have a clear role, local service posture, routing role, and segment picture. This is the place where the report needs to feel like a real site design, not generic architecture commentary.
          </p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {synthesized.lowLevelDesign.map((site) => (
            <div key={site.siteId} className="panel" style={{ padding: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 2 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{site.siteName}</h3>
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>{site.siteRole} · {site.layerModel}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={site.authorityStatus === "ready" ? "badge badge-info" : site.authorityStatus === "partial" ? "badge badge-warning" : "badge badge-error"}>{site.authorityLabel}</span>
                  <span className="badge-soft">{site.strongestAuthoritySourceLabel}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge-soft">Routing {site.routingRole}</span>
                <span className="badge-soft">Security {site.securityBoundary}</span>
                <span className="badge-soft">Flows {site.flowNames.length}</span>
                <span className="badge-soft">Boundaries {site.boundaryNames.length}</span>
              </div>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Switching:</strong> {site.switchingProfile}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Local service model:</strong> {site.localServiceModel}</p>
                  <p style={{ margin: 0 }}><strong>Wireless:</strong> {site.wirelessModel}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Summary route:</strong> {site.summaryRoute || "—"}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Loopback:</strong> {site.loopbackCidr || "—"}</p>
                  <p style={{ margin: 0 }}><strong>Segments:</strong> {site.localSegments.join(", ") || "—"}</p>
                </div>
              </div>
              <div className="grid-2" style={{ alignItems: "start" }}>
                <div>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Named boundaries:</strong> {site.boundaryNames.join(", ") || "—"}</p>
                  <p style={{ margin: 0 }}><strong>Named services:</strong> {site.serviceNames.join(", ") || "—"}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Tracked flows:</strong> {site.flowNames.join(", ") || "—"}</p>
                  <p style={{ margin: 0 }}><strong>Trust debt:</strong> {site.trustDebt.join(" · ") || "No major site-specific trust debt currently surfaced."}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-report-section="validation" className="panel report-section" style={{ display: selectedSection && selectedSection !== "validation" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>7. Validation findings</h3>
          <p className="muted" style={{ margin: 0 }}>
            Validation should remain actionable. Findings should explain the issue, why it matters, and what to fix before implementation or export.
          </p>
        </div>
        <ValidationList
          items={topValidationItems}
          getFixPath={(item) => buildValidationFixPath(projectId, item)}
          getFixLabel={(item) => validationFixLabel(item)}
          emptyTitle="No active review findings"
          emptyMessage="The current design package has no error or warning findings at the moment."
        />
      </div>

      <div data-report-section="implementation" className="panel report-section" style={{ display: selectedSection && selectedSection !== "implementation" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>8. Implementation and cutover</h3>
          <p className="muted" style={{ margin: 0 }}>
            This section now stays tied to backend truth instead of hand-wavy rollout language alone. It shows what is blocked, what still needs review, which verification gates are missing, and what rollback posture exists before handoff.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className={truthBadgeClass(reportTruth.overallReadiness)}>Overall {reportTruth.overallReadinessLabel}</span>
          <span className={truthBadgeClass(reportTruth.readiness.routing)}>Routing {reportTruth.readiness.routing}</span>
          <span className={truthBadgeClass(reportTruth.readiness.security)}>Security {reportTruth.readiness.security}</span>
          <span className={truthBadgeClass(reportTruth.readiness.nat)}>NAT {reportTruth.readiness.nat}</span>
          <span className={truthBadgeClass(reportTruth.readiness.implementation)}>Implementation {reportTruth.readiness.implementation}</span>
        </div>

        <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", alignItems: "start" }}>
          {summaryCard("Devices", reportTruth.summary.deviceCount)}
          {summaryCard("Links", reportTruth.summary.linkCount)}
          {summaryCard("Route domains", reportTruth.summary.routeDomainCount)}
          {summaryCard("Security zones", reportTruth.summary.securityZoneCount)}
          {summaryCard("Route intents", reportTruth.summary.routeIntentCount)}
          {summaryCard("Security flows", reportTruth.summary.securityFlowCount)}
          {summaryCard("Implementation steps", reportTruth.summary.implementationStepCount)}
          {summaryCard("Blocked verification", reportTruth.summary.blockedVerificationCheckCount)}
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Blocking findings</h3>
            {reportTruth.blockedFindings.length === 0 ? <p className="muted" style={{ margin: 0 }}>No backend blocking findings are currently open.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>{reportTruth.blockedFindings.map((item, index) => <li key={`${item.source}-${index}`} style={{ marginBottom: 8 }}><strong>{item.source} — {item.title}:</strong> {item.detail}</li>)}</ul>
            )}
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Review findings</h3>
            {reportTruth.reviewFindings.length === 0 ? <p className="muted" style={{ margin: 0 }}>No backend review findings are currently open.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>{reportTruth.reviewFindings.map((item, index) => <li key={`${item.source}-${index}`} style={{ marginBottom: 8 }}><strong>{item.source} — {item.title}:</strong> {item.detail}</li>)}</ul>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Implementation review queue</h3>
          {reportTruth.topImplementationSteps.length === 0 ? <p className="muted" style={{ margin: 0 }}>No implementation steps are currently available from backend truth.</p> : (
            <div className="table-wrap"><table><thead><tr><th>Step</th><th>Category</th><th>Readiness</th><th>Evidence / blockers</th><th>Rollback</th></tr></thead><tbody>
              {reportTruth.topImplementationSteps.map((step) => <tr key={step.id}><td><strong>{step.title}</strong><div className="muted">{step.expectedOutcome}</div></td><td>{step.category}</td><td><span className={truthBadgeClass(step.readiness)}>{step.readiness}</span></td><td>{step.blockers[0] ?? step.requiredEvidence[0] ?? step.readinessReasons[0] ?? "—"}</td><td>{step.rollbackIntent || "—"}</td></tr>)}
            </tbody></table></div>
          )}
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Verification coverage</h3>
            {reportTruth.verificationChecksByType.length === 0 ? <p className="muted" style={{ margin: 0 }}>No verification checks are currently available.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>{reportTruth.verificationChecksByType.map((item) => <li key={item.checkType} style={{ marginBottom: 8 }}><strong>{item.checkType}:</strong> {item.totalCount} total · {item.blockedCount} blocked · {item.reviewCount} review · {item.readyCount} ready</li>)}</ul>
            )}
            <div style={{ marginTop: 12 }}><h4 style={{ margin: "0 0 8px 0" }}>Priority verification checks</h4>{reportTruth.verificationChecks.length === 0 ? <p className="muted" style={{ margin: 0 }}>No verification checks available.</p> : <ul style={{ margin: 0, paddingLeft: 18 }}>{reportTruth.verificationChecks.slice(0, 8).map((check) => <li key={check.id} style={{ marginBottom: 8 }}><strong>{check.name}:</strong> {check.expectedResult} ({check.readiness})</li>)}</ul>}</div>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Rollback and review checklist</h3>
            {reportTruth.rollbackActions.length === 0 ? <p className="muted" style={{ margin: 0 }}>No explicit rollback actions are currently modeled.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>{reportTruth.rollbackActions.map((item) => <li key={item.id} style={{ marginBottom: 8 }}><strong>{item.name}:</strong> {item.triggerCondition}</li>)}</ul>
            )}
            <div style={{ marginTop: 12 }}><h4 style={{ margin: "0 0 8px 0" }}>Engineer review checklist</h4>{sectionList(ENGINEER_REVIEW_CHECKLIST, "No checklist items available.")}</div>
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Proof boundary and limitations</h3>
          {sectionList(reportTruth.limitations, "No additional limitations were recorded.")}
        </div>
      </div>

      <div data-report-section="issues" className="panel report-section" style={{ display: selectedSection && selectedSection !== "issues" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>9. Open issues and review items</h3>
          <p className="muted" style={{ margin: 0 }}>
            The package should stay honest about unresolved assumptions, risks, and next actions. This is where the handoff should clearly say what still needs confirmation.
          </p>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Open issues</h3>
            {sectionList(synthesized.openIssues.slice(0, 8), "No open issues captured yet.")}
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Next steps</h3>
            {sectionList(synthesized.implementationNextSteps.slice(0, 8), "No next steps captured yet.")}
          </div>
        </div>
      </div>

      <div data-report-section="diagram-cross-check" className="panel report-section" style={{ display: selectedSection && selectedSection !== "diagram-cross-check" ? "none" : "grid", gap: 14 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>10. Diagram preview and report cross-check</h3>
          <p className="muted" style={{ margin: 0 }}>
            The diagram preview is no longer only decorative. It should be used to cross-check section 2 placement, section 3 addressing, section 4 boundaries, and section 5 traffic paths against the generated topology views.
          </p>
        </div>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>What to verify visually</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 8 }}><strong>Placement overlay:</strong> site roles, edge devices, switching roles, and local versus centralized services.</li>
              <li style={{ marginBottom: 8 }}><strong>Addressing overlay:</strong> subnet labels, site blocks, transit links, and gateway relationships.</li>
              <li style={{ marginBottom: 8 }}><strong>Security overlay:</strong> DMZ placement, attached control points, permitted peers, and management source.</li>
              <li style={{ marginBottom: 0 }}><strong>Flow overlay:</strong> critical traffic paths, NAT posture, and enforcement points.</li>
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Validation items to compare against the diagram</h3>
            {topValidationItems.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No active validation blockers or warnings are open right now.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {topValidationItems.slice(0, 5).map((item) => (
                  <li key={item.id} style={{ marginBottom: 8 }}><strong>{item.severity}:</strong> {item.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <ProjectDiagram project={enrichedProject} synthesizedDesign={synthesized} />
      </div>
    </section>
  );
}
