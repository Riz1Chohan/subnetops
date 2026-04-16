import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { SectionHeader } from "../components/app/SectionHeader";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { LoadingState } from "../components/app/LoadingState";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useValidationResults } from "../features/validation/hooks";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";

function summaryCard(label: string, value: number | string, detail?: string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      {detail ? <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{detail}</p> : null}
    </div>
  );
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ProjectAddressingPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationQuery = useValidationResults(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const validations = validationQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const synthesized = useMemo(
    () => synthesizeLogicalDesign(project, sites, vlans, requirementsProfile),
    [project, sites, vlans, requirementsProfile],
  );

  const errorCount = validations.filter((item) => item.severity === "ERROR").length;
  const warningCount = validations.filter((item) => item.severity === "WARNING").length;

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading addressing plan" message="Composing the site hierarchy, segment model, and full logical address table." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load addressing plan"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load the synthesized addressing plan right now."}
      />
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested project could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Addressing Plan"
        description="This is the main engineering output of SubnetOps: organization block, site summary blocks, recommended segment model, and the full logical addressing table before implementation begins."
        actions={
          <>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Logical Design</Link>
            <Link to={`/projects/${projectId}/validation`} className="link-button">Validation</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Report</Link>
          </>
        }
      />

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div className="trust-note">
          <p className="muted" style={{ margin: 0 }}>
            <strong>{synthesized.designEngineFoundation.stageLabel}:</strong> {synthesized.designEngineFoundation.summary}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Organization block {synthesized.organizationBlock}</span>
          {project.environmentType ? <span className="badge-soft">{project.environmentType}</span> : null}
          <span className="badge-soft">{synthesized.siteHierarchy.length} site(s)</span>
          <span className="badge-soft">{synthesized.addressingPlan.length} rows</span>
          <span className="badge-soft">Validation {errorCount} errors / {warningCount} warnings</span>
          {synthesized.organizationBlockAssumed ? <span className="badge-soft">Working range assumed</span> : null}
        </div>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>{project.name}</h2>
          <p className="muted" style={{ margin: 0 }}>
            The purpose of this page is to show the real planning result: what address hierarchy the project is using, what segments exist or are still proposed,
            how much capacity each part of the design has, and where the design still needs attention before configs are written.
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {summaryCard("Organization capacity", synthesized.organizationHierarchy.organizationCapacity || "—", synthesized.organizationHierarchy.organizationCapacity ? `${synthesized.organizationHierarchy.allocatedSiteAddresses} addresses allocated to site blocks` : "Save a real project base range to lock the hierarchy." )}
        {summaryCard("Organization utilization", percentLabel(synthesized.organizationHierarchy.organizationUtilization), `${synthesized.organizationHierarchy.organizationHeadroom} addresses still unallocated at org level`)}
        {summaryCard("Segment rows", synthesized.addressingPlan.length, `${synthesized.stats.configuredSegments} configured • ${synthesized.stats.proposedSegments} proposed`)}
        {summaryCard("WAN / cloud links", synthesized.wanLinks.length, synthesized.wanLinks.length > 0 ? `${synthesized.wanReserveBlock || "Transit pool pending"} reserved for routing edges` : "No dedicated WAN or cloud transport links are needed for the saved scope." )}
        {summaryCard("Open issues", synthesized.openIssues.length, synthesized.openIssues.length > 0 ? "These are the design gaps to resolve before implementation." : "No major addressing issues are currently surfaced." )}
      </div>

      <div className="grid-2" style={{ alignItems: "start", gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>What this page is supposed to answer</h2>
          <p className="muted" style={{ margin: 0 }}>
            Engineers and technical project managers should be able to look here and understand whether the logical design is actually usable: parent range, site blocks,
            subnet/VLAN structure, service ranges, capacity headroom, and which parts are still only proposed.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {synthesized.designSummary.map((line) => (
              <div key={line} className="trust-note">
                <p className="muted" style={{ margin: 0 }}>{line}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Segment model at a glance</h2>
          <div className="network-chip-list">
            {synthesized.segmentModel.map((segment) => (
              <span key={`${segment.role}-${segment.vlanId ?? "none"}-${segment.label}`} className="badge-soft">
                {segment.vlanId ? `VLAN ${segment.vlanId}` : segment.role}: {segment.label}
              </span>
            ))}
          </div>
          <p className="muted" style={{ margin: 0 }}>
            This is the logical segmentation model derived from requirements and compared against saved records. Proposed rows stay visible until they are accepted or replaced.
          </p>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Organization and site hierarchy</h2>
          <p className="muted" style={{ margin: 0 }}>
            A strong design starts at the parent range, assigns site summary blocks, and only then places child segments inside each site boundary.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">Type</th>
                <th align="left">Site Block</th>
                <th align="left">Block Capacity</th>
                <th align="left">Allocated to Segments</th>
                <th align="left">Planned Demand</th>
                <th align="left">Utilization</th>
                <th align="left">Headroom</th>
                <th align="left">Configured / Proposed</th>
                <th align="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.siteHierarchy.map((site) => (
                <tr key={site.id}>
                  <td>{site.name}{site.siteCode ? ` • ${site.siteCode}` : ""}</td>
                  <td>{site.source === "configured" ? "Configured" : "Proposed"}</td>
                  <td>{site.siteBlockCidr || "—"}</td>
                  <td>{site.blockCapacity || "—"}</td>
                  <td>{site.allocatedSegmentAddresses || 0}</td>
                  <td>{site.plannedDemandAddresses}</td>
                  <td>{site.blockCapacity > 0 ? percentLabel(site.blockUtilization) : "—"}</td>
                  <td>{site.blockCapacity > 0 ? site.blockHeadroomAddresses : "—"}</td>
                  <td>{site.configuredSegmentCount} / {site.proposedSegmentCount}</td>
                  <td>{site.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start", gridTemplateColumns: "1fr 1fr" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Routing and summarization handoff</h2>
            <p className="muted" style={{ margin: 0 }}>
              This view carries the site summary routes, loopback identities, and transit-adjacency expectations that should move into the routing implementation plan.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Site</th>
                  <th align="left">Summary Route</th>
                  <th align="left">Loopback</th>
                  <th align="left">Local Segments</th>
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
                    <td>{item.localSegmentCount}</td>
                    <td>{item.transitAdjacencyCount}</td>
                    <td>{item.notes.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>WAN and cloud edge transit plan</h2>
            <p className="muted" style={{ margin: 0 }}>
              Transit links are kept separate from user VLANs so inter-site and cloud routing can be reviewed before device configs are written.
            </p>
          </div>
          {synthesized.wanLinks.length === 0 ? (
            <div className="trust-note">
              <p className="muted" style={{ margin: 0 }}>No dedicated WAN or cloud transit links are required by the current scope.</p>
            </div>
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
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Implementation-ready handoff actions</h2>
          <p className="muted" style={{ margin: 0 }}>
            These are the immediate actions engineers and technical PMs should take to turn the logical design into an implementation package.
          </p>
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {synthesized.implementationNextSteps.map((step) => (
            <li key={step} style={{ marginBottom: 8 }}>{step}</li>
          ))}
        </ul>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Recommended segment model</h2>
          <p className="muted" style={{ margin: 0 }}>
            This view shows what the design engine believes the logical segmentation should look like across the project.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Role</th>
                <th align="left">VLAN</th>
                <th align="left">Segment</th>
                <th align="left">Purpose</th>
                <th align="left">DHCP</th>
                <th align="left">Sites</th>
                <th align="left">Configured</th>
                <th align="left">Proposed</th>
                <th align="left">Total Est. Hosts</th>
                <th align="left">Typical Prefix</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.segmentModel.map((segment) => (
                <tr key={`${segment.role}-${segment.vlanId ?? "none"}-${segment.label}`}>
                  <td>{segment.role.replace(/_/g, " ")}</td>
                  <td>{segment.vlanId ?? "—"}</td>
                  <td>{segment.label}</td>
                  <td>{segment.purpose}</td>
                  <td>{segment.dhcpEnabled ? "Yes" : "No"}</td>
                  <td>{segment.siteCount}</td>
                  <td>{segment.configuredCount}</td>
                  <td>{segment.proposedCount}</td>
                  <td>{segment.totalEstimatedHosts}</td>
                  <td>/{segment.recommendedPrefix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start", gridTemplateColumns: "1fr 1fr" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Design decisions and assumptions</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {synthesized.designReview.filter((item) => item.kind !== "risk").map((item) => (
              <div key={`${item.kind}-${item.title}`} className="validation-card">
                <strong>{item.title}</strong>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Open issues and risks</h2>
          {synthesized.openIssues.length === 0 ? (
            <div className="trust-note">
              <p className="muted" style={{ margin: 0 }}>No major addressing gaps are currently surfaced by the synthesis engine.</p>
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {synthesized.openIssues.map((issue) => (
                <li key={issue} style={{ marginBottom: 8 }}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Full logical addressing plan</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is the detailed table an engineer or technical PM should review before implementation. It shows where every segment lives, how it is serviced,
            how much host space it has, and whether it is already configured or still only proposed.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">Status</th>
                <th align="left">Site Block</th>
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
                <th align="left">Utilization</th>
                <th align="left">Placement</th>
                <th align="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {synthesized.addressingPlan.map((row) => (
                <tr key={row.id}>
                  <td>{row.siteName}</td>
                  <td>{row.source === "configured" ? "Configured" : "Proposed"}</td>
                  <td>{row.siteBlockCidr || "—"}</td>
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
                  <td>{row.usableHosts > 0 ? percentLabel(row.utilization) : "—"}</td>
                  <td>{row.insideSiteBlock === null ? "N/A" : row.insideSiteBlock ? "Inside block" : "Outside block"}</td>
                  <td>{row.notes.length > 0 ? row.notes.join(" ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
