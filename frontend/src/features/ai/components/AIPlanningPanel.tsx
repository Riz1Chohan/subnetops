import { useEffect, useMemo, useState } from "react";
import type { AIPlanDraft } from "../../../lib/types";
import { EmptyState } from "../../../components/app/EmptyState";
import { ErrorState } from "../../../components/app/ErrorState";
import { useGeneratePlanDraft } from "../hooks";

export interface AIUseDraftOptions {
  applyProjectFields: boolean;
  applySites: boolean;
  applyVlans: boolean;
}

interface AIPlanningPanelProps {
  onUseDraft: (draft: AIPlanDraft, options: AIUseDraftOptions) => void;
  seedPrompt?: string;
}

const starterPrompts = [
  {
    label: "Branch office",
    prompt: "1 HQ, 2 branch offices, isolated guest Wi-Fi, voice VLAN at all sites, servers at HQ, 80 users at HQ and 25 per branch.",
  },
  {
    label: "Clinic",
    prompt: "1 main clinic and 2 satellite clinics, clinical devices isolated from admin users, guest Wi-Fi at all sites, voice VLAN, imaging systems at the main site, about 60 staff at main clinic and 20 at each satellite.",
  },
  {
    label: "School lab",
    prompt: "1 campus with admin offices, student labs, classroom Wi-Fi, guest Wi-Fi, printers, voice, and servers. About 300 students, 40 staff, and separate management VLANs for infrastructure.",
  },
  {
    label: "Warehouse",
    prompt: "1 HQ and 3 warehouses, barcode scanners and IoT devices separated from office staff, guest Wi-Fi only at HQ, servers centralized at HQ, around 70 users at HQ and 15 office users per warehouse plus warehouse devices.",
  },
] as const;

function providerLabel(provider: AIPlanDraft["provider"]) {
  return provider === "openai" ? "Enhanced AI mode" : "Local draft mode";
}

export function AIPlanningPanel({ onUseDraft, seedPrompt }: AIPlanningPanelProps) {
  const [prompt, setPrompt] = useState("1 HQ, 2 branches, guest Wi-Fi isolated, servers at HQ, voice VLAN, 80 users at HQ and 25 per branch.");
  const [applyProjectFields, setApplyProjectFields] = useState(true);
  const [applySites, setApplySites] = useState(true);
  const [applyVlans, setApplyVlans] = useState(true);
  const mutation = useGeneratePlanDraft();
  const draft = mutation.data;

  useEffect(() => {
    if (applyVlans && !applySites) {
      setApplySites(true);
    }
  }, [applyVlans, applySites]);

  useEffect(() => {
    if (seedPrompt && seedPrompt.trim().length > 0) {
      setPrompt(seedPrompt);
    }
  }, [seedPrompt]);

  const selectedSummary = useMemo(() => {
    const parts = [] as string[];
    if (applyProjectFields) parts.push("project fields");
    if (applySites) parts.push("sites");
    if (applyVlans) parts.push("VLANs");
    return parts.length > 0 ? parts.join(", ") : "nothing selected";
  }, [applyProjectFields, applySites, applyVlans]);

  return (
    <section className="panel" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0" }}>AI planning assistant</h2>
          <p className="muted" style={{ margin: 0 }}>
            Describe the network in plain English. SubnetOps will generate a first draft with sites, VLANs, subnet sizes, and gateways.
          </p>
        </div>
        <span className="badge badge-info">Trust-first AI</span>
      </div>

      <div className="trust-note">
        <strong>How this draft works</strong>
        <p className="muted" style={{ margin: "6px 0 0 0" }}>
          The AI proposes a draft. You review it, choose which parts to apply, and can still edit every field before the project is saved.
        </p>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <strong>Starter prompts</strong>
        <div className="starter-prompt-grid">
          {starterPrompts.map((starter) => (
            <button key={starter.label} type="button" className="starter-chip" onClick={() => setPrompt(starter.prompt)}>
              {starter.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        rows={5}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Describe your network in plain English"
      />

      <div className="form-actions">
        <button
          type="button"
          disabled={mutation.isPending || prompt.trim().length < 10}
          onClick={() => mutation.mutate(prompt)}
        >
          {mutation.isPending ? "Generating draft..." : "Generate first draft"}
        </button>
      </div>

      {mutation.error ? (
        <ErrorState
          title="AI draft unavailable"
          message={mutation.error instanceof Error ? mutation.error.message : "Draft generation failed. You can continue manually or try again."}
        />
      ) : null}

      {draft ? (
        <div className="ai-draft-grid">
          <div className="panel" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Project draft</h3>
              <span className="badge badge-info">{providerLabel(draft.provider)}</span>
            </div>
            <div className="summary-grid">
              <div className="summary-card"><div className="muted">Sites</div><div className="value">{draft.sites.length}</div></div>
              <div className="summary-card"><div className="muted">VLANs</div><div className="value">{draft.vlans.length}</div></div>
            </div>
            <p><strong>Name:</strong> {draft.project.name}</p>
            <p><strong>Environment:</strong> {draft.project.environmentType || "Custom"}</p>
            <p><strong>Base range:</strong> {draft.project.basePrivateRange || "Not set"}</p>
            <p className="muted" style={{ marginBottom: 0 }}>{draft.project.description}</p>
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Why the AI suggested this</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {draft.rationale.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Assumptions to review</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {draft.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Check before saving</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {draft.reviewChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Suggested sites</h3>
            {draft.sites.length === 0 ? (
              <EmptyState title="No sites proposed" message="Adjust the prompt and try again if you expected site recommendations." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {draft.sites.map((site) => (
                  <div key={site.name} className="validation-card">
                    <strong>{site.name}</strong>
                    <p className="muted" style={{ margin: "6px 0 0 0" }}>{site.defaultAddressBlock || "No address block set"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Suggested VLANs</h3>
            {draft.vlans.length === 0 ? (
              <EmptyState title="No VLANs proposed" message="Adjust the prompt and try again if you expected VLAN recommendations." />
            ) : (
              <div className="data-table" style={{ maxHeight: 280 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>VLAN</th>
                      <th>Name</th>
                      <th>Subnet</th>
                      <th>Gateway</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.vlans.map((vlan) => (
                      <tr key={`${vlan.siteName}-${vlan.vlanId}-${vlan.vlanName}`}>
                        <td>{vlan.siteName}</td>
                        <td>{vlan.vlanId}</td>
                        <td>{vlan.vlanName}</td>
                        <td>{vlan.subnetCidr}</td>
                        <td>{vlan.gatewayIp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 14, display: "grid", gap: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Apply options</h3>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={applyProjectFields} onChange={(event) => setApplyProjectFields(event.target.checked)} />
              Apply project fields to the form
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={applySites} onChange={(event) => setApplySites(event.target.checked)} />
              Auto-create suggested sites after project creation
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={applyVlans} onChange={(event) => setApplyVlans(event.target.checked)} />
              Auto-create suggested VLANs after project creation
            </label>
            <p className="muted" style={{ margin: 0 }}>
              Selected: <strong>{selectedSummary}</strong>
            </p>
            <div className="form-actions">
              <button
                type="button"
                disabled={!applyProjectFields && !applySites && !applyVlans}
                onClick={() => onUseDraft(draft, { applyProjectFields, applySites, applyVlans })}
              >
                Apply selected parts
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
