import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { SectionHeader } from "../components/app/SectionHeader";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { LoadingState } from "../components/app/LoadingState";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
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

function severityBadge(severity: "critical" | "warning" | "info") {
  if (severity === "critical") return "badge badge-error";
  if (severity === "warning") return "badge badge-warning";
  return "badge badge-info";
}

export function ProjectRoutingPage() {
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
    return <LoadingState title="Loading routing and switching design" message="Composing protocol intent, route policy, QoS, and switching controls." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load routing and switching design"
        message={projectQuery.error instanceof Error ? projectQuery.error.message : "SubnetOps could not load the routing and switching view right now."}
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

  const criticalFindings = synthesized.routingSwitchingReview.filter((item) => item.severity === "critical").length;
  const warningFindings = synthesized.routingSwitchingReview.filter((item) => item.severity === "warning").length;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Routing & Switching Design"
        description="This workspace turns the logical design into an implementation-oriented routing and switching package: protocol intent, route policy, switching/L2 controls, QoS treatment, and design review findings."
        actions={
          <>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Logical Design</Link>
            <Link to={`/projects/${projectId}/addressing`} className="link-button">Addressing Plan</Link>
            <Link to={`/projects/${projectId}/security`} className="link-button">Security</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Report</Link>
          </>
        }
      />

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Protocols {synthesized.routingProtocols.length}</span>
          <span className="badge-soft">Route policies {synthesized.routePolicies.length}</span>
          <span className="badge-soft">Switching controls {synthesized.switchingDesign.length}</span>
          <span className="badge-soft">QoS classes {synthesized.qosPlan.length}</span>
          <span className="badge-soft">Review {criticalFindings} critical / {warningFindings} warning</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          A real design package should explain how routing works between sites and segments, where summarization happens, how Layer 2 fault domains are contained,
          how uplinks behave under failure, and what traffic classes deserve priority before implementation begins.
        </p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {summaryCard("Protocol decisions", synthesized.routingProtocols.length, "Internal and edge routing posture for the current design.")}
        {summaryCard("Route policies", synthesized.routePolicies.length, "Summarization, defaults, redistribution, and edge filtering.")}
        {summaryCard("Switching controls", synthesized.switchingDesign.length, "Layer 2 boundaries, loop prevention, uplinks, and access templates.")}
        {summaryCard("QoS classes", synthesized.qosPlan.length, "Traffic classes that deserve explicit treatment.")}
        {summaryCard("Open review findings", synthesized.routingSwitchingReview.filter((item) => item.severity !== "info").length, "Critical and warning items still needing engineering review.")}
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Routing protocol and transport intent</h2>
          <p className="muted" style={{ margin: 0 }}>
            These recommendations describe the internal routing posture, provider or cloud edge behavior, and how transport links should carry site summaries and control-plane identity.
          </p>
        </div>
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
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Route policy and summarization</h2>
            <p className="muted" style={{ margin: 0 }}>
              This is the policy layer behind the routing design: site summarization, default route ownership, redistribution boundaries, guest/cloud filtering, and control-plane discipline.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Policy</th>
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
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Switching design controls</h2>
            <p className="muted" style={{ margin: 0 }}>
              These controls describe how Layer 2 boundaries, loop prevention, uplink behavior, and first-hop gateway placement should support the routed design.
            </p>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {synthesized.switchingDesign.map((item) => (
              <div key={item.topic} className="trust-note">
                <strong>{item.topic}</strong>
                <p className="muted" style={{ margin: "8px 0" }}>{item.recommendation}</p>
                <p className="muted" style={{ margin: "0 0 8px" }}><strong>Implementation hint:</strong> {item.implementationHint}</p>
                <p className="muted" style={{ margin: 0 }}><strong>Why:</strong> {item.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>QoS and traffic treatment</h2>
            <p className="muted" style={{ margin: 0 }}>
              The QoS plan stays at design-intent level: which classes matter, how they should be treated, and where their markings or priority assumptions apply.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th align="left">Traffic class</th>
                  <th align="left">Treatment</th>
                  <th align="left">Marking</th>
                  <th align="left">Scope</th>
                  <th align="left">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {synthesized.qosPlan.map((item) => (
                  <tr key={item.trafficClass}>
                    <td>{item.trafficClass}</td>
                    <td>{item.treatment}</td>
                    <td>{item.marking}</td>
                    <td>{item.scope}</td>
                    <td>{item.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Routing and switching review</h2>
            <p className="muted" style={{ margin: 0 }}>
              These findings highlight where the routing and switching posture is still too weak, incomplete, or risky for a serious implementation handoff.
            </p>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {synthesized.routingSwitchingReview.map((item) => (
              <div key={item.title} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  <strong>{item.title}</strong>
                  <span className={severityBadge(item.severity)}>{item.severity}</span>
                </div>
                <p className="muted" style={{ margin: "0 0 8px" }}>{item.detail}</p>
                {item.affected.length > 0 ? <p className="muted" style={{ margin: 0 }}><strong>Affected:</strong> {item.affected.join(", ")}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
