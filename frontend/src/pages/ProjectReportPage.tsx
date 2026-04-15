import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { UsageBanner } from "../components/app/UsageBanner";
import { ProjectDiagram } from "../features/diagram/components/ProjectDiagram";
import { ValidationList } from "../features/validation/components/ValidationList";
import { ValidationSummaryChart } from "../features/report/components/ValidationSummaryChart";
import { ActivityFeed } from "../features/report/components/ActivityFeed";
import { parseRequirementsProfile, planningReadinessSummary } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { analyzeDiscoveryWorkspaceState, resolveDiscoveryWorkspaceState } from "../lib/discoveryFoundation";
import { resolvePlatformProfileState, synthesizePlatformBomFoundation } from "../lib/platformBomFoundation";
import { apiBlob } from "../lib/api";

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

export function ProjectReportPage() {
  const { projectId = "" } = useParams();
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
  const synthesized = useMemo(
    () => synthesizeLogicalDesign(project, sites, vlans, requirementsProfile),
    [project, sites, vlans, requirementsProfile],
  );

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
        action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Logical Design</Link>}
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
  const readinessSummary = planningReadinessSummary(requirementsProfile);
  const summary = generatedSummary({
    projectName: project.name,
    environmentType: project.environmentType,
    siteCount: synthesized.siteSummaries.length,
    rowCount: synthesized.addressingPlan.length,
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
    .sort((a, b) => (a.severity === b.severity ? a.createdAt.localeCompare(b.createdAt) : a.severity === "ERROR" ? -1 : 1))
    .slice(0, 8);
  const exportBlockers = [
    errorCount > 0 ? `${errorCount} validation blocker${errorCount === 1 ? "" : "s"} still open` : null,
    synthesized.addressingPlan.length === 0 ? "No addressing plan rows generated yet" : null,
    synthesized.siteSummaries.length === 0 ? "No site design has been defined yet" : null,
  ].filter(Boolean) as string[];
  const includedArtifacts = [
    "Executive / technical report preview",
    `${synthesized.addressingPlan.length} addressing rows`,
    `${synthesized.securityZones.length} security zones`,
    `${synthesized.routePolicies.length} routing policy items`,
    `${platformFoundation.totals.lineItems} BOM foundation line items`,
    `${validations.length} validation findings`,
  ];

  const exportSnapshot = useMemo(() => ({
    generatedAt: new Date().toISOString(),
    project: project
      ? {
          id: project.id,
          name: project.name,
          organizationName: project.organizationName,
          environmentType: project.environmentType,
          basePrivateRange: project.basePrivateRange,
          reportHeader: project.reportHeader,
          logoUrl: project.logoUrl,
          approvalStatus: project.approvalStatus,
          requirementsJson: project.requirementsJson,
          discoveryJson: project.discoveryJson,
          platformProfileJson: project.platformProfileJson,
        }
      : null,
    requirementsProfile,
    validations: validations.map((item) => ({
      id: item.id,
      ruleCode: item.ruleCode,
      severity: item.severity,
      entityType: item.entityType,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
    })),
    synthesized,
    discoverySummary,
    platformFoundation,
  }), [project, requirementsProfile, validations, synthesized, discoverySummary, platformFoundation]);

  const downloadExport = async (kind: "pdf" | "docx" | "csv") => {
    try {
      setExportMessage(kind === "pdf" ? "Preparing professional PDF report..." : kind === "docx" ? "Preparing professional DOCX report..." : "Preparing Excel-friendly CSV export...");
      const blob = await apiBlob(`/export/projects/${projectId}/${kind}`, {
        method: "POST",
        body: JSON.stringify({ exportSnapshot }),
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

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <header className="panel report-hero">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className={status.className}>{status.label}</span>
            <span className="badge-soft">Requirements {readinessSummary.completionLabel}</span>
            {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
            <span className="badge-soft">Organization block {synthesized.organizationBlock}</span>
          </div>
          <div>
            <h1 style={{ marginBottom: 8 }}>{project.reportHeader || `${project.name} — Logical Design Package`}</h1>
            <p className="muted" style={{ margin: 0 }}>{summary}</p>
          </div>
          <div className="form-actions" style={{ flexWrap: "wrap" }}>
            <button type="button" onClick={() => void downloadExport("pdf")}>Export Professional PDF</button>
            <button type="button" className="link-button" onClick={() => void downloadExport("docx")}>Export Professional DOCX</button>
            <button type="button" className="link-button" onClick={() => void downloadExport("csv")}>Export Excel-friendly CSV</button>
            <button type="button" className="link-button" onClick={() => window.print()}>Print / Save current view</button>
            <Link to={`/projects/${projectId}/diagram`} className="link-button">Open Diagram</Link>
            <Link to={`/projects/${projectId}/addressing`} className="link-button">Addressing Table</Link>
            <Link to={`/projects/${projectId}/validation`} className="link-button">Validation</Link>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Design Package</Link>
          </div>
        </div>
      </header>


      <div className="panel report-section" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 8px 0" }}>Deliver Center</h2>
            <p className="muted" style={{ margin: 0 }}>
              Use this area to export a professional PDF report, a professional DOCX report, and the spreadsheet-friendly data pack once the current design is ready to hand off.
            </p>
          </div>
          <span className="badge-soft">{exportBlockers.length === 0 ? "Export ready" : `${exportBlockers.length} review item${exportBlockers.length === 1 ? "" : "s"}`}</span>
        </div>

        {exportMessage ? <div className="panel" style={{ padding: 12, background: "rgba(17,24,39,0.03)" }}><span className="muted">{exportMessage}</span></div> : null}

        <div className="grid-2" style={{ alignItems: "start" }}>
          <details className="panel" open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Included artifacts</summary>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {includedArtifacts.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </details>
          <details className="panel" open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Export blockers and review notes</summary>
            {exportBlockers.length === 0 ? (
              <p className="muted" style={{ margin: "12px 0 0" }}>No hard blockers are currently stopping package export.</p>
            ) : (
              <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
                {exportBlockers.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
              </ul>
            )}
          </details>
        </div>
      </div>

      <UsageBanner
        planTier={authQuery.data?.user.planTier}
        siteCount={sites.length}
        vlanCount={vlans.length}
      />

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="summary-card"><div className="muted">Discovery sections</div><div className="value">{discoverySummary.filledSections}/9</div></div>
        <div className="summary-card"><div className="muted">Current device refs</div><div className="value">{discoverySummary.deviceMentions}</div></div>
        <div className="summary-card"><div className="muted">Sites</div><div className="value">{synthesized.siteSummaries.length}</div></div>
        <div className="summary-card"><div className="muted">Logical domains</div><div className="value">{synthesized.logicalDomains.length}</div></div>
        <div className="summary-card"><div className="muted">Address rows</div><div className="value">{synthesized.addressingPlan.length}</div></div>
        <div className="summary-card"><div className="muted">Configured rows</div><div className="value">{synthesized.stats.configuredSegments}</div></div>
        <div className="summary-card"><div className="muted">Proposed rows</div><div className="value">{synthesized.stats.proposedSegments}</div></div>
        <div className="summary-card"><div className="muted">Transit links</div><div className="value">{synthesized.wanLinks.length}</div></div>
        <div className="summary-card"><div className="muted">Security zones</div><div className="value">{synthesized.securityZones.length}</div></div>
        <div className="summary-card"><div className="muted">Routing policies</div><div className="value">{synthesized.routePolicies.length}</div></div>
        <div className="summary-card"><div className="muted">Implementation phases</div><div className="value">{synthesized.implementationPhases.length}</div></div>
        <div className="summary-card"><div className="muted">Rollback triggers</div><div className="value">{synthesized.rollbackPlan.length}</div></div>
        <div className="summary-card"><div className="muted">Config templates</div><div className="value">{synthesized.configurationTemplates.length}</div></div>
        <div className="summary-card"><div className="muted">BOM line items</div><div className="value">{platformFoundation.totals.lineItems}</div></div>
      </div>

      <div className="panel report-section">
        <h2>Current-State Discovery and Gap Baseline</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          This section captures what is known about the existing environment before the target design is implemented. It is the start of discovery/current-state ingestion, not yet a full automated assessment.
        </p>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Current-state highlights</h3>
            {discoverySummary.currentStateHighlights.length === 0 ? <p className="muted" style={{ margin: 0 }}>No discovery baseline has been saved yet for this project.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {discoverySummary.currentStateHighlights.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
              </ul>
            )}
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Known gaps and constraints</h3>
            <div className="grid-2" style={{ alignItems: "start" }}>
              <div>
                <strong>Gap inputs</strong>
                {discoverySummary.gaps.length === 0 ? <p className="muted" style={{ margin: '6px 0 0' }}>No explicit pain points captured yet.</p> : (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {discoverySummary.gaps.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
                  </ul>
                )}
              </div>
              <div>
                <strong>Constraints</strong>
                {discoverySummary.constraints.length === 0 ? <p className="muted" style={{ margin: '6px 0 0' }}>No constraints captured yet.</p> : (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {discoverySummary.constraints.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
                  </ul>
                )}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to={`/projects/${projectId}/discovery`} className="link-button">Open Discovery Workspace</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Executive Summary</h2>
        <p className="muted" style={{ marginTop: 0 }}>{summary}</p>
        <div style={{ display: "grid", gap: 10 }}>
          {synthesized.designSummary.map((item) => (
            <div key={item} className="trust-note">
              <p className="muted" style={{ margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel report-section">
        <h2>High-Level Design</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <tbody>
              <tr><th align="left">Architecture pattern</th><td>{synthesized.highLevelDesign.architecturePattern}</td></tr>
              <tr><th align="left">Layer model</th><td>{synthesized.highLevelDesign.layerModel}</td></tr>
              <tr><th align="left">WAN architecture</th><td>{synthesized.highLevelDesign.wanArchitecture}</td></tr>
              <tr><th align="left">Cloud / hybrid posture</th><td>{synthesized.highLevelDesign.cloudArchitecture}</td></tr>
              <tr><th align="left">Data center / services posture</th><td>{synthesized.highLevelDesign.dataCenterArchitecture}</td></tr>
              <tr><th align="left">Redundancy model</th><td>{synthesized.highLevelDesign.redundancyModel}</td></tr>
              <tr><th align="left">Routing strategy</th><td>{synthesized.highLevelDesign.routingStrategy}</td></tr>
              <tr><th align="left">Switching strategy</th><td>{synthesized.highLevelDesign.switchingStrategy}</td></tr>
              <tr><th align="left">Segmentation strategy</th><td>{synthesized.highLevelDesign.segmentationStrategy}</td></tr>
              <tr><th align="left">Security architecture</th><td>{synthesized.highLevelDesign.securityArchitecture}</td></tr>
              <tr><th align="left">Wireless architecture</th><td>{synthesized.highLevelDesign.wirelessArchitecture}</td></tr>
              <tr><th align="left">Operations posture</th><td>{synthesized.highLevelDesign.operationsArchitecture}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {synthesized.highLevelDesign.rationale.map((item) => (
            <div key={item} className="trust-note">
              <p className="muted" style={{ margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel report-section">
        <h2>Logical Domains and Trust Boundaries</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Domain</th>
                <th align="left">Segments</th>
                <th align="left">Purpose</th>
                <th align="left">Placement</th>
                <th align="left">Policy intent</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.logicalDomains.map((domain) => (
                <tr key={domain.name}>
                  <td>{domain.name}</td>
                  <td>{domain.segments.join(", ") || "—"}</td>
                  <td>{domain.purpose}</td>
                  <td>{domain.placement}</td>
                  <td>{domain.policy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Routing and Switching Design Intent</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Protocol / transport</th>
                <th align="left">Scope</th>
                <th align="left">Purpose</th>
                <th align="left">Recommendation</th>
                <th align="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.routingProtocols.map((item) => (
                <tr key={item.protocol + item.scope}>
                  <td>{item.protocol}</td>
                  <td>{item.scope}</td>
                  <td>{item.purpose}</td>
                  <td>{item.recommendation}</td>
                  <td>{item.notes.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-2" style={{ marginTop: 14, alignItems: "start" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Route policy</th>
                  <th align="left">Scope</th>
                  <th align="left">Intent</th>
                  <th align="left">Recommendation</th>
                  <th align="left">Risk if skipped</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.routePolicies.map((item) => (
                  <tr key={item.policyName}>
                    <td>{item.policyName}</td>
                    <td>{item.scope}</td>
                    <td>{item.intent}</td>
                    <td>{item.recommendation}</td>
                    <td>{item.riskIfSkipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <h3 style={{ marginTop: 0 }}>Switching design controls</h3>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                {synthesized.switchingDesign.map((item) => (
                  <li key={item.topic}><strong>{item.topic}:</strong> {item.recommendation} <span className="muted">{item.implementationHint}</span></li>
                ))}
              </ul>
            </div>
            <div className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <h3 style={{ marginTop: 0 }}>QoS and routing review</h3>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                {synthesized.qosPlan.map((item) => (
                  <li key={item.trafficClass}><strong>{item.trafficClass}:</strong> {item.treatment} <span className="muted">{item.scope}</span></li>
                ))}
              </ul>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {synthesized.routingSwitchingReview.map((item) => (
                  <div key={item.title} className="trust-note">
                    <strong>{item.title}</strong>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Security Architecture and Segmentation</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Security zone</th>
                <th align="left">Type</th>
                <th align="left">Segments</th>
                <th align="left">Trust level</th>
                <th align="left">Enforcement</th>
                <th align="left">North-south policy</th>
                <th align="left">East-west policy</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.securityZones.map((zone) => (
                <tr key={zone.zoneName}>
                  <td>{zone.zoneName}</td>
                  <td>{zone.zoneType}</td>
                  <td>{zone.segments.join(", ") || "—"}</td>
                  <td>{zone.trustLevel}</td>
                  <td>{zone.enforcement}</td>
                  <td>{zone.northSouthPolicy}</td>
                  <td>{zone.eastWestPolicy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-2" style={{ alignItems: "start", marginTop: 14 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Control recommendations</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {synthesized.securityControls.map((item) => (
                <li key={item.control} style={{ marginBottom: 8 }}><strong>{item.control}</strong> ({item.status}) — {item.implementationHint}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Segmentation review</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {synthesized.segmentationReview.map((item) => (
                <li key={`${item.severity}-${item.title}`} style={{ marginBottom: 8 }}><strong>{item.title}</strong> ({item.severity}) — {item.detail}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Security Policy Intent Matrix</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Source zone</th>
                <th align="left">Target zone</th>
                <th align="left">Default action</th>
                <th align="left">Allowed flows</th>
                <th align="left">Control point</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.securityPolicyMatrix.map((row) => (
                <tr key={`${row.sourceZone}-${row.targetZone}`}>
                  <td>{row.sourceZone}</td>
                  <td>{row.targetZone}</td>
                  <td>{row.defaultAction}</td>
                  <td>{row.allowedFlows}</td>
                  <td>{row.controlPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Low-Level Design by Site</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {synthesized.lowLevelDesign.map((site) => (
            <div key={site.siteId} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{site.siteName}{site.siteCode ? ` • ${site.siteCode}` : ""}</strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>{site.siteRole}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge-soft">Summary {site.summaryRoute || "Pending"}</span>
                  <span className="badge-soft">Loopback {site.loopbackCidr || "Pending"}</span>
                  <span className="badge-soft">Local segments {site.localSegmentCount}</span>
                  <span className="badge-soft">Transit {site.transitAdjacencyCount}</span>
                </div>
              </div>
              <div className="grid-2" style={{ alignItems: "start", marginTop: 14 }}>
                <div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li><strong>Layer model:</strong> {site.layerModel}</li>
                    <li><strong>Routing role:</strong> {site.routingRole}</li>
                    <li><strong>Switching profile:</strong> {site.switchingProfile}</li>
                    <li><strong>Security boundary:</strong> {site.securityBoundary}</li>
                    <li><strong>Service model:</strong> {site.localServiceModel}</li>
                    <li><strong>Wireless model:</strong> {site.wirelessModel}</li>
                    <li><strong>Physical assumption:</strong> {site.physicalAssumption}</li>
                  </ul>
                </div>
                <div>
                  <p style={{ marginTop: 0, marginBottom: 8 }}><strong>Segment footprint</strong></p>
                  <p className="muted" style={{ marginTop: 0 }}>{site.localSegments.length > 0 ? site.localSegments.join(", ") : "No routed local segments yet."}</p>
                  <p style={{ marginBottom: 8 }}><strong>Implementation focus</strong></p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {site.implementationFocus.map((item) => (
          <li key={item} style={{ marginBottom: 8 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel report-section">
          <h2>Site Address Hierarchy</h2>
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">Source</th>
                <th align="left">Site Block</th>
                <th align="left">Allocated</th>
                <th align="left">Headroom</th>
                <th align="left">Summary Target</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.siteHierarchy.map((site) => (
                <tr key={site.id}>
                  <td>{site.name}{site.siteCode ? ` • ${site.siteCode}` : ""}</td>
                  <td>{site.source === "configured" ? "Configured" : "Proposed"}</td>
                  <td>{site.siteBlockCidr || "—"}</td>
                  <td>{site.allocatedSegmentAddresses}</td>
                  <td>{site.blockHeadroomAddresses}</td>
                  <td>{site.summarizationTarget || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel report-section">
          <h2>Routing and Summarization Plan</h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Site</th>
                  <th align="left">Summary Route</th>
                  <th align="left">Loopback</th>
                  <th align="left">Transit Links</th>
                  <th align="left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.routingPlan.map((item) => (
                  <tr key={item.siteId}>
                    <td>{item.siteName}{item.siteCode ? ` • ${item.siteCode}` : ""}</td>
                    <td>{item.summaryAdvertisement || "—"}</td>
                    <td>{item.loopbackCidr || "—"}</td>
                    <td>{item.transitAdjacencyCount}</td>
                    <td>{item.notes.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>WAN and Cloud Edge Plan</h2>
        {synthesized.wanLinks.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No dedicated WAN or cloud transit links are required by the current saved scope.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Link</th>
                  <th align="left">Transport</th>
                  <th align="left">Transit Pool</th>
                  <th align="left">Subnet</th>
                  <th align="left">Endpoint A</th>
                  <th align="left">Endpoint B</th>
                  <th align="left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.wanLinks.map((link) => (
                  <tr key={link.id}>
                    <td>{link.linkName}</td>
                    <td>{link.transport}</td>
                    <td>{link.parentBlockCidr || "—"}</td>
                    <td>{link.subnetCidr}</td>
                    <td>{link.endpointASiteName} • {link.endpointAIp}</td>
                    <td>{link.endpointBSiteName} • {link.endpointBIp}</td>
                    <td>{link.notes.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel report-section">
        <h2>Requirement-to-Design Traceability</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Design Topic</th>
                <th align="left">Requirement Trigger</th>
                <th align="left">Design Outcome</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.traceability.map((item) => (
                <tr key={item.title}>
                  <td>{item.title}</td>
                  <td>{item.requirement}</td>
                  <td>{item.designOutcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Full Addressing Plan</h2>
        <p className="muted">This remains the central LLD artifact: every row shows where the segment lives, what its subnet is, what gateway it uses, and how much host headroom remains.</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">Type</th>
                <th align="left">VLAN</th>
                <th align="left">Segment</th>
                <th align="left">Purpose</th>
                <th align="left">Subnet</th>
                <th align="left">Mask</th>
                <th align="left">Gateway</th>
                <th align="left">DHCP Range</th>
                <th align="left">Static Reserve</th>
                <th align="left">Usable</th>
                <th align="left">Estimated</th>
                <th align="left">Headroom</th>
                <th align="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.addressingPlan.map((row) => (
                <tr key={row.id}>
                  <td>{row.siteName}</td>
                  <td>{row.source === "configured" ? "Configured" : "Proposed"}</td>
                  <td>{row.vlanId ?? "—"}</td>
                  <td>{row.segmentName}</td>
                  <td>{row.purpose}</td>
                  <td>{row.subnetCidr}</td>
                  <td>{row.mask}</td>
                  <td>{row.gatewayIp}</td>
                  <td>{row.dhcpRange || (row.dhcpEnabled ? "Pending" : "No DHCP")}</td>
                  <td>{row.staticReserve || "—"}</td>
                  <td>{row.usableHosts || "—"}</td>
                  <td>{row.estimatedHosts || "—"}</td>
                  <td>{row.usableHosts > 0 ? row.headroom : "—"}</td>
                  <td>{row.notes.length > 0 ? row.notes.join(" ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Implementation and Migration Plan</h2>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <p className="muted" style={{ marginTop: 0 }}><strong>Rollout:</strong> {synthesized.implementationPlan.rolloutStrategy}</p>
            <p className="muted"><strong>Migration:</strong> {synthesized.implementationPlan.migrationStrategy}</p>
            <p className="muted"><strong>Downtime:</strong> {synthesized.implementationPlan.downtimePosture}</p>
            <p className="muted"><strong>Validation:</strong> {synthesized.implementationPlan.validationApproach}</p>
            <p className="muted" style={{ marginBottom: 0 }}><strong>Rollback:</strong> {synthesized.implementationPlan.rollbackPosture}</p>
          </div>
          <div>
            <p className="muted" style={{ marginTop: 0 }}><strong>Team model:</strong> {synthesized.implementationPlan.teamExecutionModel}</p>
            <p className="muted"><strong>Timeline:</strong> {synthesized.implementationPlan.timelineGuidance}</p>
            <p className="muted" style={{ marginBottom: 0 }}><strong>Handoff package:</strong> {synthesized.implementationPlan.handoffPackage}</p>
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th align="left">Phase</th>
                <th align="left">Objective</th>
                <th align="left">Scope</th>
                <th align="left">Success criteria</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.implementationPhases.map((phase) => (
                <tr key={phase.phase}>
                  <td>{phase.phase}</td>
                  <td>{phase.objective}</td>
                  <td>{phase.scope}</td>
                  <td>{phase.successCriteria.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Platform Profile and Bill of Materials Foundation</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          This section captures the deployment posture behind the design and the first role-based material estimate that engineering can use before exact platform models, licensing quantities, and quotes are finalized.
        </p>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <p className="muted" style={{ marginTop: 0 }}><strong>Profile:</strong> {platformFoundation.platformSummary.profileLabel}</p>
            <p className="muted"><strong>Deployment class:</strong> {platformFoundation.platformSummary.deploymentClass}</p>
            <p className="muted"><strong>Management style:</strong> {platformFoundation.platformSummary.managementStyle}</p>
            <p className="muted" style={{ marginBottom: 0 }}><strong>Operations fit:</strong> {platformFoundation.platformSummary.operationsFit}</p>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Compatibility notes</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {platformFoundation.platformSummary.compatibilityNotes.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th align="left">Category</th>
                <th align="left">Item</th>
                <th align="left">Qty</th>
                <th align="left">Unit</th>
                <th align="left">Scope</th>
                <th align="left">Basis</th>
                <th align="left">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {platformFoundation.bomItems.map((item) => (
                <tr key={`${item.category}-${item.item}`}>
                  <td>{item.category}</td>
                  <td>{item.item}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{item.scope}</td>
                  <td>{item.basis}</td>
                  <td>{item.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-2" style={{ alignItems: "start", marginTop: 16 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>BOM assumptions</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {platformFoundation.bomAssumptions.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Procurement and support notes</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {[...platformFoundation.procurementNotes, ...platformFoundation.licensingAndSupport].map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel report-section">
        <h2>Configuration Standards and Template Artifacts</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          This section turns the logical design into implementation-ready baseline guidance. It is not meant to replace final vendor-specific configs yet, but it should give engineering a repeatable standard pack to build from.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Topic</th>
                <th align="left">Standard</th>
                <th align="left">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.configurationStandards.map((item) => (
                <tr key={item.topic}>
                  <td>{item.topic}</td>
                  <td>{item.standard}</td>
                  <td>{item.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          {synthesized.configurationTemplates.map((template) => (
            <div key={template.name} className="trust-note">
              <strong style={{ display: "block", marginBottom: 8 }}>{template.name}</strong>
              <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}><strong>Scope:</strong> {template.scope}</p>
              <p className="muted" style={{ marginTop: 0 }}><strong>Intent:</strong> {template.intent}</p>
              <p style={{ marginBottom: 8 }}><strong>Includes:</strong> {template.includes.join('; ')}</p>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.45 }}>{template.sampleLines.join("\n")}</pre>
            </div>
          ))}
        </div>
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th align="left">Operations artifact</th>
                <th align="left">Purpose</th>
                <th align="left">Owner</th>
                <th align="left">Timing</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.operationsArtifacts.map((item) => (
                <tr key={item.artifact}>
                  <td>{item.artifact}</td>
                  <td>{item.purpose}</td>
                  <td>{item.owner}</td>
                  <td>{item.timing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel report-section">
          <h2>Cutover and Rollback Controls</h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Stage / Trigger</th>
                  <th align="left">Action or checklist item</th>
                  <th align="left">Owner / Scope</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.cutoverChecklist.map((item) => (
                  <tr key={item.stage + item.item}>
                    <td style={{ textTransform: "capitalize" }}>{item.stage}</td>
                    <td>{item.item}</td>
                    <td>{item.owner}</td>
                  </tr>
                ))}
                {synthesized.rollbackPlan.map((item) => (
                  <tr key={item.trigger}>
                    <td>{item.trigger}</td>
                    <td>{item.action}</td>
                    <td>{item.scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel report-section">
          <h2>Validation Evidence and Implementation Risks</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {synthesized.implementationRisks.map((risk) => (
              <div key={risk.title} className="validation-card">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={risk.severity === "critical" ? "badge badge-error" : risk.severity === "warning" ? "badge badge-warning" : "badge badge-info"}>{risk.severity}</span>
                  <span className="badge-soft">{risk.owner}</span>
                </div>
                <strong>{risk.title}</strong>
                <p className="muted" style={{ marginBottom: 0 }}>{risk.mitigation}</p>
              </div>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Stage</th>
                  <th align="left">Test</th>
                  <th align="left">Expected outcome</th>
                  <th align="left">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.validationPlan.map((item) => (
                  <tr key={item.stage + item.test}>
                    <td>{item.stage}</td>
                    <td>{item.test}</td>
                    <td>{item.expectedOutcome}</td>
                    <td>{item.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel report-section">
          <h2>Open Issues and Risks</h2>
          {synthesized.openIssues.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No major open issues are currently surfaced by the synthesis engine.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {synthesized.openIssues.map((issue) => (
                <li key={issue} style={{ marginBottom: 8 }}>{issue}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel report-section">
          <h2>Implementation Readiness Actions</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {synthesized.implementationNextSteps.map((step) => (
              <li key={step} style={{ marginBottom: 8 }}>{step}</li>
            ))}
          </ul>
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
