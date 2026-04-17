import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import { useProject, useProjectSites, useProjectVlans, useUpdateProject } from "../features/projects/hooks";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import {
  clearPlatformProfileState,
  emptyPlatformProfileState,
  resolvePlatformProfileState,
  savePlatformProfileState,
  synthesizePlatformBomFoundation,
  type PlatformProfileState,
} from "../lib/platformBomFoundation";

function summaryCard(label: string, value: number | string, note?: string) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="muted" style={{ marginBottom: 8 }}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      {note ? <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{note}</p> : null}
    </div>
  );
}

function selectField(label: string, description: string, value: string, options: string[], onChange: (next: string) => void) {
  return (
    <label className="field" style={{ display: "grid", gap: 8 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span className="muted">{description}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function ProjectPlatformBomPage() {
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

  const updateProjectMutation = useUpdateProject(projectId);
  const [state, setState] = useState<PlatformProfileState>(emptyPlatformProfileState());
  const [loaded, setLoaded] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  useEffect(() => {
    if (!projectId) return;
    const resolved = resolvePlatformProfileState(projectId, project);
    setState(resolved);
    setLoaded(true);
  }, [projectId, project?.platformProfileJson]);

  const foundation = useMemo(
    () => synthesizePlatformBomFoundation({ project, sites, vlans, profile: requirementsProfile, synthesized, state }),
    [project, sites, vlans, requirementsProfile, synthesized, state],
  );

  const updateState = (patch: Partial<PlatformProfileState>) => {
    setState((current) => ({ ...current, ...patch }));
    setSaveNotice("");
  };

  const saveNow = async () => {
    const payload: PlatformProfileState = {
      ...state,
      lastSavedAt: new Date().toISOString(),
    };
    await updateProjectMutation.mutateAsync({ platformProfileJson: JSON.stringify(payload) });
    savePlatformProfileState(projectId, payload);
    setState(payload);
    setSaveNotice(`Saved to shared project data • ${new Date(payload.lastSavedAt || new Date().toISOString()).toLocaleString()}`);
  };

  const clearAll = async () => {
    clearPlatformProfileState(projectId);
    await updateProjectMutation.mutateAsync({ platformProfileJson: JSON.stringify(emptyPlatformProfileState()) });
    setState(emptyPlatformProfileState());
    setSaveNotice("Platform profile and BOM inputs cleared from shared project data for this project.");
  };

  if (projectQuery.isLoading || !loaded) {
    return <LoadingState title="Loading platform and BOM workspace" message="Preparing the deployment profile and bill-of-materials foundation." />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Unable to load platform and BOM workspace"
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
        title="Platform Profile & Bill of Materials"
        description="This workspace turns the logical design into a platform-aware delivery foundation: deployment posture, supportability assumptions, and a role-based BOM that engineering can review before exact models or SKUs are chosen."
        actions={
          <>
            <Link to={`/projects/${projectId}/logical-design`} className="link-button">Logical Design</Link>
            <Link to={`/projects/${projectId}/standards`} className="link-button">Config Standards</Link>
            <Link to={`/projects/${projectId}/implementation`} className="link-button">Implementation</Link>
            <Link to={`/projects/${projectId}/report`} className="link-button">Report</Link>
          </>
        }
      />

      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">{foundation.platformSummary.profileLabel}</span>
          <span className="badge-soft">{foundation.platformSummary.deploymentClass}</span>
          <span className="badge-soft">Shared project persistence</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          The logical design is already telling SubnetOps what kind of network is being built. This page adds the delivery posture around it so outputs become more realistic for procurement, support, and implementation planning.
        </p>
        <div className="form-actions">
          <button type="button" className="button" onClick={() => void saveNow()} disabled={updateProjectMutation.isPending}>
            {updateProjectMutation.isPending ? "Saving..." : "Save platform profile"}
          </button>
          <button type="button" className="button button-secondary" onClick={() => void clearAll()} disabled={updateProjectMutation.isPending}>Clear platform profile</button>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {saveNotice || (state.lastSavedAt ? `Last saved to project data: ${new Date(state.lastSavedAt).toLocaleString()}` : "No shared platform profile saved yet for this project.")}
        </p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {summaryCard("BOM line items", foundation.totals.lineItems, "Role-based, not final SKU precision.")}
        {summaryCard("Hardware categories", foundation.totals.hardwareCategories, "Switching, security, wireless, WAN, support, and physical support.")}
        {summaryCard("Review-heavy items", foundation.totals.reviewItems, "Items that still need engineering or procurement review.")}
        {summaryCard("Transit-aware design", synthesized.wanLinks.length, "WAN and edge links influencing the BOM foundation.")}
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: 0 }}>Platform deployment profile</h2>
        <p className="muted" style={{ margin: 0 }}>
          This is the delivery posture behind the design. It lets SubnetOps shape BOM and implementation guidance around a real support and platform story rather than generic best practice alone.
        </p>
        <div className="grid-2" style={{ alignItems: "start" }}>
          {selectField("Platform mode", "Overall shape of the environment being designed.", state.platformMode, [
            "traditional campus and branch",
            "cloud-managed branch and campus",
            "security-centric edge and branch",
            "hybrid enterprise with cloud edge",
            "lean SMB with simplified operations",
          ], (next) => updateState({ platformMode: next }))}
          {selectField("Vendor strategy", "How standardized or mixed the environment should be.", state.vendorStrategy, [
            "mixed vendor with practical standardization",
            "Cisco-first campus and branch",
            "Aruba and security-vendor mix",
            "Fortinet-centric branch and security",
            "Meraki cloud-managed approach",
            "Juniper / enterprise routing-led approach",
          ], (next) => updateState({ vendorStrategy: next }))}
          {selectField("Routing stack", "Routing and WAN capability posture.", state.routingStack, [
            "enterprise routed core and branch edge",
            "collapsed routed access with simple edge control",
            "SD-WAN-ready branch and core routing",
            "mostly static edge with limited dynamic routing",
          ], (next) => updateState({ routingStack: next }))}
          {selectField("Switching stack", "Expected switching platform style.", state.switchingStack, [
            "stackable campus switching",
            "modular core plus stackable access",
            "cloud-managed switching",
            "simplified branch switching with limited distribution layer",
          ], (next) => updateState({ switchingStack: next }))}
          {selectField("Firewall stack", "Security platform posture.", state.firewallStack, [
            "NGFW at primary edge and policy boundaries",
            "branch firewall plus central policy stack",
            "single primary firewall with simpler branches",
            "service-provider or cloud edge security controls",
          ], (next) => updateState({ firewallStack: next }))}
          {selectField("Wireless stack", "Wireless control style.", state.wirelessStack, [
            "controller or cloud-managed enterprise wireless",
            "cloud-managed wireless",
            "controller-based campus wireless",
            "minimal wireless footprint",
          ], (next) => updateState({ wirelessStack: next }))}
          {selectField("WAN stack", "Provider and transport posture.", state.wanStack, [
            "business WAN with VPN or SD-WAN evolution path",
            "dual-ISP internet edge with VPN overlays",
            "MPLS or managed WAN with migration path",
            "simple broadband edge per site",
          ], (next) => updateState({ wanStack: next }))}
          {selectField("Cloud edge", "How hybrid/cloud connectivity is expected to be supported.", state.cloudStack, [
            "hybrid-ready with secure cloud edge",
            "limited cloud edge with VPN-only connectivity",
            "major cloud integration with dedicated review",
            "mostly on-prem with future cloud option",
          ], (next) => updateState({ cloudStack: next }))}
          {selectField("Operations model", "Who will run this after handoff.", state.operationsModel, [
            "small internal team with repeatable standards",
            "generalist admin or light IT ownership",
            "mature network team with review discipline",
            "MSP or outsourced operations model",
          ], (next) => updateState({ operationsModel: next }))}
          {selectField("Automation readiness", "How much configuration generation and consistency can be assumed.", state.automationReadiness, [
            "template-driven with light automation",
            "mostly manual with standard templates",
            "automation-ready with strong standards",
            "minimal automation maturity today",
          ], (next) => updateState({ automationReadiness: next }))}
          {selectField("Availability tier", "Resilience and outage posture.", state.availabilityTier, [
            "business-critical with controlled resilience",
            "standard business availability",
            "high-availability or compliance-sensitive",
            "cost-controlled with limited resilience",
          ], (next) => updateState({ availabilityTier: next }))}
          {selectField("Support model", "How support and lifecycle coverage should be treated.", state.supportModel, [
            "vendor support plus internal operational ownership",
            "internal ownership with selective vendor support",
            "MSP support with escalation to vendors",
            "cost-sensitive support posture requiring review",
          ], (next) => updateState({ supportModel: next }))}
          {selectField("Procurement model", "How the BOM should be treated at this stage.", state.procurementModel, [
            "role-based BOM with final engineering review",
            "budget-first BOM with staged procurement",
            "standardized platform BOM with strict review gates",
            "placeholder BOM pending vendor selection",
          ], (next) => updateState({ procurementModel: next }))}
          {selectField("Lifecycle policy", "Refresh and supportability expectations.", state.lifecyclePolicy, [
            "standard refresh and supportability review",
            "reuse where supportable with selective refresh",
            "refresh-first due to aging platform risk",
            "cost-sensitive reuse requiring exception tracking",
          ], (next) => updateState({ lifecyclePolicy: next }))}
        </div>
        <label className="field" style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>Extra platform notes</span>
          <span className="muted">Use this for partner standards, preferred vendors, forbidden platforms, quote constraints, or model-family notes.</span>
          <textarea
            value={state.notesText}
            onChange={(event) => updateState({ notesText: event.target.value })}
            rows={5}
            style={{ resize: "vertical" }}
            placeholder="Primary site may prefer stacked campus switches only. Existing firewall support contract should be reused if possible. Cloud-managed wireless acceptable, but routing edge must stay engineer-friendly."
          />
        </label>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Platform fit and compatibility</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {foundation.platformSummary.highlights.map((item) => (
              <div key={item} className="trust-note"><p className="muted" style={{ margin: 0 }}>{item}</p></div>
            ))}
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Compatibility notes</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {foundation.platformSummary.compatibilityNotes.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Deployment risks</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {foundation.platformSummary.deploymentRisks.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>BOM assumptions and procurement notes</h2>
          <div>
            <h3 style={{ marginBottom: 8 }}>Assumptions</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {foundation.bomAssumptions.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Procurement notes</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {foundation.procurementNotes.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Licensing and support posture</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {foundation.licensingAndSupport.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Role-based bill of materials foundation</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is the first procurement-ready output layer. It is intentionally role-based so the BOM stays honest about what is known now and what still needs exact model or SKU decisions.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
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
              {foundation.bomItems.map((item) => (
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
        <div className="grid-2" style={{ alignItems: "start" }}>
          {foundation.bomItems.map((item) => (
            <div key={`${item.category}-${item.item}-notes`} className="trust-note">
              <strong>{item.category}: {item.item}</strong>
              <p className="muted" style={{ margin: "8px 0" }}>{item.scope} • {item.quantity} {item.unit}</p>
              {item.notes.length > 0 ? <p className="muted" style={{ margin: 0 }}>{item.notes.join(" ")}</p> : null}
            </div>
          )).slice(0, 6)}
        </div>
      </div>
    </section>
  );
}
