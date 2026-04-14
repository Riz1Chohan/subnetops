import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";

function kpiCard(label: string, value: number | string, note?: string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      {note ? <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{note}</p> : null}
    </div>
  );
}

export function ProjectStandardsPage() {
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);

  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const requirementsProfile = parseRequirementsProfile(project?.requirementsJson);
  const synthesized = useMemo(
    () => synthesizeLogicalDesign(project, sites, vlans, requirementsProfile),
    [project, sites, vlans, requirementsProfile],
  );

  if (projectQuery.isLoading) {
    return <LoadingState title="Loading configuration standards" message="Preparing baseline standards and reusable template artifacts." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load configuration standards"
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
        title="Configuration Standards & Templates"
        description="This workspace turns the logical design into implementation-ready standards: baseline conventions, reusable template artifacts, and the operations items needed to deliver the project cleanly."
        actions={
          <>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Back to Logical Design</Link>
            <Link to={`/projects/${projectId}/routing`} className="link-button">Routing & Switching</Link>
            <Link to={`/projects/${projectId}/security`} className="link-button">Security</Link>
            <Link to={`/projects/${projectId}/implementation`} className="link-button">Implementation</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Report</Link>
          </>
        }
      />

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Naming {requirementsProfile.namingStandard}</span>
          <span className="badge-soft">Gateway {requirementsProfile.gatewayConvention}</span>
          <span className="badge-soft">Monitoring {requirementsProfile.monitoringModel}</span>
          <span className="badge-soft">Backup {requirementsProfile.backupPolicy}</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Senior-quality delivery needs more than a good design. It needs a repeatable baseline pack so the same naming, management,
          telemetry, routing, security, and interface expectations follow the project from design into implementation.
        </p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {kpiCard("Standards", synthesized.configurationStandards.length, "Core rules engineers should follow across the environment.")}
        {kpiCard("Template artifacts", synthesized.configurationTemplates.length, "Reusable build artifacts for device roles and control planes.")}
        {kpiCard("Operations items", synthesized.operationsArtifacts.length, "Handoff and evidence items that make deployment supportable.")}
        {kpiCard("Security zones referenced", synthesized.securityZones.length, "Templates stay tied to the actual trust boundaries.")}
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Core standards</h2>
          <p className="muted" style={{ margin: 0 }}>
            These are the minimum rules the build team should follow so site-by-site implementation still behaves like one coherent network.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Topic</th>
                <th align="left">Standard</th>
                <th align="left">Why it matters</th>
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
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Reusable template artifacts</h2>
          <p className="muted" style={{ margin: 0 }}>
            These are not vendor-perfect production configs yet. They are the implementation artifacts a strong engineering team would expect before touching live devices.
          </p>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {synthesized.configurationTemplates.map((template) => (
            <div key={template.name} className="panel" style={{ background: "rgba(15, 23, 42, 0.35)" }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: 6 }}>{template.name}</h3>
                  <p className="muted" style={{ margin: 0 }}><strong>Scope:</strong> {template.scope}</p>
                  <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}><strong>Intent:</strong> {template.intent}</p>
                </div>
                <div className="grid-2" style={{ alignItems: "start" }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 8 }}>Includes</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {template.includes.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 8 }}>Sample lines</strong>
                    <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.45 }}>{template.sampleLines.join("\n")}</pre>
                  </div>
                </div>
                {template.notes.length > 0 ? (
                  <div>
                    <strong style={{ display: "block", marginBottom: 8 }}>Notes</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {template.notes.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Operations and handoff artifacts</h2>
          <p className="muted" style={{ margin: 0 }}>
            A senior-grade delivery package includes the standards themselves and the artifacts needed to control rollout, exceptions, and post-change evidence.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th align="left">Artifact</th>
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
    </section>
  );
}
